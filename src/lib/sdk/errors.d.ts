export declare class CDRError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class WalletClientRequiredError extends CDRError {
    constructor();
}
export declare class PartialCollectionTimeoutError extends CDRError {
    constructor(collected: number, needed: number, timeoutMs: number);
}
export declare class ContractRevertError extends CDRError {
    reason: string;
    constructor(reason: string);
}
export declare class InvalidParamsError extends CDRError {
    constructor(message: string);
}
export declare class ObserverRequiredError extends CDRError {
    constructor();
}
export declare class CidIntegrityError extends CDRError {
    constructor(expected: string, actual: string);
}
export declare class RpcConsensusError extends CDRError {
    constructor(field: string);
}
export declare class InvalidConditionContractError extends CDRError {
    constructor(address: string, type: "write" | "read");
}
export declare class LabelMismatchError extends CDRError {
    constructor(expected: string, actual: string);
}
export declare class ContentSizeExceededError extends CDRError {
    actual: number;
    max: bigint;
    constructor(actual: number, max: bigint);
}
//# sourceMappingURL=errors.d.ts.map