'use client'

import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AuthGuard } from '@/components/AuthGuard'
import { ShieldIcon, ExternalLinkIcon } from '@/components/Icons'
import { STORY_CHAIN } from '@/lib/constants'

const FAUCET_URL = 'https://faucet.story.foundation'
const EXPLORER_URL = STORY_CHAIN.explorer

export default function FaucetPage() {
  return (
    <AppShell>
      <AuthGuard>
        <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Testnet Faucet</h1>
            <p className="mt-2 text-muted text-base">
              Get free IP tokens on the Aeneid testnet to create vaults, mint license tokens, and interact with CDR.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5 text-accent" />
                <CardTitle>Story Aeneid Faucet</CardTitle>
              </div>
              <CardDescription>
                Request testnet IP tokens from the official Story Foundation faucet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[6px] border border-border bg-surface p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">How to get testnet tokens</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
                  <li>Click the button below to open the official Story faucet</li>
                  <li>Connect your wallet or paste your address</li>
                  <li>Request IP tokens — they arrive in seconds</li>
                  <li>Return here to create vaults and interact with CDR</li>
                </ol>
              </div>

              <div className="rounded-[6px] border border-accent/30 bg-accent-muted px-4 py-3">
                <p className="text-sm text-muted">
                  <span className="font-medium text-accent">Network:</span> Story Aeneid Testnet (Chain ID: {STORY_CHAIN.id})
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="primary" size="lg" className="w-full">
                  Open Faucet
                  <ExternalLinkIcon className="h-4 w-4 ml-2" />
                </Button>
              </a>
              <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg">
                  Explorer
                  <ExternalLinkIcon className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What can you do with testnet IP?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { num: '1', title: 'Create Licensed Vaults', desc: 'Register IP assets, mint license tokens, encrypt content via CDR' },
                  { num: '2', title: 'Create Private Vaults', desc: 'Owner-only EOA access with CDR threshold encryption' },
                  { num: '3', title: 'Create Time-Locked Vaults', desc: 'On-chain unlock condition that gates access by timestamp' },
                  { num: '4', title: 'Buy & Unlock Vault Content', desc: 'Purchase license tokens and decrypt content via CDR network' },
                ].map(({ num, title, desc }) => (
                  <div key={num} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-border text-xs font-mono text-muted">{num}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    </AppShell>
  )
}
