'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AuthGuard } from '@/components/AuthGuard'
import { ShieldIcon, ExternalLinkIcon, DropletIcon, ClockIcon, CheckIcon } from '@/components/Icons'
import { STORY_CHAIN, MUSDC_CONFIG } from '@/lib/constants'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useToast } from '@/components/ui/Toast'

const FAUCET_URL = 'https://faucet.story.foundation'
const EXPLORER_URL = STORY_CHAIN.explorer

export default function FaucetPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()
  const address = wallets[0]?.address

  const [musdcBalance, setMusdcBalance] = useState<string | null>(null)
  const [lastClaim, setLastClaim] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number | null>(null)

  const fetchMusdcStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/faucet/claim-musdc?wallet=${address}`)
      if (!res.ok) return
      const data = await res.json()
      setMusdcBalance(data.balance ?? '0')
      setLastClaim(data.lastClaim)

      if (data.lastClaim) {
        const elapsed = Date.now() - new Date(data.lastClaim).getTime()
        const remaining = MUSDC_CONFIG.faucetCooldownMs - elapsed
        setCooldownMs(remaining > 0 ? remaining : null)
      } else {
        setCooldownMs(null)
      }
    } catch {}
  }, [address])

  useEffect(() => {
    fetchMusdcStatus()
    const interval = setInterval(fetchMusdcStatus, 30_000)
    return () => clearInterval(interval)
  }, [fetchMusdcStatus])

  useEffect(() => {
    if (cooldownMs === null || cooldownMs <= 0) return
    const timer = setInterval(() => {
      setCooldownMs(prev => {
        if (prev === null || prev <= 1000) {
          clearInterval(timer)
          return null
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownMs])

  const handleClaim = async () => {
    if (!address || claiming) return
    setClaiming(true)
    setClaimTxHash(null)
    try {
      const res = await fetch('/api/faucet/claim-musdc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
      const data = await res.json()

      if (res.status === 429 && data.remainingMs) {
        setCooldownMs(data.remainingMs)
        addToast({ title: 'Cooldown active', description: `Wait ${formatCooldown(data.remainingMs)} before claiming again`, variant: 'warning' })
        return
      }

      if (!res.ok) {
        addToast({ title: 'Claim failed', description: data.error || 'Unknown error', variant: 'destructive' })
        return
      }

      setClaimTxHash(data.txHash)
      addToast({ title: 'MUSDC claimed!', description: `+${data.amount} MUSDC`, variant: 'accent' })
      await fetchMusdcStatus()
    } catch {
      addToast({ title: 'Claim failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setClaiming(false)
    }
  }

  const canClaim = cooldownMs === null || cooldownMs <= 0

  return (
    <AppShell>
      <AuthGuard>
        <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Testnet Faucet</h1>
            <p className="mt-2 text-muted text-base">
              Get free tokens on the Aeneid testnet to create vaults, mint license tokens, and interact with CDR.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DropletIcon className="h-5 w-5 text-accent" />
                <CardTitle>MUSDC Faucet</CardTitle>
              </div>
              <CardDescription>
                Claim free Mock USDC tokens to purchase licensed vaults on the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-xs text-subtle">Your MUSDC Balance</p>
                  <p className="text-lg font-semibold text-foreground font-mono">
                    {musdcBalance !== null ? `${formatMUSDC(musdcBalance)} MUSDC` : '—'}
                  </p>
                </div>
                <Badge variant={musdcBalance !== null && Number(musdcBalance) > 0 ? 'accent' : 'outline'} dot>
                  {musdcBalance !== null && Number(musdcBalance) > 0 ? 'Ready' : 'Empty'}
                </Badge>
              </div>

              {claimTxHash && (
                <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-muted/30 px-4 py-3">
                  <CheckIcon className="h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-subtle">Last claim tx</p>
                    <a
                      href={`${EXPLORER_URL}/tx/${claimTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-accent hover:underline truncate block"
                    >
                      {claimTxHash}
                    </a>
                  </div>
                </div>
              )}

              {cooldownMs !== null && cooldownMs > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                  <ClockIcon className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-sm text-muted">
                    Next claim available in <span className="font-mono text-foreground">{formatCooldown(cooldownMs)}</span>
                  </p>
                </div>
              )}

              <div className="rounded-[6px] border border-accent/30 bg-accent-muted px-4 py-3">
                <p className="text-sm text-muted">
                  <span className="font-medium text-accent">{MUSDC_CONFIG.faucetAmount} MUSDC</span> per claim · 24h cooldown · Aeneid Testnet
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleClaim}
                loading={claiming}
                disabled={!canClaim || claiming || !address}
              >
                {!address ? 'Connect Wallet' : !canClaim ? `Cooldown ${formatCooldown(cooldownMs ?? 0)}` : `Claim ${MUSDC_CONFIG.faucetAmount} MUSDC`}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5 text-accent" />
                <CardTitle>Story Aeneid Faucet (IP Tokens)</CardTitle>
              </div>
              <CardDescription>
                Request testnet IP tokens from the official Story Foundation faucet — needed for gas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[6px] border border-border bg-surface p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">How to get testnet IP</h3>
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
              <CardTitle>What can you do with testnet tokens?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { num: '1', title: 'Claim MUSDC', desc: 'Get free Mock USDC from the faucet to purchase vaults' },
                  { num: '2', title: 'Get IP for Gas', desc: 'IP tokens pay for on-chain transactions (vault creation, license mints)' },
                  { num: '3', title: 'Create Licensed Vaults', desc: 'Register IP assets, set a MUSDC price, encrypt content via CDR' },
                  { num: '4', title: 'Buy & Unlock Vault Content', desc: 'Pay MUSDC via Marketplace, mint license token, decrypt via CDR network' },
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

function formatMUSDC(raw: string): string {
  const num = Number(raw)
  if (Number.isNaN(num)) return raw
  if (num >= 1) return num.toFixed(2)
  return num.toFixed(4)
}

function formatCooldown(ms: number): string {
  if (ms <= 0) return '0s'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
