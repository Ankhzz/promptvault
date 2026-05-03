'use client'

import { useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { UnlockIcon, KeyIcon, CheckIcon, CopyIcon } from '@/components/Icons'
import { AuthGuard } from '@/components/AuthGuard'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { STORY_CHAIN, CDR_CONFIG, getCometRpcUrl } from '@/lib/constants'
import { CDR_CONDITIONS, encodeAccessAuxData } from '@/lib/cdr'
import { initWasm, CDRClient } from '@piplabs/cdr-sdk'
import { createPublicClient, createWalletClient, custom, http, type Address, toHex } from 'viem'
import { recordVaultAccess, getVaultEncryptedDataKey } from '@/db/queries'
import {
  decryptDataKeyForWallet,
  EIP712_DOMAIN,
  EIP712_TYPES,
  EIP712_PRIMARY_TYPE,
  buildEIP712Message,
  type EncryptedDataKey,
  type SignTypedDataFn,
} from '@/lib/crypto/datakey-encryption'
import { parseTxError } from '@/lib/parseTxError'

type AccessState = 'idle' | 'accessing' | 'done'
type UnlockMethod = 'cdr_threshold' | 'local_recovery'

const DATAKEY_SESSION_PREFIX = 'pv-datakey-'

export default function UnlockVaultPage() {
  return (
    <Suspense>
      <UnlockVaultContent />
    </Suspense>
  )
}

function UnlockVaultContent() {
  const { authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [vaultUuid, setVaultUuid] = useState(searchParams.get('vault') ?? '')
  const [licenseTokenId, setLicenseTokenId] = useState('')
  const [state, setState] = useState<AccessState>('idle')
  const [recoveredKey, setRecoveredKey] = useState<string | null>(null)
  const [readTxHash, setReadTxHash] = useState<string | null>(null)
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod | null>(null)
  const isAccessingRef = useRef(false)

  const storeKeyAndFinish = useCallback((keyHex: string, uuid: number, method: UnlockMethod, txHash?: string) => {
    let keyStored = false
    try {
      sessionStorage.setItem(`${DATAKEY_SESSION_PREFIX}${uuid}`, keyHex)
      keyStored = sessionStorage.getItem(`${DATAKEY_SESSION_PREFIX}${uuid}`) === keyHex
    } catch {}

    if (!keyStored) {
      addToast({
        title: 'Session storage unavailable',
        description: 'Copy your data key now — it won\'t persist after navigation. Try a different browser or disable private browsing.',
        variant: 'warning',
      })
    }

    setRecoveredKey(keyHex)
    setReadTxHash(txHash ?? null)
    setUnlockMethod(method)
    setState('done')
  }, [addToast])

  const accessVaultCDR = useCallback(async () => {
    if (isAccessingRef.current) return
    if (!vaultUuid || !licenseTokenId) {
      addToast({ title: 'Missing fields', description: 'Enter both Vault UUID and License Token ID', variant: 'warning' })
      return
    }

    const clients = await getWalletClients(wallets)
    if (!clients) {
      addToast({ title: 'Wallet not connected', variant: 'destructive' })
      return
    }

    isAccessingRef.current = true
    try {
      setState('accessing')
      addToast({ title: 'Accessing vault...', description: 'Collecting decryption partials (may take 30-90s)', variant: 'default' })

      await initWasm()

      const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) })
      const cdrClient = new CDRClient({
        network: CDR_CONFIG.network,
        publicClient,
        walletClient: clients.walletClient,
        cometRpcUrl: getCometRpcUrl(),
        validationRpcUrls: [CDR_CONFIG.validationRpcUrl],
      })

      const accessAuxData = encodeAccessAuxData(BigInt(licenseTokenId))

      const result = await cdrClient.consumer.accessCDR({
        uuid: Number(vaultUuid),
        accessAuxData,
        timeoutMs: 120_000,
      })

      const keyHex = toHex(result.dataKey)
      storeKeyAndFinish(keyHex, Number(vaultUuid), 'cdr_threshold', result.txHash ?? undefined)
      addToast({ title: 'Vault unlocked!', description: 'Data key recovered via CDR threshold', variant: 'accent' })

      recordVaultAccess({
        vaultUuid: Number(vaultUuid),
        walletAddress: clients.address,
        txHash: result.txHash ?? undefined,
      }).catch(() => {})
    } catch (err) {
      const parsed = parseTxError(err)
      setState('idle')
      addToast({ title: parsed.title, description: parsed.description, variant: parsed.variant })
    } finally {
      isAccessingRef.current = false
    }
  }, [vaultUuid, licenseTokenId, wallets, addToast, storeKeyAndFinish])

  const accessVaultLocal = useCallback(async () => {
    if (isAccessingRef.current) return
    if (!vaultUuid) {
      addToast({ title: 'Missing Vault UUID', variant: 'warning' })
      return
    }

    const clients = await getWalletClients(wallets)
    if (!clients) {
      addToast({ title: 'Wallet not connected', variant: 'destructive' })
      return
    }

    isAccessingRef.current = true
    try {
      setState('accessing')
      addToast({ title: 'Recovering data key locally...', description: 'Using your encrypted data key backup', variant: 'default' })

      const vaultData = await getVaultEncryptedDataKey(Number(vaultUuid))
      if (!vaultData?.encryptedDataKey) {
        setState('idle')
        addToast({ title: 'No local key backup', description: 'This vault has no encrypted data key stored. Use CDR threshold unlock instead.', variant: 'warning' })
        return
      }

      if (vaultData.ownerAddress.toLowerCase() !== clients.address.toLowerCase()) {
        setState('idle')
        addToast({ title: 'Not vault owner', description: 'Local recovery is only available for the vault owner', variant: 'destructive' })
        return
      }

      const encrypted: EncryptedDataKey = JSON.parse(vaultData.encryptedDataKey)

      const signTypedDataFn: SignTypedDataFn = async ({ domain, types, primaryType, message }) => {
        return clients.walletClient.signTypedData({
          domain,
          types,
          primaryType,
          message,
        })
      }

      const dataKey = await decryptDataKeyForWallet(encrypted, signTypedDataFn)
      const keyHex = toHex(dataKey)
      storeKeyAndFinish(keyHex, Number(vaultUuid), 'local_recovery')
      addToast({ title: 'Vault unlocked!', description: 'Data key recovered from local backup', variant: 'accent' })

      recordVaultAccess({
        vaultUuid: Number(vaultUuid),
        walletAddress: clients.address,
      }).catch(() => {})
    } catch (err) {
      const parsed = parseTxError(err)
      setState('idle')
      addToast({ title: parsed.title, description: parsed.description, variant: parsed.variant })
    } finally {
      isAccessingRef.current = false
    }
  }, [vaultUuid, wallets, addToast, storeKeyAndFinish])

  if (!authenticated) {
    return (
      <AppShell>
        <AuthGuard>{null}</AuthGuard>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Unlock Vault</h1>
          <p className="mt-2 text-muted text-base">
            Access encrypted content using a valid license token or recover from your local backup.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-accent" />
              <CardTitle>Vault Credentials</CardTitle>
            </div>
            <CardDescription>Provide the vault UUID and your license token ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Vault UUID"
              placeholder="e.g. 1044"
              value={vaultUuid}
              onChange={(e) => setVaultUuid(e.target.value)}
              disabled={state === 'accessing'}
              mono
            />
            <Input
              label="License Token ID"
              placeholder="e.g. 72508"
              value={licenseTokenId}
              onChange={(e) => setLicenseTokenId(e.target.value)}
              disabled={state === 'accessing'}
              mono
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={accessVaultCDR}
              loading={state === 'accessing'}
              disabled={state === 'accessing'}
              className="w-full"
            >
              {state === 'accessing' ? 'Decrypting...' : 'Unlock via CDR Network'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={accessVaultLocal}
              disabled={state === 'accessing'}
              className="w-full"
            >
              Recover from Local Backup
            </Button>
          </CardFooter>
        </Card>

        {state === 'done' && recoveredKey && (
          <Card glow className="animate-fade-in-scale">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-accent" />
                <CardTitle className="text-accent">Vault Unlocked</CardTitle>
              </div>
              <CardDescription>
                {unlockMethod === 'cdr_threshold'
                  ? 'Data key recovered from CDR validator network'
                  : 'Data key recovered from local encrypted backup'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">Data Key</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-foreground bg-background rounded px-2 py-1 max-w-[280px] truncate">
                    {recoveredKey}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(recoveredKey)}
                    className="text-subtle hover:text-accent transition-colors"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {readTxHash && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted">Read Tx</span>
                  <a
                    href={`${STORY_CHAIN.explorer}/tx/${readTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-accent hover:underline truncate max-w-[280px]"
                  >
                    {readTxHash}
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">Method</span>
                <Badge variant={unlockMethod === 'cdr_threshold' ? 'accent' : 'default'} dot>
                  {unlockMethod === 'cdr_threshold' ? 'CDR Threshold' : 'Local Recovery'}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Badge variant="accent" dot>Decrypted</Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/vault/${vaultUuid}`)}
              >
                View Vault
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

async function getWalletClients(wallets: any[]) {
  if (wallets.length === 0) return null
  const wallet = wallets[0]
  const provider = await wallet.getEthereumProvider()
  const walletClient = createWalletClient({
    transport: custom(provider),
    account: wallet.address as Address,
  })
  return { walletClient, address: wallet.address as Address }
}
