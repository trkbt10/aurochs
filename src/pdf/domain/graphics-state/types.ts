/**
 * @file PDF graphics state types
 *
 * Types for PDF graphics state including colors, line styles, and transparency.
 */

import type { PdfMatrix } from "../coordinate";

// =============================================================================
// Color Types
// =============================================================================

/**
 * PDF Color Space types
 *
 * PDF Reference 8.6 defines multiple color space families:
 * - Device color spaces: DeviceGray, DeviceRGB, DeviceCMYK
 * - CIE-based color spaces: CalGray, CalRGB, Lab, ICCBased
 * - Special color spaces: Indexed, Pattern, Separation, DeviceN
 *
 * Currently supported: Device color spaces and ICCBased (with fallback)
 */
export type PdfColorSpace = "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | "ICCBased" | "Pattern";

/**
 * Alternate color space for ICCBased colors
 * Used when ICC profile parsing is not available
 */
export type PdfAlternateColorSpace = "DeviceGray" | "DeviceRGB" | "DeviceCMYK";

export type PdfColor = {
  readonly colorSpace: PdfColorSpace;
  readonly components: readonly number[];
  /**
   * For ICCBased color spaces, the alternate color space to use
   * when ICC profile parsing is not available.
   * Determined by the N (number of components) value in the ICC profile stream.
   *
   * PDF Reference 8.6.5.5:
   * - N=1: Alternate is DeviceGray
   * - N=3: Alternate is DeviceRGB (or Lab)
   * - N=4: Alternate is DeviceCMYK
   */
  readonly alternateColorSpace?: PdfAlternateColorSpace;
};

// =============================================================================
// Line Style Types
// =============================================================================

/** Line join style: 0=miter, 1=round, 2=bevel */
export type PdfLineJoin = 0 | 1 | 2;

/** Line cap style: 0=butt, 1=round, 2=square */
export type PdfLineCap = 0 | 1 | 2;

// =============================================================================
// Text Rendering Mode
// =============================================================================

/**
 * Text rendering mode (PDF Reference 9.3, Table 106)
 * 0 = Fill text
 * 1 = Stroke text
 * 2 = Fill then stroke text
 * 3 = Invisible text (neither fill nor stroke)
 * 4 = Fill text and add to path for clipping
 * 5 = Stroke text and add to path for clipping
 * 6 = Fill then stroke text and add to path for clipping
 * 7 = Add to path for clipping (no fill/stroke)
 */
export type PdfTextRenderingMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// =============================================================================
// Graphics State
// =============================================================================

export type PdfGraphicsState = {
  readonly ctm: PdfMatrix;
  readonly fillColor: PdfColor;
  readonly strokeColor: PdfColor;
  readonly lineWidth: number;
  readonly lineJoin: PdfLineJoin;
  readonly lineCap: PdfLineCap;
  readonly miterLimit: number;
  readonly dashArray: readonly number[];
  readonly dashPhase: number;
  readonly fillAlpha: number;
  readonly strokeAlpha: number;
  // Text state parameters (PDF Reference 9.3)
  /** Tc: Character spacing (default: 0) */
  readonly charSpacing: number;
  /** Tw: Word spacing (default: 0) */
  readonly wordSpacing: number;
  /** Tz: Horizontal scaling as percentage (default: 100) */
  readonly horizontalScaling: number;
  /** TL: Text leading (default: 0) */
  readonly textLeading: number;
  /** Tr: Text rendering mode (default: 0 = fill) */
  readonly textRenderingMode: PdfTextRenderingMode;
  /** Ts: Text rise (default: 0) */
  readonly textRise: number;
};
