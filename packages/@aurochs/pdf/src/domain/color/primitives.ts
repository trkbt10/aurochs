/**
 * @file Color conversion primitives
 *
 * Basic color conversion algorithms for PDF color spaces.
 * These are pure functions operating on normalized values (0-1 range).
 *
 * Note: These are naive conversions without ICC profile support.
 * For accurate color reproduction, ICC profile parsing would be required.
 */

/**
 * RGB color tuple (0-255 range)
 */
export type RgbColor = readonly [r: number, g: number, b: number];

/**
 * Convert grayscale to RGB
 *
 * PDF Reference 8.6.4.2: DeviceGray uses 1 component (0=black, 1=white)
 *
 * @param gray - Grayscale value (0-1)
 * @returns RGB tuple (0-255)
 */
export function grayToRgb(gray: number): RgbColor {
  const value = toByte(clamp01(gray));
  return [value, value, value];
}

/**
 * Convert RGB components to RGB bytes
 *
 * PDF Reference 8.6.4.3: DeviceRGB uses 3 components (R, G, B in 0-1 range)
 *
 * @param r - Red (0-1)
 * @param g - Green (0-1)
 * @param b - Blue (0-1)
 * @returns RGB tuple (0-255)
 */
export function rgbToRgbBytes(r: number, g: number, b: number): RgbColor {
  return [toByte(clamp01(r)), toByte(clamp01(g)), toByte(clamp01(b))];
}

/**
 * Convert CMYK to RGB using naive linear conversion.
 *
 * ## Formula
 *
 * ```
 * R = 255 × (1 - C) × (1 - K)
 * G = 255 × (1 - M) × (1 - K)
 * B = 255 × (1 - Y) × (1 - K)
 * ```
 *
 * ## Limitations
 *
 * This is a **naive conversion** that does NOT account for:
 *
 * 1. **ICC Profiles**: Professional print PDFs use calibrated CMYK
 *    (e.g., FOGRA39, US Web Coated SWOP) which have non-linear
 *    relationships with sRGB.
 *
 * 2. **Color Gamut**: CMYK and sRGB have different color gamuts.
 *    Some CMYK colors cannot be accurately represented in sRGB.
 *
 * 3. **Black Generation**: The relationship between CMY and K
 *    varies by printing process (GCR, UCR).
 *
 * ## When Accuracy Matters
 *
 * For accurate CMYK→RGB conversion, use:
 * - A color management library (e.g., lcms2, ColorSync)
 * - The PDF's embedded ICC profile
 * - A standard print profile (FOGRA39, SWOP, etc.)
 *
 * ## Typical Inaccuracies
 *
 * | CMYK Input      | This Function | Accurate sRGB |
 * |-----------------|---------------|---------------|
 * | C=100 M=0 Y=0   | (0, 255, 255) | ~(0, 174, 239)|
 * | C=0 M=100 Y=0   | (255, 0, 255) | ~(236, 0, 140)|
 * | C=0 M=0 Y=100   | (255, 255, 0) | ~(255, 242, 0)|
 *
 * @see PDF Reference 1.7, Section 8.6.4.4 (DeviceCMYK Color Space)
 * @see ISO 12647-2 (Offset printing)
 *
 * @param c - Cyan (0-1)
 * @param m - Magenta (0-1)
 * @param y - Yellow (0-1)
 * @param k - Key/Black (0-1)
 * @returns RGB tuple (0-255)
 */
export function cmykToRgb({
  c,
  m,
  y,
  k,
}: {
  readonly c: number;
  readonly m: number;
  readonly y: number;
  readonly k: number;
}): RgbColor {
  const cc = clamp01(c);
  const mm = clamp01(m);
  const yy = clamp01(y);
  const kk = clamp01(k);

  const r = Math.round(255 * (1 - cc) * (1 - kk));
  const g = Math.round(255 * (1 - mm) * (1 - kk));
  const b = Math.round(255 * (1 - yy) * (1 - kk));

  return [clampByte(r), clampByte(g), clampByte(b)];
}

/**
 * Convert RGB to hex string
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex string (e.g., "FF00FF")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return toHex2(r) + toHex2(g) + toHex2(b);
}

// =============================================================================
// Internal utilities
// =============================================================================

/**
 * Clamp value to 0-1 range
 */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

/**
 * Clamp value to 0-255 range
 */
export function clampByte(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 255) {
    return 255;
  }
  return value;
}

/**
 * Convert 0-1 component to 0-255 byte
 */
export function toByte(component01: number): number {
  return clampByte(Math.round(clamp01(component01) * 255));
}

/**
 * Convert byte to 2-digit hex string
 */
function toHex2(byte: number): string {
  return clampByte(byte).toString(16).padStart(2, "0").toUpperCase();
}
