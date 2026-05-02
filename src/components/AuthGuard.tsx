'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Button } from '@/components/ui/Button'
import { ShieldIcon, UnlockIcon } from '@/components/Icons'
import { STORY_CHAIN } from '@/lib/constants'
import { type ReactNode, useEffect, useState, useCallback } from 'react'

interface AuthGuardProps {
  children: ReactNode
  requireChain?: boolean
}

export function AuthGuard({ children, requireChain = true }: AuthGuardProps) {
  const { authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const [chainOk, setChainOk] = useState(false)

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

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <ShieldIcon className="h-12 w-12 text-subtle mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">Authentication Required</p>
        <p className="text-sm text-muted mb-6">Connect your wallet to access this page</p>
        <Button variant="primary" onClick={login}>Connect Wallet</Button>
      </div>
    )
  }

  if (requireChain && wallets.length > 0 && !chainOk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <UnlockIcon className="h-12 w-12 text-subtle mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">Switch to Aeneid Network</p>
        <p className="text-sm text-muted mb-6">This feature requires the Story Aeneid testnet (Chain ID: {STORY_CHAIN.id})</p>
        <Button variant="primary" onClick={async () => {
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
        }}>Switch Network</Button>
      </div>
    )
  }

  return <>{children}</>
}
