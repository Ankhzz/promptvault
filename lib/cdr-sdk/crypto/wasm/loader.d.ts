/**
 * TypeScript loader for the cb-mpc TDH2 WASM module.
 *
 * Usage:
 *   import { initWasm, getWasm } from "./loader.js";
 *   await initWasm();
 *   const wasm = getWasm();
 *   const raw = wasm.tdh2Encrypt(globalPubKey, plaintext, label);
 */
/** Opaque WASM module instance */
interface EmscriptenModule {
    _malloc(size: number): number;
    _free(ptr: number): void;
    _wasm_tdh2_pub_key_from_point(data: number, size: number, outHandle: number): number;
    _wasm_tdh2_free_pub_key(handle: number): void;
    _wasm_tdh2_encrypt(handle: number, plainPtr: number, plainSize: number, labelPtr: number, labelSize: number, outPtrPtr: number, outSizePtr: number): number;
    _wasm_tdh2_verify(handle: number, ctPtr: number, ctSize: number, labelPtr: number, labelSize: number): number;
    _wasm_ac_new_node(nodeType: number, namePtr: number, nameSize: number, threshold: number): number;
    _wasm_ac_add_child(parent: number, child: number): void;
    _wasm_ac_set_node_pid(handle: number, pid: number): void;
    _wasm_ac_new(root: number, curveCode: number): number;
    _wasm_ac_free(handle: number): void;
    _wasm_tdh2_combine(acHandle: number, pubKeyHandle: number, n: number, namesData: number, namesSizes: number, pubSharesData: number, pubSharesSizes: number, ctData: number, ctSize: number, labelData: number, labelSize: number, partialsData: number, partialsSizes: number, outPtrPtr: number, outSizePtr: number): number;
    _wasm_tdh2_extract_label(ctPtr: number, ctSize: number, outPtrPtr: number, outSizePtr: number): number;
    _wasm_ptr_size(): number;
    _wasm_seed_random(data: number, size: number): void;
    HEAPU8: Uint8Array;
    HEAP32: Int32Array;
    getValue(ptr: number, type: string): number;
    setValue(ptr: number, value: number, type: string): void;
}
/** Ed25519 curve code in cb-mpc (NID_ED25519 = 0x043f = 1087) */
export declare const CURVE_ED25519 = 1087;
/**
 * High-level wrapper around the cb-mpc TDH2 WASM module.
 * Exposed as CbMpcWasm for consumers that need the type.
 */
export declare class CbMpcWasm {
    private M;
    constructor(module: EmscriptenModule);
    /**
     * Encrypt plaintext to a TDH2 public key.
     *
     * @param globalPubKey  Serialized EC point (curve-code prefixed) — the DKG global public key
     * @param plaintext     Data to encrypt
     * @param label         Associated data label
     * @returns Serialized TDH2 ciphertext bytes
     */
    tdh2Encrypt(globalPubKey: Uint8Array, plaintext: Uint8Array, label: Uint8Array): Uint8Array;
    /**
     * Verify a TDH2 ciphertext against a public key and label.
     */
    tdh2Verify(globalPubKey: Uint8Array, ciphertext: Uint8Array, label: Uint8Array): boolean;
    tdh2Combine(names: string[], pubShares: Uint8Array[], partials: Uint8Array[], globalPubKey: Uint8Array, ciphertext: Uint8Array, label: Uint8Array, threshold: number): Uint8Array;
    /**
     * Extract the label (associated data) from a serialized TDH2 ciphertext.
     *
     * @param ciphertext  Serialized TDH2 ciphertext bytes
     * @returns The label bytes embedded in the ciphertext
     */
    tdh2ExtractLabel(ciphertext: Uint8Array): Uint8Array;
    private allocBytes;
    private allocConcatArrays;
    private readResult;
}
/**
 * Initialize the WASM module. Must be called once before using tdh2Encrypt/tdh2Combine.
 * Subsequent calls are no-ops and return immediately.
 *
 * @param options.skipHashCheck - If true, skip SHA-256 verification of the WASM binary (default: false)
 */
export declare function initWasm(options?: {
    skipHashCheck?: boolean;
}): Promise<void>;
/**
 * Return the initialized WASM instance, or null if initWasm() has not been called.
 */
export declare function getWasm(): CbMpcWasm | null;
/**
 * Reset the WASM instance. Primarily for use in tests.
 */
export declare function resetWasm(): void;
/**
 * Inject a pre-built CbMpcWasm instance. For use in tests only.
 */
export declare function setWasmForTesting(instance: CbMpcWasm): void;
export {};
//# sourceMappingURL=loader.d.ts.map