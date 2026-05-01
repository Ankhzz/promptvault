import { type PublicClient, type WalletClient } from "viem";
import { type Network } from "@piplabs/cdr-contracts";
import { type TDH2Ciphertext } from "@piplabs/cdr-crypto";
import type { PartialDecryptionEvent } from "./types.js";
import type { StorageProvider } from "./storage/types.js";
import { Observer } from "./observer.js";
import type { AttestationConfig } from "./attestation.js";
export declare class Consumer {
    private publicClient;
    private walletClient;
    private network;
    private observer;
    /**
     * In-flight (or settled) promise for the cached commPubKey map. Promise-
     * level caching deduplicates concurrent calls: if two accessCDR invocations
     * both trigger a build at the same time, only one scan runs.
     *
     * Registered events are immutable, so the only staleness risk is a new
     * validator registering after the cache was built; that surfaces as
     * "unknown validator" during verify, which triggers an automatic one-shot
     * refresh (see collectPartialsFromEvents).
     */
    private commPubKeyMapPromise;
    /**
     * Whether a scan is currently in progress. Used to deduplicate concurrent
     * force-refresh requests: without this flag, two collectPartials calls that
     * both encounter a verification failure at the same time would each call
     * getCommPubKeyMap(true) and fan out into two parallel full-history scans.
     * With it, the second caller joins the first refresh's in-flight promise.
     */
    private commPubKeyMapBuildInFlight;
    /**
     * Cached "fallback" Observer used by getEventLookback when the Consumer
     * was constructed without one. Reusing the same instance preserves its
     * `defaultCometUrlWarned` flag, so the plaintext-HTTP warning fires
     * exactly once per Consumer instead of once per getEventLookback call
     * (which would re-fire after every cache refresh).
     */
    private fallbackObserver;
    /** Alias for {@link accessCDR} */
    readVault: Consumer["accessCDR"];
    /** Alias for {@link downloadFile} */
    readFileVault: Consumer["downloadFile"];
    constructor(params: {
        network: Network;
        publicClient: PublicClient;
        walletClient: WalletClient;
        observer?: Observer;
    });
    /**
     * Warm the validator commPubKey cache in the background.
     *
     * The cache is normally built lazily on the first accessCDR / downloadFile
     * call, which requires a full-history scan of DKG Registered events and
     * can take tens of seconds on mature chains — long enough that a request
     * triggered by a user click can appear to hang. Frontends that know a
     * read is imminent (e.g. right after user login / wallet connection) can
     * call prefetchRegistry() to start the scan early, so the subsequent
     * accessCDR call hits a warm cache and returns immediately.
     *
     * Safe to call multiple times — concurrent callers share the same
     * in-flight build via Promise-level dedupe, so repeated prefetches cost
     * nothing. Errors propagate; callers doing best-effort warming should
     * attach their own `.catch(() => {})` and let the real accessCDR call
     * surface the failure later if it still occurs.
     *
     * @example
     * ```ts
     * // Right after user login / wallet connection, in a useEffect:
     * cdrClient.consumer.prefetchRegistry().catch(() => {
     *   // best-effort warm-up; real accessCDR call will retry if needed
     * });
     * ```
     */
    prefetchRegistry(): Promise<void>;
    /**
     * Request a vault read. Auto-queries read fee. Emits VaultRead event for validators.
     * @example
     * ```ts
     * const { txHash } = await consumer.read({
     *   uuid: 42,
     *   accessAuxData: "0x",
     *   requesterPubKey: "0x04...",
     * });
     * ```
     */
    read(params: {
        uuid: number;
        accessAuxData: `0x${string}`;
        requesterPubKey: `0x${string}`;
        feeOverride?: bigint;
    }): Promise<{
        txHash: `0x${string}`;
    }>;
    /**
     * Fetch validator address → commPubKey[] map from DKG Registered events.
     *
     * Hybrid mode (default): query `GetLatestActiveDKGNetwork` via CometBFT
     * ABCI to identify the currently active DKG round, then scan EVM
     * `Registered` events within a bounded window and keep only registrations
     * for that round. The CometBFT RPC URL defaults to
     * {@link Observer.DEFAULT_COMET_RPC_URL}; callers can override it by
     * passing `cometRpcUrl` when constructing `CDRClient`. If the ABCI query
     * fails (network unreachable, URL misconfigured, etc.), we fall back to
     * keeping every key in the window and letting the verify loop try each.
     *
     * The scan window is computed from on-chain DKG params via
     * {@link Observer.getLookbackBlocks} — `2 × (registrationPeriod +
     * dealingPeriod + finalizationPeriod) + activePeriod` — covering the
     * current epoch plus one prior protocol pass for buffer.
     */
    /** Chunk size for historical getLogs scans. Kept well below typical RPC block-range limits. */
    private static readonly DKG_LOGS_BLOCK_CHUNK;
    /** Max attempts per chunk getLogs call before propagating the error. */
    private static readonly GETLOGS_MAX_ATTEMPTS;
    /** Base delay (ms) for exponential backoff between getLogs retries. */
    private static readonly GETLOGS_BACKOFF_MS;
    /**
     * Return the cached commPubKey map, building it on first call or when
     * {@link forceRefresh} is true.
     *
     * Concurrent callers share the same in-flight build promise so we never
     * scan the full history twice in parallel — this dedup applies to the
     * force-refresh path as well, so two collectPartials calls that both
     * hit a verification failure at the same time only trigger one rescan.
     * On build failure the rejected promise is cleared so a subsequent
     * call can retry from scratch instead of inheriting the rejection.
     */
    private getCommPubKeyMap;
    /**
     * Resolve the event-scan lookback window in blocks:
     *   2 × (registrationPeriod + dealingPeriod + finalizationPeriod) + activePeriod
     *
     * Delegates to the configured Observer (which caches DKG params). When no
     * Observer is wired, lazily builds a single temporary one bound to this
     * Consumer's cometRpcUrl resolution and reuses it across calls — reusing
     * preserves the Observer's `defaultCometUrlWarned` flag so the plaintext-
     * HTTP warning fires once per Consumer rather than once per refresh.
     */
    private getEventLookback;
    private fetchRegisteredValidators;
    /**
     * getLogs wrapper with exponential-backoff retry. Public RPCs can return
     * transient errors for individual chunk ranges (observed as
     * "invalid block range params" on Aeneid); a narrow retry loop keeps the
     * full-history scan robust without swallowing persistent failures.
     */
    private getLogsWithRetry;
    /**
     * Collect at least `minPartials` partial decryptions for this vault read.
     *
     * In the default evm-events mode: polls `EncryptedPartialDecryptionSubmitted`
     * events from the CDR contract, filtered by uuid, and verifies each partial's
     * TEE signature against the validator's registered commPubKey.
     *
     * In cosmos-abci mode (when the Observer is configured with
     * `dkgSource: "cosmos-abci"`): polls the x/dkg keeper's GetCDRPartials
     * query via CometBFT abci_query. Signature verification is performed by
     * the keeper on ingress (see story/client/x/dkg/keeper/dkg_handler.go
     * PartialDecryptionSubmitted), so the SDK trusts the keeper state returned
     * by the node — the same trust level as any EVM RPC read.
     * The caller must supply `requesterPubKey` in this mode.
     *
     * @example
     * ```ts
     * const partials = await consumer.collectPartials({
     *   uuid: 42,
     *   minPartials: 3,
     *   fromBlock: startBlock,
     *   timeoutMs: 60_000,
     * });
     * ```
     */
    collectPartials(params: {
        uuid: number;
        minPartials: number;
        fromBlock: bigint;
        timeoutMs?: number;
        pollIntervalMs?: number;
        /** Required in cosmos-abci mode; ignored in evm-events mode. */
        requesterPubKey?: `0x${string}`;
        /** Called when a partial fails signature verification. evm-events mode only. */
        onInvalidPartial?: (event: PartialDecryptionEvent, error: Error) => void;
        /** If provided, verify each validator's attestation report. Invalid attestations trigger onInvalidPartial. */
        attestationConfig?: AttestationConfig;
    }): Promise<PartialDecryptionEvent[]>;
    private collectPartialsFromEvents;
    private collectPartialsFromCosmos;
    /**
     * Decrypt collected partials and combine to recover the original data key.
     * @example
     * ```ts
     * const dataKey = await consumer.decryptDataKey({
     *   ciphertext: { raw: encryptedData, label },
     *   partials,
     *   recipientPrivKey,
     *   globalPubKey,
     *   label,
     *   threshold: 3,
     * });
     * ```
     */
    decryptDataKey(params: {
        ciphertext: TDH2Ciphertext;
        partials: PartialDecryptionEvent[];
        recipientPrivKey: Uint8Array;
        globalPubKey: Uint8Array;
        label: Uint8Array;
        threshold: number;
    }): Promise<Uint8Array>;
    /**
     * Convenience: read + collect + decrypt in one call.
     * If requesterPubKey/recipientPrivKey are omitted, an ephemeral secp256k1 keypair is generated and the private key is zeroed after use.
     * If globalPubKey/threshold are omitted, they are auto-queried via the Observer (requires observer to be set).
     * @example
     * ```ts
     * // Simplified — keys and DKG params auto-managed:
     * const { dataKey, txHash } = await consumer.accessCDR({
     *   uuid: 42,
     *   accessAuxData: "0x",
     * });
     * ```
     */
    accessCDR(params: {
        uuid: number;
        accessAuxData: `0x${string}`;
        requesterPubKey?: `0x${string}`;
        recipientPrivKey?: Uint8Array;
        globalPubKey?: Uint8Array;
        threshold?: number;
        timeoutMs?: number;
        feeOverride?: bigint;
        onInvalidPartial?: (event: PartialDecryptionEvent, error: Error) => void;
    }): Promise<{
        dataKey: Uint8Array;
        txHash: `0x${string}`;
    }>;
    /**
     * Convenience: access vault, parse CID + key payload, download from storage, and decrypt file.
     * Key/threshold params are optional — see accessCDR() for auto-generation behavior.
     * @example
     * ```ts
     * const { content, cid } = await consumer.downloadFile({
     *   uuid: 42,
     *   accessAuxData: "0x",
     *   storageProvider,
     * });
     * ```
     */
    downloadFile(params: {
        uuid: number;
        accessAuxData: `0x${string}`;
        requesterPubKey?: `0x${string}`;
        recipientPrivKey?: Uint8Array;
        globalPubKey?: Uint8Array;
        threshold?: number;
        storageProvider: StorageProvider;
        timeoutMs?: number;
        feeOverride?: bigint;
        onInvalidPartial?: (event: PartialDecryptionEvent, error: Error) => void;
        /** Skip CID integrity verification of downloaded file (default: false). */
        skipCidVerification?: boolean;
    }): Promise<{
        content: Uint8Array;
        cid: string;
        txHash: `0x${string}`;
    }>;
}
//# sourceMappingURL=consumer.d.ts.map