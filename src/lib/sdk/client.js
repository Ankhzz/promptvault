import { createPublicClient, http } from "viem";
import { Uploader } from "./uploader.js";
import { Consumer } from "./consumer.js";
import { Observer } from "./observer.js";
import { WalletClientRequiredError } from "./errors.js";
export class CDRClient {
    observer;
    _uploader;
    _consumer;
    constructor(params) {
        const { network, publicClient, walletClient, cometRpcUrl, dkgSource } = params;
        const validationClients = params.validationRpcUrls?.map(url => createPublicClient({ transport: http(url) }));
        this.observer = new Observer({
            network,
            publicClient,
            dkgSource,
            cometRpcUrl,
            minThresholdRatio: params.minThresholdRatio,
            validationClients,
        });
        if (walletClient) {
            this._uploader = new Uploader({ network, publicClient, walletClient });
            this._consumer = new Consumer({ network, publicClient, walletClient, observer: this.observer });
        }
        else {
            this._uploader = null;
            this._consumer = null;
        }
    }
    /** Access the uploader. Throws WalletClientRequiredError if no wallet was provided. */
    get uploader() {
        if (!this._uploader)
            throw new WalletClientRequiredError();
        return this._uploader;
    }
    /** Access the consumer. Throws WalletClientRequiredError if no wallet was provided. */
    get consumer() {
        if (!this._consumer)
            throw new WalletClientRequiredError();
        return this._consumer;
    }
}
//# sourceMappingURL=client.js.map