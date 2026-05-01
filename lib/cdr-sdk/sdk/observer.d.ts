import { type PublicClient } from "viem";
import { type Network } from "@piplabs/cdr-contracts";
import type { Vault } from "./types.js";
import type { DKGParams } from "./cosmos/dkg-proto.js";
/**
 * Which backend to use for DKG queries.
 *
 * - `evm-events`: scan DKG contract Finalized/Registered events via the
 *   provided publicClient. Works against any EVM RPC.
 * - `cosmos-abci`: query the x/dkg keeper directly via CometBFT abci_query
 *   (port 26657). Avoids wide eth_getLogs ranges and requires only one
 *   non-EVM endpoint.
 */
export type DkgSource = "evm-events" | "cosmos-abci";
/**
 * Observer queries CDR contract state (EVM) and DKG module state.
 *
 * DKG state can come from two sources, selected via the `dkgSource` option:
 *   - `evm-events` (default): scans DKG contract events via viem
 *   - `cosmos-abci`: queries the x/dkg keeper via CometBFT abci_query
 *
 * CDR reads (vault, fees, maxEncryptedDataSize) and validator attestation
 * reports always come from EVM — the x/dkg keeper does not expose SGX quotes.
 */
export declare class Observer {
    /** Many RPCs reject or time out on wide eth_getLogs ranges; chunk to stay under typical caps. */
    private static readonly DKG_LOGS_BLOCK_CHUNK;
    /**
     * Fallback lookback window when DKG params can't be fetched from any
     * CometBFT RPC. When params are reachable, the window is computed as
     * `2 × (registrationPeriod + dealingPeriod + finalizationPeriod) + activePeriod`,
     * which spans the current epoch plus a buffer of one prior DKG protocol pass.
     */
    private static readonly DEFAULT_LOOKBACK_BLOCKS;
    /**
     * Default CometBFT RPC URL used to fetch DKG params when the caller has not
     * configured `cometRpcUrl`. Pinned to the Aeneid / mainnet endpoint so the
     * SDK works zero-config for development and demos.
     *
     * ⚠️ Plaintext HTTP — a network-level attacker could forge params /
     * activeRound responses. Production deployments should always pass an
     * explicit `cometRpcUrl` (own node, or HTTPS).
     */
    static readonly DEFAULT_COMET_RPC_URL = "http://172.192.41.96:26657";
    private publicClient;
    private network;
    readonly dkgSource: DkgSource;
    readonly cometRpcUrl: string | undefined;
    private minThresholdRatio?;
    private validationClients?;
    private dkgParamsPromise;
    private defaultCometUrlWarned;
    constructor(params: {
        network: Network;
        publicClient: PublicClient;
        /** DKG query backend. Defaults to `"evm-events"`. */
        dkgSource?: DkgSource;
        /**
         * CometBFT RPC base URL (e.g. `"http://node:26657"`). Required when
         * `dkgSource === "cosmos-abci"`.
         */
        cometRpcUrl?: string;
        /** Minimum threshold ratio override (0-1). */
        minThresholdRatio?: number;
        /** Additional RPC clients for cross-validating critical on-chain reads (evm-events mode only). */
        validationClients?: PublicClient[];
    });
    /**
     * Get a vault's details by UUID.
     * @example
     * ```ts
     * const vault = await observer.getVault(42);
     * console.log(vault.readConditionAddr);
     * ```
     */
    getVault(uuid: number): Promise<Vault>;
    /** Get current allocation fee. */
    getAllocateFee(): Promise<bigint>;
    /** Get current write fee. */
    getWriteFee(): Promise<bigint>;
    /** Get current read fee. */
    getReadFee(): Promise<bigint>;
    /** Get the maximum allowed encrypted data size for vault writes. */
    getMaxEncryptedDataSize(): Promise<bigint>;
    /** Get DKG operational threshold (basis-points constant from the DKG contract). */
    getOperationalThreshold(): Promise<bigint>;
    /**
     * Get the DKG global public key from the active round.
     * Returns the raw bytes of the globalPubKey (Ed25519 point with curve-code prefix).
     * @example
     * ```ts
     * const globalPubKey = await observer.getGlobalPubKey();
     * ```
     */
    getGlobalPubKey(params?: {
        fromBlock?: bigint;
    }): Promise<Uint8Array>;
    /**
     * Get the number of participants in the active DKG round.
     * @example
     * ```ts
     * const count = await observer.getParticipantCount();
     * ```
     */
    getParticipantCount(params?: {
        fromBlock?: bigint;
    }): Promise<number>;
    /**
     * Get the absolute threshold (minimum number of partial decryptions needed).
     * - In `evm-events` mode: computes `ceil(participants * operationalThreshold / 1000)`.
     * - In `cosmos-abci` mode: reads `threshold` directly from DKG network state.
     * If `minThresholdRatio` was set, returns `max(sourceThreshold, ceil(participants * minThresholdRatio))`.
     */
    getThreshold(params?: {
        fromBlock?: bigint;
    }): Promise<number>;
    /**
     * Get a map of validator address → commPubKey bytes for the active round.
     * The commPubKey is the uncompressed secp256k1 public key used by the
     * validator's TEE to sign partial decryption responses.
     *
     * In `evm-events` mode, reads DKG `Registered` events; `fromBlock` controls
     * the lookback window and `round` filters events. In `cosmos-abci` mode,
     * queries the x/dkg keeper's GetAllVerifiedDKGRegistrations via abci_query;
     * `codeCommitmentHex` narrows the result to a specific enclave code commitment.
     */
    getRegisteredValidators(params?: {
        fromBlock?: bigint;
        round?: number;
        codeCommitmentHex?: string;
    }): Promise<Map<string, Uint8Array>>;
    /**
     * Get validator attestation reports (raw SGX quotes) from DKG Registered events.
     * Returns a map of validator address → enclaveReport bytes (most recent per validator).
     *
     * Use with `verifyAttestation()` to verify each validator's TEE enclave
     * before trusting their partial decryptions.
     *
     * Note: sourced from EVM events regardless of `dkgSource`, because the
     * x/dkg keeper does not expose raw SGX quotes.
     */
    getValidatorAttestations(params?: {
        fromBlock?: bigint;
        round?: number;
    }): Promise<Map<string, Uint8Array>>;
    /** Fetch DKG logs for a single event type in block chunks. */
    private fetchDkgEventLogs;
    /** Get parsed Finalized events from the DKG contract. */
    private getFinalizedEvents;
    /**
     * Find the highest DKG round that has enough finalized participants to be
     * considered "active" — i.e. count >= minReqFinalizedParticipants.
     * Fixes issue #36: the previous logic used the latest Finalized event which
     * could be from a failed round.
     */
    private getActiveRound;
    private getGlobalPubKeyFromEvents;
    private getRegisteredValidatorsFromEvents;
    private requireCometRpcUrl;
    private getLatestActiveNetwork;
    /**
     * Fetch x/dkg module Params, cached for the lifetime of this Observer.
     * Uses the configured `cometRpcUrl`; falls back to
     * {@link Observer.DEFAULT_COMET_RPC_URL} with a one-time warning when none
     * is set.
     */
    getDKGParams(): Promise<DKGParams>;
    /**
     * Lookback window for EVM event scans, in blocks:
     *   2 × (registrationPeriod + dealingPeriod + finalizationPeriod) + activePeriod
     *
     * Falls back to {@link Observer.DEFAULT_LOOKBACK_BLOCKS} when DKG params
     * are unreachable on every CometBFT URL.
     */
    getLookbackBlocks(): Promise<bigint>;
    private getGlobalPubKeyFromCosmos;
    private getRegisteredValidatorsFromCosmos;
}
//# sourceMappingURL=observer.d.ts.map