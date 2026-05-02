# PROJECT_STATE.md — PromptVault

**Last updated:** 2026-05-02  
**Status:** Phase 1 Hardening Complete — Milestone Stable  
**Build:** `next build` passes (Turbopack, production)  
**TypeScript:** `tsc --noEmit` passes clean  

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Client)                                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Privy Auth│  │viem/WC   │  │CDR WASM  │  │EIP-712   │ │
│  │Provider  │  │WalletClient│ │TDH2+ECIES│  │signTyped │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │              │              │              │      │
│  ┌────┴──────────────┴──────────────┴──────────────┴───┐ │
│  │  Next.js App Router (Client Components)            │ │
│  │  /  /create  /unlock  /activity                    │ │
│  └────┬───────────────────────────────────────────────┘ │
└───────┼──────────────────────────────────────────────────┘
        │ Server Actions + API Routes
┌───────┼──────────────────────────────────────────────────┐
│  Server │                                               │
│  ┌──────┴──────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Middleware  │  │ Server Actions│  │ API Routes     │  │
│  │ Auth+CSPL  │  │ queries.ts    │  │ retry-persist  │  │
│  │ RateLimit  │  │ (DB CRUD)     │  │ csp-report     │  │
│  └────────────┘  └──────┬───────┘  └────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │  SQLite (Drizzle ORM)                            │   │
│  │  users | vaults | activity | licenseTokens       │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────┐
│  External Services                                      │
│  ┌──────┴─────┐  ┌────────────┐  ┌───────────────────┐  │
│  │Story Proto │  │CDR Network │  │Privy Auth Service │  │
│  │Aeneid RPC  │  │CometBFT RPC│  │(OAuth + Wallet)   │  │
│  │IP Registry │  │Validators  │  │                   │  │
│  │Licensing   │  │TDH2 DKG   │  │                   │  │
│  └────────────┘  └────────────┘  └───────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Full Flow: Create Vault → License → Access → Decrypt

### 1. Create Vault (`/create`)

```
User fills name+description → Clicks "Create Vault"
    │
    ├─ Step 1: Register IP Asset
    │   └─ StoryClient.ipAsset.registerIpAsset()
    │       → ipId, licenseTermsId, txHash
    │
    ├─ Step 2: Mint License Token
    │   └─ StoryClient.license.mintLicenseTokens()
    │       → licenseTokenId, txHash
    │
    ├─ Step 3: Encrypt & Upload CDR
    │   └─ CDRClient.uploader.uploadCDR({
    │        dataKey: crypto.getRandomValues(32 bytes),
    │        globalPubKey: from CDR DKG,
    │        readCondition: LICENSE_READ_CONDITION,
    │        writeCondition: OWNER_WRITE_CONDITION,
    │     })
    │       → uuid, allocateTxHash, writeTxHash
    │
    ├─ Step 4: Encrypt Data Key (EIP-712)
    │   └─ walletClient.signTypedData({
    │        domain: { name: 'PromptVault', version: '1', chainId: 1315 },
    │        types: { EncryptDataKey: [wallet, purpose, version] },
    │     })
    │   └─ PBKDF2(keccak256(signature), salt, 100k iter, SHA-256) → AES key
    │   └─ AES-256-GCM(dataKey, AES key, random IV) → encryptedDataKey
    │
    └─ Step 5: Persist to DB
        └─ createVaultRecord({ uuid, owner, ipId, encryptedDataKey, ... })
        └─ If fails → "Retry Save" button calls POST /api/vaults/retry-persist
```

### 2. Access/Unlock Vault (`/unlock`)

```
User enters vault UUID + license token ID
    │
    ├─ Method A: CDR Threshold Access
    │   └─ CDRClient.consumer.accessCDR({
    │        dataKey, licenseTokenId, accessAuxData
    │     })
    │   └─ Validators return decryption partials
    │   └─ TDH2 combine partials → recover data key
    │
    └─ Method B: Local Recovery (owner-only)
        └─ Fetch encryptedDataKey from DB (getVaultEncryptedDataKey)
        └─ Verify caller === vault owner
        └─ walletClient.signTypedData() (same EIP-712 domain)
        └─ Derive AES key from signature
        └─ AES-256-GCM decrypt → original data key
```

### 3. Activity Tracking

```
Every vault creation, license mint, and access event
    → INSERT INTO activity (vaultUuid, walletAddress, type, txHash, details)
    → Displayed on /activity page with explorer links
```

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| Language | TypeScript (target ES2017) | strict mode |
| Auth | Privy (`@privy-io/react-auth`) | ^1.78.0 |
| Blockchain | Story Protocol Aeneid Testnet | chainId 1315 |
| Story SDK | `@story-protocol/core-sdk` | ^1.4.4 |
| CDR SDK | `@piplabs/cdr-sdk` (local alias) | custom build |
| Ethereum | viem + wagmi | ^2.21.0 / ^2.9.0 |
| Database | SQLite via Drizzle ORM (Turso compatible) | drizzle ^0.45.2 |
| Styling | Tailwind CSS v4 + custom dark theme | @tailwindcss/postcss ^4.2.4 |
| State | React Query (@tanstack/react-query) | ^5.0.0 |
| Storage | Lighthouse Web3 SDK (IPFS) | ^0.3.0 |

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────┐
│  TRUST ZONE: Client (Browser)                   │
│  • Wallet private keys (Privy embedded/external)│
│  • EIP-712 signature (never leaves browser)     │
│  • AES key derivation (PBKDF2 in browser)       │
│  • Data key encryption/decryption               │
│  • CDR WASM TDH2 operations                     │
│  ⚠ Raw dataKey exists in memory briefly          │
├─────────────────────────────────────────────────┤
│  TRUST ZONE: Server (Next.js)                   │
│  • Server Actions: DB queries (no secrets)      │
│  • API Routes: retry-persist, csp-report        │
│  • Middleware: cookie check (not JWT validation) │
│  ⚠ encryptedDataKey stored in DB (AES-GCM enc)  │
│  ✗ Never stores raw dataKey                      │
├─────────────────────────────────────────────────┤
│  TRUST ZONE: External                           │
│  • Story Protocol: IP registration + licensing  │
│  • CDR Network: threshold encryption + DKG      │
│  • Privy: OAuth + wallet management             │
│  ⚠ CometBFT RPC: HTTP in dev, HTTPS in prod     │
└─────────────────────────────────────────────────┘
```

### Security Properties

| Property | Mechanism | Status |
|----------|-----------|--------|
| Auth boundary | Middleware cookie check + AuthGuard chain check | Active |
| Data key at rest | AES-256-GCM with EIP-712-derived key | Active (v2) |
| Data key in transit | Never sent to server; encrypted client-side | Active |
| CSP | Full policy with report-uri; unsafe-eval dev-only | Active |
| Test route protection | 404 unless NEXT_PUBLIC_ENABLE_TEST_ROUTES=true | Active |
| Rate limiting | 30 req/60s per IP (in-memory, prod only) | Active |
| Log sanitization | cryptoLog() redacts keys/addresses; suppressed in prod | Active |
| DB persist retry | Idempotent POST /api/vaults/retry-persist | Active |
| HSTS | max-age=63072000; includeSubDomains; preload | Active |

---

## Decisions Taken

| Decision | Rationale | Date |
|----------|-----------|------|
| EIP-712 over EIP-191 personal_sign | Structured data, domain separation, better wallet UX | 2026-05-02 |
| AES-256-GCM + PBKDF2 (100k iter) for data key encryption | NIST-standard, browser-native WebCrypto, no extra deps | 2026-05-02 |
| v1/v2 backward compat in decrypt | Existing vaults encrypted with personal_sign still work | 2026-05-02 |
| Server Actions for DB queries | Simpler than API routes for CRUD, automatic type safety | Ongoing |
| API Routes for retry-persist + csp-report | Need idempotent POST without Server Action overhead | 2026-05-02 |
| Local CDR SDK alias (not npm) | SDK not published to npm; compiled from monorepo in external/ | Ongoing |
| In-memory rate limiting | Simple for single-instance; documented limitation for multi-instance | 2026-05-02 |
| Dark-only theme | Design choice; emerald accent (#34d399) | Ongoing |
| Privy cookie check in middleware (not JWT) | JWT validation happens server-side in actions; middleware is fast gate | 2026-05-02 |
| BigInt(1) instead of 1n | tsconfig target ES2017 doesn't support BigInt literals | Ongoing |

---

## Risks Residual

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| CometBFT RPC uses HTTP + private IP in dev | Medium | HTTPS enforced in prod; `getCometRpcUrl()` throws if missing | Documented |
| In-memory rate limit resets on restart | Low | Works for single instance; Redis needed for multi-instance | Documented |
| CSP `unsafe-inline` for styles | Low | Required by Next.js + font loading; not for scripts | Accepted |
| Privy iframe CSP edge cases | Low | Added `auth.privy.io` to frame-src; `explorer-api.walletconnect.com` to connect-src | Mitigated |
| CDR SDK WASM `Module not found: '.'` warning | Low | Turbopack warning only; doesn't affect runtime; WASM loads via fetch/blob | Documented |
| No automated tests | Medium | No test framework configured; validation via manual functional testing + tsc + build | Needs work |
| No ESLint installed | Low | Config exists but package not installed | Needs npm install |
| Auth middleware checks cookie presence, not JWT validity | Medium | JWT validated server-side in actions; middleware is fast gate, not full auth | Accepted |
| Next.js 16 deprecates middleware in favor of "proxy" | Low | Warning in build; will need migration eventually | Tracked |

---

## Critical Dependencies

| Dependency | Risk | Fallback |
|-----------|------|----------|
| `@piplabs/cdr-sdk` (local) | SDK changes break aliases | Pinned to current build in lib/cdr-sdk/ |
| `@story-protocol/core-sdk` | API changes between versions | Pin version in package.json |
| Privy auth service | Service outage blocks auth | No offline fallback possible |
| Story Aeneid testnet | Testnet resets | DB records survive; on-chain data lost |
| CometBFT validators | Validators offline = no threshold decrypt | Local recovery fallback works |
| Turso/libsql | DB outage blocks server actions | Local SQLite fallback in drizzle config |

---

## What Works (Validated)

- [x] Production build (`next build`) — passes
- [x] TypeScript strict mode (`tsc --noEmit`) — passes
- [x] Auth middleware: `/create`, `/unlock`, `/activity` → 307 redirect without cookies
- [x] Test route protection: `/test`, `/test-cdr`, `/test-cdr-flow` → 404
- [x] Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- [x] CSP report endpoint: POST `/api/csp-report` → 200
- [x] Retry-persist API: POST `/api/vaults/retry-persist` → creates + idempotent on duplicate
- [x] EIP-712 data key encryption (v2) — signTypedData → PBKDF2 → AES-GCM
- [x] v1 backward compat — personal_sign decrypt still works
- [x] AuthGuard component — auth + chain check with network switch
- [x] DB schema — users, vaults (with encryptedDataKey), activity, licenseTokens
- [x] cryptoLog sanitization — keys/addresses redacted, suppressed in prod

## What's Protected

- Auth boundary: middleware cookie gate on protected routes
- Chain boundary: AuthGuard enforces Aeneid 1315
- Crypto boundary: raw dataKey never persists; only AES-GCM ciphertext in DB
- CSP boundary: strict policy with violation reporting
- Test boundary: test routes blocked by default in production

---

## What's Missing for MVP

### Must Have (Phase 2)

- [ ] **Real vault list on dashboard** — currently fetches from DB but needs proper card UI
- [ ] **Real activity feed** — data flows from DB but needs richer rendering (tx links, type badges)
- [ ] **License token management** — `licenseTokens` table exists but no UI to view/manage tokens
- [ ] **Vault detail view** — no page to see full vault info (IP ID, tx hashes, status, encrypted key status)
- [ ] **File upload + encryption** — create page uses random dataKey; no actual file encryption flow
- [ ] **Decrypt + download** — unlock page recovers dataKey; no actual file decryption + download
- [ ] **Error handling UX** — on-chain errors need user-friendly messages, not raw throw

### Should Have

- [ ] **ESLint setup** — config exists, package not installed
- [ ] **Automated tests** — no test framework; need vitest + testing-library setup
- [ ] **IPFS metadata upload** — AssetMetadata type defined but not used in create flow
- [ ] **Vault sharing** — `vault_shared` activity type defined but no implementation

### Nice to Have

- [ ] **Middleware → proxy migration** (Next.js 16 deprecation)
- [ ] **Redis rate limiting** for multi-instance
- [ ] **HTTPS CometBFT proxy** for production
- [ ] **Light mode** (currently dark-only)
- [ ] **ESLint + Prettier** formatting pipeline

---

## File Reference (Key Files)

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Auth boundary, rate limit, CSP, security headers |
| `src/components/AuthGuard.tsx` | Client-side auth + chain gate |
| `src/lib/crypto/datakey-encryption.ts` | EIP-712 data key encryption (v1/v2) |
| `src/lib/constants.ts` | Chain config, contract addresses, CometBFT |
| `src/lib/logger.ts` | cryptoLog with key/address redaction |
| `src/lib/cdr.ts` | CDR condition ABI encoders |
| `src/db/queries.ts` | Server Actions: all DB CRUD |
| `src/db/schema.ts` | Drizzle schema: 4 tables |
| `src/app/(app)/create/page.tsx` | Create vault 5-step flow |
| `src/app/(app)/unlock/page.tsx` | Unlock vault (CDR threshold + local recovery) |
| `src/app/(app)/activity/page.tsx` | Activity log |
| `src/app/(app)/page.tsx` | Dashboard |
| `src/app/api/vaults/retry-persist/route.ts` | Idempotent DB persist |
| `src/app/api/csp-report/route.ts` | CSP violation reporter |
| `next.config.mjs` | Turbopack + webpack CDR SDK aliases |
| `drizzle.config.ts` | SQLite/Turso migration config |
| `.env.example` | Required environment variables |
| `AGENTS.md` | Agent rules + known limitations |
