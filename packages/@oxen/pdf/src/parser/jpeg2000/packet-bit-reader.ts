/**
 * @file src/pdf/parser/jpeg2000/packet-bit-reader.ts
 */











export class PacketBitReader {
  private readonly data: Uint8Array;
  private bytePos: number;
  private bitPos: number;

  constructor(data: Uint8Array) {
    if (!data) {throw new Error("data is required");}
    this.data = data;
    this.bytePos = 0;
    this.bitPos = 0;
  }

  get offset(): number {
    return this.bytePos;
  }

  readBit(): 0 | 1 {
    if (this.bytePos >= this.data.length) {
      throw new Error("PacketBitReader: out of data");
    }
    const b = this.data[this.bytePos] ?? 0;
    const bit = (b >> (7 - this.bitPos)) & 1;
    this.bitPos += 1;
    if (this.bitPos >= 8) {
      this.bitPos = 0;
      this.bytePos += 1;
    }
    return bit as 0 | 1;
  }

  readBits(n: number): number {
    if (!Number.isFinite(n) || n < 0) {throw new Error(`readBits: n must be >= 0 (got ${n})`);}
    let v = 0;
    for (let i = 0; i < n; i += 1) {
      v = (v << 1) | this.readBit();
    }
    return v >>> 0;
  }

  alignToByte(): void {
    if (this.bitPos === 0) {return;}
    this.bitPos = 0;
    this.bytePos += 1;
  }

  readBytes(n: number): Uint8Array {
    this.alignToByte();
    if (!Number.isFinite(n) || n < 0) {throw new Error(`readBytes: n must be >= 0 (got ${n})`);}
    const start = this.bytePos;
    const end = start + n;
    if (end > this.data.length) {
      throw new Error(`PacketBitReader: readBytes out of range (need ${end}, have ${this.data.length})`);
    }
    this.bytePos = end;
    return this.data.slice(start, end);
  }
}

