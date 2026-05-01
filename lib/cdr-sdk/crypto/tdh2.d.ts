import type { TDH2Ciphertext, DecryptedPartial } from "./types.js";
/**
 * Encrypt plaintext using TDH2 threshold encryption.
 *
 * The ciphertext can only be decrypted by collecting >= threshold partial
 * decryptions from DKG committee validators and combining them.
 */
export declare function tdh2Encrypt(params: {
    plaintext: Uint8Array;
    /** 32-byte Ed25519 global DKG public key */
    globalPubKey: Uint8Array;
    label: Uint8Array;
}): Promise<TDH2Ciphertext>;
/**
 * Verify a TDH2 ciphertext against a public key and label.
 * Returns true if valid, false otherwise.
 */
export declare function tdh2Verify(params: {
    ciphertext: Uint8Array;
    globalPubKey: Uint8Array;
    label: Uint8Array;
}): Promise<boolean>;
/**
 * Extract the label (associated data) from a serialized TDH2 ciphertext.
 * Returns the label bytes embedded in the ciphertext.
 */
export declare function tdh2ExtractLabel(ciphertext: Uint8Array): Uint8Array;
export declare function tdh2Combine(params: {
    ciphertext: TDH2Ciphertext;
    partials: DecryptedPartial[];
    globalPubKey: Uint8Array;
    label: Uint8Array;
    threshold: number;
}): Promise<Uint8Array>;
//# sourceMappingURL=tdh2.d.ts.map