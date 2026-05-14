'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { VaultIcon, EyeIcon, PricetagIcon } from '@/components/Icons'
import { getVaultsForSale } from '@/db/queries'

type ForSaleVault = Awaited<ReturnType<typeof getVaultsForSale>>[number]

function formatPrice(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ExplorePage() {
  const [vaults, setVaults] = useState<ForSaleVault[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    setLoading(true)
    getVaultsForSale()
      .then(setVaults)
      .catch(() => { addToast({ title: 'Failed to load vaults', variant: 'destructive' }) })
      .finally(() => setLoading(false))
  }, [addToast])

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">Explore</span> Vaults
          </h1>
          <p className="mt-2 text-muted text-base max-w-xl">
            Browse vaults available for purchase from the community
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="space-y-3">
                  <div className="h-4 w-32 bg-surface-active rounded animate-pulse" />
                  <div className="h-3 w-48 bg-surface-active rounded animate-pulse" />
                  <div className="h-6 w-20 bg-surface-active rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        ) : vaults.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
            <PricetagIcon className="h-12 w-12 text-subtle mb-4" />
            <p className="text-muted text-sm">No vaults for sale yet</p>
            <p className="text-subtle text-xs mt-1 mb-6">Check back later for community listings</p>
            <Link href="/">
              <Button variant="secondary" size="sm">Back to Dashboard</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaults.map((vault) => (
              <Card key={vault.uuid} hoverable className="p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {vault.name}
                    </h3>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
                      <PricetagIcon className="h-3 w-3" />
                      {formatPrice(vault.price)}
                    </span>
                  </div>

                  {vault.description && (
                    <p className="text-xs text-muted line-clamp-2">{vault.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-subtle">
                    <span className="font-mono">{shortenAddress(vault.ownerAddress)}</span>
                    <span>
                      {vault.updatedAt instanceof Date
                        ? vault.updatedAt.toLocaleDateString()
                        : new Date(vault.updatedAt * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  <Link href={`/vault/${vault.uuid}`} className="block">
                    <Button variant="secondary" size="sm" className="w-full">
                      <EyeIcon className="h-3.5 w-3.5 mr-1" />
                      View Vault
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
