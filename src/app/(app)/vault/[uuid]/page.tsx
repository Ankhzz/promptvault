'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AuthGuard } from '@/components/AuthGuard'
import {
  ArrowLeftIcon,
  VaultIcon,
  ShieldIcon,
  KeyIcon,
  ExternalLinkIcon,
  CopyIcon,
  FileIcon,
  ActivityIcon,
  CheckIcon,
  DownloadIcon,
  EyeIcon,
  PricetagIcon,
  LockIcon,
  ClockIcon,
} from '@/components/Icons'
import { STORY_CHAIN, CONTRACTS, MUSDC_CONFIG } from '@/lib/constants'
import { toBigIntSafe } from '@/lib/math'
import { getVaultByUuid, getVaultLicenseTokens, getVaultActivity, getPurchase, purchaseVault, getVaultEncryptedDataKey, getPurchaseEncryptedDataKey } from '@/db/queries'
import { decryptFileFromBase64, type EncryptedFile } from '@/lib/encrypt-file'
import { decryptDataKeyForWallet, type EncryptedDataKey, type SignTypedDataFn, type SignMessageFn } from '@/lib/crypto/datakey-encryption'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, type Address, toHex } from 'viem'
import { useLicenseToken } from '@/hooks/useLicenseToken'
import { cn } from '@/lib/cn'
import { MUSDC_ABI, MARKETPLACE_ABI } from '@/lib/abis/musdc'
import { createPublicClient, http } from 'viem'

type VaultData = Awaited<ReturnType<typeof getVaultByUuid>>
type LicenseTokenData = Awaited<ReturnType<typeof getVaultLicenseTokens>>
type ActivityData = Awaited<ReturnType<typeof getVaultActivity>>

const DATAKEY_SESSION_PREFIX = 'pv-datakey-'

function sessionKey(uuid: number, address: string): string {
  return `${DATAKEY_SESSION_PREFIX}${address.toLowerCase()}-${uuid}`
}

const statusConfig: Record<string, { badge: 'accent' | 'default' | 'warning' | 'destructive'; label: string }> = {
  creating: { badge: 'warning', label: 'Creating' },
  active: { badge: 'accent', label: 'Active' },
  accessed: { badge: 'default', label: 'Accessed' },
  failed: { badge: 'destructive', label: 'Failed' },
}

type DecryptState = 'idle' | 'decrypting' | 'done' | 'error'
type PurchaseStep = 'idle' | 'approving' | 'purchasing' | 'minting' | 'finalizing' | 'redirecting' | 'done' | 'approve_failed' | 'purchase_failed' | 'mint_failed' | 'finalize_failed'

export default function VaultDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()

  const parsedUuid = parseInt(String(params.uuid), 10)
  const uuid = Number.isInteger(parsedUuid) && parsedUuid > 0 ? parsedUuid : NaN

  const [vault, setVault] = useState<VaultData | undefined>(undefined)
  const [licenses, setLicenses] = useState<LicenseTokenData>([])
  const [activityEntries, setActivityEntries] = useState<ActivityData>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const [decryptState, setDecryptState] = useState<DecryptState>('idle')
  const [decryptedFile, setDecryptedFile] = useState<File | null>(null)
  const [decryptedText, setDecryptedText] = useState<string | null>(null)
  const [decryptedObjectUrl, setDecryptedObjectUrl] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState<string | null>(null)
  const isDecryptingRef = useRef(false)
  const purchasingRef = useRef(false)
  const retryingFinalizeRef = useRef(false)

  const [hasPurchased, setHasPurchased] = useState(false)
  const [confirmingPurchase, setConfirmingPurchase] = useState(false)
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('idle')
  const purchaseStepRef = useRef<PurchaseStep>('idle')
  const [buyerLicenseTokenId, setBuyerLicenseTokenId] = useState<string | null>(null)
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const { mintLicenseToken, isReady: mintReady } = useLicenseToken()

  const address = wallets[0]?.address
  const isOwner = vault && address
    ? vault.ownerAddress.toLowerCase() === address.toLowerCase()
    : false
  const isPrivate = vault?.vaultType === 'private'
  const isTimeLocked = vault?.vaultType === 'timelocked'
  const isLocked = isTimeLocked && vault?.unlockTime && new Date(vault.unlockTime) > new Date()

  const needsPurchase = !isPrivate && !isTimeLocked && !!vault?.isForSale && !isOwner && !hasPurchased

  const purchaseBusy = purchaseStep === 'approving' || purchaseStep === 'purchasing' || purchaseStep === 'minting' || purchaseStep === 'finalizing' || purchaseStep === 'redirecting'

  const [hasSessionKey, setHasSessionKey] = useState(false)

  useEffect(() => {
    if (!uuid || Number.isNaN(uuid)) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getVaultByUuid(uuid),
      getVaultLicenseTokens(uuid),
      getVaultActivity(uuid),
    ])
      .then(([v, l, a]) => {
        setVault(v)
        setLicenses(l)
        setActivityEntries(a)
        if (v?.isForSale && address && v.ownerAddress.toLowerCase() !== address.toLowerCase()) {
          getPurchase(uuid, address).then(p => {
            setHasPurchased(!!p?.paid)
            if (p?.buyerLicenseTokenId) setBuyerLicenseTokenId(p.buyerLicenseTokenId)
          })
        }
      })
      .catch(() => { addToast({ title: 'Failed to load vault data', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [uuid, address])

  useEffect(() => {
    try {
      setHasSessionKey(!!(address && sessionStorage.getItem(sessionKey(uuid, address))))
    } catch {
      setHasSessionKey(false)
    }
  }, [uuid, address])

  useEffect(() => {
    return () => {
      if (decryptedObjectUrl) URL.revokeObjectURL(decryptedObjectUrl)
    }
  }, [decryptedObjectUrl])

  const handleDecrypt = useCallback(async () => {
    if (isDecryptingRef.current) return
    if (!vault?.ipfsCid || !vault?.encryptedFileMeta) {
      setDecryptError('No encrypted content found for this vault')
      setDecryptState('error')
      return
    }

    let keyHex: string | null = null
    try {
      keyHex = address ? sessionStorage.getItem(sessionKey(uuid, address)) : null
    } catch {
      keyHex = null
    }

    if (!keyHex && address) {
      try {
        isDecryptingRef.current = true
        setDecryptState('decrypting')
        addToast({ title: 'Recovering data key from backup...', variant: 'default' })

        const wallet = wallets[0]
        if (wallet) {
          const provider = await wallet.getEthereumProvider()
          const walletClient = createWalletClient({
            transport: custom(provider),
            account: wallet.address as Address,
          })

          const signTypedDataFn: SignTypedDataFn = async ({ domain, types, primaryType, message }) => {
            return walletClient.signTypedData({ domain, types, primaryType, message })
          }
          const signMessageFn: SignMessageFn = async (message) => {
            return walletClient.signMessage({ message })
          }

          const ownerCheck = vault.ownerAddress.toLowerCase() === address.toLowerCase()

          if (ownerCheck) {
            const ownerBackup = await getVaultEncryptedDataKey(uuid)
            if (ownerBackup?.encryptedDataKey) {
              const encrypted: EncryptedDataKey = JSON.parse(ownerBackup.encryptedDataKey)
              const dataKey = await decryptDataKeyForWallet(encrypted, signTypedDataFn, signMessageFn)
              keyHex = toHex(dataKey)
            }
          } else {
            const buyerBackup = await getPurchaseEncryptedDataKey(uuid, address)
            if (buyerBackup?.encryptedDataKey) {
              const encrypted: EncryptedDataKey = JSON.parse(buyerBackup.encryptedDataKey)
              const dataKey = await decryptDataKeyForWallet(encrypted, signTypedDataFn, signMessageFn)
              keyHex = toHex(dataKey)
            }
          }

          if (keyHex) {
            try {
              sessionStorage.setItem(sessionKey(uuid, address), keyHex)
              setHasSessionKey(true)
              addToast({ title: 'Data key recovered from backup!', variant: 'accent' })
            } catch {
              addToast({ title: 'Key recovered but session storage unavailable', description: 'Proceeding without cache', variant: 'warning' })
            }
          }
        }
      } catch {
        addToast({ title: 'Local recovery failed', description: 'Redirecting to unlock page', variant: 'warning' })
      } finally {
        isDecryptingRef.current = false
      }
    }

    if (!keyHex) {
      if (needsPurchase) {
        addToast({ title: 'Purchase required', description: 'Buy this vault first to access content', variant: 'warning' })
        return
      }
      addToast({ title: 'Key not found', description: 'Unlock the vault first to access content', variant: 'warning' })
      const params = new URLSearchParams({ vaultId: String(uuid) })
      const tokenId = buyerLicenseTokenId || vault.licenseTokenId
      if (tokenId) params.set('licenseTokenId', tokenId)
      router.push(`/unlock?${params}`)
      return
    }

    isDecryptingRef.current = true
    try {
      setDecryptState('decrypting')
      addToast({ title: 'Decrypting...', variant: 'default' })

      const meta = safelyParseMeta(vault.encryptedFileMeta)
      if (!meta) {
        throw new Error('Invalid encrypted file metadata')
      }
      const keyBytes = hexToBytes(keyHex)
      const file = await decryptFileFromBase64(meta, keyBytes)

      if (file.type.startsWith('text/') || file.type === 'application/json') {
        const text = await file.text()
        setDecryptedText(text)
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setDecryptedObjectUrl(url)
      }

      setDecryptedFile(file)
      setDecryptState('done')
      addToast({ title: 'Content decrypted', variant: 'accent' })
    } catch (err) {
      setDecryptState('error')
      setDecryptError(err instanceof Error ? err.message : 'Decryption failed')
      addToast({ title: 'Decryption failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      isDecryptingRef.current = false
    }
  }, [vault, uuid, addToast, router, needsPurchase, buyerLicenseTokenId, address, wallets])

  const handleDownload = useCallback(() => {
    if (!decryptedFile) return
    const url = decryptedObjectUrl ?? URL.createObjectURL(decryptedFile)
    const a = document.createElement('a')
    a.href = url
    a.download = decryptedFile.name
    a.click()
    if (!decryptedObjectUrl) URL.revokeObjectURL(url)
  }, [decryptedFile, decryptedObjectUrl])

  const handlePurchase = useCallback(async () => {
    if (purchasingRef.current) return
    if (!vault || !address) return

    if (hasPurchased && buyerLicenseTokenId) {
      setPurchaseStep('redirecting')
      addToast({ title: 'Redirecting to unlock...', variant: 'default' })
      const params = new URLSearchParams({ vaultId: String(vault.uuid) })
      params.set('licenseTokenId', buyerLicenseTokenId)
      router.push(`/unlock?${params}`)
      return
    }

    if (!mintReady) {
      addToast({ title: 'Wallet not ready', description: 'Wait for wallet connection and try again', variant: 'warning' })
      return
    }

    const wallet = wallets[0]
    if (!wallet) return

    purchasingRef.current = true

    const priceMusdc = vault.priceMusdc
    const hasMusdcPrice = !!priceMusdc && Number(priceMusdc) > 0

    try {
      if (hasMusdcPrice) {
        const provider = await wallet.getEthereumProvider()
        const walletClient = createWalletClient({
          transport: custom(provider),
          account: wallet.address as Address,
        })
        const publicClient = createPublicClient({
          transport: http(STORY_CHAIN.rpcUrl),
        })

        const priceWei = toBigIntSafe(priceMusdc)
        if (!priceWei) {
          addToast({ title: 'Invalid MUSDC price', description: 'Could not parse vault price', variant: 'destructive' })
          return
        }

        purchaseStepRef.current = 'approving'
        setPurchaseStep('approving')
        addToast({ title: 'Approving MUSDC...', description: 'Confirm the approval in your wallet', variant: 'default' })

        const currentAllowance = await publicClient.readContract({
          address: CONTRACTS.MUSDC_TOKEN,
          abi: MUSDC_ABI,
          functionName: 'allowance',
          args: [wallet.address as Address, CONTRACTS.MARKETPLACE],
        })

        if (currentAllowance < priceWei!) {
          const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')
          const approveTxHash = await walletClient.writeContract({
            address: CONTRACTS.MUSDC_TOKEN,
            abi: MUSDC_ABI,
            functionName: 'approve',
            args: [CONTRACTS.MARKETPLACE, maxUint256],
            account: wallet.address as Address,
            chain: { id: STORY_CHAIN.id, name: STORY_CHAIN.name, nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 }, rpcUrls: { default: { http: [STORY_CHAIN.rpcUrl] } } },
          })
          await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
          addToast({ title: 'MUSDC approved!', variant: 'accent' })
        } else {
          addToast({ title: 'MUSDC already approved', variant: 'default' })
        }

        purchaseStepRef.current = 'purchasing'
        setPurchaseStep('purchasing')
        addToast({ title: 'Purchasing via Marketplace...', description: 'Confirm the purchase in your wallet', variant: 'default' })

        const purchaseTxHash = await walletClient.writeContract({
          address: CONTRACTS.MARKETPLACE,
          abi: MARKETPLACE_ABI,
          functionName: 'purchase',
          args: [BigInt(vault.uuid), priceWei!, vault.ownerAddress as Address],
          account: wallet.address as Address,
          chain: { id: STORY_CHAIN.id, name: STORY_CHAIN.name, nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 }, rpcUrls: { default: { http: [STORY_CHAIN.rpcUrl] } } },
        })
        await publicClient.waitForTransactionReceipt({ hash: purchaseTxHash })
        addToast({ title: 'MUSDC payment successful!', variant: 'accent' })
      }

      if (!vault.licenseTermsId) {
        purchaseStepRef.current = 'mint_failed'
        setPurchaseStep('mint_failed')
        addToast({ title: 'License terms not found', description: 'This vault has no license terms configured', variant: 'destructive' })
        return
      }

      purchaseStepRef.current = 'minting'
      setPurchaseStep('minting')
      addToast({ title: 'Minting license token...', description: 'Confirm the transaction in your wallet', variant: 'default' })

      const mintResult = await mintLicenseToken({
        licensorIpId: vault.ipId as `0x${string}`,
        licenseTermsId: vault.licenseTermsId,
        amount: 1,
        receiver: address as `0x${string}`,
      })

      if (!mintResult.success || !mintResult.licenseTokenId) {
        setPurchaseStep('mint_failed')
        addToast({ title: 'License mint failed', description: mintResult.error || 'Transaction reverted', variant: 'destructive' })
        return
      }

      const tokenIdStr = mintResult.licenseTokenId.toString()
      const txHash = mintResult.txHash ?? ''
      setBuyerLicenseTokenId(tokenIdStr)
      setMintTxHash(txHash)

      purchaseStepRef.current = 'finalizing'
      setPurchaseStep('finalizing')
      addToast({ title: 'Finalizing access...', description: 'Saving purchase record', variant: 'default' })

      await purchaseVault(vault.uuid, address, tokenIdStr, txHash)
      setHasPurchased(true)
      setConfirmingPurchase(false)

      setPurchaseStep('redirecting')
      addToast({ title: 'Purchase successful!', description: 'Redirecting to unlock...', variant: 'accent' })
      const params = new URLSearchParams({ vaultId: String(vault.uuid) })
      params.set('licenseTokenId', tokenIdStr)
      router.push(`/unlock?${params}`)
    } catch (err) {
      const currentStep = purchaseStepRef.current
      if (currentStep === 'finalizing' || (currentStep === 'minting' && buyerLicenseTokenId && mintTxHash)) {
        setPurchaseStep('finalize_failed')
        addToast({ title: 'DB save failed', description: 'License token minted but purchase record failed. Click Retry.', variant: 'warning' })
      } else if (currentStep === 'approving') {
        setPurchaseStep('approve_failed')
        addToast({ title: 'Approval failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
      } else if (currentStep === 'purchasing') {
        setPurchaseStep('purchase_failed')
        addToast({ title: 'Marketplace purchase failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
      } else {
        setPurchaseStep('mint_failed')
        addToast({ title: 'Purchase failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
      }
    } finally {
      purchasingRef.current = false
    }
  }, [vault, address, hasPurchased, buyerLicenseTokenId, mintTxHash, mintReady, mintLicenseToken, addToast, router, wallets])

  const handleRetryFinalize = useCallback(async () => {
    if (retryingFinalizeRef.current) return
    if (!vault || !address || !buyerLicenseTokenId || !mintTxHash) return
    retryingFinalizeRef.current = true
    try {
      setPurchaseStep('finalizing')
      addToast({ title: 'Retrying finalize...', variant: 'default' })
      await purchaseVault(vault.uuid, address, buyerLicenseTokenId, mintTxHash)
      setHasPurchased(true)
      setConfirmingPurchase(false)
      setPurchaseStep('redirecting')
      addToast({ title: 'Purchase successful!', description: 'Redirecting to unlock...', variant: 'accent' })
      const params = new URLSearchParams({ vaultId: String(vault.uuid) })
      params.set('licenseTokenId', buyerLicenseTokenId)
      router.push(`/unlock?${params}`)
    } catch {
      setPurchaseStep('finalize_failed')
      addToast({ title: 'DB save failed again', description: 'License token is minted. Try again later.', variant: 'destructive' })
    } finally {
      retryingFinalizeRef.current = false
    }
  }, [vault, address, buyerLicenseTokenId, mintTxHash, addToast, router])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (Number.isNaN(uuid)) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto animate-fade-in">
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <VaultIcon className="h-12 w-12 text-subtle mb-4" />
          <p className="text-muted text-sm">Invalid vault ID</p>
          <p className="text-subtle text-xs mt-1 mb-6">The URL must contain a positive integer vault ID</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>Back to Dashboard</Button>
        </Card>
        </div>
      </AppShell>
    )
  }

  if (!authenticated) {
    return (
      <AppShell>
        <AuthGuard>{null}</AuthGuard>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          <div className="h-8 w-48 bg-surface-active rounded-[6px] animate-pulse" />
          <div className="h-4 w-64 bg-surface-active rounded animate-pulse" />
          <div className="space-y-4">
            <div className="h-40 bg-surface-active rounded-2xl animate-pulse" />
            <div className="h-32 bg-surface-active rounded-2xl animate-pulse" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!vault) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto animate-fade-in">
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
            <VaultIcon className="h-12 w-12 text-subtle mb-4" />
            <p className="text-muted text-sm">Vault not found</p>
            <p className="text-subtle text-xs mt-1 mb-6">UUID {uuid} does not exist or you don't have access</p>
            <Button variant="outline" size="sm" onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </AppShell>
    )
  }

  const status = statusConfig[vault.status] || statusConfig.active
  const hasEncryptedKey = !!vault.encryptedDataKey
  const hasIpfsCid = !!vault.ipfsCid
  const canDecrypt = hasIpfsCid && !!vault.encryptedFileMeta && hasSessionKey

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/')}
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl tracking-tight truncate">
                {vault.name}
              </h1>
              <Badge variant={status.badge} dot>{status.label}</Badge>
      {isPrivate && (
          <Badge variant="default" dot>
            <LockIcon className="h-3 w-3 mr-0.5" />
            Private
          </Badge>
        )}
        {isTimeLocked && (
          <Badge variant={isLocked ? 'destructive' : 'accent'} dot>
            <ClockIcon className="h-3 w-3 mr-0.5" />
            {isLocked ? 'Locked' : 'Unlocked'}
          </Badge>
        )}
                {!isPrivate && !isTimeLocked && vault.isForSale && !isOwner && (
                  <Badge variant="accent" dot>
                    <PricetagIcon className="h-3 w-3 mr-0.5" />
                    For Sale · {vault.priceMusdc ? `${vault.priceMusdc} MUSDC` : formatPrice(vault.price)}
                  </Badge>
                )}
            </div>
            {vault.description && (
              <p className="mt-2 text-muted text-base">{vault.description}</p>
            )}
          </div>
        {isOwner && !hasSessionKey && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({ vaultId: String(vault.uuid) })
              if (!isPrivate && !isTimeLocked && vault.licenseTokenId) params.set('licenseTokenId', vault.licenseTokenId)
              router.push(`/unlock?${params}`)
            }}
          >
            Unlock
          </Button>
        )}
        {!isOwner && isPrivate && (
          <Badge variant="destructive" dot>
            <LockIcon className="h-3 w-3 mr-0.5" />
            Owner Only
          </Badge>
        )}
        {!isOwner && isTimeLocked && !isLocked && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({ vaultId: String(vault.uuid) })
              router.push(`/unlock?${params}`)
            }}
          >
            Unlock
          </Button>
        )}
        {!isOwner && isTimeLocked && isLocked && (
          <Badge variant="destructive" dot>
            <ClockIcon className="h-3 w-3 mr-0.5" />
            Locked
          </Badge>
        )}
        {(!isPrivate || isOwner) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({ vaultId: String(vault.uuid) })
              if (!isPrivate && !isTimeLocked && vault.licenseTokenId) params.set('licenseTokenId', vault.licenseTokenId)
              const url = `${window.location.origin}/unlock?${params}`
              navigator.clipboard.writeText(url)
              addToast({ title: 'Link copied!', description: 'Share this link to grant vault access', variant: 'accent' })
            }}
          >
            Share
          </Button>
        )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-accent" />
              <CardTitle>On-Chain Identity</CardTitle>
            </div>
      <CardDescription>
        {isPrivate
          ? 'Private vault — owner-only EOA access, no IP registration'
          : isTimeLocked
          ? 'Time-locked vault — on-chain condition enforces unlock time'
          : 'IP asset and licensing information on Story Protocol'}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <DetailRow label="Vault UUID" value={String(vault.uuid)} mono copyId="uuid" onCopy={copyToClipboard} copied={copied} />
      <DetailRow
        label="Vault Type"
        value={isPrivate ? 'Private (Owner-Only)' : isTimeLocked ? 'Time-Locked' : 'Licensed'}
      />
        {!isPrivate && !isTimeLocked && (
        <>
          <DetailRow
            label="IP Asset"
            value={vault.ipId || ''}
            mono
            copyId="ipId"
            onCopy={copyToClipboard}
            copied={copied}
            explorerUrl={`${STORY_CHAIN.explorer}/address/${vault.ipId}`}
          />
          <DetailRow label="License Terms" value={String(vault.licenseTermsId)} mono />
          {vault.licenseTokenId && (
            <DetailRow label="License Token" value={vault.licenseTokenId} mono copyId="licenseTokenId" onCopy={copyToClipboard} copied={copied} />
          )}
        </>
)}
      {isTimeLocked && vault.unlockTime && (
        <DetailRow
          label="Unlock Time"
          value={isLocked ? `${new Date(vault.unlockTime).toLocaleString()} (locked)` : `${new Date(vault.unlockTime).toLocaleString()} (unlocked)`}
        />
      )}
      <DetailRow
              label="Owner"
              value={vault.ownerAddress}
              mono
              copyId="owner"
              onCopy={copyToClipboard}
              copied={copied}
              explorerUrl={`${STORY_CHAIN.explorer}/address/${vault.ownerAddress}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-accent" />
              <CardTitle>Encryption & Storage</CardTitle>
            </div>
            <CardDescription>Data key protection and content storage status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted shrink-0">Encrypted Data Key</span>
              <Badge variant={hasEncryptedKey ? 'accent' : 'warning'} dot>
                {hasEncryptedKey ? 'Saved' : 'Not saved'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted shrink-0">IPFS Content</span>
              <Badge variant={hasIpfsCid ? 'accent' : 'outline'} dot>
                {hasIpfsCid ? 'Uploaded' : 'No content'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted shrink-0">Session Key</span>
              <Badge variant={hasSessionKey ? 'accent' : 'outline'} dot>
                {hasSessionKey ? 'Available' : 'Not loaded'}
              </Badge>
            </div>
            {hasIpfsCid && vault.ipfsCid && (
              <DetailRow
                label="IPFS CID"
                value={vault.ipfsCid}
                mono
                copyId="ipfsCid"
                onCopy={copyToClipboard}
                copied={copied}
                explorerUrl={`https://gateway.lighthouse.storage/ipfs/${vault.ipfsCid}`}
              />
            )}
            <DetailRow label="CDR UUID" value={String(vault.uuid)} mono />
            {vault.dataKeyEncryptionMeta && (
              <DetailRow label="Key Encryption" value={(safelyParseEncryptionMeta(vault.dataKeyEncryptionMeta))?.version === 2 ? 'EIP-712 (v2)' : 'personal_sign (v1)'} />
            )}
          </CardContent>
        </Card>

        {hasIpfsCid && vault.encryptedFileMeta && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-accent" />
                <CardTitle>Encrypted Content</CardTitle>
              </div>
        <CardDescription>
          {needsPurchase
            ? 'This vault is for sale — purchase required to access content'
            : decryptState === 'done'
            ? 'Content decrypted successfully'
            : hasSessionKey
            ? 'Ready to decrypt — data key available in session'
            : 'Unlock the vault first to decrypt content'}
        </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const meta: EncryptedFile | null = safelyParseMeta(vault.encryptedFileMeta)
                if (meta) {
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border px-3 py-2">
                        <p className="text-xs text-subtle">Original name</p>
                        <p className="text-sm font-medium truncate">{meta.originalName}</p>
                      </div>
                      <div className="rounded-lg border border-border px-3 py-2">
                        <p className="text-xs text-subtle">Type</p>
                        <p className="text-sm font-medium truncate">{meta.originalType || 'unknown'}</p>
                      </div>
                      <div className="rounded-lg border border-border px-3 py-2">
                        <p className="text-xs text-subtle">Size</p>
                        <p className="text-sm font-medium">{formatBytes(meta.originalSize)}</p>
                      </div>
                      <div className="rounded-lg border border-border px-3 py-2">
                        <p className="text-xs text-subtle">Chunks</p>
                        <p className="text-sm font-medium">{meta.chunks.length}</p>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

{decryptState === 'idle' && (
  <div className="flex gap-3">
    {needsPurchase ? (
      (() => {
                        if (purchaseStep === 'mint_failed') {
                          return (
                            <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
                              <p className="text-sm text-destructive">License token mint failed</p>
                              <Button variant="primary" size="sm" onClick={() => { setPurchaseStep('idle'); setConfirmingPurchase(true) }}>
                                Retry Purchase
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setPurchaseStep('idle')}>
                                Cancel
                              </Button>
                            </div>
                          )
                        }
                        if (purchaseStep === 'approve_failed') {
                          return (
                            <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
                              <p className="text-sm text-destructive">MUSDC approval failed</p>
                              <Button variant="primary" size="sm" onClick={() => { setPurchaseStep('idle'); setConfirmingPurchase(true) }}>
                                Retry Purchase
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setPurchaseStep('idle')}>
                                Cancel
                              </Button>
                            </div>
                          )
                        }
                        if (purchaseStep === 'purchase_failed') {
                          return (
                            <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
                              <p className="text-sm text-destructive">Marketplace purchase failed</p>
                              <Button variant="primary" size="sm" onClick={() => { setPurchaseStep('idle'); setConfirmingPurchase(true) }}>
                                Retry Purchase
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setPurchaseStep('idle')}>
                                Cancel
                              </Button>
                            </div>
                          )
                        }
                        if (purchaseStep === 'finalize_failed') {
          return (
            <div className="flex-1 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 space-y-2">
              <p className="text-sm text-warning">License token minted but purchase record failed</p>
              <Button variant="primary" size="sm" onClick={handleRetryFinalize}>
                Retry Finalize
              </Button>
            </div>
          )
        }
                        if (purchaseBusy) {
                          const vaultHasMusdcPrice = !!vault.priceMusdc && Number(vault.priceMusdc) > 0
                          const steps = [
                            ...(vaultHasMusdcPrice ? [
                              { key: 'approving', label: 'Approving MUSDC...' },
                              { key: 'purchasing', label: 'Purchasing via Marketplace...' },
                            ] : []),
                            { key: 'minting', label: 'Minting license token...' },
                            { key: 'finalizing', label: 'Finalizing access...' },
                            { key: 'redirecting', label: 'Redirecting to unlock...' },
                          ] as const
          return (
            <div className="flex-1 space-y-2 rounded-lg border border-border bg-surface px-4 py-3">
              {steps.map((s) => {
                const isActive = purchaseStep === s.key
                const isDone = steps.findIndex(x => x.key === purchaseStep) > steps.findIndex(x => x.key === s.key)
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckIcon className="h-4 w-4 text-accent shrink-0" />
                    ) : isActive ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border shrink-0" />
                    )}
                    <span className={cn('text-sm', isActive ? 'text-foreground' : isDone ? 'text-accent' : 'text-subtle')}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        }
                        if (confirmingPurchase) {
                          const priceLabel = vault.priceMusdc ? `${vault.priceMusdc} MUSDC` : formatPrice(vault.price)
                          const txDescription = vault.priceMusdc
                            ? 'You will sign 2-3 transactions: approve MUSDC, purchase via Marketplace, and mint a license token (gas required).'
                            : 'You will sign a transaction to mint a license token (gas required).'
                          return (
                            <div className="flex-1 space-y-3 rounded-lg border border-border bg-surface px-4 py-3">
                              <p className="text-sm text-muted">
                                Confirm purchase: <span className="font-medium text-foreground">{priceLabel}</span>
                                <span className="block text-xs text-subtle mt-1">{txDescription}</span>
                              </p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handlePurchase} disabled={purchaseBusy}>
                  {purchaseBusy ? 'Processing...' : 'Confirm Purchase'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingPurchase(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )
        }
                        return (
                          <Button variant="primary" size="md" onClick={() => setConfirmingPurchase(true)} className="flex-1">
                            <PricetagIcon className="h-4 w-4 mr-2" />
                            Buy & Unlock · {vault.priceMusdc ? `${vault.priceMusdc} MUSDC` : formatPrice(vault.price)}
                          </Button>
        )
      })()
    ) : hasSessionKey ? (
      <Button variant="primary" size="md" onClick={handleDecrypt} className="flex-1">
        <EyeIcon className="h-4 w-4 mr-2" />
        Decrypt & View
      </Button>
        ) : (
                  <Button variant="outline" size="md"
                    onClick={() => {
                      const params = new URLSearchParams({ vaultId: String(uuid) })
                      if (!isPrivate && !isTimeLocked) {
                        const tokenId = buyerLicenseTokenId || vault.licenseTokenId
                        if (tokenId) params.set('licenseTokenId', tokenId)
                      }
                      router.push(`/unlock?${params}`)
                    }}
                    className="flex-1"
                  >
                    Unlock Vault First
                  </Button>
    )}
  </div>
)}

              {decryptState === 'decrypting' && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="text-sm text-muted">Decrypting content...</span>
                </div>
              )}

              {decryptState === 'error' && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <p className="text-sm text-destructive">{decryptError}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => { setDecryptState('idle'); setDecryptError(null) }}>
                    Retry
                  </Button>
                </div>
              )}

              {decryptState === 'done' && decryptedFile && (
                <div className="space-y-4">
                  {decryptedText && (
                    <div className="rounded-lg border border-border bg-surface p-4 max-h-96 overflow-auto">
                      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words">
                        {decryptedText}
                      </pre>
                    </div>
                  )}
                  {decryptedObjectUrl && (
                    <div className="rounded-lg border border-border bg-surface p-4 flex items-center justify-center max-h-96 overflow-auto">
                      <img src={decryptedObjectUrl} alt={decryptedFile.name} className="max-w-full rounded" />
                    </div>
                  )}
                  {!decryptedText && !decryptedObjectUrl && (
                    <div className="rounded-lg border border-border bg-surface p-4 text-center">
                      <FileIcon className="h-8 w-8 text-subtle mx-auto mb-2" />
                      <p className="text-sm text-muted">{decryptedFile.name}</p>
                      <p className="text-xs text-subtle">{formatBytes(decryptedFile.size)}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="primary" size="md" onClick={handleDownload} className="flex-1">
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download {decryptedFile.name}
                    </Button>
                    <Button variant="outline" size="md" onClick={() => { setDecryptState('idle'); setDecryptedFile(null); setDecryptedText(null); if (decryptedObjectUrl) { URL.revokeObjectURL(decryptedObjectUrl); setDecryptedObjectUrl(null) } }}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-accent" />
              <CardTitle>Transactions</CardTitle>
            </div>
            <CardDescription>On-chain transaction history for this vault</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {vault.registerTxHash && (
              <DetailRow
                label="IP Registration"
                value={vault.registerTxHash}
                mono
                copyId="registerTx"
                onCopy={copyToClipboard}
                copied={copied}
                explorerUrl={`${STORY_CHAIN.explorer}/tx/${vault.registerTxHash}`}
              />
            )}
            {vault.mintTxHash && (
              <DetailRow
                label="License Mint"
                value={vault.mintTxHash}
                mono
                copyId="mintTx"
                onCopy={copyToClipboard}
                copied={copied}
                explorerUrl={`${STORY_CHAIN.explorer}/tx/${vault.mintTxHash}`}
              />
            )}
            {vault.allocateTxHash && (
              <DetailRow
                label="CDR Allocate"
                value={vault.allocateTxHash}
                mono
                copyId="allocateTx"
                onCopy={copyToClipboard}
                copied={copied}
                explorerUrl={`${STORY_CHAIN.explorer}/tx/${vault.allocateTxHash}`}
              />
            )}
            {vault.writeTxHash && (
              <DetailRow
                label="CDR Write"
                value={vault.writeTxHash}
                mono
                copyId="writeTx"
                onCopy={copyToClipboard}
                copied={copied}
                explorerUrl={`${STORY_CHAIN.explorer}/tx/${vault.writeTxHash}`}
              />
            )}
            {activityEntries.length > 0 && (
              <>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-subtle font-medium uppercase tracking-wider mb-3">Access Log</p>
                </div>
                {activityEntries.map((entry: ActivityData[number]) => (
                  <div key={entry.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.type === 'vault_created' ? 'accent' : entry.type === 'license_minted' ? 'info' : 'default'} dot>
                        {entry.type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-subtle">
                        {entry.createdAt instanceof Date
                          ? entry.createdAt.toLocaleDateString()
                          : new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {entry.txHash && (
                      <a
                        href={`${STORY_CHAIN.explorer}/tx/${entry.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-subtle hover:text-accent transition-colors truncate max-w-[200px]"
                      >
                        {entry.txHash}
                      </a>
                    )}
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {!isPrivate && !isTimeLocked && licenses.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-accent" />
                <CardTitle>License Tokens</CardTitle>
              </div>
              <CardDescription>Tokens granting access to this vault's content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {licenses.map((license: LicenseTokenData[number]) => (
                <div key={license.tokenId} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground font-mono truncate">
                      Token #{license.tokenId}
                    </p>
                    <p className="text-xs text-subtle mt-0.5 font-mono truncate">
                      {license.ownerAddress}
                    </p>
                  </div>
                  <Badge variant={license.status === 'active' ? 'accent' : 'destructive'} dot>
                    {license.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between text-xs text-subtle pt-2 pb-8">
          <span>
            Created {vault.createdAt instanceof Date
              ? vault.createdAt.toLocaleDateString()
              : new Date(vault.createdAt).toLocaleDateString()}
          </span>
          {vault.updatedAt && (
            <span>
              Updated {vault.updatedAt instanceof Date
                ? vault.updatedAt.toLocaleDateString()
                : new Date(vault.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function DetailRow({
  label,
  value,
  mono,
  copyId,
  onCopy,
  copied,
  explorerUrl,
}: {
  label: string
  value: string
  mono?: boolean
  copyId?: string
  onCopy?: (text: string, id: string) => void
  copied?: string | null
  explorerUrl?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'text-right truncate max-w-[320px] hover:text-accent transition-colors',
              mono ? 'font-mono text-xs' : 'text-sm',
              'text-foreground',
            )}
          >
            {value}
          </a>
        ) : (
          <span className={cn('text-right truncate max-w-[320px]', mono ? 'font-mono text-xs' : 'text-sm', 'text-foreground')}>
            {value}
          </span>
        )}
        {copyId && onCopy && (
          <button
            onClick={() => onCopy(value, copyId)}
            className="shrink-0 text-subtle hover:text-accent transition-colors"
          >
            {copied === copyId ? (
              <CheckIcon className="h-3.5 w-3.5 text-accent" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-subtle hover:text-accent transition-colors"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function safelyParseMeta(raw: string): EncryptedFile | null {
  try {
    return JSON.parse(raw) as EncryptedFile
  } catch {
    return null
  }
}

function safelyParseEncryptionMeta(raw: string): { version?: number } | null {
  try {
    return JSON.parse(raw) as { version?: number }
  } catch {
    return null
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatPrice(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`Invalid hex string: length=${clean.length}`)
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
  }
  return bytes
}
