/**
 * @file src/pdf/native/filters/lzw.ts
 */

import type { PdfDict, PdfObject } from "../core/types";

type LzwDecodeOptions = Readonly<{
  /**
   * PDF LZWDecode parameter (ISO 32000-1).
   * Default: 1.
   */
  readonly earlyChange?: number;
}>;

function asDict(obj: PdfObject | null | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}











/** Read `/LZWDecode` options from stream `/DecodeParms`. */
export function readLzwDecodeOptions(decodeParms: PdfObject | null | undefined): LzwDecodeOptions {
  const dict = asDict(decodeParms);
  if (!dict) {return {};}

  const early = asNumber(dictGet(dict, "EarlyChange"));
  if (early == null) {return {};}
  if (early !== 0 && early !== 1) {
    throw new Error(`LZWDecode: invalid EarlyChange=${early}`);
  }
  return { earlyChange: early };
}

type BitReader = Readonly<{
  readonly bytes: Uint8Array;
  readonly bitPos: number;
}>;

function readBitsMSB(r: BitReader, n: number): { value: number | null; next: BitReader } {
  if (n <= 0 || n > 12) {throw new Error(`LZWDecode: invalid code size ${n}`);}

  const totalBits = r.bytes.length * 8;
  if (r.bitPos + n > totalBits) {
    return { value: null, next: r };
  }

  const state = { value: 0 };
  for (let i = 0; i < n; i += 1) {
    const bitIndex = r.bitPos + i;
    const byteIndex = Math.floor(bitIndex / 8);
    const within = bitIndex % 8;
    const b = r.bytes[byteIndex] ?? 0;
    const bit = (b >> (7 - within)) & 1;
    state.value = (state.value << 1) | bit;
  }
  return { value: state.value, next: { bytes: r.bytes, bitPos: r.bitPos + n } };
}

function shouldIncreaseCodeSize(nextCode: number, codeSize: number, earlyChange: 0 | 1): boolean {
  // PDF LZW is MSB-first and supports EarlyChange (default 1).
  // With EarlyChange=1, increase code size one code earlier than EarlyChange=0.
  const limit = (1 << codeSize) - (earlyChange === 1 ? 1 : 0);
  return nextCode >= limit && codeSize < 12;
}

/**
 * Decode PDF LZWDecode (MSB-first, Clear/EOD codes).
 *
 * This implementation follows the PDF variant (not GIF):
 * - MSB-first code packing
 * - Clear code: 256
 * - EOD code: 257
 * - Initial code size: 9
 * - Max code size: 12
 */
export function decodeLzw(encoded: Uint8Array, options: LzwDecodeOptions = {}): Uint8Array {
  if (!encoded) {throw new Error("encoded is required");}
  const earlyChange = (options.earlyChange ?? 1) as 0 | 1;
  if (earlyChange !== 0 && earlyChange !== 1) {throw new Error(`LZWDecode: invalid EarlyChange=${earlyChange}`);}

  const CLEAR = 256;
  const EOD = 257;

  const dict = new Map<number, Uint8Array>();
  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < 256; i += 1) {
      dict.set(i, new Uint8Array([i]));
    }
  };

  resetDict();

  const out: number[] = [];
  const state: { codeSize: number; nextCode: number; reader: BitReader; prev: Uint8Array | null } = {
    codeSize: 9,
    nextCode: 258,
    reader: { bytes: encoded, bitPos: 0 },
    prev: null,
  };

  while (true) {
    const read = readBitsMSB(state.reader, state.codeSize);
    state.reader = read.next;
    const code = read.value;
    if (code == null) {break;}

    if (code === CLEAR) {
      resetDict();
      state.codeSize = 9;
      state.nextCode = 258;
      state.prev = null;
      continue;
    }
    if (code === EOD) {
      break;
    }

    const entry: Uint8Array = (() => {
      const direct = dict.get(code);
      if (direct) {return direct;}
      // KwKwK special case: code is nextCode, meaning current = prev + first(prev)
      if (code === state.nextCode && state.prev) {
        const first = state.prev[0] ?? 0;
        const combined: Uint8Array = new Uint8Array(state.prev.length + 1);
        combined.set(state.prev, 0);
        combined[state.prev.length] = first;
        return combined;
      }
      throw new Error(`LZWDecode: invalid code ${code}`);
    })();

    for (const b of entry) {out.push(b);}

    if (state.prev) {
      const first = entry[0] ?? 0;
      const combined: Uint8Array = new Uint8Array(state.prev.length + 1);
      combined.set(state.prev, 0);
      combined[state.prev.length] = first;
      dict.set(state.nextCode, combined);
      state.nextCode += 1;

      if (shouldIncreaseCodeSize(state.nextCode, state.codeSize, earlyChange)) {
        state.codeSize += 1;
      }
    }

    state.prev = entry;

    // PDF limits dictionary to 4096 entries; stop adding beyond that.
    if (state.nextCode > 4095) {
      // Spec suggests the encoder should emit CLEAR; decoding can continue reading codes,
      // but no longer grows the dictionary until reset.
      state.nextCode = 4096;
    }
  }

  return new Uint8Array(out);
}
