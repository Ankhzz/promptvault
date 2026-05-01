import type { StorageProvider, UploadOptions } from "./types.js";
/** Generic IPFS HTTP API + gateway provider. */
export declare class GatewayProvider implements StorageProvider {
    private apiUrl;
    private gatewayUrl;
    /**
     * @param params.apiUrl - IPFS HTTP API endpoint (e.g. "http://localhost:5001")
     * @param params.gatewayUrl - IPFS gateway base URL (e.g. "https://gateway.pinata.cloud/ipfs")
     */
    constructor(params: {
        apiUrl: string;
        gatewayUrl: string;
    });
    upload(data: Uint8Array, options?: UploadOptions): Promise<string>;
    download(cid: string): Promise<Uint8Array>;
}
//# sourceMappingURL=gateway.d.ts.map