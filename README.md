<div align="center">

![PromptVault Banner](public/banner.png)

# PromptVault

**Threshold-encrypted AI prompt vaults powered by Story Protocol and CDR.**

Protect, license, and monetize AI prompts without exposing the source.

[![Built for CDR Hackathon](https://img.shields.io/badge/Built%20for-CDR%20Hackathon-3b9eff?style=flat-square)](https://docs.story.foundation/developers/cdr-sdk/overview)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## What is PromptVault?

PromptVault lets creators secure prompts, workflows, and AI assets using:

- **Threshold encryption** via the CDR validator network — no single point of failure
- **License-gated access** — on-chain conditions control who can decrypt
- **On-chain ownership** with Story Protocol IP Assets
- **Encrypted IPFS storage** — content never leaves the client in plaintext
- **Wallet-based and time-locked** access controls

---

## Why It Matters

AI prompts are valuable intellectual property, yet most sharing platforms either expose the original source, rely on centralized servers, or cannot enforce programmable ownership. PromptVault abstracts the complexity of threshold encryption and IP assets, turning a prompt into a secure, tradeable digital commodity.

---

## How It Works

```text
Upload Prompt
     ↓
Encrypt Locally (AES-256-GCM)
     ↓
Threshold Encrypt Key via CDR (3-of-5)
     ↓
Store Encrypted Content on IPFS
     ↓
Register Access Rules on Story Protocol
     ↓
Authorized Users Unlock via CDR Validators
```

No single entity ever holds the complete decryption key.

### Vault Types

| Type | Access Model | IP Registration | Marketplace |
|------|-------------|-----------------|-------------|
| **Licensed** | License Token (ERC-721) | ✅ Story Protocol | ✅ |
| **Private** | Owner-only EOA | ❌ | ❌ |
| **Time-Locked** | Anyone after unlock timestamp | ❌ | ✅ |

---

## Features

- **Licensed Vaults** — Register an IP Asset on Story Protocol. Mint license tokens that grant decryption access. Built-in marketplace for selling prompt collections.
- **Private Vaults** — Owner-only EOA access. Maximum privacy — only your wallet can decrypt.
- **Time-Locked Vaults** — On-chain smart contract enforces an unlock timestamp. Anyone can decrypt after the deadline.
- **Threshold Encryption** — Data keys are distributed across 5 CDR validators. 3-of-5 partials required to reconstruct the key.
- **Buyer Backup Recovery** — After the first successful CDR unlock, buyers receive an encrypted local backup (EIP-712) for gasless future access.
- **Built-In Marketplace** — Creators publish vaults with prices in MUSDC. Purchases mint license tokens and grant decryption rights.
- **3D Interactive Hero** — Procedural vault model rendered with React Three Fiber.
- **Dark / Light Theme** — Resend-inspired matte black UI with a light mode toggle.
- **Mobile Responsive** — Slide-out sidebar navigation on small screens.

---

## Architecture

```mermaid
flowchart LR
    User[User Browser] --> Privy[Privy Auth]
    User --> Next[Next.js 16 Frontend]
    Next --> Story[Story Protocol<br/>IP Assets + Licensing]
    Next --> CDR[CDR Network<br/>Threshold Encryption]
    Next --> DB[(PostgreSQL<br/>Supabase)]
    Next --> IPFS[IPFS via Pinata]
    CDR --> Story
    Story --> Marketplace[Marketplace<br/>MUSDC Token]
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 |
| Language | TypeScript |
| Auth & Wallet | Privy + Wagmi + Viem |
| UI | Tailwind CSS v4 + custom design tokens |
| 3D | React Three Fiber, Drei, Postprocessing |
| Database | PostgreSQL via Supabase (Drizzle ORM) |
| Encrypted Storage | Pinata IPFS |
| CDR SDK | `@piplabs/cdr-sdk` (threshold encryption, source build) |
| Smart Contracts | Story Protocol Core SDK (IP registration, licensing) |
| Deployed Network | Aeneid testnet (Chain ID: 1315) |

---

## Contract Addresses (Aeneid Testnet)

### PromptVault Contracts

| Contract | Address |
|---|---|
| TimeLock Read Condition | `0x46161d99592C2b5148a8c2593cDa268E052982F5` |
| Marketplace | Configurable via `NEXT_PUBLIC_MARKETPLACE_ADDRESS` |
| MUSDC Token | Configurable via `NEXT_PUBLIC_MUSDC_TOKEN_ADDRESS` |

### Story Protocol Contracts (pre-deployed)

| Contract | Address |
|---|---|
| SPG NFT Contract | `0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc` |
| License Token | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` |
| Licensing Module | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` |
| PI License Template | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` |
| WIP Token | `0x1514000000000000000000000000000000000000` |
| Owner Write Condition | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` |
| License Read Condition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` |

---

## CDR SDK

The CDR SDK is vendored at `lib/cdr-sdk/`. The app uses this path via the `@piplabs/cdr-sdk` TypeScript alias.

Source: [github.com/piplabs/cdr-sdk](https://github.com/piplabs/cdr-sdk)

To rebuild: clone the repo, run `pnpm install && pnpm build`, and copy the dist output to `lib/cdr-sdk/`.

---

## Project Structure

```
src/
  app/          — Next.js App Router pages and layouts
  components/   — UI components (Sidebar, WalletStatus, Cards, etc.)
    hero/       — 3D vault scene (React Three Fiber)
    ui/         — Primitive UI components (Button, Card, Badge, Input, Toast)
  lib/          — Utilities, constants, hooks, CDR helpers
  contracts/    — Solidity smart contracts (Forge)
  drizzle/      — Database schema and migrations
  scripts/      — CLI tools (backup/restore vault keys)
_project/       — Project documentation (litepaper, migration guides, etc.)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A wallet with IP tokens on Story Aeneid testnet ([faucet](https://aeneid.storyscan.xyz/faucet))
- A Privy account ([dashboard](https://privy.io)) — get your App ID
- A Supabase project ([dashboard](https://supabase.com)) — for the database
- A Pinata account ([dashboard](https://pinata.cloud)) — for IPFS storage

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm run start
```

### Environment Variables

Create `.env.local` in the project root:

```env
# Privy Auth
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Supabase Database (PostgreSQL direct connection)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Story Protocol (Aeneid Testnet)
NEXT_PUBLIC_STORY_RPC_URL=https://aeneid.storyrpc.io
NEXT_PUBLIC_STORY_CHAIN_ID=1315
NEXT_PUBLIC_STORY_EXPLORER=https://aeneid.storyscan.xyz

# Pinata IPFS Storage
PINATA_JWT=your-pinata-jwt

# CometBFT RPC (dev: HTTP fallback; production: MUST be HTTPS)
# NEXT_PUBLIC_COMET_RPC_URL=
```

> **For production (Vercel):** `DATABASE_URL` must use the **Supabase connection pooler** (port 6543) instead of direct connection (port 5432). See `_project/db-migration.md` for details.

---

## Data Recovery

Some vault data (encrypted data keys, IPFS CIDs) is **only stored in the database** and cannot be recovered from the blockchain. PromptVault ships with CLI scripts to export and restore that critical data — a safety net that ensures no vault is permanently lost even if the database is reset.

```bash
# Backup irrecoverable fields to a JSON file
npm run backup

# Restore from a backup file (e.g. after a database reset)
npm run restore backup-2026-05-17.json
```

Full instructions in `_project/db-migration.md`.

---

## Links

- **Live App** — [promptvaultcdr.vercel.app](https://promptvaultcdr.vercel.app)
- **Litepaper** — [`_project/funcionamiento.md`](https://github.com/Ankhzz/promptvault/blob/main/_project/funcionamiento.md) (architecture, flows, security, FAQ)
- **Story Protocol** — [story.foundation](https://story.foundation)
- **CDR SDK Docs** — [docs.story.foundation/developers/cdr-sdk/overview](https://docs.story.foundation/developers/cdr-sdk/overview)
- **Aeneid Explorer** — [aeneid.storyscan.xyz](https://aeneid.storyscan.xyz)
- **Testnet Faucet** — [aeneid.storyscan.xyz/faucet](https://aeneid.storyscan.xyz/faucet)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Built on [Story Protocol](https://story.foundation) · Powered by [CDR SDK](https://docs.story.foundation/developers/cdr-sdk/overview)
