import { parseEventLogs, toHex, toBytes } from "viem";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { tdh2Encrypt, encryptFile, getWasm } from "@piplabs/cdr-crypto";
import { uuidToLabel } from "./label.js";
import { ContentSizeExceededError, LabelMismatchError, InvalidConditionContractError } from "./errors.js";
export class Uploader {
    publicClient;
    walletClient;
    network;
    /** Alias for {@link uploadCDR} */
    createVault;
    /** Alias for {@link uploadFile} */
    createFileVault;
    constructor(params) {
        this.publicClient = params.publicClient;
        this.walletClient = params.walletClient;
        this.network = params.network;
        this.createVault = this.uploadCDR.bind(this);
        this.createFileVault = this.uploadFile.bind(this);
    }
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
    async encryptDataKey(params) {
        return tdh2Encrypt({
            plaintext: params.dataKey,
            globalPubKey: params.globalPubKey,
            label: params.label,
        });
    }
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
    async allocate(params) {
        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
        if (!params.skipConditionValidation) {
            if (params.writeConditionAddr !== ZERO_ADDRESS) {
                await this.validateConditionContract(params.writeConditionAddr, "write");
            }
            if (params.readConditionAddr !== ZERO_ADDRESS) {
                await this.validateConditionContract(params.readConditionAddr, "read");
            }
        }
        const cdrAddress = contractAddresses[this.network].cdr;
        const fee = params.feeOverride ?? await this.publicClient.readContract({
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "allocateFee",
        });
        const txHash = await this.walletClient.writeContract({
            chain: this.walletClient.chain ?? null,
            account: this.walletClient.account ?? null,
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "allocate",
            args: [
                params.updatable,
                params.writeConditionAddr,
                params.readConditionAddr,
                params.writeConditionData,
                params.readConditionData,
            ],
            value: fee,
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        const uuid = this.parseVaultAllocatedUuid(receipt.logs);
        return { txHash, uuid };
    }
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
    async write(params) {
        // Label binding validation: extract the label from the serialized TDH2
        // ciphertext via WASM and compare against the expected UUID-derived label.
        if (!params.skipLabelValidation) {
            const expectedLabel = uuidToLabel(params.uuid);
            const rawBytes = toBytes(params.encryptedData);
            const wasm = getWasm();
            if (wasm && rawBytes.length > 0) {
                const actualLabel = wasm.tdh2ExtractLabel(rawBytes);
                if (actualLabel.length > 0 &&
                    (actualLabel.length !== expectedLabel.length ||
                        !actualLabel.every((b, i) => b === expectedLabel[i]))) {
                    throw new LabelMismatchError(toHex(expectedLabel), toHex(actualLabel));
                }
            }
        }
        const cdrAddress = contractAddresses[this.network].cdr;
        const fee = params.feeOverride ?? await this.publicClient.readContract({
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "writeFee",
        });
        const txHash = await this.walletClient.writeContract({
            chain: this.walletClient.chain ?? null,
            account: this.walletClient.account ?? null,
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "write",
            args: [params.uuid, params.accessAuxData, params.encryptedData],
            value: fee,
        });
        await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }
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
    async uploadCDR(params) {
        // Step 1: Allocate vault first to get the UUID
        const { txHash: allocateTx, uuid } = await this.allocate({
            updatable: params.updatable,
            writeConditionAddr: params.writeConditionAddr,
            readConditionAddr: params.readConditionAddr,
            writeConditionData: params.writeConditionData,
            readConditionData: params.readConditionData,
            feeOverride: params.allocateFeeOverride,
        });
        // Step 2: Encrypt using UUID-derived label (matches validator's uuidToLabel)
        const label = uuidToLabel(uuid);
        const ciphertext = await this.encryptDataKey({
            dataKey: params.dataKey,
            globalPubKey: params.globalPubKey,
            label,
        });
        // Step 3: Write encrypted data to the vault
        const encryptedDataHex = toHex(ciphertext.raw);
        const { txHash: writeTx } = await this.write({
            uuid,
            accessAuxData: params.accessAuxData,
            encryptedData: encryptedDataHex,
            feeOverride: params.writeFeeOverride,
        });
        return {
            uuid,
            ciphertext,
            txHashes: { allocate: allocateTx, write: writeTx },
        };
    }
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
    async uploadFile(params) {
        const { content, storageProvider, checkSize = true, pin = true } = params;
        // Step 1: Encrypt file with ephemeral AES key
        const { ciphertext: encryptedFile, key } = encryptFile(content);
        // Step 2: Upload encrypted file to storage
        const cid = await storageProvider.upload(encryptedFile, { pin });
        // Step 3: Build vault payload JSON
        const payload = JSON.stringify({ cid, key: toHex(key) });
        const payloadBytes = new TextEncoder().encode(payload);
        // Step 4: Allocate vault
        const { txHash: allocateTx, uuid } = await this.allocate({
            updatable: params.updatable,
            writeConditionAddr: params.writeConditionAddr,
            readConditionAddr: params.readConditionAddr,
            writeConditionData: params.writeConditionData,
            readConditionData: params.readConditionData,
            feeOverride: params.allocateFeeOverride,
        });
        // Step 5: TDH2-encrypt the payload with UUID-derived label
        const label = uuidToLabel(uuid);
        const ciphertext = await this.encryptDataKey({
            dataKey: payloadBytes,
            globalPubKey: params.globalPubKey,
            label,
        });
        // Step 6: Size check on actual TDH2 ciphertext (default on)
        const encryptedDataHex = toHex(ciphertext.raw);
        if (checkSize) {
            const cdrAddress = contractAddresses[this.network].cdr;
            const maxSize = await this.publicClient.readContract({
                address: cdrAddress,
                abi: cdrAbi,
                functionName: "maxEncryptedDataSize",
            });
            if (BigInt(ciphertext.raw.length) > maxSize) {
                throw new ContentSizeExceededError(ciphertext.raw.length, maxSize);
            }
        }
        const { txHash: writeTx } = await this.write({
            uuid,
            accessAuxData: params.accessAuxData,
            encryptedData: encryptedDataHex,
            feeOverride: params.writeFeeOverride,
        });
        return {
            uuid,
            cid,
            ciphertext,
            txHashes: { allocate: allocateTx, write: writeTx },
        };
    }
    async validateConditionContract(address, type) {
        const functionName = type === "write" ? "checkWriteCondition" : "checkReadCondition";
        const conditionAbi = [{
                type: "function",
                name: functionName,
                inputs: [
                    { name: "caller", type: "address" },
                    { name: "conditionData", type: "bytes" },
                    { name: "accessAuxData", type: "bytes" },
                ],
                outputs: [{ name: "", type: "bool" }],
                stateMutability: "view",
            }];
        try {
            await this.publicClient.simulateContract({
                address,
                abi: conditionAbi,
                functionName,
                args: [
                    "0x0000000000000000000000000000000000000000",
                    "0x",
                    "0x",
                ],
            });
        }
        catch (e) {
            // A revert inside the function body means the function exists — contract is valid.
            // Only throw if the function selector itself is missing (zero data / execution error).
            if (e?.cause?.name === "ContractFunctionRevertedError") {
                return; // Function exists but reverted with dummy args — expected
            }
            throw new InvalidConditionContractError(address, type);
        }
    }
    parseVaultAllocatedUuid(logs) {
        const parsed = parseEventLogs({
            abi: cdrAbi,
            logs,
            eventName: "VaultAllocated",
        });
        if (parsed.length === 0) {
            throw new Error("VaultAllocated event not found in transaction logs");
        }
        return parsed[0].args.uuid;
    }
}
//# sourceMappingURL=uploader.js.map