'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { AuthGuard } from '@/components/AuthGuard'
import { VaultIcon, CopyIcon, CheckIcon, EyeIcon, UnlockIcon, PricetagIcon, LockIcon, ShoppingCartIcon } from '@/components/Icons'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { getUserVaults, getPurchasedVaults, setVaultPrice, setVaultForSale } from '@/db/queries'
import { cn } from '@/lib/cn'

type Tab = 'all' | 'owned' | 'purchased'

type OwnedVaultRow = {
  uuid: number
  name: string
  status: string
  vaultType: 'licensed' | 'private'
  ipId: string | null
  licenseTokenId: string | null
  price: number | null
  isForSale: boolean
  createdAt: Date
  ownerAddress: string
  relationship: 'owner'
}

type PurchasedVaultRow = {
  uuid: number
  name: string
  description: string | null
  status: string
  vaultType: 'licensed' | 'private'
  ipId: string | null
  licenseTokenId: string | null
  price: number | null
  isForSale: boolean
  createdAt: Date
  ownerAddress: string
  buyerLicenseTokenId: string | null
  relationship: 'purchased'
}

type LibraryRow = OwnedVaultRow | PurchasedVaultRow

function formatPrice(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(d: Date | string): string {
  if (d instanceof Date) return d.toLocaleDateString()
  return new Date(typeof d === 'number' ? d * 1000 : d).toLocaleDateString()
}

export default function MyVaultsPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [ownedVaults, setOwnedVaults] = useState<OwnedVaultRow[]>([])
  const [purchasedVaults, setPurchasedVaults] = useState<PurchasedVaultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({})
  const [editingVault, setEditingVault] = useState<number | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const { addToast } = useToast()

  const address = wallets[0]?.address

  const refreshVaults = useCallback(async () => {
    if (!address) return
    const [owned, purchased] = await Promise.all([
      getUserVaults(address),
      getPurchasedVaults(address),
    ])
    setOwnedVaults(owned.map(v => ({ ...v, relationship: 'owner' as const })))
    setPurchasedVaults(purchased.map(v => ({ ...v, relationship: 'purchased' as const })))
  }, [address])

  useEffect(() => {
    if (!address) {
      setOwnedVaults([])
      setPurchasedVaults([])
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([getUserVaults(address), getPurchasedVaults(address)])
      .then(([owned, purchased]) => {
        setOwnedVaults(owned.map(v => ({ ...v, relationship: 'owner' as const })))
        setPurchasedVaults(purchased.map(v => ({ ...v, relationship: 'purchased' as const })))
      })
      .catch(() => { addToast({ title: 'Failed to load library', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [address, addToast])

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      addToast({ title: `${label} copied`, variant: 'default' })
      setTimeout(() => setCopied(prev => prev === label ? null : prev), 2000)
    } catch {
      addToast({ title: 'Copy failed', variant: 'destructive' })
    }
  }, [addToast])

  const handleEnableSale = useCallback(async (uuid: number) => {
    const raw = priceDraft[uuid]
    const cents = raw ? parseInt(raw, 10) : 0
    if (!raw || isNaN(cents) || cents <= 0) {
      addToast({ title: 'Invalid price', description: 'Enter a positive price in USD cents', variant: 'warning' })
      return
    }
    setSaving(uuid)
    try {
      await setVaultPrice(uuid, cents)
      await setVaultForSale(uuid, true)
      addToast({ title: 'Vault listed for sale', description: formatPrice(cents), variant: 'accent' })
      await refreshVaults()
    } catch {
      addToast({ title: 'Failed to enable sale', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }, [priceDraft, addToast, refreshVaults])

  const handleEditPrice = useCallback(async (uuid: number) => {
    const raw = priceDraft[uuid]
    const cents = raw ? parseInt(raw, 10) : 0
    if (!raw || isNaN(cents) || cents <= 0) {
      addToast({ title: 'Invalid price', description: 'Enter a positive price in USD cents', variant: 'warning' })
      return
    }
    setSaving(uuid)
    try {
      await setVaultPrice(uuid, cents)
      setEditingVault(null)
      addToast({ title: 'Price updated', description: formatPrice(cents), variant: 'accent' })
      await refreshVaults()
    } catch {
      addToast({ title: 'Failed to update price', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }, [priceDraft, addToast, refreshVaults])

  const handleDisableSale = useCallback(async (uuid: number) => {
    setSaving(uuid)
    try {
      await setVaultForSale(uuid, false)
      addToast({ title: 'Sale disabled', variant: 'default' })
      await refreshVaults()
    } catch {
      addToast({ title: 'Failed to disable sale', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }, [addToast, refreshVaults])

  const statusConfig: Record<string, { variant: 'default' | 'accent' | 'warning' | 'destructive'; label: string }> = {
    active: { variant: 'accent', label: 'Active' },
    accessed: { variant: 'default', label: 'Accessed' },
    creating: { variant: 'warning', label: 'Creating' },
    failed: { variant: 'destructive', label: 'Failed' },
  }

  const filteredList: LibraryRow[] = (() => {
    switch (activeTab) {
      case 'owned': return ownedVaults
      case 'purchased': return purchasedVaults
      default: return [...ownedVaults, ...purchasedVaults].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  })()

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: ownedVaults.length + purchasedVaults.length },
    { key: 'owned', label: 'Owned', count: ownedVaults.length },
    { key: 'purchased', label: 'Purchased', count: purchasedVaults.length },
  ]

  if (!authenticated) {
    return (
      <AppShell>
        <AuthGuard>{null}</AuthGuard>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              My <span className="text-gradient">Library</span>
            </h1>
            <p className="mt-2 text-muted text-base max-w-xl">
              Manage your vaults and access purchased content
            </p>
          </div>
          <Link href="/create">
            <Button variant="primary" size="sm">Create Vault</Button>
          </Link>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-surface-active text-foreground shadow-sm'
                  : 'text-subtle hover:text-foreground'
              )}
            >
              {tab.label}
              <span className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none',
                activeTab === tab.key
                  ? 'bg-accent/20 text-accent'
                  : 'bg-surface-active text-subtle'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-40 bg-surface-active rounded animate-pulse" />
                    <div className="h-3 w-56 bg-surface-active rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-surface-active rounded animate-pulse" />
                    <div className="h-8 w-20 bg-surface-active rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
            <VaultIcon className="h-12 w-12 text-subtle mb-4" />
            <p className="text-muted text-sm">
              {activeTab === 'purchased' ? 'No purchases yet' : 'No vaults yet'}
            </p>
            <p className="text-subtle text-xs mt-1 mb-6">
              {activeTab === 'purchased'
                ? 'Browse the marketplace to find encrypted content'
                : 'Create your first encrypted vault to get started'}
            </p>
            {activeTab === 'purchased' ? (
              <Link href="/explore">
                <Button variant="secondary" size="sm">Browse Marketplace</Button>
              </Link>
            ) : (
              <Link href="/create">
                <Button variant="secondary" size="sm">Create First Vault</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredList.map((vault) => {
              const sc = statusConfig[vault.status] ?? statusConfig.active
              const copyIdLabel = `id-${vault.uuid}`
              const isOwner = vault.relationship === 'owner'
              const isSavingThis = isOwner && saving === vault.uuid
              const isEditingThis = isOwner && editingVault === vault.uuid

              const licenseIdForUnlock = isOwner
                ? vault.licenseTokenId
                : (vault as PurchasedVaultRow).buyerLicenseTokenId

              let unlockHref = `/unlock?vaultId=${vault.uuid}`
              if (licenseIdForUnlock && vault.vaultType !== 'private') {
                unlockHref += `&licenseTokenId=${licenseIdForUnlock}`
              }

              return (
                <Card key={`${vault.relationship}-${vault.uuid}`} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">{vault.name}</span>
                          <Badge variant={sc.variant} dot>{sc.label}</Badge>
                          {isOwner ? (
                            vault.vaultType === 'private' ? (
                              <Badge variant="default" dot>
                                <LockIcon className="h-3 w-3 mr-0.5" />
                                Private
                              </Badge>
                            ) : vault.isForSale ? (
                              <Badge variant="accent" dot>
                                <PricetagIcon className="h-3 w-3 mr-0.5" />
                                For Sale · {formatPrice(vault.price)}
                              </Badge>
                            ) : null
                          ) : (
                            <Badge variant="default" dot>
                              <ShoppingCartIcon className="h-3 w-3 mr-0.5" />
                              Purchased
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted flex-wrap">
                          <span className="font-mono">ID {vault.uuid}</span>
                          <button
                            onClick={() => copyToClipboard(String(vault.uuid), copyIdLabel)}
                            className="inline-flex items-center gap-1 text-subtle hover:text-accent transition-colors"
                          >
                            {copied === copyIdLabel ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                          </button>
                          {licenseIdForUnlock && (
                            <>
                              <span className="text-border">|</span>
                              <span className="font-mono">License #{licenseIdForUnlock}</span>
                              <button
                                onClick={() => copyToClipboard(licenseIdForUnlock, `lic-${vault.uuid}`)}
                                className="inline-flex items-center gap-1 text-subtle hover:text-accent transition-colors"
                              >
                                {copied === `lic-${vault.uuid}` ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                              </button>
                            </>
                          )}
                          <span className="text-border">|</span>
                          <span>{formatDate(vault.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/vault/${vault.uuid}`}>
                          <Button variant="secondary" size="sm">
                            <EyeIcon className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link href={unlockHref}>
                          <Button variant="primary" size="sm">
                            <UnlockIcon className="h-3.5 w-3.5 mr-1" />
                            Unlock
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {isOwner && (
                      <div className="border-t border-border pt-3">
                        {vault.vaultType === 'private' ? (
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <LockIcon className="h-4 w-4 text-subtle" />
                            <span>Owner-only vault — licensing not available</span>
                          </div>
                        ) : !vault.isForSale ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Price (USD cents, e.g. 500)"
                              value={priceDraft[vault.uuid] ?? ''}
                              onChange={(e) => setPriceDraft(prev => ({ ...prev, [vault.uuid]: e.target.value }))}
                              disabled={isSavingThis}
                              className="flex-1"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={isSavingThis}
                              disabled={isSavingThis}
                              onClick={() => handleEnableSale(vault.uuid)}
                            >
                              Enable Sale
                            </Button>
                          </div>
                        ) : isEditingThis ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="New price (USD cents)"
                              value={priceDraft[vault.uuid] ?? String(vault.price ?? '')}
                              onChange={(e) => setPriceDraft(prev => ({ ...prev, [vault.uuid]: e.target.value }))}
                              disabled={isSavingThis}
                              className="flex-1"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={isSavingThis}
                              disabled={isSavingThis}
                              onClick={() => handleEditPrice(vault.uuid)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSavingThis}
                              onClick={() => setEditingVault(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted">
                              Price: <span className="font-medium text-foreground">{formatPrice(vault.price)}</span>
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isSavingThis}
                              onClick={() => {
                                setPriceDraft(prev => ({ ...prev, [vault.uuid]: String(vault.price ?? '') }))
                                setEditingVault(vault.uuid)
                              }}
                            >
                              Edit Price
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={isSavingThis}
                              disabled={isSavingThis}
                              onClick={() => handleDisableSale(vault.uuid)}
                            >
                              Disable Sale
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
