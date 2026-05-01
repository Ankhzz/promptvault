/**
 * Minimal protobuf wire-format primitives.
 *
 * Supports only what the x/dkg query messages need:
 *   - wire type 0 (varint): uint32, int64, bool, enum
 *   - wire type 2 (length-delimited): string, bytes, nested messages
 */
export declare class Writer {
    private chunks;
    writeVarint(n: number | bigint): this;
    writeTag(field: number, wireType: number): this;
    writeUint32(field: number, value: number): this;
    writeBool(field: number, value: boolean): this;
    writeString(field: number, value: string): this;
    writeBytes(field: number, value: Uint8Array): this;
    writeMessage(field: number, encoded: Uint8Array): this;
    finish(): Uint8Array;
}
export declare class Reader {
    private readonly buf;
    private offset;
    constructor(buf: Uint8Array);
    get eof(): boolean;
    readVarint(): bigint;
    readUint32(): number;
    readInt64(): bigint;
    readBool(): boolean;
    readTag(): {
        field: number;
        wireType: number;
    };
    readLenDelim(): Uint8Array;
    readString(): string;
    skipField(wireType: number): void;
}
export declare function bytesToHex(b: Uint8Array): string;
export declare function base64ToBytes(b64: string): Uint8Array;
export declare function bytesToBase64(b: Uint8Array): string;
//# sourceMappingURL=protobuf.d.ts.map