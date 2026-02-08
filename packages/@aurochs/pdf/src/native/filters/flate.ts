/**
 * @file src/pdf/native/filters/flate.ts
 */

import { unzlibSync } from "fflate";
import type { PdfObject } from "../core/types";
import { applyPredictorDecodeParms } from "./predictor";











/** Decode data using the PDF `/FlateDecode` filter. */
export function decodeFlate(data: Uint8Array, decodeParms?: PdfObject | null): Uint8Array {
  // FlateDecode uses zlib-wrapped DEFLATE per ISO 32000.
  const decoded = unzlibSync(data);
  return applyPredictorDecodeParms(decoded, decodeParms);
}
