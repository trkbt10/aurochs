/**
 * @file PNG Encoder
 *
 * Browser: Canvas API
 * Node.js: pngjs (dynamic require, excluded from browser bundle)
 */

import { toDataUrl } from "@oxen/buffer";

// =============================================================================
// Public API
// =============================================================================

/**
 * RGBAデータをPNG Data URLにエンコード
 */
export function encodeRgbaToPngDataUrl(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): string {
  const normalized = normalizeRgbaData(rgbaData, width, height);

  if (typeof document !== "undefined") {
    return encodeWithCanvas(normalized, width, height);
  }

  return encodeWithPngjs(normalized, width, height);
}

/**
 * RGBAデータをPNGバイト列にエンコード
 */
export function encodeRgbaToPng(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const normalized = normalizeRgbaData(rgbaData, width, height);

  if (typeof document !== "undefined") {
    return encodeWithCanvasToBytes(normalized, width, height);
  }

  return encodeWithPngjsToBytes(normalized, width, height);
}

// =============================================================================
// Browser: Canvas API
// =============================================================================

function encodeWithCanvas(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas");
  }

  const buffer = new ArrayBuffer(rgbaData.byteLength);
  const copied = new Uint8ClampedArray(buffer);
  copied.set(rgbaData);

  const imageData = new ImageData(copied, width, height);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

function encodeWithCanvasToBytes(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const dataUrl = encodeWithCanvas(rgbaData, width, height);
  return dataUrlToBytes(dataUrl);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Invalid data URL format");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Node.js: pngjs
// =============================================================================

function encodeWithPngjs(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): string {
  const pngBytes = encodeWithPngjsToBytes(rgbaData, width, height);
  return toDataUrl(pngBytes.buffer as ArrayBuffer, "image/png");
}

function encodeWithPngjsToBytes(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  // Dynamic require to exclude pngjs from browser bundle
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- pngjs must be loaded dynamically to exclude from browser bundle
  const pngjs = require("pngjs") as typeof import("pngjs");
  const { PNG } = pngjs;

  const png = new PNG({ width, height });
  png.data = Buffer.from(rgbaData);

  const buffer = PNG.sync.write(png);
  return new Uint8Array(buffer);
}

// =============================================================================
// Utilities
// =============================================================================

function normalizeRgbaData(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const expectedLength = width * height * 4;
  if (rgbaData.length === expectedLength) {
    return rgbaData;
  }

  console.warn(
    `[PNG Encoder] Data length mismatch: expected ${expectedLength} bytes for ${width}x${height}, got ${rgbaData.length}`
  );

  const normalized = new Uint8ClampedArray(expectedLength);
  normalized.set(rgbaData.subarray(0, Math.min(rgbaData.length, expectedLength)));
  return normalized;
}
