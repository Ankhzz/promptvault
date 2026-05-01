/**
 * Filecoin storage provider using the Synapse SDK.
 *
 * Note: the string returned from `upload` and accepted by `download` is a
 * Filecoin PieceCID, not an IPFS CID. It is only resolvable by another
 * SynapseProvider pointed at the same network.
 */
export class SynapseProvider {
    synapse;
    /**
     * @param synapse - An instance created via `Synapse.create({ chain, transport, account })`
     *                  from `@filoz/synapse-sdk`.
     */
    constructor(synapse) {
        this.synapse = synapse;
    }
    async upload(data) {
        const result = await this.synapse.storage.upload(data);
        return result.pieceCid.toString();
    }
    async download(pieceCid) {
        const data = await this.synapse.storage.download({ pieceCid });
        return new Uint8Array(data);
    }
}
//# sourceMappingURL=synapse.js.map