/** Generic IPFS HTTP API + gateway provider. */
export class GatewayProvider {
    apiUrl;
    gatewayUrl;
    /**
     * @param params.apiUrl - IPFS HTTP API endpoint (e.g. "http://localhost:5001")
     * @param params.gatewayUrl - IPFS gateway base URL (e.g. "https://gateway.pinata.cloud/ipfs")
     */
    constructor(params) {
        this.apiUrl = params.apiUrl.replace(/\/+$/, "");
        this.gatewayUrl = params.gatewayUrl.replace(/\/+$/, "");
    }
    async upload(data, options) {
        const { pin = true } = options ?? {};
        const formData = new FormData();
        const buf = new ArrayBuffer(data.byteLength);
        new Uint8Array(buf).set(data);
        formData.append("file", new Blob([buf]));
        const response = await fetch(`${this.apiUrl}/api/v0/add`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`IPFS API upload failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        const cid = result.Hash;
        if (pin) {
            const pinResponse = await fetch(`${this.apiUrl}/api/v0/pin/add?arg=${cid}`, {
                method: "POST",
            });
            if (!pinResponse.ok) {
                throw new Error(`IPFS pin failed: ${pinResponse.status} ${pinResponse.statusText}`);
            }
        }
        return cid;
    }
    async download(cid) {
        const response = await fetch(`${this.gatewayUrl}/${cid}`);
        if (!response.ok) {
            throw new Error(`IPFS gateway download failed: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }
}
//# sourceMappingURL=gateway.js.map