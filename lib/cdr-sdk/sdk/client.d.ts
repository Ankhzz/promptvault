import { type PublicClient, type WalletClient } from "viem";
import type { Network } from "@piplabs/cdr-contracts";
import { Uploader } from "./uploader.js";
import { Consumer } from "./consumer.js";
import { Observer, type DkgSource } from "./observer.js";
export declare class CDRClient {
    readonly observer: Observer;
    private _uploader;
    private _consumer;
    constructor(params: {
        network: Network;
        publicClient: PublicClient;
        walletClient?: WalletClient;
        /**
         * Which backend to use for DKG queries (globalPubKey, participant count,
         * threshold, registered validators, and — in Consumer.collectPartials —
         * partial decryption submissions). Defaults to `"evm-events"`, which
         * scans DKG/CDR contract events via the provided publicClient.
         *
         * Use `"cosmos-abci"` to query the x/dkg keeper directly via CometBFT
         * abci_query (port 26657). This avoids wide eth_getLogs ranges and removes
         * the need for any auxiliary HTTP proxy.
         */
        dkgSource?: DkgSource;
        /** CometBFT RPC base URL (e.g. `"http://node:26657"`). Required when `dkgSource === "cosmos-abci"`. */
        cometRpcUrl?: string;
        /** Minimum threshold ratio override (0-1). The effective threshold is max(source threshold, ceil(participants * minThresholdRatio)). */
        minThresholdRatio?: number;
        /** Additional RPC URLs for cross-validating critical on-chain reads (used only in "evm-events" mode). */
        validationRpcUrls?: string[];
    });
    /** Access the uploader. Throws WalletClientRequiredError if no wallet was provided. */
    get uploader(): Uploader;
    /** Access the consumer. Throws WalletClientRequiredError if no wallet was provided. */
    get consumer(): Consumer;
}
//# sourceMappingURL=client.d.ts.map