/**
 * @file CCITT Fax (Group 3/4) decoder for PDF image streams
 *
 * PDF images can be compressed with the `/CCITTFaxDecode` filter.
 * `pdf-lib` does not support this filter, so we decode it here into a 1bpp
 * packed bitmap (MSB-first within each byte, row-major).
 *
 * ## Supported (current)
 * - `K < 0` (Group 4 / T.6), with `Columns == Width` and `Rows == Height` (or `Rows == 0`)
 * - `K = 0` (Group 3 1D / T.4), with the same dimension constraints
 * - `K > 0` (Group 3 mixed 1D/2D / T.4 2D groups), with the same dimension constraints
 * - `BlackIs1` (handled by inverting the 1bpp output when true)
 * - Optional pre-filters (e.g. `/ASCII85Decode`) are decoded in `image-extractor.ts`
 *
 * ## Not supported (fail-fast)
 * - `DamagedRowsBeforeError != 0` when `EndOfLine=false` (no resync markers)
 *
 * References:
 * - ISO 32000-1:2008 (PDF): CCITTFaxDecode filter parameters
 * - ITU-T T.4 / T.6: fax encoding (Modified Huffman + 2D modes)
 */

export type CcittFaxDecodeParms = Readonly<{
  /**
   * K parameter:
   * - K < 0: Group 4 (T.6) 2D encoding
   * - K = 0: Group 3 (T.4) 1D encoding
   * - K > 0: Group 3 mixed 1D/2D (T.4 2D groups)
   */
  readonly k: number;
  readonly columns: number;
  readonly rows: number;
  readonly endOfLine: boolean;
  readonly encodedByteAlign: boolean;
  readonly blackIs1: boolean;
  readonly endOfBlock: boolean;
  readonly damagedRowsBeforeError: number;
}>;

export type DecodeCcittFaxArgs = Readonly<{
  readonly encoded: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly parms: CcittFaxDecodeParms;
}>;

type RunCode = Readonly<{ readonly bits: number; readonly code: number; readonly run: number }>;

type TrieNode<T> = {
  next0?: TrieNode<T>;
  next1?: TrieNode<T>;
  value?: T;
};

type Color = "white" | "black";

type TwoDCode =
  | Readonly<{ readonly type: "pass" }>
  | Readonly<{ readonly type: "horizontal" }>
  | Readonly<{ readonly type: "vertical"; readonly delta: -3 | -2 | -1 | 0 | 1 | 2 | 3 }>
  | Readonly<{ readonly type: "extension" }>;

// =============================================================================
// Bit Reader (MSB-first)
// =============================================================================

type MsbBitReader = Readonly<{
  savePosition: () => Readonly<{ readonly byteIndex: number; readonly bitIndex: number }>;
  restorePosition: (pos: Readonly<{ readonly byteIndex: number; readonly bitIndex: number }>) => void;
  readBit: () => 0 | 1;
  readBits: (count: number) => number;
  peekBits: (count: number) => number;
  alignToByte: () => void;
}>;

function createMsbBitReader(data: Uint8Array): MsbBitReader {
  if (!data) {
    throw new Error("MsbBitReader: data is required");
  }

  const state = { byteIndex: 0, bitIndex: 0 };

  const savePosition = (): Readonly<{ readonly byteIndex: number; readonly bitIndex: number }> => ({
    byteIndex: state.byteIndex,
    bitIndex: state.bitIndex,
  });

  const restorePosition = (pos: Readonly<{ readonly byteIndex: number; readonly bitIndex: number }>): void => {
    state.byteIndex = pos.byteIndex;
    state.bitIndex = pos.bitIndex;
  };

  const readBit = (): 0 | 1 => {
    const byte = data[state.byteIndex];
    if (byte === undefined) {
      return 0;
    }
    const bit = (byte >> (7 - state.bitIndex)) & 1;
    state.bitIndex += 1;
    if (state.bitIndex === 8) {
      state.bitIndex = 0;
      state.byteIndex += 1;
    }
    return bit as 0 | 1;
  };

  const readBits = (count: number): number => {
    if (!Number.isFinite(count) || count <= 0) {
      throw new Error(`MsbBitReader.readBits: count must be > 0 (got ${count})`);
    }
    if (count > 31) {
      throw new Error(`MsbBitReader.readBits: count must be <= 31 (got ${count})`);
    }

    const acc = { value: 0 };
    for (let i = 0; i < count; i += 1) {
      acc.value = (acc.value << 1) | readBit();
    }
    return acc.value >>> 0;
  };

  const peekBits = (count: number): number => {
    const pos = savePosition();
    const value = readBits(count);
    restorePosition(pos);
    return value;
  };

  const alignToByte = (): void => {
    if (state.bitIndex === 0) {
      return;
    }
    state.bitIndex = 0;
    state.byteIndex += 1;
  };

  return { savePosition, restorePosition, readBit, readBits, peekBits, alignToByte };
}

// =============================================================================
// Huffman Tries (T.4 Modified Huffman)
// =============================================================================

function addToTrie<T>({ root, bits, code, value }: { readonly root: TrieNode<T>; readonly bits: number; readonly code: number; readonly value: T }): TrieNode<T> {
  const state = { node: root };
  for (let i = bits - 1; i >= 0; i -= 1) {
    const bit = (code >> i) & 1;
    if (bit === 0) {
      if (!state.node.next0) {state.node.next0 = {};}
      state.node = state.node.next0;
    } else {
      if (!state.node.next1) {state.node.next1 = {};}
      state.node = state.node.next1;
    }
  }
  state.node.value = value;
  return root;
}

function buildTrie<T>(codes: readonly Readonly<{ readonly bits: number; readonly code: number; readonly value: T }>[]): TrieNode<T> {
  const root: TrieNode<T> = {};
  for (const c of codes) {
    addToTrie({ root, bits: c.bits, code: c.code, value: c.value });
  }
  return root;
}

function decodeFromTrie<T>(reader: MsbBitReader, trie: TrieNode<T>, maxBits: number): T {
  for (let node: TrieNode<T> | undefined = trie, i = 0; i < maxBits; i += 1) {
    const bit = reader.readBit();
    node = bit === 0 ? node?.next0 : node?.next1;
    if (!node) {
      throw new Error("CCITT: encountered invalid code");
    }
    if (node.value !== undefined) {
      return node.value;
    }
  }
  throw new Error("CCITT: code exceeded max bit length");
}

// CCITT T.4 1D codes (terminating + makeup). `run` is run length in pixels.
// These values match the standard tables (run lengths are encoded as: makeup*64 + terminating).
const WHITE_1D_CODES: readonly RunCode[] = [
  { bits: 8, code: 0x35, run: 0 },
  { bits: 6, code: 0x07, run: 1 },
  { bits: 4, code: 0x07, run: 2 },
  { bits: 4, code: 0x08, run: 3 },
  { bits: 4, code: 0x0b, run: 4 },
  { bits: 4, code: 0x0c, run: 5 },
  { bits: 4, code: 0x0e, run: 6 },
  { bits: 4, code: 0x0f, run: 7 },
  { bits: 5, code: 0x13, run: 8 },
  { bits: 5, code: 0x14, run: 9 },
  { bits: 5, code: 0x07, run: 10 },
  { bits: 5, code: 0x08, run: 11 },
  { bits: 6, code: 0x08, run: 12 },
  { bits: 6, code: 0x03, run: 13 },
  { bits: 6, code: 0x34, run: 14 },
  { bits: 6, code: 0x35, run: 15 },
  { bits: 6, code: 0x2a, run: 16 },
  { bits: 6, code: 0x2b, run: 17 },
  { bits: 7, code: 0x27, run: 18 },
  { bits: 7, code: 0x0c, run: 19 },
  { bits: 7, code: 0x08, run: 20 },
  { bits: 7, code: 0x17, run: 21 },
  { bits: 7, code: 0x03, run: 22 },
  { bits: 7, code: 0x04, run: 23 },
  { bits: 7, code: 0x28, run: 24 },
  { bits: 7, code: 0x2b, run: 25 },
  { bits: 7, code: 0x13, run: 26 },
  { bits: 7, code: 0x24, run: 27 },
  { bits: 7, code: 0x18, run: 28 },
  { bits: 8, code: 0x02, run: 29 },
  { bits: 8, code: 0x03, run: 30 },
  { bits: 8, code: 0x1a, run: 31 },
  { bits: 8, code: 0x1b, run: 32 },
  { bits: 8, code: 0x12, run: 33 },
  { bits: 8, code: 0x13, run: 34 },
  { bits: 8, code: 0x14, run: 35 },
  { bits: 8, code: 0x15, run: 36 },
  { bits: 8, code: 0x16, run: 37 },
  { bits: 8, code: 0x17, run: 38 },
  { bits: 8, code: 0x28, run: 39 },
  { bits: 8, code: 0x29, run: 40 },
  { bits: 8, code: 0x2a, run: 41 },
  { bits: 8, code: 0x2b, run: 42 },
  { bits: 8, code: 0x2c, run: 43 },
  { bits: 8, code: 0x2d, run: 44 },
  { bits: 8, code: 0x04, run: 45 },
  { bits: 8, code: 0x05, run: 46 },
  { bits: 8, code: 0x0a, run: 47 },
  { bits: 8, code: 0x0b, run: 48 },
  { bits: 8, code: 0x52, run: 49 },
  { bits: 8, code: 0x53, run: 50 },
  { bits: 8, code: 0x54, run: 51 },
  { bits: 8, code: 0x55, run: 52 },
  { bits: 8, code: 0x24, run: 53 },
  { bits: 8, code: 0x25, run: 54 },
  { bits: 8, code: 0x58, run: 55 },
  { bits: 8, code: 0x59, run: 56 },
  { bits: 8, code: 0x5a, run: 57 },
  { bits: 8, code: 0x5b, run: 58 },
  { bits: 8, code: 0x4a, run: 59 },
  { bits: 8, code: 0x4b, run: 60 },
  { bits: 8, code: 0x32, run: 61 },
  { bits: 8, code: 0x33, run: 62 },
  { bits: 8, code: 0x34, run: 63 },
  // makeup codes
  { bits: 5, code: 0x1b, run: 64 },
  { bits: 5, code: 0x12, run: 128 },
  { bits: 6, code: 0x17, run: 192 },
  { bits: 7, code: 0x37, run: 256 },
  { bits: 8, code: 0x36, run: 320 },
  { bits: 8, code: 0x37, run: 384 },
  { bits: 8, code: 0x64, run: 448 },
  { bits: 8, code: 0x65, run: 512 },
  { bits: 8, code: 0x68, run: 576 },
  { bits: 8, code: 0x67, run: 640 },
  { bits: 9, code: 0xcc, run: 704 },
  { bits: 9, code: 0xcd, run: 768 },
  { bits: 9, code: 0xd2, run: 832 },
  { bits: 9, code: 0xd3, run: 896 },
  { bits: 9, code: 0xd4, run: 960 },
  { bits: 9, code: 0xd5, run: 1024 },
  { bits: 9, code: 0xd6, run: 1088 },
  { bits: 9, code: 0xd7, run: 1152 },
  { bits: 9, code: 0xd8, run: 1216 },
  { bits: 9, code: 0xd9, run: 1280 },
  { bits: 9, code: 0xda, run: 1344 },
  { bits: 9, code: 0xdb, run: 1408 },
  { bits: 9, code: 0x98, run: 1472 },
  { bits: 9, code: 0x99, run: 1536 },
  { bits: 9, code: 0x9a, run: 1600 },
  { bits: 6, code: 0x18, run: 1664 },
  { bits: 9, code: 0x9b, run: 1728 },
  { bits: 11, code: 0x08, run: 1792 },
  { bits: 11, code: 0x0c, run: 1856 },
  { bits: 11, code: 0x0d, run: 1920 },
  { bits: 12, code: 0x12, run: 1984 },
  { bits: 12, code: 0x13, run: 2048 },
  { bits: 12, code: 0x14, run: 2112 },
  { bits: 12, code: 0x15, run: 2176 },
  { bits: 12, code: 0x16, run: 2240 },
  { bits: 12, code: 0x17, run: 2304 },
  { bits: 12, code: 0x1c, run: 2368 },
  { bits: 12, code: 0x1d, run: 2432 },
  { bits: 12, code: 0x1e, run: 2496 },
  { bits: 12, code: 0x1f, run: 2560 },
];

const BLACK_1D_CODES: readonly RunCode[] = [
  { bits: 10, code: 0x37, run: 0 },
  { bits: 3, code: 0x02, run: 1 },
  { bits: 2, code: 0x03, run: 2 },
  { bits: 2, code: 0x02, run: 3 },
  { bits: 3, code: 0x03, run: 4 },
  { bits: 4, code: 0x03, run: 5 },
  { bits: 4, code: 0x02, run: 6 },
  { bits: 5, code: 0x03, run: 7 },
  { bits: 6, code: 0x05, run: 8 },
  { bits: 6, code: 0x04, run: 9 },
  { bits: 7, code: 0x04, run: 10 },
  { bits: 7, code: 0x05, run: 11 },
  { bits: 7, code: 0x07, run: 12 },
  { bits: 8, code: 0x04, run: 13 },
  { bits: 8, code: 0x07, run: 14 },
  { bits: 9, code: 0x18, run: 15 },
  { bits: 10, code: 0x17, run: 16 },
  { bits: 10, code: 0x18, run: 17 },
  { bits: 10, code: 0x08, run: 18 },
  { bits: 11, code: 0x67, run: 19 },
  { bits: 11, code: 0x68, run: 20 },
  { bits: 11, code: 0x6c, run: 21 },
  { bits: 11, code: 0x37, run: 22 },
  { bits: 11, code: 0x28, run: 23 },
  { bits: 11, code: 0x17, run: 24 },
  { bits: 11, code: 0x18, run: 25 },
  { bits: 12, code: 0xca, run: 26 },
  { bits: 12, code: 0xcb, run: 27 },
  { bits: 12, code: 0xcc, run: 28 },
  { bits: 12, code: 0xcd, run: 29 },
  { bits: 12, code: 0x68, run: 30 },
  { bits: 12, code: 0x69, run: 31 },
  { bits: 12, code: 0x6a, run: 32 },
  { bits: 12, code: 0x6b, run: 33 },
  { bits: 12, code: 0xd2, run: 34 },
  { bits: 12, code: 0xd3, run: 35 },
  { bits: 12, code: 0xd4, run: 36 },
  { bits: 12, code: 0xd5, run: 37 },
  { bits: 12, code: 0xd6, run: 38 },
  { bits: 12, code: 0xd7, run: 39 },
  { bits: 12, code: 0x6c, run: 40 },
  { bits: 12, code: 0x6d, run: 41 },
  { bits: 12, code: 0xda, run: 42 },
  { bits: 12, code: 0xdb, run: 43 },
  { bits: 12, code: 0x54, run: 44 },
  { bits: 12, code: 0x55, run: 45 },
  { bits: 12, code: 0x56, run: 46 },
  { bits: 12, code: 0x57, run: 47 },
  { bits: 12, code: 0x64, run: 48 },
  { bits: 12, code: 0x65, run: 49 },
  { bits: 12, code: 0x52, run: 50 },
  { bits: 12, code: 0x53, run: 51 },
  { bits: 12, code: 0x24, run: 52 },
  { bits: 12, code: 0x37, run: 53 },
  { bits: 12, code: 0x38, run: 54 },
  { bits: 12, code: 0x27, run: 55 },
  { bits: 12, code: 0x28, run: 56 },
  { bits: 12, code: 0x58, run: 57 },
  { bits: 12, code: 0x59, run: 58 },
  { bits: 12, code: 0x2b, run: 59 },
  { bits: 12, code: 0x2c, run: 60 },
  { bits: 12, code: 0x5a, run: 61 },
  { bits: 12, code: 0x66, run: 62 },
  { bits: 12, code: 0x67, run: 63 },
  // makeup codes
  { bits: 10, code: 0x0f, run: 64 },
  { bits: 12, code: 0xc8, run: 128 },
  { bits: 12, code: 0xc9, run: 192 },
  { bits: 12, code: 0x5b, run: 256 },
  { bits: 12, code: 0x33, run: 320 },
  { bits: 12, code: 0x34, run: 384 },
  { bits: 12, code: 0x35, run: 448 },
  { bits: 13, code: 0x6c, run: 512 },
  { bits: 13, code: 0x6d, run: 576 },
  { bits: 13, code: 0x4a, run: 640 },
  { bits: 13, code: 0x4b, run: 704 },
  { bits: 13, code: 0x4c, run: 768 },
  { bits: 13, code: 0x4d, run: 832 },
  { bits: 13, code: 0x72, run: 896 },
  { bits: 13, code: 0x73, run: 960 },
  { bits: 13, code: 0x74, run: 1024 },
  { bits: 13, code: 0x75, run: 1088 },
  { bits: 13, code: 0x76, run: 1152 },
  { bits: 13, code: 0x77, run: 1216 },
  { bits: 13, code: 0x52, run: 1280 },
  { bits: 13, code: 0x53, run: 1344 },
  { bits: 13, code: 0x54, run: 1408 },
  { bits: 13, code: 0x55, run: 1472 },
  { bits: 13, code: 0x5a, run: 1536 },
  { bits: 13, code: 0x5b, run: 1600 },
  { bits: 13, code: 0x64, run: 1664 },
  { bits: 13, code: 0x65, run: 1728 },
  { bits: 11, code: 0x08, run: 1792 },
  { bits: 11, code: 0x0c, run: 1856 },
  { bits: 11, code: 0x0d, run: 1920 },
  { bits: 12, code: 0x12, run: 1984 },
  { bits: 12, code: 0x13, run: 2048 },
  { bits: 12, code: 0x14, run: 2112 },
  { bits: 12, code: 0x15, run: 2176 },
  { bits: 12, code: 0x16, run: 2240 },
  { bits: 12, code: 0x17, run: 2304 },
  { bits: 12, code: 0x1c, run: 2368 },
  { bits: 12, code: 0x1d, run: 2432 },
  { bits: 12, code: 0x1e, run: 2496 },
  { bits: 12, code: 0x1f, run: 2560 },
];

const WHITE_TRIE = buildTrie(
  WHITE_1D_CODES.map((c) => ({ bits: c.bits, code: c.code, value: c.run }))
);
const BLACK_TRIE = buildTrie(
  BLACK_1D_CODES.map((c) => ({ bits: c.bits, code: c.code, value: c.run }))
);

function decodeRunLength(reader: MsbBitReader, color: Color): number {
  const trie = color === "white" ? WHITE_TRIE : BLACK_TRIE;
  const maxBits = color === "white" ? 12 : 13;
  for (let total = 0; ; ) {
    const run = decodeFromTrie(reader, trie, maxBits);
    total += run;
    if (run < 64) {
      return total;
    }
    if (total > 1_000_000) {
      throw new Error("CCITT: run length overflow");
    }
  }
}

// =============================================================================
// 2D Codes (T.6)
// =============================================================================

function decode2DCode(reader: MsbBitReader): TwoDCode {
  const b1 = reader.readBit();
  if (b1 === 1) {
    return { type: "vertical", delta: 0 };
  }

  const b2 = reader.readBit();
  if (b2 === 1) {
    const b3 = reader.readBit();
    return b3 === 1 ? { type: "vertical", delta: 1 } : { type: "vertical", delta: -1 };
  }

  const b3 = reader.readBit();
  if (b3 === 1) {
    return { type: "horizontal" };
  }

  const b4 = reader.readBit();
  if (b4 === 1) {
    return { type: "pass" };
  }

  const b5 = reader.readBit();
  if (b5 === 1) {
    const b6 = reader.readBit();
    return b6 === 1 ? { type: "vertical", delta: 2 } : { type: "vertical", delta: -2 };
  }

  const b6 = reader.readBit();
  if (b6 === 1) {
    const b7 = reader.readBit();
    return b7 === 1 ? { type: "vertical", delta: 3 } : { type: "vertical", delta: -3 };
  }

  const b7 = reader.readBit();
  if (b7 === 1) {
    return { type: "extension" };
  }

  throw new Error("CCITT: invalid 2D code");
}

// =============================================================================
// Bitmap Fill
// =============================================================================

function clearRangeInRow(row: Uint8Array, startX: number, endX: number): void {
  if (endX <= startX) {return;}

  const startByte = Math.floor(startX / 8);
  const endByte = Math.floor((endX - 1) / 8);
  const startBitPos = startX % 8; // 0..7 (0 = leftmost)
  const endBitPos = (endX - 1) % 8;

  if (startByte === endByte) {
    const keepLeftMask = ((0xff << (8 - startBitPos)) & 0xff) >>> 0;
    const keepRightMask = ((1 << (7 - endBitPos)) - 1) >>> 0;
    row[startByte] = (row[startByte] ?? 0xff) & (keepLeftMask | keepRightMask);
    return;
  }

  // First byte: clear from startBitPos..7
  row[startByte] = (row[startByte] ?? 0xff) & (((0xff << (8 - startBitPos)) & 0xff) >>> 0);

  // Middle bytes: fully cleared
  for (let i = startByte + 1; i < endByte; i += 1) {
    row[i] = 0;
  }

  // Last byte: clear from 0..endBitPos
  row[endByte] = (row[endByte] ?? 0xff) & (((1 << (7 - endBitPos)) - 1) >>> 0);
}

function writeRunsToBitmapRow({
  out,
  outOffset,
  rowBytes,
  width,
  runs,
}: {
  readonly out: Uint8Array;
  readonly outOffset: number;
  readonly rowBytes: number;
  readonly width: number;
  readonly runs: readonly number[];
}): void {
  // Start with all white (1 bits). Black runs (odd index) clear bits to 0.
  out.fill(0xff, outOffset, outOffset + rowBytes);
  for (let i = 0, x = 0; i < runs.length && x < width; i += 1) {
    const runLen = runs[i] ?? 0;
    if (runLen < 0) {
      throw new Error("CCITT: negative run length");
    }
    const start = x;
    const end = Math.min(width, x + runLen);
    if (i % 2 === 1) {
      // black run
      clearRangeInRow(out.subarray(outOffset, outOffset + rowBytes), start, end);
    }
    x = end;
  }
}

// =============================================================================
// Public API
// =============================================================================











/** Decode `/CCITTFaxDecode`-encoded data into unpacked 1bpp pixels. */
export function decodeCcittFax(args: DecodeCcittFaxArgs): Uint8Array {
  const { encoded, width, height, parms } = args;
  if (!encoded) {throw new Error("decodeCcittFax: encoded is required");}
  if (!Number.isFinite(width) || width <= 0) {throw new Error("decodeCcittFax: width must be > 0");}
  if (!Number.isFinite(height) || height <= 0) {throw new Error("decodeCcittFax: height must be > 0");}

  // PDF uses Columns/Rows to describe the uncompressed bitmap dimensions.
  // Most PDFs also set Width/Height to the same values; we require them to match
  // to avoid silently producing a wrong raster.
  if (parms.columns !== width) {
    throw new Error(`decodeCcittFax: Columns (${parms.columns}) must match width (${width})`);
  }
  if (parms.rows !== 0 && parms.rows !== height) {
    throw new Error(`decodeCcittFax: Rows (${parms.rows}) must match height (${height})`);
  }

  // Not implemented yet: handling EOL markers and error-resync requires additional
  // decoding logic and fixtures. Fail fast rather than returning corrupted output.
  //
  // However, some PDFs set these parms even for Group 4 (K=-1) where EOL markers
  // are not used and damaged-row resync is irrelevant for our decoder. In that
  // case, accept them as no-ops.
  if (parms.k !== -1 && parms.damagedRowsBeforeError !== 0 && !parms.endOfLine) {
    throw new Error("decodeCcittFax: DamagedRowsBeforeError requires EndOfLine=true for resynchronization");
  }

  const rowBytes = Math.ceil(width / 8);
  const out = new Uint8Array(rowBytes * height);

  const reader = createMsbBitReader(encoded);

  const EOL_MARKER_12BIT = 0x001; // 000000000001 (11 zeros + 1)
  const consumeEolMarker = (): void => {
    // The EOL marker is not necessarily byte-aligned.
    // Scan forward until we see the 12-bit EOL pattern.
    for (let i = 0, window = 0; i < 2048; i += 1) {
      window = ((window << 1) | reader.readBit()) & 0xfff;
      if (i >= 11 && window === EOL_MARKER_12BIT) {
        return;
      }
    }
    throw new Error("CCITT: expected EOL marker but did not find it");
  };

  const consumeLeadingEolMarkersIfPresent = (): void => {
    // Some producers emit one or more EOL markers before the first line (and sometimes between lines).
    // Only consume when the next 12 bits match exactly; otherwise leave the stream untouched.
    while (reader.peekBits(12) === EOL_MARKER_12BIT) {
      reader.readBits(12);
      if (parms.encodedByteAlign) {reader.alignToByte();}
    }
  };

  const writeWhiteRow = (y: number): void => {
    out.fill(0xff, y * rowBytes, (y + 1) * rowBytes);
  };

  const canResyncDamagedRows = parms.k !== -1 && parms.endOfLine && parms.damagedRowsBeforeError > 0;
  const damagedState = { streak: 0 };

  const decode1DLine = (): number[] => {
    const runs: number[] = [];
    for (let x = 0; x < width;) {
      const whiteRun = decodeRunLength(reader, "white");
      const w = Math.min(whiteRun, width - x);
      runs.push(w);
      x += w;
      if (x >= width) {break;}

      const blackRun = decodeRunLength(reader, "black");
      const b = Math.min(blackRun, width - x);
      runs.push(b);
      x += b;
    }
    runs.push(0);
    return runs;
  };

  const decode2DLine = (referenceRuns: number[]): number[] => {
    const runs: number[] = [];
    const state = { a0: 0, pending: 0, pbIndex: 1, b1: referenceRuns[0] ?? width };

    const checkB1 = (): void => {
      if (runs.length === 0) {return;}
      while (state.b1 <= state.a0 && state.b1 < width) {
        const r0 = referenceRuns[state.pbIndex] ?? 0;
        const r1 = referenceRuns[state.pbIndex + 1] ?? 0;
        state.b1 += r0 + r1;
        state.pbIndex += 2;
      }
    };

    const setValue = (len: number): void => {
      const value = state.pending + len;
      if (value < 0) {throw new Error("CCITT: negative run length");}
      runs.push(value);
      state.a0 += len;
      state.pending = 0;
    };

    for (; state.a0 < width;) {
      const code = decode2DCode(reader);
      switch (code.type) {
        case "pass": {
          checkB1();
          const b2Delta = referenceRuns[state.pbIndex] ?? 0;
          state.pbIndex += 1;
          const b2 = state.b1 + b2Delta;
          state.pending += b2 - state.a0;
          state.a0 = b2;
          const nextDelta = referenceRuns[state.pbIndex] ?? 0;
          state.pbIndex += 1;
          state.b1 = b2 + nextDelta;
          break;
        }
        case "horizontal": {
          const blackFirst = runs.length % 2 === 1;
          if (blackFirst) {
            const blackRun = decodeRunLength(reader, "black");
            setValue(blackRun);
            const whiteRun = decodeRunLength(reader, "white");
            setValue(whiteRun);
          } else {
            const whiteRun = decodeRunLength(reader, "white");
            setValue(whiteRun);
            const blackRun = decodeRunLength(reader, "black");
            setValue(blackRun);
          }
          checkB1();
          break;
        }
        case "vertical": {
          checkB1();
          const len = state.b1 - state.a0 + code.delta;
          if (len < 0) {
            throw new Error("CCITT: vertical code produced negative run");
          }
          setValue(len);
          if (code.delta >= 0) {
            const delta = referenceRuns[state.pbIndex] ?? 0;
            state.pbIndex += 1;
            state.b1 += delta;
          } else {
            state.pbIndex -= 1;
            state.b1 -= referenceRuns[state.pbIndex] ?? 0;
          }
          break;
        }
        case "extension": {
          // Not supported: treat as end of line for robustness
          state.pending += width - state.a0;
          state.a0 = width;
          break;
        }
      }
    }

    if (state.pending > 0 || runs.length === 0) {
      runs.push(state.pending);
      state.pending = 0;
    }
    runs.push(0);
    return runs;
  };

  if (parms.k === 0) {
    // Group 3 1D: each line is alternating white/black run lengths.
    for (let y = 0; y < height; y += 1) {
      if (parms.endOfLine) {
        consumeLeadingEolMarkersIfPresent();
      }
      try {
        const runs = decode1DLine();
        writeRunsToBitmapRow({ out, outOffset: y * rowBytes, rowBytes, width, runs });
        damagedState.streak = 0;
      } catch (error) {
        if (!canResyncDamagedRows) {
          throw error;
        }
        damagedState.streak += 1;
        if (damagedState.streak > parms.damagedRowsBeforeError) {
          throw error;
        }
        writeWhiteRow(y);
        consumeEolMarker();
        if (parms.encodedByteAlign) {reader.alignToByte();}
        continue;
      }

      if (parms.endOfLine) {
        consumeEolMarker();
        if (parms.encodedByteAlign) {reader.alignToByte();}
      } else if (parms.encodedByteAlign) {
        reader.alignToByte();
      }
    }
    if (parms.blackIs1) {
      for (let i = 0; i < out.length; i += 1) {out[i] = (out[i] ?? 0) ^ 0xff;}
    }
    return out;
  }

  if (parms.k > 0) {
    // Group 3 mixed 1D/2D: first line is 1D, then K lines 2D, repeating.
    const groupLen = parms.k + 1;

    for (let y = 0, referenceRuns: number[] = [width, 0]; y < height; y += 1) {
      if (parms.endOfLine) {
        consumeLeadingEolMarkersIfPresent();
      }
      try {
        const runs = y % groupLen === 0 ? decode1DLine() : decode2DLine(referenceRuns);
        writeRunsToBitmapRow({ out, outOffset: y * rowBytes, rowBytes, width, runs });
        referenceRuns = runs;
        damagedState.streak = 0;
      } catch (error) {
        if (!canResyncDamagedRows) {
          throw error;
        }
        damagedState.streak += 1;
        if (damagedState.streak > parms.damagedRowsBeforeError) {
          throw error;
        }
        writeWhiteRow(y);
        referenceRuns = [width, 0];
        consumeEolMarker();
        if (parms.encodedByteAlign) {reader.alignToByte();}
        continue;
      }

      if (parms.endOfLine) {
        consumeEolMarker();
        if (parms.encodedByteAlign) {reader.alignToByte();}
      } else if (parms.encodedByteAlign) {
        reader.alignToByte();
      }
    }

    if (parms.blackIs1) {
      for (let i = 0; i < out.length; i += 1) {out[i] = (out[i] ?? 0) ^ 0xff;}
    }
    return out;
  }

  // Group 4 2D (K < 0)
  for (let y = 0, referenceRuns: number[] = [width, 0]; y < height; y += 1) { // all-white reference line + sentinel
    const runs = decode2DLine(referenceRuns);
    writeRunsToBitmapRow({ out, outOffset: y * rowBytes, rowBytes, width, runs });
    referenceRuns = runs;
    if (parms.encodedByteAlign) {reader.alignToByte();}
  }

  if (parms.blackIs1) {
    for (let i = 0; i < out.length; i += 1) {out[i] = (out[i] ?? 0) ^ 0xff;}
  }
  return out;
}
