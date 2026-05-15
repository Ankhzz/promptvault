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
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Testnet Faucet</h1>
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
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">How to get testnet tokens</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
                  <li>Click the button below to open the official Story faucet</li>
                  <li>Connect your wallet or paste your address</li>
                  <li>Request IP tokens — they arrive in seconds</li>
                  <li>Return here to create vaults and interact with CDR</li>
                </ol>
              </div>

              <div className="rounded-lg border border-accent/20 bg-accent-muted/30 px-4 py-3">
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
                <Button variant="secondary" size="lg">
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
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-accent">1</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Create Licensed Vaults</p>
                    <p className="text-xs text-muted">Register IP assets, mint license tokens, encrypt content via CDR</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-accent">2</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Create Private Vaults</p>
                    <p className="text-xs text-muted">Owner-only EOA access with CDR threshold encryption</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-accent">3</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Create Time-Locked Vaults</p>
                    <p className="text-xs text-muted">On-chain unlock condition that gates access by timestamp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-accent">4</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Buy & Unlock Vault Content</p>
                    <p className="text-xs text-muted">Purchase license tokens and decrypt content via CDR network</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    </AppShell>
  )
}
