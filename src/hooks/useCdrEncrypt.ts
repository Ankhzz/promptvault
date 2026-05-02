'use client';

import { useCallback, useState } from 'react';
import { toHex } from 'viem';
import { useCdrClient } from './useCdrClient';
import {
  CDR_CONDITIONS,
  encodeLicenseReadCondition,
  encodeWriteConditionData,
} from '@/lib/cdr';

interface UploadVaultParams {
  ipId: `0x${string}`;
  writerAddress: `0x${string}`;
}

interface UploadVaultResult {
  success: boolean;
  uuid?: number;
  dataKeyHex?: `0x${string}`;
  txHashes?: {
    allocate?: `0x${string}`;
    write?: `0x${string}`;
  };
  error?: string;
}

export function useCdrEncrypt() {
  const { client, isReady } = useCdrClient();
  const [isEncrypting, setIsEncrypting] = useState(false);

  const uploadVault = useCallback(
    async ({ ipId, writerAddress }: UploadVaultParams): Promise<UploadVaultResult> => {
      if (!client || !isReady) {
        return { success: false, error: 'CDR client not ready' };
      }

      setIsEncrypting(true);

      try {
        const globalPubKey = await client.observer.getGlobalPubKey();

        const dataKey = crypto.getRandomValues(new Uint8Array(32));
        const dataKeyHex = toHex(dataKey) as `0x${string}`;

        const readConditionData = encodeLicenseReadCondition(ipId);
        const writeConditionData = encodeWriteConditionData(writerAddress);

        const result = await client.uploader.uploadCDR({
          dataKey,
          globalPubKey,
          updatable: false,
          writeConditionAddr: CDR_CONDITIONS.writeCondition,
          readConditionAddr: CDR_CONDITIONS.readCondition,
          writeConditionData,
          readConditionData,
          accessAuxData: '0x',
        });

        return {
          success: true,
          uuid: result.uuid,
          dataKeyHex,
          txHashes: result.txHashes,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: msg };
      } finally {
        setIsEncrypting(false);
      }
    },
    [client, isReady]
  );

  return {
    uploadVault,
    isEncrypting,
  };
}
