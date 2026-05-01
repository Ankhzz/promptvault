'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import type { PublicClient, WalletClient } from 'viem';
import { initWasm, CDRClient } from '@piplabs/cdr-sdk';
import { STORY_CHAIN, CDR_CONFIG } from '@/lib/constants';
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
      console.error('[CDR] initWasm error:', msg);
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
        });
        setCdrClient(client);
        setError(null);
        console.log('[CDR] Client initialized');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'CDR client init failed';
        console.error('[CDR] Client init error:', msg);
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