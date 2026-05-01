export class CDRError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = "CDRError";
        this.code = code;
    }
}
export class WalletClientRequiredError extends CDRError {
    constructor() {
        super("WalletClient is required for write operations", "WALLET_CLIENT_REQUIRED");
    }
}
export class PartialCollectionTimeoutError extends CDRError {
    constructor(collected, needed, timeoutMs) {
        super(`Timed out collecting partials after ${timeoutMs}ms: got ${collected}/${needed}`, "PARTIAL_COLLECTION_TIMEOUT");
    }
}
export class ContractRevertError extends CDRError {
    reason;
    constructor(reason) {
        super(`Contract reverted: ${reason}`, "CONTRACT_REVERT");
        this.reason = reason;
    }
}
export class InvalidParamsError extends CDRError {
    constructor(message) {
        super(message, "INVALID_PARAMS");
    }
}
export class ObserverRequiredError extends CDRError {
    constructor() {
        super("globalPubKey and threshold are required when no Observer is configured", "OBSERVER_REQUIRED");
    }
}
export class CidIntegrityError extends CDRError {
    constructor(expected, actual) {
        super(`CID integrity check failed: expected ${expected}, got ${actual}`, "CID_INTEGRITY");
    }
}
export class RpcConsensusError extends CDRError {
    constructor(field) {
        super(`RPC consensus failure: ${field} returned different values across providers`, "RPC_CONSENSUS");
    }
}
export class InvalidConditionContractError extends CDRError {
    constructor(address, type) {
        super(`${type} condition contract at ${address} does not implement the required interface`, "INVALID_CONDITION_CONTRACT");
    }
}
export class LabelMismatchError extends CDRError {
    constructor(expected, actual) {
        super(`TDH2 ciphertext label mismatch: expected ${expected}, got ${actual}`, "LABEL_MISMATCH");
    }
}
export class ContentSizeExceededError extends CDRError {
    actual;
    max;
    constructor(actual, max) {
        super(`Vault payload size ${actual} bytes exceeds max ${max} bytes`, "CONTENT_SIZE_EXCEEDED");
        this.actual = actual;
        this.max = max;
    }
}
//# sourceMappingURL=errors.js.map