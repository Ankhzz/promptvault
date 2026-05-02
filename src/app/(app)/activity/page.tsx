'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ActivityIcon } from '@/components/Icons'
import { AuthGuard } from '@/components/AuthGuard'
import { STORY_CHAIN } from '@/lib/constants'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { getUserActivity } from '@/db/queries'

type ActivityEntry = {
  id: number
  vaultUuid: number
  walletAddress: string
  type: 'vault_created' | 'license_minted' | 'vault_accessed' | 'vault_shared' | 'ip_registered'
  txHash: string | null
  details: string | null
  blockNumber: number | null
  createdAt: Date
}

const typeConfig = {
  vault_created: { badge: 'accent' as const, label: 'Created' },
  license_minted: { badge: 'info' as const, label: 'Licensed' },
  vault_accessed: { badge: 'default' as const, label: 'Accessed' },
  vault_shared: { badge: 'warning' as const, label: 'Shared' },
  ip_registered: { badge: 'accent' as const, label: 'IP Registered' },
}

export default function ActivityPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const address = wallets[0]?.address

  useEffect(() => {
    if (!address) return
    getUserActivity(address).then(setEntries).catch(() => {})
  }, [address])

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Activity</h1>
          <p className="mt-2 text-muted text-base">
            On-chain transaction history for your vaults and licenses
          </p>
        </div>

        {entries.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
            <ActivityIcon className="h-12 w-12 text-subtle mb-4" />
            <p className="text-muted text-sm">No activity yet</p>
            <p className="text-subtle text-xs mt-1">Create a vault to see your on-chain history</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((item) => {
              const config = typeConfig[item.type]
              const details = item.details ? JSON.parse(item.details) : {}
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-active mt-0.5">
                      <ActivityIcon className="h-4 w-4 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {item.type === 'vault_created' && `Vault #${item.vaultUuid} Created`}
                          {item.type === 'license_minted' && `License Minted for Vault #${item.vaultUuid}`}
                          {item.type === 'vault_accessed' && `Vault #${item.vaultUuid} Accessed`}
                          {item.type === 'vault_shared' && `Vault #${item.vaultUuid} Shared`}
                          {item.type === 'ip_registered' && `IP Registered for Vault #${item.vaultUuid}`}
                        </span>
                        <Badge variant={config.badge} dot>{config.label}</Badge>
                      </div>
                      {details && (
                        <p className="text-xs text-muted leading-relaxed">
                          {details.name && `Name: ${details.name}`}
                          {details.licenseTokenId && ` · Token #${details.licenseTokenId}`}
                          {details.ipId && ` · IP ${details.ipId.slice(0, 10)}...`}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        {item.txHash && (
                          <a
                            href={`${STORY_CHAIN.explorer}/tx/${item.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-subtle hover:text-accent transition-colors truncate max-w-[240px]"
                          >
                            {item.txHash}
                          </a>
                        )}
                        <span className="text-[11px] text-subtle">
                          {item.createdAt instanceof Date
                            ? item.createdAt.toLocaleDateString()
                            : new Date(item.createdAt * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
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
