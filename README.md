# PromptVault

**Threshold-encrypted AI prompt vaults on Story Protocol — license-gated access with no single point of failure.**

Built for the [CDR Hackathon](https://docs.story.foundation/developers/cdr-sdk/overview), PromptVault lets creators encrypt their most valuable prompts and gate access behind on-chain conditions: license tokens, wallet ownership, or timelocks.

## How It Works

1. **Create a Vault** — Upload your prompt. Choose your access model (licensed, private, or timelocked).
2. **Encrypt** — A random 256-bit data key encrypts the content client-side. The data key is then threshold-encrypted to the CDR validator network.
3. **Gate** — On-chain conditions (license token mint, EOA check, or timelock) control who can request decryption.
4. **Access** — Authorized wallets submit a decryption request to the CDR network. Validators threshold-decrypt the data key, and the content is revealed.

No single entity holds the full key — security is distributed across the CDR validator set.

## Features

- **Licensed Vaults** — Register an IP Asset on Story Protocol. Mint license tokens that grant decryption access. Built-in marketplace for selling prompt collections.
- **Private Vaults** — Owner-only EOA access. Maximum privacy — only your wallet can decrypt.
- **Time-Locked Vaults** — On-chain smart contract enforces an unlock timestamp. Anyone can decrypt after the deadline.
- **3D Interactive Hero** — Procedural vault model rendered with React Three Fiber.
- **Wallet Dropdown** — Compact sidebar footer with network status, chain switching, copy address, and disconnect.
- **Dark / Light Theme** — Resend-inspired matte black UI with a light mode toggle.
- **Mobile Responsive** — Slide-out sidebar navigation on small screens.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (webpack) |
| Language | TypeScript |
| Auth & Wallet | Privy + Wagmi + Viem |
| UI | Tailwind CSS v4 + custom design tokens |
| 3D | React Three Fiber, Drei, Postprocessing |
| Database | PostgreSQL via Supabase (Drizzle ORM) |
| Encrypted Storage | Lighthouse IPFS |
| CDR SDK | `@piplabs/cdr-sdk` (threshold encryption) |
| Smart Contracts | Story Protocol Core SDK (IP registration, licensing) |
| Deployed Contracts | Aeneid testnet |

## Prerequisites

- Node.js 20+
- npm
- A wallet with IP tokens on Story Aeneid testnet ([faucet](https://aeneid.storyscan.xyz/faucet))
- A Privy account ([dashboard](https://privy.io)) — get your App ID
- A Supabase project ([dashboard](https://supabase.com)) — for the database
- A Lighthouse API key ([dashboard](https://files.lighthouse.storage)) — for IPFS storage

## Environment Variables

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

# Lighthouse IPFS Storage
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your-lighthouse-api-key

# CometBFT RPC (dev: HTTP fallback; production: MUST be HTTPS)
# NEXT_PUBLIC_COMET_RPC_URL=
```

> **For production (Vercel), `DATABASE_URL` must use the **Supabase connection pooler** (port 6543) instead of direct connection (port 5432). See `_project/db-migration.md` for details.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Database Backup & Restore

Some vault data (encrypted data keys, IPFS CIDs) is **only stored in the database** and cannot be recovered from the blockchain. These scripts export/restore that critical data.

```bash
# Backup irrecoverable fields to a JSON file
npm run backup

# Restore from a backup file (e.g. after a database reset)
npm run restore backup-2026-05-17.json
```

Full instructions in `_project/db-migration.md`.

## Contract Addresses (Aeneid Testnet)

| Contract | Address |
|---|---|
| SPG NFT Contract | `0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc` |
| License Token | `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC` |
| Licensing Module | `0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f` |
| PI License Template | `0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316` |
| WIP Token | `0x1514000000000000000000000000000000000000` |
| Owner Write Condition | `0x4C9bFC96d7092b590D497A191826C3dA2277c34B` |
| License Read Condition | `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3` |
| TimeLock Read Condition | `0x46161d99592C2b5148a8c2593cDa268E052982F5` |

## CDR SDK

The CDR SDK is vendored at `lib/cdr-sdk/`. The app uses this path via the `@piplabs/cdr-sdk` TypeScript alias.

Source: [github.com/piplabs/cdr-sdk](https://github.com/piplabs/cdr-sdk)

To rebuild: clone the repo, run `pnpm install && pnpm build`, and copy the dist output to `lib/cdr-sdk/`.

## Project Structure

```
src/
  app/              — Next.js App Router pages and layouts
  components/       — UI components (Sidebar, WalletStatus, Cards, etc.)
    hero/           — 3D vault scene (React Three Fiber)
    ui/             — Primitive UI components (Button, Card, Badge, Input, Toast)
  lib/              — Utilities, constants, hooks, CDR helpers
contracts/           — Solidity smart contracts (Forge)
drizzle/             — Database schema and migrations
scripts/             — CLI tools (backup/restore vault keys)
_project/            — Project documentation (migration guides, etc.)
```

---

Built on [Story Protocol](https://story.foundation) · [CDR SDK](https://docs.story.foundation/developers/cdr-sdk/overview)
