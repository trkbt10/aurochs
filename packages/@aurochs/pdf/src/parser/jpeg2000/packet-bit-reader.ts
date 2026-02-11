/**
 * @file src/pdf/parser/jpeg2000/packet-bit-reader.ts
 */

/** Bit-level reader for JPEG 2000 packet headers. */
export type PacketBitReader = Readonly<{
  readonly offset: number;
  readBit(): 0 | 1;
  readBits(n: number): number;
  alignToByte(): void;
  readBytes(n: number): Uint8Array;
}>;

/**
 * Creates a bit-level reader for JPEG 2000 packet headers.
 *
 * The reader provides bit-by-bit access to the packet header data,
 * supporting both individual bit reads and multi-bit value reads.
 */
export function createPacketBitReader(data: Uint8Array): PacketBitReader {
  if (!data) {throw new Error("data is required");}

  // Bit reader state: current byte position and bit offset within the byte
  const readerState = { bytePos: 0, bitPos: 0 };

  function readBit(): 0 | 1 {
    if (readerState.bytePos >= data.length) {
      throw new Error("PacketBitReader: out of data");
    }
    const b = data[readerState.bytePos] ?? 0;
    const bit = (b >> (7 - readerState.bitPos)) & 1;
    readerState.bitPos += 1;
    if (readerState.bitPos >= 8) {
      readerState.bitPos = 0;
      readerState.bytePos += 1;
    }
    return bit as 0 | 1;
  }

  function readBits(n: number): number {
    if (!Number.isFinite(n) || n < 0) {throw new Error(`readBits: n must be >= 0 (got ${n})`);}
    const v = Array.from({ length: n }, () => readBit()).reduce<number>((acc, bit) => (acc << 1) | bit, 0);
    return v >>> 0;
  }

  function alignToByte(): void {
    if (readerState.bitPos === 0) {return;}
    readerState.bitPos = 0;
    readerState.bytePos += 1;
  }

  function readBytes(n: number): Uint8Array {
    alignToByte();
    if (!Number.isFinite(n) || n < 0) {throw new Error(`readBytes: n must be >= 0 (got ${n})`);}
    const start = readerState.bytePos;
    const end = start + n;
    if (end > data.length) {
      throw new Error(`PacketBitReader: readBytes out of range (need ${end}, have ${data.length})`);
    }
    readerState.bytePos = end;
    return data.slice(start, end);
  }

  return {
    get offset() {
      return readerState.bytePos;
    },
    readBit,
    readBits,
    alignToByte,
    readBytes,
  };
}
