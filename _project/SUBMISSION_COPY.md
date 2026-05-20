# Hackathon Submission Copy

---

## Title
PromptVault — Threshold-Encrypted AI Prompt Vaults

## Tagline
Protect your AI prompts with distributed key security and on-chain access control on Story Protocol.

## Description

PromptVault lets prompt engineers and AI creators encrypt their most valuable prompts using the CDR (Confidential Data Rails) SDK on Story Protocol. Instead of trusting a single server with your intellectual property, the encryption key is threshold-protected across the CDR validator network — no single entity can decrypt without authorization.

### How it works

1. **Create a Vault** — Upload your prompt content and choose an access control model.
2. **Encrypt** — A random 256-bit data key encrypts the content client-side in the browser. The data key is then threshold-encrypted to the CDR validator set using Shamir's Secret Sharing.
3. **Gate** — On-chain conditions are enforced via pre-deployed smart contracts:
   - **Licensed Vaults**: Register an IP Asset on Story → mint license tokens → only token holders can decrypt.
   - **Private Vaults**: Owner-only EOA address check — maximum privacy.
   - **Time-Locked Vaults**: A dedicated TimeLockReadCondition contract enforces an unlock timestamp on-chain.
4. **Access** — Authorized wallets submit a decryption request to the CDR network. Validators threshold-decrypt the data key and return it to the client, which decrypts the content locally.

### Key Features

- **Threshold Encryption**: No single point of failure. The CDR validator network holds shards of the key — no single validator can decrypt alone.
- **On-Chain Access Control**: Three vault types with different gating mechanisms, all enforced by Story Protocol smart contracts.
- **Resend-Inspired UI**: Matte black design system with dark/light theme, 3D interactive vault hero, and responsive sidebar navigation.
- **Wallet-first UX**: Privy-based authentication with a compact dropdown wallet menu showing network status, chain switching, and disconnect.
- **IPFS Storage**: Encrypted content is stored on IPFS via Lighthouse, with the CID stored on-chain.

### Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4
- **Auth & Wallets**: Privy, Wagmi, Viem
- **3D**: React Three Fiber, Drei, Postprocessing
- **CDR**: @piplabs/cdr-sdk (threshold encryption)
- **Story Protocol**: Core SDK (IP registration, licensing)
- **Database**: SQLite via Drizzle ORM
- **Storage**: Lighthouse IPFS

### Smart Contracts (Aeneid Testnet)

- OwnerWriteCondition: `0x4C9bFC96d7092b590D497A191826C3dA2277c34B`
- LicenseReadCondition: `0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3`
- TimeLockReadCondition: `0x46161d99592C2b5148a8c2593cDa268E052982F5`
- LicenseToken: `0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC`

## Links

- Live Demo: https://promptvault.vercel.app
- Source Code: [GitHub URL]
- CDR SDK Docs: https://docs.story.foundation/developers/cdr-sdk/overview

## Screenshots

(see SCREENSHOTS.md for details)
