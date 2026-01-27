/**
 * @file src/pdf/parser/jpeg-decode.ts
 */

import jpeg from "jpeg-js";

export type DecodedJpegRgb = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array; // RGB, 3 bytes/pixel
}>;











/** Decode JPEG bytes into raw RGB pixels (3 bytes/pixel). */
export function decodeJpegToRgb(
  bytes: Uint8Array,
  options: { readonly expectedWidth?: number; readonly expectedHeight?: number } = {},
): DecodedJpegRgb {
  if (!bytes) {throw new Error("bytes is required");}

  const decoded = jpeg.decode(bytes, { useTArray: true });
  if (!decoded || !decoded.data) {throw new Error("Failed to decode JPEG");}

  const { width, height, data } = decoded;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Invalid JPEG dimensions");
  }

  if (options.expectedWidth != null && width !== options.expectedWidth) {
    throw new Error(`JPEG width mismatch: expected ${options.expectedWidth}, got ${width}`);
  }
  if (options.expectedHeight != null && height !== options.expectedHeight) {
    throw new Error(`JPEG height mismatch: expected ${options.expectedHeight}, got ${height}`);
  }

  const pixelCount = width * height;
  if (data.length !== pixelCount * 4) {
    throw new Error("Invalid JPEG decode output size");
  }

  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i += 1) {
    const src = i * 4;
    const dst = i * 3;
    rgb[dst] = data[src] ?? 0;
    rgb[dst + 1] = data[src + 1] ?? 0;
    rgb[dst + 2] = data[src + 2] ?? 0;
  }
  return { width, height, data: rgb };
}
