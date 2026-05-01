'use client';

import { useCallback, useState } from 'react';
import { type Address } from 'viem';
import { StoryClient } from '@story-protocol/core-sdk';
import { useWallet } from './useWallet';
import { useEffect, useRef } from 'react';
import { StoryConfig } from '@story-protocol/core-sdk';
import { custom, Account } from 'viem';

export interface MintLicenseTokenParams {
  licensorIpId: Address;
  licenseTermsId: number | bigint;
  amount?: number | bigint;
  receiver?: Address;
}

export interface MintLicenseTokenResult {
  success: boolean;
  licenseTokenId?: bigint;
  licenseTokenIds?: bigint[];
  txHash?: string;
  error?: string;
}

export function useLicenseToken() {
  const { walletClient, address, isReady: walletReady } = useWallet();
  const [storyClient, setStoryClient] = useState<StoryClient | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletClient || !address) {
      setStoryClient(null);
      return;
    }
    try {
      const transport = custom(walletClient.transport);
      const config: StoryConfig = {
        account: walletClient.account as Account,
        transport,
        chainId: 'aeneid',
      };
      const client = StoryClient.newClient(config);
      setStoryClient(client);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to init Story client';
      setError(msg);
      setStoryClient(null);
    }
  }, [walletClient, address]);

  const mintLicenseToken = useCallback(
    async (params: MintLicenseTokenParams): Promise<MintLicenseTokenResult> => {
      if (!storyClient) {
        return { success: false, error: 'Story client not initialized — connect wallet first' };
      }

      setIsMinting(true);
      setError(null);

      try {
        console.log('[LicenseToken] minting:', {
          licensorIpId: params.licensorIpId,
          licenseTermsId: params.licenseTermsId,
          amount: params.amount ?? 1,
        });

        const result = await storyClient.license.mintLicenseTokens({
          licensorIpId: params.licensorIpId,
          licenseTermsId: params.licenseTermsId,
          amount: params.amount ?? 1,
          receiver: params.receiver,
        });

        const licenseTokenId = result.licenseTokenIds?.[0];
        console.log('[LicenseToken] minted:', {
          licenseTokenIds: result.licenseTokenIds,
          txHash: result.txHash,
        });

        return {
          success: true,
          licenseTokenId,
          licenseTokenIds: result.licenseTokenIds ?? undefined,
          txHash: result.txHash ?? undefined,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown minting error';
        console.error('[LicenseToken] mint error:', msg, err);
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsMinting(false);
      }
    },
    [storyClient]
  );

  return {
    storyClient,
    mintLicenseToken,
    isReady: walletReady && !!storyClient,
    isMinting,
    error,
  };
}
