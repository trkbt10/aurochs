/**
 * @file RAW pixel data to RGBA conversion
 *
 * Converts raw pixel data from various color spaces to RGBA format.
 * Supports DeviceGray, DeviceRGB, DeviceCMYK, and ICCBased color spaces.
 */

import type { PdfColorSpace } from "../domain";
import { getColorSpaceComponents } from "../domain";

/**
 * Convert 16-bit component data to 8-bit by taking the high byte.
 *
 * PDF 16-bit images store 2 bytes per component in big-endian order.
 */
function downsample16to8(data: Uint8Array, sampleCount: number): Uint8Array {
  const result = new Uint8Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    result[i] = data[i * 2] ?? 0;
  }
  return result;
}

/**
 * Expand 1, 2, or 4-bit packed component data to 8-bit (0-255).
 */
function expandBitsTo8(
  data: Uint8Array,
  bitsPerComponent: 1 | 2 | 4,
  sampleCount: number
): Uint8Array {
  const result = new Uint8Array(sampleCount);
  const samplesPerByte = 8 / bitsPerComponent;
  const mask = (1 << bitsPerComponent) - 1;
  const scale = 255 / mask;

  for (let i = 0; i < sampleCount; i++) {
    const byteIdx = Math.floor(i / samplesPerByte);
    const bitOffset = (samplesPerByte - 1 - (i % samplesPerByte)) * bitsPerComponent;
    const byte = data[byteIdx] ?? 0;
    const value = (byte >> bitOffset) & mask;
    result[i] = Math.round(value * scale);
  }

  return result;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert RAW pixel data to RGBA format
 *
 * bitsPerComponent: PDF Reference 8.9.2
 * - 1, 2, 4, 8, 16 bits per component
 * - 1/2/4-bit: unpacked and scaled to 8-bit (0-255)
 * - 16-bit: downsampled to 8-bit by taking the high byte
 */
export function convertToRgba(
  data: Uint8Array,
  width: number,
  height: number,
  colorSpace: PdfColorSpace,
  bitsPerComponent: number,
  options: Readonly<{ readonly decode?: readonly number[] }> = {},
): Uint8ClampedArray {
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  const componentsPerPixel = getColorSpaceComponents(colorSpace);
  const sampleCount = pixelCount * componentsPerPixel;
  if (componentsPerPixel === 0) {
    console.warn(`[PDF Image] Unsupported color space: ${colorSpace}`);
    return rgba;
  }

  let expectedRawLength: number;
  switch (bitsPerComponent) {
    case 1:
    case 2:
    case 4:
      expectedRawLength = Math.ceil((sampleCount * bitsPerComponent) / 8);
      break;
    case 8:
      expectedRawLength = sampleCount;
      break;
    case 16:
      expectedRawLength = sampleCount * 2;
      break;
    default:
      throw new Error(
        `[PDF Image] Unsupported bitsPerComponent: ${bitsPerComponent}. Supported values: 1, 2, 4, 8, 16.`
      );
  }

  if (data.length !== expectedRawLength) {
    const message =
      `[PDF Image] Data length mismatch for ${colorSpace} (bitsPerComponent=${bitsPerComponent}): ` +
      `expected ${expectedRawLength} bytes (${width}x${height}x${componentsPerPixel}), got ${data.length}`;

    if (expectedRawLength > 0 && Math.abs(data.length - expectedRawLength) < expectedRawLength * 0.1) {
      console.warn(message + ". Attempting to proceed.");
    } else {
      throw new Error(message + ". Cannot process image.");
    }
  }

  let normalizedData: Uint8Array = data;
  switch (bitsPerComponent) {
    case 1:
    case 2:
    case 4:
      normalizedData = expandBitsTo8(data, bitsPerComponent, sampleCount);
      break;
    case 8:
      normalizedData = data;
      break;
    case 16:
      normalizedData = downsample16to8(data, sampleCount);
      console.info("[PDF Image] Downsampled 16-bit image to 8-bit");
      break;
    default:
      throw new Error(
        `[PDF Image] Unsupported bitsPerComponent: ${bitsPerComponent}. Supported values: 1, 2, 4, 8, 16.`
      );
  }

  if (options.decode) {
    const expectedDecodeLen = componentsPerPixel * 2;
    if (options.decode.length === expectedDecodeLen) {
      normalizedData = applyDecodeArray(normalizedData, componentsPerPixel, options.decode);
    }
  }

  if (bitsPerComponent === 8 && normalizedData.length !== sampleCount) {
    // Try to auto-detect color space based on data length (8-bit only)
    const actualComponents = normalizedData.length / pixelCount;
    if (Math.abs(actualComponents - 1) < 0.01) {
      console.warn("[PDF Image] Auto-detected as grayscale");
      return convertGrayToRgba(normalizedData, pixelCount, rgba);
    }
    if (Math.abs(actualComponents - 3) < 0.01) {
      console.warn("[PDF Image] Auto-detected as RGB");
      return convertRgbToRgba(normalizedData, pixelCount, rgba);
    }
    if (Math.abs(actualComponents - 4) < 0.01) {
      console.warn("[PDF Image] Auto-detected as CMYK");
      return convertCmykToRgba(normalizedData, pixelCount, rgba);
    }
  }

  switch (colorSpace) {
    case "DeviceGray":
      return convertGrayToRgba(normalizedData, pixelCount, rgba);
    case "DeviceRGB":
      return convertRgbToRgba(normalizedData, pixelCount, rgba);
    case "DeviceCMYK":
      return convertCmykToRgba(normalizedData, pixelCount, rgba);
    case "ICCBased":
      return convertIccBasedToRgba(normalizedData, pixelCount, rgba);
    case "Pattern":
    default:
      console.warn(`[PDF Image] Unsupported color space: ${colorSpace}`);
      return rgba;
  }
}

function applyDecodeArray(
  data: Uint8Array,
  componentsPerPixel: number,
  decode: readonly number[],
): Uint8Array {
  if (componentsPerPixel <= 0) {return data;}
  if (decode.length !== componentsPerPixel * 2) {return data;}

  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    const component = i % componentsPerPixel;
    const dmin = decode[component * 2] ?? 0;
    const dmax = decode[component * 2 + 1] ?? 1;
    const v = (data[i] ?? 0) / 255;
    const decoded = dmin + v * (dmax - dmin);
    const clamped = Math.min(1, Math.max(0, decoded));
    out[i] = Math.round(clamped * 255);
  }
  return out;
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
