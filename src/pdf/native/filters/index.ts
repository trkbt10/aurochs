import type { PdfObject } from "../types";
import { decodeAscii85 } from "./ascii85";
import { decodeAsciiHex } from "./ascii-hex";
import { decodeFlate } from "./flate";
import { decodeLzw, readLzwDecodeOptions } from "./lzw";
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











export function decodeStreamData(encoded: Uint8Array, options: DecodeStreamOptions): Uint8Array {
  if (!encoded) {throw new Error("encoded is required");}
  if (!options) {throw new Error("options is required");}
  if (!options.filters) {throw new Error("options.filters is required");}

  let data = encoded;
  for (let i = 0; i < options.filters.length; i += 1) {
    const rawFilter = options.filters[i]!;
    const filter = normalizeFilterName(rawFilter);
    const parms = options.decodeParms?.[i];
    switch (filter) {
      case "Crypt":
        // Decryption is handled at object-load time (NativePdfDocument + PdfResolver).
        // When /Filter includes /Crypt, stream.data should already be decrypted.
        break;
      case "FlateDecode":
        data = decodeFlate(data, parms);
        break;
      case "LZWDecode": {
        const lzwOpts = readLzwDecodeOptions(parms);
        data = decodeLzw(data, lzwOpts);
        break;
      }
      case "ASCII85Decode":
        data = decodeAscii85(data);
        break;
      case "ASCIIHexDecode":
        data = decodeAsciiHex(data);
        break;
      case "RunLengthDecode":
        data = decodeRunLength(data);
        break;
      case "DCTDecode":
      case "JPXDecode":
        // Keep bytes as-is.
        break;
      default: {
        throw new Error(`Unsupported filter: ${String(filter)}`);
      }
    }
  }
  return data;
}
