'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useToast } from '@/components/ui/Toast'
import { STORY_CHAIN } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useEffect, useState, useCallback, useRef } from 'react'
import { CopyIcon, CheckIcon } from '@/components/Icons'

export function WalletStatus() {
  const { authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()
  const [chainOk, setChainOk] = useState(false)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const address = wallets[0]?.address
  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  const checkChain = useCallback(async () => {
    if (wallets.length === 0) return
    try {
      const provider = await wallets[0].getEthereumProvider()
      const chainId = await provider.request({ method: 'eth_chainId' })
      const ok = Number(chainId) === STORY_CHAIN.id
      setChainOk(ok)
      if (!ok) {
        addToast({
          title: 'Wrong network',
          description: `Switch to ${STORY_CHAIN.name} to use PromptVault`,
          variant: 'warning',
        })
      }
    } catch {
      setChainOk(false)
    }
  }, [wallets, addToast])

  useEffect(() => {
    if (authenticated) checkChain()
  }, [authenticated, checkChain])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const switchChain = useCallback(async () => {
    if (wallets.length === 0) return
    const provider = await wallets[0].getEthereumProvider()
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${STORY_CHAIN.id.toString(16)}` }],
      })
      setChainOk(true)
      addToast({ title: `Connected to ${STORY_CHAIN.name}`, variant: 'accent' })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as any).code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${STORY_CHAIN.id.toString(16)}`,
            chainName: STORY_CHAIN.name,
            rpcUrls: [STORY_CHAIN.rpcUrl],
            blockExplorerUrls: [STORY_CHAIN.explorer],
            nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
          }],
        })
        setChainOk(true)
        addToast({ title: `${STORY_CHAIN.name} added & connected`, variant: 'accent' })
      }
    }
  }, [wallets, addToast])

  const copyAddress = useCallback(async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }, [address])

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-accent px-3 py-2 text-sm font-medium text-foreground transition-all duration-[var(--transition-fast)] hover:bg-accent-muted hover:scale-[1.02] active:scale-[0.98]"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-sm transition-all duration-[var(--transition-fast)]',
          open
            ? 'bg-surface text-foreground'
            : 'text-muted hover:text-foreground hover:bg-surface',
        )}
      >
        <div className={cn('h-2 w-2 shrink-0 rounded-full', chainOk ? 'bg-accent' : 'bg-warning')} />
        <span className="flex-1 text-left font-medium">{shortAddr}</span>
        <svg
          className={cn('h-3.5 w-3.5 transition-transform duration-[var(--transition-fast)]', open && 'rotate-180')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-elevated p-2 shadow-lg space-y-1">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <div className={cn('h-2 w-2 shrink-0 rounded-full', chainOk ? 'bg-accent' : 'bg-warning')} />
            <span className="flex-1 text-sm text-foreground">
              {chainOk ? 'Story Aeneid' : 'Wrong Network'}
            </span>
            {chainOk && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-accent">Connected</span>
            )}
          </div>

          {!chainOk && (
            <button
              onClick={switchChain}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface"
            >
              <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Switch to Story Aeneid
            </button>
          )}

          <div className="border-t border-border my-1" />

          <button
            onClick={copyAddress}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground hover:bg-surface"
          >
            {copied ? <CheckIcon className="h-4 w-4 text-accent" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>

          <button
            onClick={() => { logout(); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive-muted"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
