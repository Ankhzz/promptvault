'use client';

import { useCallback, useState } from 'react';
import { toHex, type Address } from 'viem';
import { useCdrClient } from './useCdrClient';
import {
  CDR_CONDITIONS,
  encodeLicenseReadCondition,
  encodeWriteConditionData,
} from '@/lib/cdr';
import {
  encryptDataKeyForWallet,
  type EncryptedDataKeyV2,
  type SignTypedDataFn,
  EIP712_DOMAIN,
  EIP712_TYPES,
  EIP712_PRIMARY_TYPE,
  buildEIP712Message,
} from '@/lib/crypto/datakey-encryption';

interface UploadVaultParams {
  ipId: `0x${string}`;
  writerAddress: `0x${string}`;
  signTypedDataFn: SignTypedDataFn;
}

interface UploadVaultResult {
  success: boolean;
  uuid?: number;
  dataKeyHex?: `0x${string}`;
  encryptedDataKey?: EncryptedDataKeyV2;
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
    async ({ ipId, writerAddress, signTypedDataFn }: UploadVaultParams): Promise<UploadVaultResult> => {
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

        const encryptedDataKey = await encryptDataKeyForWallet(
          dataKey,
          writerAddress,
          signTypedDataFn,
        );

        return {
          success: true,
          uuid: result.uuid,
          dataKeyHex,
          encryptedDataKey,
          txHashes: result.txHashes,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: msg };
      } finally {
        setIsEncrypting(false);
      }
    },
    [client, isReady],
  );

  return {
    uploadVault,
    isEncrypting,
  };
}

export function createWalletSignTypedData(
  walletClient: { signTypedData: (args: any) => Promise<`0x${string}`> },
  _walletAddress: string,
): SignTypedDataFn {
  return async ({ domain, types, primaryType, message }) => {
    return walletClient.signTypedData({
      domain,
      types,
      primaryType,
      message,
    })
  }
}
