/**
 * @file PDF Function parsers (ISO 32000-1 §7.10).
 *
 * Parses native PDF objects (dictionaries / streams) into typed
 * {@link PdfFunction} domain objects. Each parser validates the
 * FunctionType discriminant so callers can safely rely on the
 * returned type.
 *
 * Public API:
 *  - {@link parsePdfFunction}  — unified entry point (auto-detects type)
 *  - {@link parsePdfFunctionType0} — FunctionType 0 (sampled)
 *  - {@link parsePdfFunctionType2} — FunctionType 2 (exponential)
 */

import type { NativePdfPage, PdfArray, PdfDict, PdfNumber, PdfObject, PdfStream } from "../../native";
import { decodePdfStream } from "../../native/stream/stream";
import type { PdfFunction, PdfFunctionType0, PdfFunctionType2 } from "./types";

// =============================================================================
// Internal helpers — same pattern used by other .native.ts parsers
// =============================================================================

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function asNumber(obj: PdfObject | undefined): PdfNumber | null {
  return obj?.type === "number" ? obj : null;
}

function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) { return undefined; }
  return page.lookup(obj);
}

function resolveDictOrStreamDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  const resolved = resolve(page, obj);
  const dict = asDict(resolved);
  if (dict) { return dict; }
  const stream = asStream(resolved);
  return stream?.dict ?? null;
}

function parseNumberArray(page: NativePdfPage, obj: PdfObject | undefined, expectedLen: number): number[] | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr) { return null; }
  if (expectedLen >= 0 && arr.items.length !== expectedLen) { return null; }
  const nums: number[] = [];
  for (const item of arr.items) {
    const n = asNumber(resolve(page, item))?.value;
    if (n == null || !Number.isFinite(n)) { return null; }
    nums.push(n);
  }
  return nums;
}

// =============================================================================
// FunctionType 2 — Exponential interpolation (ISO 32000-1 §7.10.3)
// =============================================================================

/**
 * Parse a FunctionType 2 (exponential interpolation) function.
 *
 * The function dict/stream must have `FunctionType` = 2.
 * Returns `null` if the object is not a valid Type 2 function.
 */
export function parsePdfFunctionType2(page: NativePdfPage, obj: PdfObject | undefined): PdfFunctionType2 | null {
  const dict = resolveDictOrStreamDict(page, obj);
  if (!dict) { return null; }

  const ft = asNumber(resolve(page, dictGet(dict, "FunctionType")))?.value;
  if (ft !== 2) { return null; }

  const c0 = parseNumberArray(page, dictGet(dict, "C0"), -1) ?? [];
  const c1 = parseNumberArray(page, dictGet(dict, "C1"), -1) ?? [];

  const n = asNumber(resolve(page, dictGet(dict, "N")))?.value;
  if (n == null || !Number.isFinite(n)) { return null; }

  const domainNums = parseNumberArray(page, dictGet(dict, "Domain"), 2);
  const domain: readonly [number, number] | undefined =
    domainNums ? [domainNums[0] ?? 0, domainNums[1] ?? 1] : undefined;

  return { type: "FunctionType2", c0, c1, n, domain };
}

// =============================================================================
// FunctionType 0 — Sampled function (ISO 32000-1 §7.10.2)
// =============================================================================

/**
 * Parse a FunctionType 0 (sampled) function from a PDF stream.
 *
 * Required entries: FunctionType, Domain, Range, Size, BitsPerSample.
 * Optional entries: Encode, Decode, Order (Order is accepted but ignored
 * — we always use linear interpolation as higher-order is rare).
 *
 * Returns `null` if the object is not a valid Type 0 function stream.
 */
export function parsePdfFunctionType0(page: NativePdfPage, obj: PdfObject | undefined): PdfFunctionType0 | null {
  const resolved = resolve(page, obj);
  const stream = asStream(resolved);
  if (!stream) { return null; }
  const dict = stream.dict;

  const ft = asNumber(resolve(page, dictGet(dict, "FunctionType")))?.value;
  if (ft !== 0) { return null; }

  // Domain (required): 2×m numbers
  const domainArr = parseNumberArray(page, dictGet(dict, "Domain"), -1);
  if (!domainArr || domainArr.length < 2 || domainArr.length % 2 !== 0) { return null; }
  const m = domainArr.length / 2;

  // Range (required): 2×n numbers
  const rangeArr = parseNumberArray(page, dictGet(dict, "Range"), -1);
  if (!rangeArr || rangeArr.length < 2 || rangeArr.length % 2 !== 0) { return null; }
  const n = rangeArr.length / 2;

  // Size (required): m integers — number of samples per input dimension
  const sizeArr = parseNumberArray(page, dictGet(dict, "Size"), m);
  if (!sizeArr) { return null; }
  for (let i = 0; i < m; i += 1) {
    if (!Number.isInteger(sizeArr[i]) || (sizeArr[i] ?? 0) < 1) { return null; }
  }

  // BitsPerSample (required)
  const bitsPerSample = asNumber(resolve(page, dictGet(dict, "BitsPerSample")))?.value;
  if (bitsPerSample == null || !Number.isFinite(bitsPerSample)) { return null; }

  // Encode (optional): 2×m numbers.  Default: [0, Size[0]−1, 0, Size[1]−1, …]
  const encodeArr = parseNumberArray(page, dictGet(dict, "Encode"), -1);
  const encode: number[] = [];
  for (let i = 0; i < m; i += 1) {
    if (encodeArr && encodeArr.length >= 2 * m) {
      encode.push(encodeArr[i * 2] ?? 0, encodeArr[i * 2 + 1] ?? ((sizeArr[i] ?? 1) - 1));
    } else {
      encode.push(0, (sizeArr[i] ?? 1) - 1);
    }
  }

  // Decode (optional): 2×n numbers.  Default: Range values
  const decodeArr = parseNumberArray(page, dictGet(dict, "Decode"), -1);
  const decode: number[] = [];
  for (let i = 0; i < n; i += 1) {
    if (decodeArr && decodeArr.length >= 2 * n) {
      decode.push(decodeArr[i * 2] ?? 0, decodeArr[i * 2 + 1] ?? 1);
    } else {
      decode.push(rangeArr[i * 2] ?? 0, rangeArr[i * 2 + 1] ?? 1);
    }
  }

  // Decode stream data
  // eslint-disable-next-line no-restricted-syntax -- mutable before assignment: try/catch is needed to return null on decode failure
  let samples: Uint8Array;
  try {
    samples = decodePdfStream(stream);
    // eslint-disable-next-line no-restricted-syntax -- catch without param: decodePdfStream throws on malformed streams; null return signals parse failure
  } catch {
    return null;
  }

  return {
    type: "FunctionType0",
    m,
    n,
    domain: domainArr,
    range: rangeArr,
    size: sizeArr,
    bitsPerSample,
    encode,
    decode,
    samples,
  };
}

// =============================================================================
// Unified entry point
// =============================================================================

/**
 * Parse a PDF Function object, auto-detecting the FunctionType.
 *
 * Tries each supported type in order of parsing cost:
 *   1. Type 2 (exponential — dict only, no stream decoding)
 *   2. Type 0 (sampled — requires stream decoding)
 *
 * Returns `null` if the object is not a recognized function type.
 */
export function parsePdfFunction(page: NativePdfPage, obj: PdfObject | undefined): PdfFunction | null {
  const fn2 = parsePdfFunctionType2(page, obj);
  if (fn2) { return fn2; }

  const fn0 = parsePdfFunctionType0(page, obj);
  if (fn0) { return fn0; }

  return null;
}
