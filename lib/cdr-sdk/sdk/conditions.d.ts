/** Condition configuration for a CDR vault read/write gate. */
export interface ConditionConfig {
    /** Address of the condition contract (or zero address for open access). */
    address: `0x${string}`;
    /** ABI-encoded condition data passed to the condition contract. */
    conditionData: `0x${string}`;
}
/** No-restriction condition — anyone can access. */
declare function open(params: {
    address: `0x${string}`;
}): ConditionConfig;
/** Only the specified owner can access. */
declare function ownerOnly(params: {
    address: `0x${string}`;
    owner: `0x${string}`;
}): ConditionConfig;
/** Token-gated access — caller must hold at least `minBalance` of `token`. */
declare function tokenGate(params: {
    address: `0x${string}`;
    token: `0x${string}`;
    minBalance: bigint;
}): ConditionConfig;
/** Merkle-proof gated access — caller must prove inclusion in the tree. */
declare function merkle(params: {
    address: `0x${string}`;
    root: `0x${string}`;
}): ConditionConfig;
/** Pass-through for custom condition contracts with pre-encoded data. */
declare function custom(params: {
    address: `0x${string}`;
    conditionData: `0x${string}`;
}): ConditionConfig;
export declare const conditions: {
    readonly open: typeof open;
    readonly ownerOnly: typeof ownerOnly;
    readonly tokenGate: typeof tokenGate;
    readonly merkle: typeof merkle;
    readonly custom: typeof custom;
};
export {};
//# sourceMappingURL=conditions.d.ts.map