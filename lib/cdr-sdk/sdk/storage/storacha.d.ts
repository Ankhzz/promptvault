import type { StorageProvider } from "./types.js";
/** Storage provider using Storacha (w3up) SDK. */
export declare class StorachaProvider implements StorageProvider {
    private client;
    /**
     * @param client - A configured @storacha/client instance (with space set)
     */
    constructor(client: any);
    upload(data: Uint8Array): Promise<string>;
    download(cid: string): Promise<Uint8Array>;
}
//# sourceMappingURL=storacha.d.ts.map