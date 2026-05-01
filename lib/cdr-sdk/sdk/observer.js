import { getAbiItem, parseEventLogs, toBytes, toHex, } from "viem";
import { cdrAbi, dkgAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { CURVE_ED25519 } from "@piplabs/cdr-crypto";
import { RpcConsensusError } from "./errors.js";
import { queryDKGParams, queryLatestActiveDKGNetwork, queryVerifiedRegistrations, } from "./cosmos/abci-query.js";
// ---------------------------------------------------------------------------
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
export class Observer {
    /** Many RPCs reject or time out on wide eth_getLogs ranges; chunk to stay under typical caps. */
    static DKG_LOGS_BLOCK_CHUNK = 8192n;
    /**
     * Fallback lookback window when DKG params can't be fetched from any
     * CometBFT RPC. When params are reachable, the window is computed as
     * `2 × (registrationPeriod + dealingPeriod + finalizationPeriod) + activePeriod`,
     * which spans the current epoch plus a buffer of one prior DKG protocol pass.
     */
    static DEFAULT_LOOKBACK_BLOCKS = 302400n;
    /**
     * Default CometBFT RPC URL used to fetch DKG params when the caller has not
     * configured `cometRpcUrl`. Pinned to the Aeneid / mainnet endpoint so the
     * SDK works zero-config for development and demos.
     *
     * ⚠️ Plaintext HTTP — a network-level attacker could forge params /
     * activeRound responses. Production deployments should always pass an
     * explicit `cometRpcUrl` (own node, or HTTPS).
     */
    static DEFAULT_COMET_RPC_URL = "http://172.192.41.96:26657";
    publicClient;
    network;
    dkgSource;
    cometRpcUrl;
    minThresholdRatio;
    validationClients;
    dkgParamsPromise = null;
    defaultCometUrlWarned = false;
    constructor(params) {
        this.publicClient = params.publicClient;
        this.network = params.network;
        this.dkgSource = params.dkgSource ?? "evm-events";
        this.cometRpcUrl = params.cometRpcUrl;
        this.minThresholdRatio = params.minThresholdRatio;
        this.validationClients = params.validationClients;
        if (this.dkgSource === "cosmos-abci" && !this.cometRpcUrl) {
            throw new Error('Observer: cometRpcUrl is required when dkgSource is "cosmos-abci"');
        }
    }
    // =======================================================================
    // CDR contract reads (always EVM)
    // =======================================================================
    /**
     * Get a vault's details by UUID.
     * @example
     * ```ts
     * const vault = await observer.getVault(42);
     * console.log(vault.readConditionAddr);
     * ```
     */
    async getVault(uuid) {
        const result = await this.publicClient.readContract({
            address: contractAddresses[this.network].cdr,
            abi: cdrAbi,
            functionName: "vaults",
            args: [uuid],
        });
        return { uuid, ...result };
    }
    /** Get current allocation fee. */
    async getAllocateFee() {
        return this.publicClient.readContract({
            address: contractAddresses[this.network].cdr,
            abi: cdrAbi,
            functionName: "allocateFee",
        });
    }
    /** Get current write fee. */
    async getWriteFee() {
        return this.publicClient.readContract({
            address: contractAddresses[this.network].cdr,
            abi: cdrAbi,
            functionName: "writeFee",
        });
    }
    /** Get current read fee. */
    async getReadFee() {
        return this.publicClient.readContract({
            address: contractAddresses[this.network].cdr,
            abi: cdrAbi,
            functionName: "readFee",
        });
    }
    /** Get the maximum allowed encrypted data size for vault writes. */
    async getMaxEncryptedDataSize() {
        return this.publicClient.readContract({
            address: contractAddresses[this.network].cdr,
            abi: cdrAbi,
            functionName: "maxEncryptedDataSize",
        });
    }
    /** Get DKG operational threshold (basis-points constant from the DKG contract). */
    async getOperationalThreshold() {
        return this.publicClient.readContract({
            address: contractAddresses[this.network].dkg,
            abi: dkgAbi,
            functionName: "operationalThreshold",
        });
    }
    // =======================================================================
    // DKG queries — dispatched to either EVM events or cosmos REST API
    // =======================================================================
    /**
     * Get the DKG global public key from the active round.
     * Returns the raw bytes of the globalPubKey (Ed25519 point with curve-code prefix).
     * @example
     * ```ts
     * const globalPubKey = await observer.getGlobalPubKey();
     * ```
     */
    async getGlobalPubKey(params) {
        const rawPoint = this.dkgSource === "cosmos-abci"
            ? await this.getGlobalPubKeyFromCosmos()
            : await this.getGlobalPubKeyFromEvents(params);
        // Both sources return the raw 32-byte Ed25519 point. The WASM TDH2
        // functions expect a 2-byte curve-code prefix (0x043f for Ed25519).
        if (rawPoint.length === 32) {
            const prefixed = new Uint8Array(34);
            prefixed[0] = (CURVE_ED25519 >> 8) & 0xff; // 0x04
            prefixed[1] = CURVE_ED25519 & 0xff; // 0x3f
            prefixed.set(rawPoint, 2);
            return prefixed;
        }
        return rawPoint;
    }
    /**
     * Get the number of participants in the active DKG round.
     * @example
     * ```ts
     * const count = await observer.getParticipantCount();
     * ```
     */
    async getParticipantCount(params) {
        if (this.dkgSource === "cosmos-abci") {
            const network = await this.getLatestActiveNetwork();
            return network.total;
        }
        const parsed = await this.getFinalizedEvents(params);
        const { events } = await this.getActiveRound(parsed);
        return events.length;
    }
    /**
     * Get the absolute threshold (minimum number of partial decryptions needed).
     * - In `evm-events` mode: computes `ceil(participants * operationalThreshold / 1000)`.
     * - In `cosmos-abci` mode: reads `threshold` directly from DKG network state.
     * If `minThresholdRatio` was set, returns `max(sourceThreshold, ceil(participants * minThresholdRatio))`.
     */
    async getThreshold(params) {
        let sourceThreshold;
        let participantCount;
        if (this.dkgSource === "cosmos-abci") {
            const network = await this.getLatestActiveNetwork();
            sourceThreshold = network.threshold;
            participantCount = network.total;
        }
        else {
            const [operationalThreshold, count] = await Promise.all([
                this.getOperationalThreshold(),
                this.getParticipantCount(params),
            ]);
            participantCount = count;
            sourceThreshold = Math.ceil(participantCount * Number(operationalThreshold) / 1000);
        }
        if (this.minThresholdRatio !== undefined) {
            const overrideThreshold = Math.ceil(participantCount * this.minThresholdRatio);
            return Math.max(sourceThreshold, overrideThreshold);
        }
        return sourceThreshold;
    }
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
    async getRegisteredValidators(params) {
        if (this.dkgSource === "cosmos-abci") {
            return this.getRegisteredValidatorsFromCosmos(params);
        }
        return this.getRegisteredValidatorsFromEvents(params);
    }
    // =======================================================================
    // Validator attestations — always EVM (cosmos API does not expose quotes)
    // =======================================================================
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
    async getValidatorAttestations(params) {
        const toBlock = await this.publicClient.getBlockNumber();
        const lookback = await this.getLookbackBlocks();
        const fromBlock = params?.fromBlock ??
            (toBlock > lookback ? toBlock - lookback : 0n);
        const rawLogs = await this.fetchDkgEventLogs(this.publicClient, "Registered", fromBlock, toBlock);
        const parsed = parseEventLogs({
            abi: dkgAbi,
            logs: rawLogs,
            eventName: "Registered",
        });
        const attestations = new Map();
        for (const log of parsed) {
            if (params?.round !== undefined && log.args.round !== params.round) {
                continue;
            }
            const addr = log.args.validatorAddr.toLowerCase();
            attestations.set(addr, toBytes(log.args.enclaveReport));
        }
        // Fallback: if lookback window found nothing and the caller did NOT
        // explicitly provide fromBlock, scan from block 0.
        if (attestations.size === 0 && !params?.fromBlock && fromBlock > 0n) {
            return this.getValidatorAttestations({ fromBlock: 0n, round: params?.round });
        }
        return attestations;
    }
    // =======================================================================
    // Private: EVM event-scanning implementation
    // =======================================================================
    /** Fetch DKG logs for a single event type in block chunks. */
    async fetchDkgEventLogs(client, eventName, fromBlock, toBlock) {
        const dkgAddress = contractAddresses[this.network].dkg;
        const event = getAbiItem({ abi: dkgAbi, name: eventName });
        const chunk = Observer.DKG_LOGS_BLOCK_CHUNK;
        const logs = [];
        let start = fromBlock;
        while (start <= toBlock) {
            const end = start + chunk - 1n <= toBlock ? start + chunk - 1n : toBlock;
            const chunkLogs = await client.getLogs({
                address: dkgAddress,
                event,
                fromBlock: start,
                toBlock: end,
            });
            logs.push(...chunkLogs);
            start = end + 1n;
        }
        return logs;
    }
    /** Get parsed Finalized events from the DKG contract. */
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    async getFinalizedEvents(params) {
        const toBlock = params?.toBlock ?? (await this.publicClient.getBlockNumber());
        const lookback = await this.getLookbackBlocks();
        const fromBlock = params?.fromBlock ??
            (toBlock > lookback ? toBlock - lookback : 0n);
        const rawLogs = await this.fetchDkgEventLogs(this.publicClient, "Finalized", fromBlock, toBlock);
        const parsed = parseEventLogs({
            abi: dkgAbi,
            logs: rawLogs,
            eventName: "Finalized",
        });
        if (parsed.length === 0) {
            // Fallback: if no events in lookback window, try from block 0
            if (!params?.fromBlock && fromBlock > 0n) {
                return this.getFinalizedEvents({ fromBlock: 0n, toBlock });
            }
            throw new Error("No Finalized event found — DKG may not have completed yet");
        }
        return parsed;
    }
    /**
     * Find the highest DKG round that has enough finalized participants to be
     * considered "active" — i.e. count >= minReqFinalizedParticipants.
     * Fixes issue #36: the previous logic used the latest Finalized event which
     * could be from a failed round.
     */
    async getActiveRound(allEvents) {
        const minReq = await this.publicClient.readContract({
            address: contractAddresses[this.network].dkg,
            abi: dkgAbi,
            functionName: "minReqFinalizedParticipants",
        });
        const minRequired = Number(minReq);
        // Group events by round, deduplicate by validatorAddr within each round
        const byRound = new Map();
        for (const e of allEvents) {
            const round = e.args.round;
            if (!byRound.has(round))
                byRound.set(round, []);
            const existing = byRound.get(round);
            const alreadySeen = existing.some((prev) => prev.args.validatorAddr.toLowerCase() === e.args.validatorAddr.toLowerCase());
            if (!alreadySeen)
                existing.push(e);
        }
        // Find the highest round that meets the threshold (descending order)
        const rounds = [...byRound.keys()].sort((a, b) => b - a);
        for (const round of rounds) {
            const events = byRound.get(round);
            if (events.length >= minRequired) {
                return { round, events };
            }
        }
        // Fallback: no round meets threshold — warn and use the highest round.
        const highestRound = rounds[0];
        console.warn(`[CDR SDK] Warning: no DKG round meets minReqFinalizedParticipants (${minRequired}). ` +
            `Using highest round ${highestRound} as fallback. Data encrypted with this key may not be recoverable.`);
        return { round: highestRound, events: byRound.get(highestRound) };
    }
    async getGlobalPubKeyFromEvents(params) {
        const toBlock = await this.publicClient.getBlockNumber();
        const parsed = await this.getFinalizedEvents({ ...params, toBlock });
        const { events: activeEvents } = await this.getActiveRound(parsed);
        const latest = activeEvents[activeEvents.length - 1];
        const rawPoint = toBytes(latest.args.globalPubKey);
        // Cross-validate against additional RPCs if configured
        if (this.validationClients?.length) {
            const primaryHex = toHex(rawPoint);
            const lookback = await this.getLookbackBlocks();
            const fromBlock = params?.fromBlock ??
                (toBlock > lookback ? toBlock - lookback : 0n);
            const settled = await Promise.allSettled(this.validationClients.map(async (client) => {
                const logs = await this.fetchDkgEventLogs(client, "Finalized", fromBlock, toBlock);
                const events = parseEventLogs({ abi: dkgAbi, logs, eventName: "Finalized" });
                if (events.length === 0)
                    return null;
                const { events: activeEvents } = await this.getActiveRound(events);
                return activeEvents[activeEvents.length - 1].args.globalPubKey;
            }));
            for (const s of settled) {
                if (s.status === "fulfilled" && s.value !== null && s.value !== primaryHex) {
                    throw new RpcConsensusError("globalPubKey");
                }
            }
        }
        return rawPoint;
    }
    async getRegisteredValidatorsFromEvents(params) {
        const toBlock = await this.publicClient.getBlockNumber();
        const lookback = await this.getLookbackBlocks();
        const fromBlock = params?.fromBlock ??
            (toBlock > lookback ? toBlock - lookback : 0n);
        const rawLogs = await this.fetchDkgEventLogs(this.publicClient, "Registered", fromBlock, toBlock);
        const parsed = parseEventLogs({
            abi: dkgAbi,
            logs: rawLogs,
            eventName: "Registered",
        });
        const validators = new Map();
        for (const log of parsed) {
            if (params?.round !== undefined && log.args.round !== params.round) {
                continue;
            }
            const addr = log.args.validatorAddr.toLowerCase();
            validators.set(addr, toBytes(log.args.enclaveCommKey));
        }
        return validators;
    }
    // =======================================================================
    // Private: CometBFT abci_query implementation
    // =======================================================================
    requireCometRpcUrl() {
        if (!this.cometRpcUrl) {
            throw new Error('Observer: cometRpcUrl is required when dkgSource is "cosmos-abci"');
        }
        return this.cometRpcUrl;
    }
    async getLatestActiveNetwork() {
        return queryLatestActiveDKGNetwork(this.requireCometRpcUrl());
    }
    /**
     * Fetch x/dkg module Params, cached for the lifetime of this Observer.
     * Uses the configured `cometRpcUrl`; falls back to
     * {@link Observer.DEFAULT_COMET_RPC_URL} with a one-time warning when none
     * is set.
     */
    async getDKGParams() {
        if (!this.dkgParamsPromise) {
            const url = this.cometRpcUrl ?? Observer.DEFAULT_COMET_RPC_URL;
            if (!this.cometRpcUrl && !this.defaultCometUrlWarned) {
                this.defaultCometUrlWarned = true;
                // eslint-disable-next-line no-console
                console.warn("[cdr-sdk] Using the default CometBFT RPC URL over plaintext HTTP " +
                    `(${Observer.DEFAULT_COMET_RPC_URL}) to fetch DKG params for the event-scan lookback. ` +
                    "A network-level attacker can forge params and shrink/expand the scan window. " +
                    "For production, pass `cometRpcUrl` to CDRClient pointing to your own CometBFT node " +
                    "or an HTTPS endpoint.");
            }
            this.dkgParamsPromise = queryDKGParams(url).catch((e) => {
                this.dkgParamsPromise = null;
                throw e;
            });
        }
        return this.dkgParamsPromise;
    }
    /**
     * Lookback window for EVM event scans, in blocks:
     *   2 × (registrationPeriod + dealingPeriod + finalizationPeriod) + activePeriod
     *
     * Falls back to {@link Observer.DEFAULT_LOOKBACK_BLOCKS} when DKG params
     * are unreachable on every CometBFT URL.
     */
    async getLookbackBlocks() {
        try {
            const p = await this.getDKGParams();
            return 2n * (p.registrationPeriod + p.dealingPeriod + p.finalizationPeriod)
                + p.activePeriod;
        }
        catch {
            return Observer.DEFAULT_LOOKBACK_BLOCKS;
        }
    }
    async getGlobalPubKeyFromCosmos() {
        const network = await this.getLatestActiveNetwork();
        return network.globalPublicKey;
    }
    async getRegisteredValidatorsFromCosmos(params) {
        let round = params?.round;
        const codeCommitmentHex = params?.codeCommitmentHex ?? "";
        if (round === undefined) {
            round = (await this.getLatestActiveNetwork()).round;
        }
        const registrations = await queryVerifiedRegistrations(this.requireCometRpcUrl(), round, codeCommitmentHex);
        const validators = new Map();
        for (const reg of registrations) {
            validators.set(reg.validatorAddr.toLowerCase(), reg.commPubKey);
        }
        return validators;
    }
}
//# sourceMappingURL=observer.js.map