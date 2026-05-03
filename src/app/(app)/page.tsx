'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { VaultIcon, ShieldIcon, KeyIcon, ArrowRightIcon } from '@/components/Icons'
import Link from 'next/link'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { getUserStats, getUserVaults } from '@/db/queries'
import { cn } from '@/lib/cn'

const features = [
  {
    icon: ShieldIcon,
    title: 'License-Gated Encryption',
    description: 'Content encrypted with CDR — only license token holders can decrypt and access.',
    badge: 'Core',
  },
  {
    icon: KeyIcon,
    title: 'Story Protocol IP',
    description: 'Each vault is a registered IP asset with programmable license terms on-chain.',
    badge: 'On-Chain',
  },
  {
    icon: VaultIcon,
    title: 'Threshold Decryption',
    description: 'Distributed validator network ensures no single point of failure for key recovery.',
    badge: 'Secure',
  },
]

export default function DashboardPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [stats, setStats] = useState<{
    totalVaults: number
    activeVaults: number
    accessedVaults: number
    licenseCount: number
    accessCount: number
  } | null>(null)
  const [vaultList, setVaultList] = useState<Array<{
    uuid: number
    name: string
    status: string
    ipId: string
    createdAt: Date
  }>>([])
  const [loading, setLoading] = useState(true)

  const address = wallets[0]?.address

  useEffect(() => {
    if (!address) {
      setStats(null)
      setVaultList([])
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getUserStats(address),
      getUserVaults(address),
    ])
      .then(([s, v]) => {
        setStats(s)
        setVaultList(v)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  const statCards = stats
    ? [
        { label: 'Total Vaults', value: String(stats.totalVaults), accent: false },
        { label: 'Licensed Access', value: String(stats.accessCount), accent: true },
        { label: 'Active Licenses', value: String(stats.licenseCount), accent: false },
      ]
    : [
        { label: 'Total Vaults', value: '-', accent: false },
        { label: 'Licensed Access', value: '-', accent: true },
        { label: 'Active Licenses', value: '-', accent: false },
      ]

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome to <span className="text-gradient">PromptVault</span>
          </h1>
          <p className="mt-2 text-muted text-base max-w-xl">
            Encrypted AI prompt vaults with license-gated access. Protect your intellectual property with Story Protocol and threshold cryptography.
          </p>
        </div>

        {authenticated ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              {loading ? (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent>
                        <div className="h-4 w-24 bg-surface-active rounded animate-pulse mb-2" />
                        <div className="h-8 w-12 bg-surface-active rounded animate-pulse" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                statCards.map((stat) => (
                  <Card key={stat.label}>
                    <CardContent>
                      <p className="text-sm text-muted mb-1">{stat.label}</p>
                      <p className={cn(
                        'font-display text-3xl font-bold tracking-tight',
                        stat.accent ? 'text-gradient' : 'text-foreground',
                      )}>
                        {stat.value}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Your Vaults</h2>
              <Link href="/create">
                <Button variant="primary" size="sm">
                  Create Vault
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 w-40 bg-surface-active rounded animate-pulse" />
                        <div className="h-3 w-56 bg-surface-active rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-16 bg-surface-active rounded animate-pulse" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : vaultList.length > 0 ? (
              <div className="space-y-3">
                {vaultList.map((vault) => (
                  <Link key={vault.uuid} href={`/vault/${vault.uuid}`}>
                    <Card className="p-4 hoverable">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{vault.name}</span>
                            <Badge variant={vault.status === 'accessed' ? 'default' : 'accent'} dot>
                              {vault.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted mt-1 font-mono">UUID {vault.uuid} &middot; {vault.ipId.slice(0, 10)}...{vault.ipId.slice(-6)}</p>
                        </div>
                        <Button variant="secondary" size="sm">View</Button>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
                <VaultIcon className="h-12 w-12 text-subtle mb-4" />
                <p className="text-muted text-sm">No vaults yet</p>
                <p className="text-subtle text-xs mt-1 mb-6">Create your first encrypted vault to get started</p>
                <Link href="/create">
                  <Button variant="secondary" size="sm">
                    Create First Vault
                  </Button>
                </Link>
              </Card>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map(({ icon: Icon, title, description, badge }) => (
                <Card key={title} hoverable>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <Badge variant="accent" dot>{badge}</Badge>
                    </div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Card className="flex items-center justify-between p-6 border-accent/20 bg-accent-muted/30">
              <div>
                <p className="font-display font-semibold text-foreground">Get Started</p>
                <p className="text-sm text-muted mt-0.5">Connect your wallet to create and manage encrypted vaults</p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-accent" />
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
