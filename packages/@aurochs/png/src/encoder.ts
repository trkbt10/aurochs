/**
 * @file PNG Encoder
 *
 * Uses the built-in pngjs port (pure TypeScript + pako) for PNG encoding.
 * Environment-independent: works in both Node.js and browser.
 */

import { pack } from "./pngjs/packer";
import { toDataUrl } from "@aurochs/buffer";

// =============================================================================
// Public API
// =============================================================================

/**
 * RGBAデータをPNG Data URLにエンコード
 */
export function encodeRgbaToPngDataUrl(rgbaData: Uint8ClampedArray, width: number, height: number): string {
  const normalized = normalizeRgbaData(rgbaData, width, height);
  const pngBytes = encodePng(normalized, width, height);
  return toDataUrl(pngBytes.buffer as ArrayBuffer, "image/png");
}

/**
 * RGBAデータをPNGバイト列にエンコード
 */
export function encodeRgbaToPng(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const normalized = normalizeRgbaData(rgbaData, width, height);
  return encodePng(normalized, width, height);
}

// =============================================================================
// Encoding
// =============================================================================

function encodePng(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8Array {
  return pack({
    width,
    height,
    data: new Uint8Array(rgbaData.buffer, rgbaData.byteOffset, rgbaData.byteLength),
  });
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
