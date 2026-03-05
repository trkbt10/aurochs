/**
 * @file PNG Encoder (Node.js)
 *
 * Uses pngjs for PNG encoding.
 */

// @ts-expect-error -- pngjs types
import { PNG } from "pngjs";
import { toDataUrl } from "@aurochs/buffer";

// =============================================================================
// Public API
// =============================================================================

/**
 * RGBAデータをPNG Data URLにエンコード
 */
export function encodeRgbaToPngDataUrl(rgbaData: Uint8ClampedArray, width: number, height: number): string {
  const normalized = normalizeRgbaData(rgbaData, width, height);
  const pngBytes = encodeWithPngjs(normalized, width, height);
  return toDataUrl(pngBytes.buffer as ArrayBuffer, "image/png");
}

/**
 * RGBAデータをPNGバイト列にエンコード
 */
export function encodeRgbaToPng(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const normalized = normalizeRgbaData(rgbaData, width, height);
  return encodeWithPngjs(normalized, width, height);
}

// =============================================================================
// pngjs
// =============================================================================

function encodeWithPngjs(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgbaData);
  const buffer = PNG.sync.write(png);
  return new Uint8Array(buffer);
}

// =============================================================================
// Utilities
// =============================================================================

function normalizeRgbaData(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const expectedLength = width * height * 4;
  if (rgbaData.length === expectedLength) {
    return rgbaData;
  }

  console.warn(
    `[PNG Encoder] Data length mismatch: expected ${expectedLength} bytes for ${width}x${height}, got ${rgbaData.length}`,
  );

  const normalized = new Uint8ClampedArray(expectedLength);
  normalized.set(rgbaData.subarray(0, Math.min(rgbaData.length, expectedLength)));
  return normalized;
}
