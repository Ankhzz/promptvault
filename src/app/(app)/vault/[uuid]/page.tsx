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
} from '@/components/Icons'
import { STORY_CHAIN } from '@/lib/constants'
import { getVaultByUuid, getVaultLicenseTokens, getVaultActivity } from '@/db/queries'
import { decryptFileFromBase64, type EncryptedFile } from '@/lib/encrypt-file'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { cn } from '@/lib/cn'

type VaultData = Awaited<ReturnType<typeof getVaultByUuid>>
type LicenseTokenData = Awaited<ReturnType<typeof getVaultLicenseTokens>>
type ActivityData = Awaited<ReturnType<typeof getVaultActivity>>

const DATAKEY_SESSION_PREFIX = 'pv-datakey-'

const statusConfig: Record<string, { badge: 'accent' | 'default' | 'warning' | 'destructive'; label: string }> = {
  creating: { badge: 'warning', label: 'Creating' },
  active: { badge: 'accent', label: 'Active' },
  accessed: { badge: 'default', label: 'Accessed' },
  failed: { badge: 'destructive', label: 'Failed' },
}

type DecryptState = 'idle' | 'decrypting' | 'done' | 'error'

export default function VaultDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()

  const uuid = Number(params.uuid)

  const [vault, setVault] = useState<VaultData>(undefined)
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

  const address = wallets[0]?.address
  const isOwner = vault && address
    ? vault.ownerAddress.toLowerCase() === address.toLowerCase()
    : false

  const hasSessionKey = typeof window !== 'undefined'
    ? !!sessionStorage.getItem(`${DATAKEY_SESSION_PREFIX}${uuid}`)
    : false

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
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

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

    const keyHex = sessionStorage.getItem(`${DATAKEY_SESSION_PREFIX}${uuid}`)
    if (!keyHex) {
      addToast({ title: 'Key not found', description: 'Unlock the vault first to access content', variant: 'warning' })
      router.push(`/unlock?vault=${uuid}`)
      return
    }

    isDecryptingRef.current = true
    try {
      setDecryptState('decrypting')
      addToast({ title: 'Decrypting...', variant: 'default' })

      const meta: EncryptedFile = JSON.parse(vault.encryptedFileMeta)
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
  }, [vault, uuid, addToast, router])

  const handleDownload = useCallback(() => {
    if (!decryptedFile) return
    const url = decryptedObjectUrl ?? URL.createObjectURL(decryptedFile)
    const a = document.createElement('a')
    a.href = url
    a.download = decryptedFile.name
    a.click()
    if (!decryptedObjectUrl) URL.revokeObjectURL(url)
  }, [decryptedFile, decryptedObjectUrl])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!authenticated) {
    return (
      <AppShell>
        <AuthGuard>{null}</AuthGuard>
      </AppShell>
    )
  }

  if (Number.isNaN(uuid)) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto animate-fade-in">
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
            <VaultIcon className="h-12 w-12 text-subtle mb-4" />
            <p className="text-muted text-sm">Invalid vault ID</p>
            <p className="text-subtle text-xs mt-1 mb-6">The URL does not contain a valid vault UUID</p>
            <Button variant="secondary" size="sm" onClick={() => router.push('/')}>Back to Dashboard</Button>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          <div className="h-8 w-48 bg-surface-active rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-surface-active rounded animate-pulse" />
          <div className="space-y-4">
            <div className="h-40 bg-surface-active rounded-xl animate-pulse" />
            <div className="h-32 bg-surface-active rounded-xl animate-pulse" />
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
            <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
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
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight truncate">
                {vault.name}
              </h1>
              <Badge variant={status.badge} dot>{status.label}</Badge>
            </div>
            {vault.description && (
              <p className="mt-2 text-muted text-base">{vault.description}</p>
            )}
          </div>
          {isOwner && !hasSessionKey && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/unlock?vault=${vault.uuid}`)}
            >
              Unlock
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-accent" />
              <CardTitle>On-Chain Identity</CardTitle>
            </div>
            <CardDescription>IP asset and licensing information on Story Protocol</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Vault UUID" value={String(vault.uuid)} mono copyId="uuid" onCopy={copyToClipboard} copied={copied} />
            <DetailRow
              label="IP Asset"
              value={vault.ipId}
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
              <DetailRow label="Key Encryption" value={JSON.parse(vault.dataKeyEncryptionMeta).version === 2 ? 'EIP-712 (v2)' : 'personal_sign (v1)'} />
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
                {decryptState === 'done'
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
                  {hasSessionKey ? (
                    <Button variant="primary" size="md" onClick={handleDecrypt} className="flex-1">
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Decrypt & View
                    </Button>
                  ) : (
                    <Button variant="secondary" size="md" onClick={() => router.push(`/unlock?vault=${uuid}`)} className="flex-1">
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
                  <Button variant="secondary" size="sm" className="mt-2" onClick={() => { setDecryptState('idle'); setDecryptError(null) }}>
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
                    <Button variant="secondary" size="md" onClick={() => { setDecryptState('idle'); setDecryptedFile(null); setDecryptedText(null); if (decryptedObjectUrl) { URL.revokeObjectURL(decryptedObjectUrl); setDecryptedObjectUrl(null) } }}>
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
                {activityEntries.map((entry) => (
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

        {licenses.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-accent" />
                <CardTitle>License Tokens</CardTitle>
              </div>
              <CardDescription>Tokens granting access to this vault's content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {licenses.map((license) => (
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
  }
  return bytes
}
