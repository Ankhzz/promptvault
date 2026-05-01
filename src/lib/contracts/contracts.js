import { getContract } from "viem";
import { dkgAbi } from "./abis/dkg.js";
import { cdrAbi } from "./abis/cdr.js";
import { contractAddresses } from "./addresses.js";
function buildClient(publicClient, walletClient) {
    if (publicClient && walletClient) {
        return { public: publicClient, wallet: walletClient };
    }
    if (publicClient) {
        return publicClient;
    }
    if (walletClient) {
        return walletClient;
    }
    throw new Error("At least one of publicClient or walletClient must be provided");
}
export function getDKGContract(params) {
    return getContract({
        address: contractAddresses[params.network].dkg,
        abi: dkgAbi,
        client: buildClient(params.publicClient, params.walletClient),
    });
}
export function getCDRContract(params) {
    return getContract({
        address: contractAddresses[params.network].cdr,
        abi: cdrAbi,
        client: buildClient(params.publicClient, params.walletClient),
    });
}
//# sourceMappingURL=contracts.js.map