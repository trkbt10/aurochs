/**
 * @file src/pdf/parser/jpeg2000/jpx-decode.native.ts
 *
 * Browser-compatible `/JPXDecode` implementation (pure TS/JS).
 */

import type { JpxDecodedImage, JpxDecodeFn } from "./jpx-decoder";
import { extractJp2Codestream } from "./jp2";
import { decodeJ2kCodestreamToRgb } from "./j2k";

export const decodeJpxNative: JpxDecodeFn = (jpxBytes, options): JpxDecodedImage => {
  if (!jpxBytes) {throw new Error("jpxBytes is required");}
  if (!options) {throw new Error("options is required");}
  if (!Number.isFinite(options.expectedWidth) || options.expectedWidth <= 0) {
    throw new Error(`expectedWidth must be > 0 (got ${options.expectedWidth})`);
  }
  if (!Number.isFinite(options.expectedHeight) || options.expectedHeight <= 0) {
    throw new Error(`expectedHeight must be > 0 (got ${options.expectedHeight})`);
  }

  const codestream = extractJp2Codestream(jpxBytes);
  const decoded = decodeJ2kCodestreamToRgb(codestream, options);
  return {
    width: decoded.width,
    height: decoded.height,
    components: decoded.components,
    bitsPerComponent: 8,
    data: decoded.data,
  };
};
