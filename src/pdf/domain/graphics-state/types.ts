/**
 * @file PDF graphics state types
 *
 * Types for PDF graphics state including line styles, text modes, and transparency.
 * Color types are defined in domain/color.
 */

import type { PdfMatrix } from "../coordinate";
import type { PdfBBox } from "../coordinate";
import type { PdfColor } from "../color";

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
  /**
   * Current clipping bounding box in PDF page space.
   *
   * This is a conservative representation of the actual clipping path.
   * When present, it represents the intersection of rectangular clips (and/or Form `/BBox`)
   * applied so far in the current graphics state.
   */
  readonly clipBBox?: PdfBBox;
  readonly fillColor: PdfColor;
  readonly strokeColor: PdfColor;
  /**
   * Stroke width in PDF points (1 point = 1/72 inch).
   */
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
