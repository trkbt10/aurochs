/**
 * @file src/pdf/native/filters/index.ts
 */

import type { PdfObject } from "../core/types";
import { decodeAscii85 } from "./ascii85";
import { decodeAsciiHex } from "./ascii-hex";
import { decodeFlate } from "./flate";
import { decodeLzw, readLzwDecodeOptions } from "./lzw";
import { applyPredictorDecodeParms } from "./predictor";
import { decodeRunLength } from "./run-length";

export type DecodeStreamOptions = Readonly<{
  /** Names without leading slash (e.g. "FlateDecode"). */
  readonly filters: readonly string[];
  readonly decodeParms?: readonly (PdfObject | null)[];
}>;

function normalizeFilterName(name: string): string {
  switch (name) {
    case "FlateDecode":
    case "Fl":
      return "FlateDecode";
    case "LZWDecode":
    case "LZW":
      return "LZWDecode";
    case "ASCII85Decode":
    case "A85":
      return "ASCII85Decode";
    case "ASCIIHexDecode":
    case "AHx":
      return "ASCIIHexDecode";
    case "RunLengthDecode":
    case "RL":
      return "RunLengthDecode";
    case "DCTDecode":
    case "DCT":
      return "DCTDecode";
    case "Crypt":
      return "Crypt";
    case "JPXDecode":
      return "JPXDecode";
    default:
      throw new Error(`Unsupported filter: ${name}`);
  }
}











/** Decode a stream by applying its PDF filters in order. */
export function decodeStreamData(encoded: Uint8Array, options: DecodeStreamOptions): Uint8Array {
  if (!encoded) {throw new Error("encoded is required");}
  if (!options) {throw new Error("options is required");}
  if (!options.filters) {throw new Error("options.filters is required");}

  return options.filters.reduce((data, rawFilter, i) => {
    const filter = normalizeFilterName(rawFilter);
    const parms = options.decodeParms?.[i];
    switch (filter) {
      case "Crypt":
        // Decryption is handled at object-load time (NativePdfDocument + PdfResolver).
        // When /Filter includes /Crypt, stream.data should already be decrypted.
        return data;
      case "FlateDecode":
        return decodeFlate(data, parms);
      case "LZWDecode": {
        const lzwOpts = readLzwDecodeOptions(parms);
        const decoded = decodeLzw(data, lzwOpts);
        return applyPredictorDecodeParms(decoded, parms);
      }
      case "ASCII85Decode":
        return decodeAscii85(data);
      case "ASCIIHexDecode":
        return decodeAsciiHex(data);
      case "RunLengthDecode":
        return decodeRunLength(data);
      case "DCTDecode":
      case "JPXDecode":
        // Keep bytes as-is.
        return data;
      default: {
        throw new Error(`Unsupported filter: ${String(filter)}`);
      }
    }
  }, encoded);
}
