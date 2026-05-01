import type { StorageProvider, UploadOptions } from "./types.js";
/** A function that parses a CID string into a CID object compatible with helia. */
export type CIDParser = (cid: string) => any;
/** IPFS storage provider using the Helia SDK. */
export declare class HeliaProvider implements StorageProvider {
    private helia;
    private fs;
    private parseCID?;
    /**
     * @param params.helia - An initialized Helia node instance (used for pinning)
     * @param params.unixfs - A @helia/unixfs instance created from the Helia node
     * @param params.CID - (Recommended) CID parser from the **same** `multiformats`
     *   package that helia depends on. Avoids version-mismatch `instanceof` failures.
     *   If omitted, falls back to dynamic `import("multiformats/cid")` which may
     *   fail if multiple multiformats versions are installed.
     *
     * @example
     * ```ts
     * import { CID } from "multiformats/cid";
     * const provider = new HeliaProvider({
     *   helia,
     *   unixfs: fs,
     *   CID: (s) => CID.parse(s),
     * });
     * ```
     */
    constructor(params: {
        helia: any;
        unixfs: any;
        CID?: CIDParser;
    });
    upload(data: Uint8Array, options?: UploadOptions): Promise<string>;
    download(cid: string): Promise<Uint8Array>;
}
//# sourceMappingURL=helia.d.ts.map