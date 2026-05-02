'use client'

import { useCallback, useEffect, useState } from 'react'
import { StoryClient, StoryConfig, PILFlavor, WIP_TOKEN_ADDRESS } from '@story-protocol/core-sdk'
import { createPublicClient, createWalletClient, custom, http, Address, parseEther, Account } from 'viem'
import { STORY_CHAIN, CONTRACTS } from '@/lib/constants'
import { useWallet } from './useWallet'

interface UseStoryClientReturn {
  client: StoryClient | null
  isReady: boolean
  registerIPAsset: (params: RegisterIPParams) => Promise<RegisterIPResult>
  error: string | null
}

interface RegisterIPParams {
  metadataUri: string
  metadataHash: `0x${string}`
  licenseType: 'personal' | 'commercial'
  mintingFee?: bigint
}

interface RegisterIPResult {
  success: boolean
  ipId?: Address
  licenseTermsId?: number
  txHash?: string
  error?: string
}

export function useStoryClient(): UseStoryClientReturn {
  const { walletClient, address, isReady: walletReady } = useWallet()
  const [client, setClient] = useState<StoryClient | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initClient = async () => {
      if (!walletClient || !address) {
        setClient(null)
        return
      }

      try {
        const transport = custom(walletClient.transport)

        const config: StoryConfig = {
          account: walletClient.account as Account,
          transport: transport,
          chainId: 'aeneid',
        }

        const storyClient = StoryClient.newClient(config)
        setClient(storyClient)
        setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to init Story client')
        setClient(null)
      }
    }

    initClient()
  }, [walletClient, address])

  const registerIPAsset = useCallback(async (params: RegisterIPParams): Promise<RegisterIPResult> => {
    if (!client) {
      return { success: false, error: 'Story client not initialized' }
    }

    try {
      setError(null)

      const licenseTermsData = params.licenseType === 'commercial'
        ? [{
            terms: PILFlavor.commercialUse({
              defaultMintingFee: params.mintingFee || parseEther('0.01'),
              currency: WIP_TOKEN_ADDRESS,
            }),
          }]
        : [{
            terms: PILFlavor.nonCommercialSocialRemixing(),
          }]

      const result = await client.ipAsset.registerIpAsset({
        nft: {
          type: 'mint',
          spgNftContract: CONTRACTS.SPG_NFT_CONTRACT,
        },
        licenseTermsData,
        ipMetadata: {
          ipMetadataURI: params.metadataUri,
          ipMetadataHash: params.metadataHash,
          nftMetadataURI: params.metadataUri,
          nftMetadataHash: params.metadataHash,
        },
      })

      return {
        success: true,
        ipId: result.ipId as Address,
        licenseTermsId: Number(result.licenseTermsIds?.[0]),
        txHash: result.txHash,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [client])

  return {
    client,
    isReady: walletReady && !!client,
    registerIPAsset,
    error,
  }
}