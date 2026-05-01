import { encodeAbiParameters } from "viem";
/** No-restriction condition — anyone can access. */
function open(params) {
    return { address: params.address, conditionData: "0x" };
}
/** Only the specified owner can access. */
function ownerOnly(params) {
    return {
        address: params.address,
        conditionData: encodeAbiParameters([{ type: "address" }], [params.owner]),
    };
}
/** Token-gated access — caller must hold at least `minBalance` of `token`. */
function tokenGate(params) {
    return {
        address: params.address,
        conditionData: encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [params.token, params.minBalance]),
    };
}
/** Merkle-proof gated access — caller must prove inclusion in the tree. */
function merkle(params) {
    return {
        address: params.address,
        conditionData: encodeAbiParameters([{ type: "bytes32" }], [params.root]),
    };
}
/** Pass-through for custom condition contracts with pre-encoded data. */
function custom(params) {
    return { address: params.address, conditionData: params.conditionData };
}
export const conditions = { open, ownerOnly, tokenGate, merkle, custom };
//# sourceMappingURL=conditions.js.map