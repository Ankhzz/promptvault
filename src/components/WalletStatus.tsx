'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { STORY_CHAIN } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useEffect, useState, useCallback } from 'react'

export function WalletStatus() {
  const { authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const [chainOk, setChainOk] = useState(false)

  const address = wallets[0]?.address
  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  const checkChain = useCallback(async () => {
    if (wallets.length === 0) return
    try {
      const provider = await wallets[0].getEthereumProvider()
      const chainId = await provider.request({ method: 'eth_chainId' })
      setChainOk(Number(chainId) === STORY_CHAIN.id)
    } catch {
      setChainOk(false)
    }
  }, [wallets])

  useEffect(() => {
    if (authenticated) checkChain()
  }, [authenticated, checkChain])

  const switchChain = useCallback(async () => {
    if (wallets.length === 0) return
    const provider = await wallets[0].getEthereumProvider()
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${STORY_CHAIN.id.toString(16)}` }],
      })
      setChainOk(true)
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
      }
    }
  }, [wallets])

  if (!authenticated) {
    return (
      <Button variant="primary" size="sm" onClick={login}>
        Connect Wallet
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', chainOk ? 'bg-accent' : 'bg-warning')} />
        <span className="text-sm font-medium text-foreground">{shortAddr}</span>
      </div>
      {!chainOk && (
        <Button variant="outline" size="sm" onClick={switchChain}>
          Switch Network
        </Button>
      )}
      <Badge variant={chainOk ? 'accent' : 'warning'} dot>
        {chainOk ? 'Aeneid' : 'Wrong Chain'}
      </Badge>
      <button
        onClick={logout}
        className="text-xs text-subtle hover:text-muted transition-colors ml-1"
      >
        Disconnect
      </button>
    </div>
  )
}
