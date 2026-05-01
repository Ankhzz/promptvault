import { getWasm } from "./wasm/loader.js";
import { WasmNotInitializedError, InsufficientPartialsError, InvalidCiphertextError } from "./errors.js";
/**
 * Encrypt plaintext using TDH2 threshold encryption.
 *
 * The ciphertext can only be decrypted by collecting >= threshold partial
 * decryptions from DKG committee validators and combining them.
 */
export async function tdh2Encrypt(params) {
    const wasm = getWasm();
    if (!wasm)
        throw new WasmNotInitializedError();
    const raw = wasm.tdh2Encrypt(params.globalPubKey, params.plaintext, params.label);
    return { raw, label: params.label };
}
/**
 * Verify a TDH2 ciphertext against a public key and label.
 * Returns true if valid, false otherwise.
 */
export async function tdh2Verify(params) {
    const wasm = getWasm();
    if (!wasm)
        throw new WasmNotInitializedError();
    return wasm.tdh2Verify(params.globalPubKey, params.ciphertext, params.label);
}
/**
 * Extract the label (associated data) from a serialized TDH2 ciphertext.
 * Returns the label bytes embedded in the ciphertext.
 */
export function tdh2ExtractLabel(ciphertext) {
    const wasm = getWasm();
    if (!wasm)
        throw new WasmNotInitializedError();
    return wasm.tdh2ExtractLabel(ciphertext);
}
export async function tdh2Combine(params) {
    const wasm = getWasm();
    if (!wasm)
        throw new WasmNotInitializedError();
    const { ciphertext, partials, globalPubKey, label, threshold } = params;
    if (partials.length < threshold) {
        throw new InsufficientPartialsError(partials.length, threshold);
    }
    if (ciphertext.raw.length === 0) {
        throw new InvalidCiphertextError("empty ciphertext");
    }
    const names = partials.map((p) => p.name);
    const pubShares = partials.map((p) => p.pubShare);
    const partialBytes = partials.map((p) => p.partial);
    return wasm.tdh2Combine(names, pubShares, partialBytes, globalPubKey, ciphertext.raw, label, threshold);
}
//# sourceMappingURL=tdh2.js.map