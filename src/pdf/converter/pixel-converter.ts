/**
 * @file RAW pixel data to RGBA conversion
 *
 * Converts raw pixel data from various color spaces to RGBA format.
 * Supports DeviceGray, DeviceRGB, DeviceCMYK, and ICCBased color spaces.
 */

import type { PdfColorSpace } from "../domain";
import { getColorSpaceComponents } from "../domain";

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert RAW pixel data to RGBA format
 *
 * bitsPerComponent: PDF Reference 8.9.2
 * - 1, 2, 4, 8, 16 bits per component
 * Currently only 8-bit is fully supported (most common)
 */
export function convertToRgba(
  data: Uint8Array,
  width: number,
  height: number,
  colorSpace: PdfColorSpace,
  bitsPerComponent: number
): Uint8ClampedArray {
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  // Currently only support 8 bits per component
  if (bitsPerComponent !== 8) {
    console.warn(
      `[PDF Image] bitsPerComponent=${bitsPerComponent} not fully supported, treating as 8-bit`
    );
  }

  // Validate data length for expected color space
  const componentsPerPixel = getColorSpaceComponents(colorSpace);
  const expectedLength = pixelCount * componentsPerPixel;
  if (data.length !== expectedLength) {
    console.warn(
      `[PDF Image] Data length mismatch for ${colorSpace}: expected ${expectedLength} bytes (${width}x${height}x${componentsPerPixel}), got ${data.length}`
    );
    // Try to auto-detect color space based on data length
    const actualComponents = data.length / pixelCount;
    if (Math.abs(actualComponents - 1) < 0.01) {
      console.warn("[PDF Image] Auto-detected as grayscale");
      return convertGrayToRgba(data, pixelCount, rgba);
    }
    if (Math.abs(actualComponents - 3) < 0.01) {
      console.warn("[PDF Image] Auto-detected as RGB");
      return convertRgbToRgba(data, pixelCount, rgba);
    }
    if (Math.abs(actualComponents - 4) < 0.01) {
      console.warn("[PDF Image] Auto-detected as CMYK");
      return convertCmykToRgba(data, pixelCount, rgba);
    }
  }

  switch (colorSpace) {
    case "DeviceGray":
      return convertGrayToRgba(data, pixelCount, rgba);
    case "DeviceRGB":
      return convertRgbToRgba(data, pixelCount, rgba);
    case "DeviceCMYK":
      return convertCmykToRgba(data, pixelCount, rgba);
    case "ICCBased":
      return convertIccBasedToRgba(data, pixelCount, rgba);
    case "Pattern":
    default:
      console.warn(`[PDF Image] Unsupported color space: ${colorSpace}`);
      return rgba;
  }
}

// =============================================================================
// Color Space Converters
// =============================================================================

/**
 * DeviceGray → RGBA
 * PDF Reference 8.6.4.2: 1 component (0=black, 1=white)
 */
export function convertGrayToRgba(
  data: Uint8Array,
  pixelCount: number,
  rgba: Uint8ClampedArray
): Uint8ClampedArray {
  for (let i = 0; i < pixelCount; i++) {
    const gray = data[i] ?? 0;
    const rgbaOffset = i * 4;
    rgba[rgbaOffset] = gray;
    rgba[rgbaOffset + 1] = gray;
    rgba[rgbaOffset + 2] = gray;
    rgba[rgbaOffset + 3] = 255;
  }
  return rgba;
}

/**
 * DeviceRGB → RGBA
 * PDF Reference 8.6.4.3: 3 components (R, G, B)
 */
export function convertRgbToRgba(
  data: Uint8Array,
  pixelCount: number,
  rgba: Uint8ClampedArray
): Uint8ClampedArray {
  for (let i = 0; i < pixelCount; i++) {
    const srcOffset = i * 3;
    const rgbaOffset = i * 4;
    rgba[rgbaOffset] = data[srcOffset] ?? 0;
    rgba[rgbaOffset + 1] = data[srcOffset + 1] ?? 0;
    rgba[rgbaOffset + 2] = data[srcOffset + 2] ?? 0;
    rgba[rgbaOffset + 3] = 255;
  }
  return rgba;
}

/**
 * DeviceCMYK → RGBA
 * PDF Reference 8.6.4.4: 4 components (C, M, Y, K)
 *
 * Naive CMYK→RGB conversion (without ICC profile):
 * R = 255 × (1 - C) × (1 - K)
 * G = 255 × (1 - M) × (1 - K)
 * B = 255 × (1 - Y) × (1 - K)
 */
export function convertCmykToRgba(
  data: Uint8Array,
  pixelCount: number,
  rgba: Uint8ClampedArray
): Uint8ClampedArray {
  for (let i = 0; i < pixelCount; i++) {
    const srcOffset = i * 4;
    const c = (data[srcOffset] ?? 0) / 255;
    const m = (data[srcOffset + 1] ?? 0) / 255;
    const y = (data[srcOffset + 2] ?? 0) / 255;
    const k = (data[srcOffset + 3] ?? 0) / 255;

    const rgbaOffset = i * 4;
    rgba[rgbaOffset] = Math.round(255 * (1 - c) * (1 - k));
    rgba[rgbaOffset + 1] = Math.round(255 * (1 - m) * (1 - k));
    rgba[rgbaOffset + 2] = Math.round(255 * (1 - y) * (1 - k));
    rgba[rgbaOffset + 3] = 255;
  }
  return rgba;
}

/**
 * ICCBased → RGBA
 *
 * PDF Reference 8.6.5.5: ICCBased infers alternate color space
 * based on number of components.
 */
export function convertIccBasedToRgba(
  data: Uint8Array,
  pixelCount: number,
  rgba: Uint8ClampedArray
): Uint8ClampedArray {
  const bytesPerPixel = data.length / pixelCount;

  if (bytesPerPixel <= 1) {
    return convertGrayToRgba(data, pixelCount, rgba);
  }
  if (bytesPerPixel <= 3) {
    return convertRgbToRgba(data, pixelCount, rgba);
  }
  if (bytesPerPixel <= 4) {
    return convertCmykToRgba(data, pixelCount, rgba);
  }

  console.warn(`[PDF Image] ICCBased with ${bytesPerPixel} bytes/pixel not supported`);
  return rgba;
}
