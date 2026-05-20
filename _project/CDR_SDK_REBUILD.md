# CDR SDK Rebuild Guide

## Overview

CDR SDK is compiled from the official [piplabs/cdr-sdk](https://github.com/piplabs/cdr-sdk) repository and copied to `lib/cdr-sdk/` for use in PromptVault.

## Directory Structure

```
promptvault/
├── external/
│   └── cdr-sdk/              # Cloned repo (pnpm)
│       ├── packages/
│       │   ├── contracts/dist
│       │   ├── crypto/dist
│       │   └── sdk/dist
│       ├── sync-to-lib.sh    # Sync script
│       └── ...
└── lib/
    └── cdr-sdk/              # Compiled dist (used by app)
        ├── contracts/
        ├── crypto/
        └── sdk/
```

## Setup (One-Time)

```powershell
# 1. Create directories
New-Item -ItemType Directory -Force -Path "promptvault\external\cdr-sdk"
New-Item -ItemType Directory -Force -Path "promptvault\lib\cdr-sdk"

# 2. Clone repo
git clone https://github.com/piplabs/cdr-sdk.git external\cdr-sdk

# 3. Install dependencies
cd external\cdr-sdk
pnpm install

# 4. Fix TypeScript compatibility (if build fails)
pnpm add -wD @types/node@22 @types/lodash

# 5. Build
pnpm build
```

## Rebuild After Updates

```powershell
cd external\cdr-sdk

# Pull latest changes
git pull

# Reinstall and rebuild
pnpm install
pnpm build

# Sync dists to lib/cdr-sdk/
# (Run in Git Bash or WSL)
bash sync-to-lib.sh
```

### Manual Sync (Windows PowerShell)

If `sync-to-lib.sh` doesn't work on Windows, use PowerShell:

```powershell
$src = "E:\PROGRAMACION GENERAL\Proyectocdr\promptvault\external\cdr-sdk\packages"
$dest = "E:\PROGRAMACION GENERAL\Proyectocdr\promptvault\lib\cdr-sdk"

Remove-Item -Recurse -Force "$dest\*" -ErrorAction SilentlyContinue

Copy-Item -Recurse "$src\contracts\dist\*" "$dest\contracts\"
Copy-Item -Recurse "$src\crypto\dist\*" "$dest\crypto\"
Copy-Item -Recurse "$src\sdk\dist\*" "$dest\sdk\"
```

## Webpack Alias Configuration

The `next.config.ts` configures webpack aliases to resolve internal CDR SDK package references:

```typescript
config.resolve.alias = {
  "@piplabs/cdr-contracts": resolve(libPath, "contracts"),
  "@piplabs/cdr-crypto": resolve(libPath, "crypto"),
};
```

**Important:** Use `npm run build -- --webpack` to build with webpack (required for aliases).

## Troubleshooting

### Build fails with TS errors in node_modules/@types/node

```powershell
cd external/cdr-sdk
pnpm add -wD @types/node@22
pnpm build
```

### Build fails with "Cannot find type definition file for 'lodash'"

```powershell
cd external/cdr-sdk
pnpm add -wD @types/lodash
pnpm build
```

### Module not found errors after npm install

```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

### Next.js build fails with Turbopack error

Use `--webpack` flag explicitly:

```powershell
npm run build -- --webpack
```

## Files Created in PromptVault

| File | Purpose |
|------|---------|
| `next.config.ts` | Webpack aliases for CDR SDK packages |
| `src/lib/cdr.ts` | CDR condition helpers, encoding functions |
| `src/hooks/useCdrClient.ts` | CDRClient initialization + initWasm |
| `src/hooks/useCdrEncrypt.ts` | uploadVault() function |

## Next Steps

1. Fix project dependency issues (Privy/WalletConnect)
2. Test `useCdrClient` initialization
3. Test `useCdrEncrypt.uploadVault()` with real IP ID
4. Build `useCdrDecrypt` after confirming encrypt flow
5. Build `useLicenseToken` for Story Protocol license minting

## CDR SDK Docs

- [User Guide](https://github.com/piplabs/cdr-sdk/blob/main/USER_GUIDE.md)
- [Condition Contracts](https://github.com/piplabs/cdr-sdk/blob/main/docs/CONDITIONS.md)
- [Quick Start Example](https://github.com/piplabs/cdr-sdk#quick-start)