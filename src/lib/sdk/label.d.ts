/**
 * Derive a deterministic 32-byte TDH2 label from a vault UUID.
 * Matches the Go validator's uuidToLabel(): 28 zero bytes + 4-byte big-endian UUID.
 */
export declare function uuidToLabel(uuid: number): Uint8Array;
//# sourceMappingURL=label.d.ts.map