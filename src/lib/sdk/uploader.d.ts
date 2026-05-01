import { type PublicClient, type WalletClient } from "viem";
import { type Network } from "@piplabs/cdr-contracts";
import { type TDH2Ciphertext } from "@piplabs/cdr-crypto";
import type { StorageProvider } from "./storage/types.js";
export declare class Uploader {
    private publicClient;
    private walletClient;
    private network;
    /** Alias for {@link uploadCDR} */
    createVault: Uploader["uploadCDR"];
    /** Alias for {@link uploadFile} */
    createFileVault: Uploader["uploadFile"];
    constructor(params: {
        network: Network;
        publicClient: PublicClient;
        walletClient: WalletClient;
    });
    /**
     * Encrypt a data key using TDH2 to the DKG global public key.
     * @example
     * ```ts
     * const ciphertext = await uploader.encryptDataKey({
     *   dataKey: new TextEncoder().encode("secret"),
     *   globalPubKey,
     *   label: uuidToLabel(uuid),
     * });
     * ```
     */
    encryptDataKey(params: {
        dataKey: Uint8Array;
        globalPubKey: Uint8Array;
        label: Uint8Array;
    }): Promise<TDH2Ciphertext>;
    /**
     * Allocate a new vault on-chain. Auto-queries allocation fee unless feeOverride is provided.
     * @example
     * ```ts
     * const { uuid, txHash } = await uploader.allocate({
     *   updatable: false,
     *   writeConditionAddr: "0x...",
     *   readConditionAddr: "0x...",
     *   writeConditionData: "0x",
     *   readConditionData: "0x",
     * });
     * ```
     */
    allocate(params: {
        updatable: boolean;
        writeConditionAddr: `0x${string}`;
        readConditionAddr: `0x${string}`;
        writeConditionData: `0x${string}`;
        readConditionData: `0x${string}`;
        feeOverride?: bigint;
        /** Skip condition contract interface validation (default: false). */
        skipConditionValidation?: boolean;
    }): Promise<{
        txHash: `0x${string}`;
        uuid: number;
    }>;
    /**
     * Write encrypted data to an existing vault. Auto-queries write fee.
     * @example
     * ```ts
     * const { txHash } = await uploader.write({
     *   uuid: 42,
     *   accessAuxData: "0x",
     *   encryptedData: "0x...",
     * });
     * ```
     */
    write(params: {
        uuid: number;
        accessAuxData: `0x${string}`;
        encryptedData: `0x${string}`;
        feeOverride?: bigint;
        /** Skip label binding validation (default: false). */
        skipLabelValidation?: boolean;
    }): Promise<{
        txHash: `0x${string}`;
    }>;
    /**
     * Convenience: allocate vault, encrypt data key with UUID-derived label, and write in one call.
     * @example
     * ```ts
     * const result = await uploader.uploadCDR({
     *   dataKey: new TextEncoder().encode("secret"),
     *   globalPubKey,
     *   updatable: false,
     *   writeConditionAddr: writeCondition.address,
     *   readConditionAddr: readCondition.address,
     *   writeConditionData: writeCondition.conditionData,
     *   readConditionData: readCondition.conditionData,
     *   accessAuxData: "0x",
     * });
     * console.log("UUID:", result.uuid);
     * ```
     */
    uploadCDR(params: {
        dataKey: Uint8Array;
        globalPubKey: Uint8Array;
        updatable: boolean;
        writeConditionAddr: `0x${string}`;
        readConditionAddr: `0x${string}`;
        writeConditionData: `0x${string}`;
        readConditionData: `0x${string}`;
        accessAuxData: `0x${string}`;
        allocateFeeOverride?: bigint;
        writeFeeOverride?: bigint;
    }): Promise<{
        uuid: number;
        ciphertext: TDH2Ciphertext;
        txHashes: {
            allocate: `0x${string}`;
            write: `0x${string}`;
        };
    }>;
    /**
     * Encrypt a file, upload to storage, and write CID + key reference to a new vault.
     * @example
     * ```ts
     * const result = await uploader.uploadFile({
     *   content: fileBytes,
     *   storageProvider,
     *   globalPubKey,
     *   updatable: false,
     *   writeConditionAddr: "0x...",
     *   readConditionAddr: "0x...",
     *   writeConditionData: "0x",
     *   readConditionData: "0x",
     *   accessAuxData: "0x",
     * });
     * console.log("CID:", result.cid);
     * ```
     */
    uploadFile(params: {
        content: Uint8Array;
        storageProvider: StorageProvider;
        globalPubKey: Uint8Array;
        updatable: boolean;
        writeConditionAddr: `0x${string}`;
        readConditionAddr: `0x${string}`;
        writeConditionData: `0x${string}`;
        readConditionData: `0x${string}`;
        accessAuxData: `0x${string}`;
        checkSize?: boolean;
        pin?: boolean;
        allocateFeeOverride?: bigint;
        writeFeeOverride?: bigint;
    }): Promise<{
        uuid: number;
        cid: string;
        ciphertext: TDH2Ciphertext;
        txHashes: {
            allocate: `0x${string}`;
            write: `0x${string}`;
        };
    }>;
    private validateConditionContract;
    private parseVaultAllocatedUuid;
}
//# sourceMappingURL=uploader.d.ts.map