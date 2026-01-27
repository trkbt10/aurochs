/**
 * @file PDF graphics state types
 *
 * Types for PDF graphics state including line styles, text modes, and transparency.
 * Color types are defined in domain/color.
 */

import type { PdfMatrix } from "../coordinate";
import type { PdfBBox } from "../coordinate";
import type { PdfColor } from "../color";

export type PdfSoftMask = Readonly<{
  readonly kind: "Alpha" | "Luminosity";
  readonly width: number;
  readonly height: number;
  /** Per-pixel alpha in mask space (0..255). */
  readonly alpha: Uint8Array;
  /**
   * Mask bounding box in the mask XObject's own coordinate space (Form `/BBox`).
   *
   * To map a point from mask space to page space at evaluation time:
   * `pagePoint = graphicsState.ctm × softMask.matrix × maskPoint`.
   */
  readonly bbox: PdfBBox;
  /**
   * Mask space → user space matrix (Form `/Matrix`, default identity).
   *
   * This is multiplied with the current `graphicsState.ctm` at evaluation time.
   */
  readonly matrix: PdfMatrix;
}>;

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
  /**
   * Optional per-pixel clip mask in PDF page space.
   *
   * This is a higher-fidelity representation than `clipBBox`, used when the PDF
   * establishes a non-rectangular clipping path that cannot be represented in PPTX.
   *
   * The mask is stored in page space (i.e., its `/BBox` is page coordinates).
   */
  readonly clipMask?: PdfSoftMask;
  /**
   * Current blend mode (ExtGState `/BM`).
   *
   * Stored for completeness; rendering semantics are applied (or ignored)
   * at conversion time depending on the output format.
   */
  readonly blendMode?: string;
  /**
   * Soft mask multiplier (ExtGState `/SMask`) when it can be reduced to a constant alpha.
   *
   * This is a conservative subset to support common “uniform opacity mask” PDFs.
   * Per-pixel masks are represented separately via `softMask`.
   */
  readonly softMaskAlpha?: number;
  /**
   * Soft mask definition when the mask can be evaluated to a per-pixel alpha map.
   *
   * This is currently a limited subset (e.g. single-image masks with simple transforms).
   */
  readonly softMask?: PdfSoftMask;
  /**
   * Current fill pattern name (set via `/Pattern cs` + `scn`/`sc` with a name).
   *
   * Only a subset is supported (shading patterns are rasterized at parse time).
   */
  readonly fillPatternName?: string;
  /**
   * Current stroke pattern name (set via `/Pattern CS` + `SCN`/`SC` with a name).
   */
  readonly strokePatternName?: string;
  /**
   * Underlying base color space for uncolored (PaintType 2) tiling patterns.
   *
   * Set via `cs/CS` with an array like `[/Pattern /DeviceRGB]`.
   */
  readonly fillPatternUnderlyingColorSpace?: "DeviceGray" | "DeviceRGB" | "DeviceCMYK";
  readonly strokePatternUnderlyingColorSpace?: "DeviceGray" | "DeviceRGB" | "DeviceCMYK";
  /**
   * Base color to apply for PaintType 2 tiling patterns.
   *
   * Set via `scn/SCN` components + pattern name.
   */
  readonly fillPatternColor?: PdfColor;
  readonly strokePatternColor?: PdfColor;
  /**
   * Current non-stroking color space name set by `cs`.
   *
   * Stored to allow the parser to interpret `sc/scn` operands under
   * non-device color spaces (e.g., ICCBased) using injected resources.
   */
  readonly fillColorSpaceName?: string;
  /**
   * Current stroking color space name set by `CS`.
   */
  readonly strokeColorSpaceName?: string;
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
