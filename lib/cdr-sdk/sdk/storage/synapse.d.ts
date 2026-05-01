import type { StorageProvider } from "./types.js";
/**
 * Filecoin storage provider using the Synapse SDK.
 *
 * Note: the string returned from `upload` and accepted by `download` is a
 * Filecoin PieceCID, not an IPFS CID. It is only resolvable by another
 * SynapseProvider pointed at the same network.
 */
export declare class SynapseProvider implements StorageProvider {
    private synapse;
    /**
     * @param synapse - An instance created via `Synapse.create({ chain, transport, account })`
     *                  from `@filoz/synapse-sdk`.
     */
    constructor(synapse: any);
    upload(data: Uint8Array): Promise<string>;
    download(pieceCid: string): Promise<Uint8Array>;
}
//# sourceMappingURL=synapse.d.ts.map