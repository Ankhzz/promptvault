'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

type FaucetStatus = {
  musdcBalance: string
  lastMusdcClaim: string | null
  hasClaimedIp: boolean
  faucetIpBalance: string | null
  musdcCooldownRemaining: number | null
  ipAmount: string
}

export default function FaucetPage() {
  const { wallets } = useWallets()
  const { addToast } = useToast()
  const address = wallets[0]?.address

  const [status, setStatus] = useState<FaucetStatus | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [lastResult, setLastResult] = useState<{
    musdcTxHash?: string
    ipTxHash?: string
    musdcClaimed?: boolean
    ipClaimed?: boolean
  } | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/faucet/claim-all?wallet=${address}`)
      if (!res.ok) return
      const data: FaucetStatus = await res.json()
      setStatus(data)
      setCooldownMs(data.musdcCooldownRemaining)
    } catch {}
  }, [address])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    if (cooldownMs === null || cooldownMs <= 0) return
    const timer = setInterval(() => {
      setCooldownMs(prev => {
        if (prev === null || prev <= 0) return null
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownMs])

  const handleClaim = async () => {
    if (!address || claiming) return
    setClaiming(true)
    setLastResult(null)
    try {
      const res = await fetch('/api/faucet/claim-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
      const data = await res.json()

      if (res.status === 429 && data.remainingMs) {
        setCooldownMs(data.remainingMs)
        addToast({ title: 'Cooldown active', description: `Wait ${formatCooldown(data.remainingMs)}`, variant: 'warning' })
        return
      }

      if (!res.ok && !data.ok) {
        addToast({ title: 'Claim failed', description: data.error || 'Unknown error', variant: 'destructive' })
        return
      }

      const parts: string[] = []
      if (data.musdcClaimed) parts.push('+100 MUSDC')
      if (data.ipClaimed) parts.push('+0.01 IP')
      if (parts.length > 0) {
        addToast({ title: 'Claimed!', description: parts.join(' · '), variant: 'accent' })
      }
      if (data.ipError && data.musdcClaimed) {
        addToast({ title: 'IP claim skipped', description: data.ipError, variant: 'warning' })
      }

      setLastResult(data)
      await fetchStatus()
    } catch {
      addToast({ title: 'Claim failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setClaiming(false)
    }
  }

  const musdcReady = cooldownMs === null || cooldownMs <= 0
  const ipReady = !status?.hasClaimedIp
  const canClaim = (musdcReady || ipReady) && !!address
  const faucetLowIp = status?.faucetIpBalance != null && Number(status.faucetIpBalance) < 0.1

  const buttonLabel = (() => {
    if (!address) return 'Connect Wallet'
    if (claiming) return 'Claiming...'
    if (!musdcReady && !ipReady) return `Cooldown ${formatCooldown(cooldownMs ?? 0)}`
    if (ipReady && musdcReady) return 'Claim Starter Kit'
    if (musdcReady) return 'Claim Daily MUSDC'
    return 'Nothing to claim'
  })()

  return (
    <AppShell>
      <AuthGuard>
        <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Testnet Faucet</h1>
            <p className="mt-2 text-muted text-base">
              Get free tokens on the Aeneid testnet — MUSDC for marketplace purchases + IP for gas.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DropletIcon className="h-5 w-5 text-accent" />
                <CardTitle>PromptVault Faucet</CardTitle>
              </div>
              <CardDescription>
                {ipReady
                  ? 'Claim your Starter Kit: 100 MUSDC + 0.01 IP (one-time)'
                  : 'Claim daily MUSDC — 24h cooldown between claims'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 col-span-1">
                  <div>
                    <p className="text-xs text-subtle">MUSDC Balance</p>
                    <p className="text-lg font-semibold text-foreground font-mono">
                      {status?.musdcBalance != null ? `${formatMUSDC(status.musdcBalance)}` : '—'}
                    </p>
                  </div>
                  <Badge variant={status?.musdcBalance != null && Number(status.musdcBalance) > 0 ? 'accent' : 'outline'} dot>
                    {status?.musdcBalance != null && Number(status.musdcBalance) > 0 ? 'Ready' : 'Empty'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 col-span-1">
                  <div>
                    <p className="text-xs text-subtle">IP Gas</p>
                    <p className="text-lg font-semibold text-foreground">
                      {status?.hasClaimedIp ? 'Claimed' : 'Available'}
                    </p>
                  </div>
                  <Badge variant={status?.hasClaimedIp ? 'success' : 'accent'} dot>
                    {status?.hasClaimedIp ? '0.01 IP' : 'One-time'}
                  </Badge>
                </div>
              </div>

              {lastResult && (lastResult.musdcTxHash || lastResult.ipTxHash) && (
                <div className="space-y-2 rounded-lg border border-accent/30 bg-accent-muted/30 px-4 py-3">
                  {lastResult.musdcClaimed && lastResult.musdcTxHash && (
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-accent shrink-0" />
                      <p className="text-xs text-muted">MUSDC tx</p>
                      <a href={`${EXPLORER_URL}/tx/${lastResult.musdcTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-accent hover:underline truncate">
                        {lastResult.musdcTxHash}
                      </a>
                    </div>
                  )}
                  {lastResult.ipClaimed && lastResult.ipTxHash && (
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-accent shrink-0" />
                      <p className="text-xs text-muted">IP tx</p>
                      <a href={`${EXPLORER_URL}/tx/${lastResult.ipTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-accent hover:underline truncate">
                        {lastResult.ipTxHash}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {cooldownMs !== null && cooldownMs > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                  <ClockIcon className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-sm text-muted">
                    Next MUSDC claim in <span className="font-mono text-foreground">{formatCooldown(cooldownMs)}</span>
                  </p>
                </div>
              )}

              {faucetLowIp && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                  <ShieldIcon className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-warning font-medium">Faucet IP pool low</p>
                    <p className="text-xs text-muted mt-0.5">
                      The IP faucet wallet is running low. Use the{' '}
                      <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        official Story faucet
                      </a>
                      {' '}while we refill.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-[6px] border border-accent/30 bg-accent-muted px-4 py-3">
                <p className="text-sm text-muted">
                  <span className="font-medium text-accent">100 MUSDC</span> / 24h ·{' '}
                  <span className="font-medium text-accent">0.01 IP</span> one-time · Aeneid Testnet
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleClaim}
                loading={claiming}
                disabled={!canClaim || claiming}
              >
                {buttonLabel}
              </Button>
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg">
                  Story Faucet
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
                  { num: '1', title: 'Claim Starter Kit', desc: 'Get 100 MUSDC (daily) + 0.01 IP for gas (one-time)' },
                  { num: '2', title: 'Create Licensed Vaults', desc: 'Register IP assets, set a MUSDC price, encrypt content via CDR' },
                  { num: '3', title: 'Buy & Unlock Content', desc: 'Pay MUSDC via Marketplace, mint license token, decrypt via CDR' },
                  { num: '4', title: 'Need More IP?', desc: 'Use the official Story Foundation faucet for additional gas tokens' },
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
