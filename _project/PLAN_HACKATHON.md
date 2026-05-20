# PromptVault — CDR Hackathon Plan

**Hackathon**: CDR Hackathon (May 27 → June 3 submission → June 5 Demo Day)
**Tracks**: Technical Implementation ($1k) + Best CDR Application ($1k × 2)
**Strategy**: Compete in BOTH tracks. Maximize technical depth + real-world utility.

---

## SDK / Skills / Dependencies Inventory

### Already Installed & Ready

| Resource | Location | Purpose |
|----------|----------|---------|
| `@piplabs/cdr-sdk` (source build) | `external/cdr-sdk/` (pnpm) + copied to `lib/cdr-sdk/` | CDR vault allocate/encrypt/write/read/access |
| `@piplabs/cdr-crypto` | bundled in `lib/cdr-sdk/crypto/` | TDH2 encryption, ECIES, WASM initWasm() |
| `@piplabs/cdr-contracts` | bundled in `lib/cdr-sdk/contracts/` | ABIs + addresses for DKG/CDR precompiles |
| `@story-protocol/core-sdk` | npm `^1.4.4` | registerIpAsset, mintLicenseTokens, WIP |
| `@privy-io/react-auth` + `@privy-io/wagmi` | npm | Wallet auth (email, google, github, wallet) |
| `@lighthouse-web3/sdk` | npm `^0.4.5` | IPFS file upload (encrypted blobs) |
| `@tanstack/react-query` | npm `^5.0.0` | **INSTALLED BUT UNUSED** — use for caching |
| `viem` | npm `^2.21.0` | ABI encoding, wallet clients, public clients |
| `wagmi` | npm `^2.9.0` | React hooks for chain interaction |
| `drizzle-orm` + `postgres` | npm | Supabase PostgreSQL persistence |
| CDR Skill | `.agents/skills/cdr/SKILL.md` | Reference for CDR patterns, EOA conditions, failure modes |

### Already in CDR SDK but Not Yet Used in PromptVault

| Resource | Location | When to Use |
|----------|----------|-------------|
| `conditions.ownerOnly()` | `lib/cdr-sdk/sdk/conditions.js` | **Step 1**: Owner-Only EOA vaults — encodes `address` into `conditionData` |
| `conditions.open()` | same | **Future**: Public vaults if we deploy an OpenCondition contract |
| `conditions.tokenGate()` | same | **Future**: ERC-20 gated reads |
| `conditions.merkle()` | same | **Future**: Allowlist-gated reads |
| `conditions.custom()` | same | **Step 2**: Time-Locked Vaults — custom `conditionData` for our contract |
| `uploader.allocate()` (low-level) | `lib/cdr-sdk/sdk/uploader.js` | **Step 1**: EOA-as-read-condition requires `skipConditionValidation: true` |
| `uploader.encryptDataKey()` (low-level) | same | **Step 1**: Split from `uploadCDR()` for EOA condition flow |
| `uploader.write()` (low-level) | same | **Step 1**: Write ciphertext after manual allocate+encrypt |
| `observer.getVault()` | `lib/cdr-sdk/sdk/observer.js` | Debug: read back vault condition addresses/data |
| `uuidToLabel()` | `lib/cdr-sdk/sdk/label.js` | **Step 1**: Required for low-level `encryptDataKey({ label })` |

### Needs Installation (per step)

| Package | When | Purpose |
|---------|------|---------|
| None for Step 1 | — | All deps already available |
| Solidity dev tools (Remix IDE) | **Step 2** | Time-Locked Vault contract — deploy from browser, no WSL needed |
| `date-fns` or similar | **Step 2** | UI for datetime picker (unlock time) — optional, can use native `<input type="datetime-local">` |
| `framer-motion` | **Step 5** | Landing page animations — optional, can use CSS animations |

### External Resources

| Resource | URL | When to Use |
|----------|-----|-------------|
| CDR SDK docs — Overview | https://docs.story.foundation/developers/cdr-sdk/overview | Reference for all steps |
| CDR SDK docs — Setup | https://docs.story.foundation/developers/cdr-sdk/setup | If rebuilding SDK |
| CDR SDK docs — Encrypt/Decrypt | https://docs.story.foundation/developers/cdr-sdk/encrypt-and-decrypt | Step 1 (low-level path) |
| CDR SDK docs — IP Asset Vaults | https://docs.story.foundation/developers/cdr-sdk/ip-asset-vaults | License-gated pattern |
| CDR SDK docs — Advanced Config | https://docs.story.foundation/developers/cdr-sdk/advanced-configuration | Custom conditions |
| CDR SDK API Reference | https://docs.story.foundation/sdk-reference/cdr/overview | Method signatures |
| Remix IDE | https://remix.ethereum.org | **Step 2**: Deploy TimeLock condition contract |
| Aeneid Explorer | https://aeneid.storyscan.xyz | Verify txs, contracts |
| Story Faucet | https://faucet.story.foundation | **Step 6**: Faucet page (or link) |
| Jacob Tucker's CDR Skill | `npx skills add jacob-tucker/cdr-skill --skill cdr` | Alternative CDR reference (same patterns) |

---

## Implementation Steps (punto por punto)

### Step 1: Owner-Only EOA Vaults
**Priority**: HIGH | **Estimate**: 1-2 days | **Track**: Both

**What**: Add "Private" vault type where only the owner's EOA can read (no license token needed). Uses EOA-as-read-condition — no custom contract deployment needed.

**SDK usage**:
- Use `conditions.ownerOnly()` from `lib/cdr-sdk/sdk/conditions.js` (or manually encode with `encodeAbiParameters`)
- Use **low-level** `allocate()` → `encryptDataKey()` → `write()` (NOT `uploadCDR()`) because EOA has no code → `skipConditionValidation: true`
- `readConditionAddr = ownerAddress` (EOA), `readConditionData = "0x"`
- On read: `accessAuxData = "0x"` (no license token needed)
- `uuidToLabel(uuid)` for `encryptDataKey({ label })`

**Files to modify**:
- `src/lib/cdr.ts` — add `encodeOwnerReadConditionEOA()`, add `allocateOwnerOnlyVault()` helper
- `src/hooks/useCdrEncrypt.ts` — add `uploadOwnerOnlyVault()` alongside existing `uploadVault()`
- `src/app/(app)/create/page.tsx` — add vault type selector ("Private" vs "Licensed"), branch logic
- `src/db/schema.ts` — add `vaultType` column (enum: `licensed`, `private`)
- `drizzle.config.ts` — generate migration for new column
- `src/db/queries.ts` — update createVaultRecord to accept vaultType
- `src/app/(app)/unlock/page.tsx` — if vault is private, skip license token ID input, use `accessAuxData: "0x"`
- `src/app/(app)/vault/[uuid]/page.tsx` — show "Private" badge, hide "Buy" for private vaults
- `src/app/(app)/explore/page.tsx` — filter out private vaults from marketplace

**Testing**: Create private vault → verify on Aeneid → access with owner wallet → verify non-owner CANNOT access

**Commit message**: `feat: owner-only EOA vaults with skipConditionValidation`

---

### Step 2: Time-Locked Vaults
**Priority**: HIGH | **Estimate**: 2-3 days | **Track**: Technical Implementation 🏆

**What**: Smart contract as read condition that checks `block.timestamp >= unlockTime`. High-impact for technical judges — novel use of CDR condition contracts.

**SDK usage**:
- Use `conditions.custom()` from `lib/cdr-sdk/sdk/conditions.js` to encode `(uint256 unlockTime)` into `readConditionData`
- Use `uploader.uploadCDR()` (high-level OK since condition contract has code — no need for `skipConditionValidation`)
- On read: `accessAuxData = "0x"` (condition checks chain state, no aux data needed)

**Smart contract** (deploy via Remix IDE — no WSL needed):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimeLockReadCondition {
    function checkReadCondition(
        address,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        uint256 unlockTime = abi.decode(conditionData, (uint256));
        return block.timestamp >= unlockTime;
    }

    function checkWriteCondition(
        address,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        return true; // or owner-only
    }
}
```

**Files to modify**:
- Deploy contract on Aeneid via Remix, add address to `src/lib/constants.ts`
- `src/lib/cdr.ts` — add `encodeTimeLockReadCondition(unlockTime: bigint)`
- `src/hooks/useCdrEncrypt.ts` — add `uploadTimeLockedVault()`
- `src/app/(app)/create/page.tsx` — add "Time-Locked" vault type, datetime picker for `unlockTime`
- `src/db/schema.ts` — add `unlockTime` column (timestamp, nullable)
- `src/db/queries.ts` — update queries for unlockTime
- `src/app/(app)/vault/[uuid]/page.tsx` — show countdown timer if locked, "Unlock Available" badge if time passed
- `src/app/(app)/unlock/page.tsx` — check if unlockTime has passed before attempting read
- `src/app/(app)/explore/page.tsx` — show lock status on cards

**Testing**:
1. Deploy contract on Aeneid
2. Create time-locked vault with unlockTime = now + 5min
3. Try to read before unlockTime → should REVERT
4. Wait 5min, read again → should SUCCEED
5. Verify countdown UI updates correctly

**Commit message**: `feat: time-locked vaults with on-chain unlock condition`

---

### Step 3: Refactor useCdrEncrypt → useCreateVault
**Priority**: MEDIUM | **Estimate**: 0.5-1 day | **Track**: N/A (cleanup)

**What**: `create/page.tsx` duplicates all CDR logic inline (~80 lines). Extract into a unified hook that handles all vault types.

**Files to modify**:
- `src/hooks/useCdrEncrypt.ts` → rename/refactor to `useCreateVault.ts` with methods:
  - `createLicensedVault(params)` — existing flow (register IP + mint license + upload CDR)
  - `createPrivateVault(params)` — EOA-only flow (no IP registration, no license mint)
  - `createTimeLockedVault(params)` — time-locked flow (with unlockTime, uses custom condition contract)
- `src/app/(app)/create/page.tsx` — replace inline logic with hook calls, reduce from ~200 lines to ~80

**Testing**: Create each vault type → verify all 3 work

**Commit message**: `refactor: extract create vault logic into useCreateVault hook`

---

### Step 4: Faucet Page
**Priority**: MEDIUM | **Estimate**: 0.5 day | **Track**: Best CDR Application

**What**: Simple page that links to the official Story faucet or wraps it in an iframe/redirect. Optional: server action that calls faucet API if one exists.

**Files to create/modify**:
- `src/app/(app)/faucet/page.tsx` — Faucet page with link to https://faucet.story.foundation
- `src/components/Sidebar.tsx` — add Faucet nav item

**Testing**: Click faucet link → verify it opens correctly

**Commit message**: `feat: faucet page for testnet IP`

---

### Step 5: Landing Page
**Priority**: MEDIUM | **Estimate**: 1-2 days | **Track**: Best CDR Application

**What**: Separate public landing page at `/` (not behind auth). Hero section, feature highlights, CTA to connect wallet. Current dashboard moves to `/dashboard`.

**Files to create/modify**:
- `src/app/page.tsx` — NEW public landing page (no AppShell, no AuthGuard)
- `src/app/(app)/page.tsx` — becomes `/dashboard` (current hybrid)
- `src/app/(app)/layout.tsx` — may need route adjustments
- `src/components/Sidebar.tsx` — update nav links

**Design**: Premium dark Web3 aesthetic. Sections:
1. Hero — "Encrypted AI Prompt Vaults on Story Protocol" + CTA
2. How It Works — 3 steps (Create → License → Access)
3. Features — Private Vaults, Time-Locked Vaults, License-Gated Access
4. CTA — "Get Started" → login flow

**Testing**: Visit `/` unauthenticated → see landing. Visit `/dashboard` authenticated → see current UI.

**Commit message**: `feat: public landing page with hero, features, CTA`

---

### Step 6: Share Vault by Link
**Priority**: LOW | **Estimate**: 0.5 day | **Track**: Best CDR Application

**What**: "Share" button in vault detail page that copies a link with vault UUID + license token ID pre-filled.

**Files to modify**:
- `src/app/(app)/vault/[uuid]/page.tsx` — add Share button, construct URL: `/unlock?vaultId=1044&licenseTokenId=72508`
- For private vaults: `/unlock?vaultId=1044` (no licenseTokenId param)

**Testing**: Click Share → open link in new tab → verify Unlock page has pre-filled fields

**Commit message**: `feat: share vault link with pre-filled credentials`

---

### Step 7: React Query Integration
**Priority**: LOW | **Estimate**: 1 day | **Track**: N/A (polish)

**What**: Replace direct server action calls with React Query hooks. Cache vault lists, user stats, activity. Optimistic updates for mutations.

**Files to create/modify**:
- `src/hooks/useQueries.ts` — React Query hooks wrapping server actions
- `src/app/providers.tsx` — already has QueryClientProvider, configure staleTime/cacheTime
- All page components — replace `useEffect + useState` fetch patterns with `useQuery`/`useMutation`

**Testing**: Navigate between pages → verify data is cached (no loading spinners on revisit)

**Commit message**: `feat: react query integration for data caching`

---

### Step 8: Dead-Man Switch 🏆
**Priority**: NICE-TO-HAVE | **Estimate**: 2-3 days | **Track**: Technical Implementation 🏆

**What**: Smart contract as read condition: owner must "check in" by a deadline. If they don't, access transfers to a beneficiary address. Extremely novel CDR use case.

**SDK usage**:
- Custom condition contract with state: `mapping(uuid => CheckIn)` — owner checkInDeadline, beneficiary
- `checkReadCondition`: if `block.timestamp <= deadline`, only owner can read; if `block.timestamp > deadline && !ownerCheckedIn`, beneficiary can read
- Requires `allocate()` with custom `readConditionAddr` + `readConditionData`

**Smart contract** (deploy via Remix):
```solidity
contract DeadManSwitchCondition {
    struct SwitchConfig {
        address owner;
        address beneficiary;
        uint256 checkInDeadline;
        bool ownerCheckedIn;
    }
    mapping(uint256 => SwitchConfig) public switches;

    function configure(uint256 uuid, address beneficiary, uint256 deadline) external { ... }
    function checkIn(uint256 uuid) external { ... }

    function checkReadCondition(
        address caller,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        (address owner, address beneficiary, uint256 deadline) =
            abi.decode(conditionData, (address, address, uint256));
        if (block.timestamp <= deadline) return caller == owner;
        return caller == beneficiary; // after deadline, beneficiary gets access
    }
}
```

**NOTE**: Complex — requires contract state management. Only implement if Steps 1-2 are done and time permits.

**Commit message**: `feat: dead-man switch vaults with on-chain beneficiary transfer`

---

### Step 9: Push to GitHub + Submission
**Priority**: CRITICAL | **Estimate**: 0.5 day | **Deadline**: June 3

**What**:
1. Create GitHub repo (public)
2. Push all code
3. Fill submission form on Luma
4. Optional: record 2-3 min demo video

**Demo video script** (2-3 min):
1. Landing page → connect wallet
2. Create Private vault → show on Aeneid explorer
3. Access private vault → decrypt
4. Create Time-Locked vault → show countdown
5. Try to access before unlock → show revert
6. Wait → access after unlock → decrypt
7. Marketplace → browse → buy license → unlock
8. Share link flow

---

### Step 10: Demo Day Prep (June 5)
**Priority**: OPTIONAL | **Estimate**: 0.5 day

**What**: If selected for Demo Day, prepare a 2-3 min live demo. Practice the flow. Have backup screenshots/video in case of network issues.

---

## Execution Order (Priority)

| Order | Step | Days | Cumulative | Notes |
|-------|------|------|------------|-------|
| 1 | **Owner-Only EOA Vaults** | 1-2 | 1-2 | No contract deployment needed — fastest new feature |
| 2 | **Refactor useCdrEncrypt** | 0.5-1 | 2 | Clean up before adding more vault types |
| 3 | **Time-Locked Vaults** 🏆 | 2-3 | 4-5 | Highest technical impact — needs Remix deployment |
| 4 | **Faucet Page** | 0.5 | 4.5-5.5 | Quick win |
| 5 | **Landing Page** | 1-2 | 6-7 | Important for demo/judges first impression |
| 6 | **Share Vault by Link** | 0.5 | 6.5-7.5 | Quick win |
| 7 | **React Query** | 1 | 7.5-8.5 | Polish, not critical |
| 8 | **Dead-Man Switch** 🏆 | 2-3 | 10-11 | Only if time permits (cut if behind) |
| 9 | **GitHub + Submission** | 0.5 | 11 | CRITICAL — don't miss June 3 deadline |
| 10 | **Demo Day Prep** | 0.5 | 11.5 | Optional |

**Buffer**: We have ~20 days (May 14 → June 3). Plan covers ~11.5 days. Plenty of buffer for testing, debugging, and polish.

---

## Key Technical References

### EOA-as-Read-Condition Pattern (Step 1)

```ts
// From CDR SKILL.md — canonical pattern
const { uuid } = await client.uploader.allocate({
  updatable: false,
  writeConditionAddr: OWNER_WRITE_CONDITION, // 0x4C9bFC96d7092b590D497A191826C3dA2277c34B
  writeConditionData: encodeAbiParameters([{ type: "address" }], [owner]),
  readConditionAddr: owner,    // EOA — gates reads to this exact wallet
  readConditionData: "0x",     // No data for EOA
  skipConditionValidation: true, // EOA has no code; skip preflight
});

const globalPubKey = await client.observer.getGlobalPubKey();
const ciphertext = await client.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode(secret),
  globalPubKey,
  label: uuidToLabel(uuid),
});

await client.uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ciphertext.raw),
});

// Reading — only owner's wallet can call this
const { dataKey } = await client.consumer.accessCDR({
  uuid,
  accessAuxData: "0x",
  timeoutMs: 120_000,
});
```

### Custom Condition Contract Pattern (Step 2, 8)

```ts
// Deploy contract on Aeneid via Remix IDE
// Add address to constants.ts

const readConditionData = encodeAbiParameters(
  [{ type: "uint256" }],      // unlockTime for TimeLock
  [unlockTimestamp],
);

const { uuid } = await client.uploader.uploadCDR({
  dataKey,
  globalPubKey,
  updatable: false,
  writeConditionAddr: OWNER_WRITE_CONDITION,
  writeConditionData: encodeAbiParameters([{ type: "address" }], [owner]),
  readConditionAddr: TIME_LOCK_CONDITION, // our deployed contract
  readConditionData,
  accessAuxData: "0x",
});
```

### Contract Interface Required

```solidity
function checkReadCondition(
    address caller,
    bytes calldata conditionData,
    bytes calldata accessAuxData
) external view returns (bool);
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CDR SDK WASM fails in browser | Already working — `initWasm()` called in `useCdrClient` |
| EOA condition `allocate()` throws `InvalidConditionContractError` | Use `skipConditionValidation: true` (documented in SKILL.md) |
| Time-Lock contract deployment fails on Aeneid | Test in Remix first, use simple contract, verify gas |
| Aeneid RPC rate limiting | `validationRpcUrls` array, fallback providers |
| Supabase connection drops | `ssl: 'require'` already set, pooler port 6543 available |
| Hackathon deadline pressure | Steps 1-3 are the core — Steps 4-7 are bonus |
| No WSL for contract deployment | Remix IDE works in browser — no local tooling needed |
| Demo Day network issues | Record backup video, have screenshots ready |

---

## Notes

- **No `skipHashCheck: true`** in production code
- **dataKey never stored raw** — always encrypted via EIP-712 + AES-256-GCM
- **Test routes blocked** in production (`/test`, `/test-cdr`)
- **CometBFT HTTPS** only needed in production — dev uses private IP OK
- **Aeneid only** — CDR mainnet doesn't exist yet
- **npm** for PromptVault, **pnpm** ONLY inside `external/cdr-sdk/`
- **Windows PowerShell** — no bash, no WSL
