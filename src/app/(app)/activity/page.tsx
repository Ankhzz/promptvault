'use client'

import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ActivityIcon } from '@/components/Icons'
import { STORY_CHAIN } from '@/lib/constants'

const recentActivity = [
  {
    type: 'vault_created' as const,
    label: 'Vault #1044 Created',
    description: 'IP Asset 0x63a4...E007 registered with nonCommercialSocialRemixing license',
    txHash: '0x2696598acb74c6afb1032669c8ae622e3ab69e1974e278973043cf70e7d73417',
    time: 'Recently',
  },
  {
    type: 'license_minted' as const,
    label: 'License Token #72508 Minted',
    description: 'License for IP Asset 0x63a4...E007 on terms #2054',
    txHash: '0x2881ef844ee8078762514ad172ae545516de60f9552503dd4ff1aca0483a1e36',
    time: 'Recently',
  },
  {
    type: 'vault_accessed' as const,
    label: 'Vault #1044 Accessed',
    description: 'License token #72508 used to decrypt data key via CDR network',
    txHash: '0xce0dbdbfb600a07b9b7779e43c2a27a005a05ed7c9900c989c435ba6d03c5212',
    time: 'Recently',
  },
]

const typeConfig = {
  vault_created: { badge: 'accent' as const, label: 'Created' },
  license_minted: { badge: 'info' as const, label: 'Licensed' },
  vault_accessed: { badge: 'default' as const, label: 'Accessed' },
}

export default function ActivityPage() {
  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Activity</h1>
          <p className="mt-2 text-muted text-base">
            On-chain transaction history for your vaults and licenses
          </p>
        </div>

        <div className="space-y-3">
          {recentActivity.map((item, i) => {
            const config = typeConfig[item.type]
            return (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-active mt-0.5">
                    <ActivityIcon className="h-4 w-4 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      <Badge variant={config.badge} dot>{config.label}</Badge>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href={`${STORY_CHAIN.explorer}/tx/${item.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-subtle hover:text-accent transition-colors truncate max-w-[240px]"
                      >
                        {item.txHash}
                      </a>
                      <span className="text-[11px] text-subtle">{item.time}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
