'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import type { PublicClient } from 'viem';
import { initWasm, CDRClient } from '@piplabs/cdr-sdk';
import { STORY_CHAIN, CDR_CONFIG, getCometRpcUrl } from '@/lib/constants';
import { useWallet } from './useWallet';

let wasmInitialized = false;

export function useCdrClient() {
  const { walletClient, address, isReady: walletReady } = useWallet();
  const [cdrClient, setCdrClient] = useState<CDRClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeWasm = useCallback(async () => {
    if (wasmInitialized) return true;
    setIsInitializing(true);
    try {
      await initWasm();
      wasmInitialized = true;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'WASM init failed';
      setError(msg);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const pc = createPublicClient({
      transport: http(STORY_CHAIN.rpcUrl),
    });
    setPublicClient(pc);
  }, []);

  useEffect(() => {
    if (!walletClient || !address || !publicClient) {
      setCdrClient(null);
      return;
    }

    const init = async () => {
      const wasmOk = await initializeWasm();
      if (!wasmOk) return;

      try {
        const client = new CDRClient({
          network: CDR_CONFIG.network,
          publicClient,
          walletClient,
          cometRpcUrl: getCometRpcUrl(),
          validationRpcUrls: [CDR_CONFIG.validationRpcUrl],
        });
        setCdrClient(client);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'CDR client init failed';
        setError(msg);
      }
    };

    init();
  }, [walletClient, address, publicClient, initializeWasm]);

  return {
    client: cdrClient,
    publicClient,
    isReady: !!cdrClient && !isInitializing && !error,
    isInitializing,
    error,
  };
}