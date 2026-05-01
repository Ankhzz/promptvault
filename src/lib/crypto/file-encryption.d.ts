/** Encrypt file content with a random AES-256-GCM key.
 *  Returns ciphertext (IV || encrypted || GCM tag) and the 32-byte key. */
export declare function encryptFile(plaintext: Uint8Array): {
    ciphertext: Uint8Array;
    key: Uint8Array;
};
/** Decrypt file content given the AES-256-GCM key.
 *  Expects ciphertext format: IV (12 bytes) || encrypted || GCM tag. */
export declare function decryptFile(params: {
    ciphertext: Uint8Array;
    key: Uint8Array;
}): Uint8Array;
//# sourceMappingURL=file-encryption.d.ts.map