'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { createPublicClient, createWalletClient, custom, http, Address } from 'viem'
import { STORY_CHAIN } from '@/lib/constants'

interface UseWalletReturn {
  address: Address | null
  isConnected: boolean
  isAuthenticated: boolean
  isReady: boolean
  publicClient: ReturnType<typeof createPublicClient> | null
  walletClient: ReturnType<typeof createWalletClient> | null
  connect: () => void
  disconnect: () => void
  chainId: number | null
}

export function useWallet(): UseWalletReturn {
  const { login, logout, authenticated } = usePrivy()
  const { wallets } = useWallets()

  const [publicClient, setPublicClient] = useState<ReturnType<typeof createPublicClient> | null>(null)
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null)

  const wallet = wallets[0]
  const isConnected = wallets.length > 0
  const address = wallet?.address as Address | undefined

  useEffect(() => {
    const client = createPublicClient({
      transport: http(STORY_CHAIN.rpcUrl),
    })
    setPublicClient(client)
  }, [])

  useEffect(() => {
    const initWalletClient = async () => {
      if (!wallet) {
        setWalletClient(null)
        return
      }

      try {
        const provider = await wallet.getEthereumProvider()
        if (!provider) {
          setWalletClient(null)
          return
        }

        const client = createWalletClient({
          transport: custom(provider),
          account: wallet.address as Address,
        })
        setWalletClient(client)
    } catch {
      setWalletClient(null)
      }
    }

    initWalletClient()
  }, [wallet])

  const connect = useCallback(() => {
    login({
      loginMethods: ['email', 'google', 'github', 'wallet'],
    })
  }, [login])

  const disconnect = useCallback(() => {
    logout()
  }, [logout])

  return {
    address: address || null,
    isConnected,
    isAuthenticated: authenticated,
    isReady: isConnected && !!walletClient && !!publicClient,
    publicClient,
    walletClient,
    connect,
    disconnect,
    chainId: STORY_CHAIN.id,
  }
}