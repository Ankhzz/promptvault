'use client'

import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { VaultIcon, ShieldIcon, KeyIcon, ArrowRightIcon } from '@/components/Icons'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'

const stats = [
  { label: 'Total Vaults', value: '0', accent: false },
  { label: 'Licensed Access', value: '0', accent: true },
  { label: 'IP Assets', value: '0', accent: false },
]

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
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent>
                    <p className="text-sm text-muted mb-1">{stat.label}</p>
                    <p className={cn('font-display text-3xl font-bold tracking-tight',
                      stat.accent ? 'text-gradient' : 'text-foreground',
                    )}>
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Your Vaults</h2>
              <Link href="/create">
                <Button variant="primary" size="sm">
                  Create Vault
                </Button>
              </Link>
            </div>

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

function cn(...args: (string | boolean | undefined)[]) {
  return args.filter(Boolean).join(' ')
}
