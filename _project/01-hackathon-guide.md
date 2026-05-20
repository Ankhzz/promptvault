# CDR Hackathon Guide

> **Virtual Hackathon** · May 27 → June 5, 2026 · $3,000 in prizes
> Build with Story's **Confidential Data Rails (CDR)**
> Registration: https://luma.com/kjdzir6d
> Discord: https://discord.gg/storybuilders

---

## 1. Schedule

| Date | Event |
|------|-------|
| **May 14** | Hackathon Announced |
| **May 27** | Opening Ceremony (10:00 AM ET / 11:00 PM KST) |
| **May 27** | "What is CDR" Workshop — Ramtin Seraj (10:30 AM ET) |
| **May 28** | Developing with CDR: 한국어 — Jongwon Park (7:00 AM ET / 8:00 PM KST) |
| **May 28** | Developing with CDR: English — Jacob Tucker (11:00 AM ET) |
| **June 3** | Projects Due |
| **June 4** | Judging Complete |
| **June 5** | Demo Day |

Workshops are live on YouTube + X. Subscribe to [Google Calendar](https://calendar.google.com/calendar/u/0?cid=Y19jNTY0ZmQ2YWI2OTZlMzcyNjZlZTg0NTNmM2NkYWYwZTNmMjhmMmNlNGUxZmRiZTNkNzFmYzhiNTg1N2UxNTJjQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20).

---

## 2. Prizes & Tracks

**Total pool: $3,000 USD** — A project can win in both tracks.

### Track A: Technical Implementation ($1,000)
Push what's possible with read/write conditions, on-chain logic, and dynamic permissioning.

**Judging criteria:**
- Advanced read/write conditions (multi-sig, time-based, multi-step)
- Smart contracts enforcing complex or conditional access
- Composable vault systems interacting with other contracts
- Trustless data exchange using CDR vaults
- New patterns for programmable or dynamic permissions

### Track B: Best CDR Application ($1,000 first + $1,000 runner-up)
The best-executed product idea built on CDR.

**Judging criteria:**
- Quality and polish of the application itself
- Real traction across Twitter, the app, and LinkedIn
- Evidence that real users actually want it — not just a demo
- End-to-end UX that someone would actually use twice

---

## 3. How to Participate

| Step | Action |
|------|--------|
| **01** | **Register** on [Luma](https://luma.com/kjdzir6d) — you'll be added to the shared calendar |
| **02** | **Join the Discord** — team formation, Q&A, mentor support, submissions |
| **03** | **Tune into workshops** — May 27→28, live on YouTube + X |
| **04** | **Ship + submit** — build with your team, post progress, submit by June 3 |

---

## 4. The 6 Starter Ideas

> "These are vibe checks, not a menu. The most surprising builds tend to win."

### Idea 01: On-chain Private Storage
Stash anything secret on-chain. Wallet recovery, dead-man switches, time-locked notes: your call.

**CDR capabilities used:** EOA read conditions, owner-only vaults
**Key insight:** Simple access control — who can read, when can they read
**Expansions:**
- Social recovery for wallets (N-of-M guardians each hold a shard)
- Dead-man switch (if wallet inactive for X days, heirs can decrypt)
- Time capsule (content unlocks at a specific block height or timestamp)
- Inheritance vaults with multi-sig beneficiary approval

### Idea 02: Data Marketplace
Atomic swaps for private data. Pay → unlock. Subscriptions and recurring access on the house.

**CDR capabilities used:** License-gated reads, payment integration
**Key insight:** Data as a tradeable asset with instant settlement
**Expansions:**
- Pay-per-view datasets (AI training data, financial models, research)
- Recurring subscription vaults (time-based read conditions + ERC-20 streaming payments)
- Data bundles with tiered pricing
- Resale markets for data access rights

### Idea 03: Confidential Query Marketplace
Query a dataset without ever seeing it. Fraud checks, private AI inference, medical lookups.

**CDR capabilities used:** TEE compute + encrypted data in vaults
**Key insight:** Data stays private; only the query result is revealed
**Expansions:**
- KYC/AML verification without exposing PII
- Credit scoring with private financial history
- Medical diagnosis queries against private health records
- AI model inference on private data (the prompt stays hidden from the model owner)
- Zero-knowledge proof verification gates

### Idea 04: Agent-to-Agent Data Deals
Agents negotiate over a dataset, settle on a price, mint a license, pay, and the data unlocks: all without a human in the loop.

**CDR capabilities used:** License-gated reads + Story IP + autonomous agents
**Key insight:** Fully automated data economy between AI agents
**Expansions:**
- AI training data marketplaces (agents bid on datasets)
- Automated content licensing between creator agents and remixer agents
- DAO-to-DAO data sharing agreements
- Oracles negotiating data freshness SLAs
- Multi-agent negotiation rounds with privacy-preserving bids

### Idea 05: Autonomous Objects
Self-governing on-chain agents with private brains. An ETF that won't tell you its strategy.

**CDR capabilities used:** Vaults as private state + smart contract governance
**Key insight:** On-chain entities with confidential internal logic
**Expansions:**
- Trading bots with secret alpha strategies (verifiable execution, hidden logic)
- DAOs with confidential voting and private treasury allocations
- Autonomous worlds / on-chain games with hidden map state revealed by CDR
- Private DAO treasuries with programmable spending conditions
- Prediction markets where certain data sources are paid and confidential

### Idea 06: Go Weirder
These are vibe checks, not a menu. The most surprising builds tend to win. We dare you.

**Key insight:** CDR is a primitive — combine it in unexpected ways
**Provocations:**
- What if encrypted content is a reward for on-chain achievements?
- What if your private data earns yield while being queried?
- What if CDR vaults are used for trustless escrow in P2P marketplaces?
- What if you build "unlockable lore" for NFT collections?
- What if CDR enables truly private social networks?
- What if CDR + AI = private, personalized agents that own their context?

---

## 5. Live Examples (Already Built on CDR)

### Scroll (onscroll.app)
**Type:** Reader · Publisher platform

Share text snippets with embedded unlockables — content gated by CDR. Readers pay to unlock a hidden line, paragraph, or asset; the access logic runs on-chain. No trusted middleman.

**Features:**
- Programmable access per unlockable
- On-chain content that other apps can reference
- Polished read + publish experience, not just a demo

**CDR patterns:** EOA-gated owner writes, license/payment-gated reads

---

### AI Negotiate (cdr-ai-negotiate-web.vercel.app)
**Type:** Agent-to-agent demo

Two AI agents discover each other, negotiate a price for a private dataset, settle on-chain, and unlock the data: no human in the loop. A2A + AP2 + CDR working together.

**Features:**
- Buyer and seller agents handshake over A2A
- Signed payment mandate via AP2
- License mints on-chain; the vault decrypts on settlement

**CDR patterns:** License-gated reads, payment settlement triggering decryption

---

## 6. Resources for Building

| # | Resource | URL |
|---|----------|-----|
| 01 | CDR SDK Docs | https://docs.story.foundation/developers/cdr-sdk/overview |
| 02 | CDR Agent Skill + Examples | https://github.com/jacob-tucker/cdr-skill |
| 03 | Live Demo | https://usecdr.dev |
| 04 | App Example: Scroll | https://onscroll.app |
| 05 | CDR Whitepaper | https://www.story.foundation/blog/confidential-data-rails |
| 06 | Launch Blog | https://www.story.foundation/blog/cdr-on-testnet-a-new-way-to-use-sensitive-data-without-exposing-it |
| 07 | Story Builder Discord | https://discord.gg/storybuilders |

---

## 7. Speakers

| Speaker | Role |
|---------|------|
| **Jacob Tucker** | Story · Opening Ceremony + English dev workshop |
| **Ramtin Seraj** | Co-author of CDR · "What is CDR" workshop |
| **Jongwon Park** | Story · Korean dev workshop (한국어) |

---

## 8. Key Constraints to Keep in Mind

- **Aeneid testnet only** — not prod, don't put real secrets in
- **~1KB inline data cap** — larger payloads require IPFS/Helia flow
- **Node 22+** for file operations
- **pnpm required** (SDK uses workspace protocol)
- **EOA conditions need `skipConditionValidation`**
- **Only 2 deployed condition contracts:** `OwnerWriteCondition` + `LicenseReadCondition`
- **Custom conditions require deploying your own condition contract**
- **Must call `initWasm()` before any encrypt/decrypt**
