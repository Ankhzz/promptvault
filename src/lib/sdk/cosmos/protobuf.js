/**
 * Minimal protobuf wire-format primitives.
 *
 * Supports only what the x/dkg query messages need:
 *   - wire type 0 (varint): uint32, int64, bool, enum
 *   - wire type 2 (length-delimited): string, bytes, nested messages
 */
export class Writer {
    chunks = [];
    writeVarint(n) {
        let value = typeof n === "bigint" ? n : BigInt(n);
        if (value < 0n)
            value += 1n << 64n;
        while (value >= 0x80n) {
            this.chunks.push(Number(value & 0x7fn) | 0x80);
            value >>= 7n;
        }
        this.chunks.push(Number(value));
        return this;
    }
    writeTag(field, wireType) {
        return this.writeVarint((field << 3) | wireType);
    }
    writeUint32(field, value) {
        if (value === 0)
            return this;
        return this.writeTag(field, 0).writeVarint(value);
    }
    writeBool(field, value) {
        if (!value)
            return this;
        return this.writeTag(field, 0).writeVarint(1);
    }
    writeString(field, value) {
        if (value.length === 0)
            return this;
        const bytes = new TextEncoder().encode(value);
        return this.writeBytes(field, bytes);
    }
    writeBytes(field, value) {
        if (value.length === 0)
            return this;
        this.writeTag(field, 2).writeVarint(value.length);
        for (let i = 0; i < value.length; i++)
            this.chunks.push(value[i]);
        return this;
    }
    writeMessage(field, encoded) {
        this.writeTag(field, 2).writeVarint(encoded.length);
        for (let i = 0; i < encoded.length; i++)
            this.chunks.push(encoded[i]);
        return this;
    }
    finish() {
        return Uint8Array.from(this.chunks);
    }
}
export class Reader {
    buf;
    offset = 0;
    constructor(buf) {
        this.buf = buf;
    }
    get eof() {
        return this.offset >= this.buf.length;
    }
    readVarint() {
        let result = 0n;
        let shift = 0n;
        while (true) {
            if (this.offset >= this.buf.length)
                throw new Error("varint: EOF");
            const b = this.buf[this.offset++];
            result |= BigInt(b & 0x7f) << shift;
            if ((b & 0x80) === 0)
                return result;
            shift += 7n;
            if (shift > 63n)
                throw new Error("varint: too long");
        }
    }
    readUint32() {
        return Number(this.readVarint() & 0xffffffffn);
    }
    readInt64() {
        return BigInt.asIntN(64, this.readVarint());
    }
    readBool() {
        return this.readVarint() !== 0n;
    }
    readTag() {
        const tag = Number(this.readVarint());
        return { field: tag >>> 3, wireType: tag & 0x7 };
    }
    readLenDelim() {
        const len = Number(this.readVarint());
        if (this.offset + len > this.buf.length) {
            throw new Error("length-delim: out of bounds");
        }
        const out = this.buf.subarray(this.offset, this.offset + len);
        this.offset += len;
        return out;
    }
    readString() {
        return new TextDecoder().decode(this.readLenDelim());
    }
    skipField(wireType) {
        switch (wireType) {
            case 0:
                this.readVarint();
                return;
            case 1:
                this.offset += 8;
                return;
            case 2:
                this.readLenDelim();
                return;
            case 5:
                this.offset += 4;
                return;
            default:
                throw new Error(`unsupported wire type: ${wireType}`);
        }
    }
}
export function bytesToHex(b) {
    let s = "";
    for (let i = 0; i < b.length; i++) {
        s += b[i].toString(16).padStart(2, "0");
    }
    return s;
}
export function base64ToBytes(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
export function bytesToBase64(b) {
    let s = "";
    for (let i = 0; i < b.length; i++)
        s += String.fromCharCode(b[i]);
    return btoa(s);
}
//# sourceMappingURL=protobuf.js.map