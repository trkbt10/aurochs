/**
 * @file PDF operator handler types
 *
 * Defines the handler interface and context types for PDF content stream parsing.
 * Each operator handler is a pure function that receives context and returns updated state.
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate all operations for a variant (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Higher-order functions for dependency injection (Rule 4)
 */

import type {
  PdfPathOp,
  PdfPaintOp,
  PdfGraphicsState,
  PdfMatrix,
  PdfBBox,
  PdfSoftMask,
  PdfImage,
  FontMappings,
  FontMetrics,
  FontInfo,
} from "../../domain";
import type { ParsedNamedColorSpace } from "../color/color-space.native";
import type { PdfPattern } from "../pattern/pattern.types";
import type { PdfShading } from "../shading/shading.types";

// =============================================================================
// Parsed Element Types
// =============================================================================

export type ParsedPath = {
  readonly type: "path";
  readonly operations: readonly PdfPathOp[];
  readonly paintOp: PdfPaintOp;
  /**
   * Fill rule used for painting operations that include a fill component.
   *
   * - `f`, `F`, `B`, `b`: `nonzero`
   * - `f*`, `B*`, `b*`: `evenodd`
   *
   * This is currently used by soft-mask rasterization to preserve the visual
   * difference between winding rules.
   */
  readonly fillRule?: "nonzero" | "evenodd";
  readonly graphicsState: PdfGraphicsState;
  /**
   * Optional source tag for elements produced outside the primary content stream.
   *
   * - `"type3"`: path created by executing a Type3 `/CharProcs` glyph program
   */
  readonly source?: "type3";
};

/**
 * Text run extracted from PDF content stream.
 *
 * Represents a single text show operation (Tj, TJ, ', ").
 *
 * ## Position Semantics
 *
 * x and y represent the **baseline** position (not bounding box):
 * - x: Start of baseline (left edge of first glyph)
 * - y: Baseline vertical position
 *
 * These are in PDF page space (after CTM transformation).
 *
 * @see ISO 32000-1:2008 Section 9.4.4 - Text Rendering
 */
export type TextRun = {
  readonly text: string;

  /**
   * Snapshot of the text matrix (Tm) at the moment the text-showing operator ran.
   *
   * This is required for rendering Type3 glyph programs, which are executed in
   * graphics mode using the text rendering matrix derived from Tm + font state.
   */
  readonly textMatrix: PdfMatrix;

  /**
   * X coordinate of baseline start in PDF points (page space).
   * This is where the first glyph's origin is positioned.
   */
  readonly x: number;

  /**
   * Y coordinate of baseline in PDF points (page space).
   *
   * This is the **baseline**, not the bounding box edge.
   * The baseline is where glyphs sit; ascenders go above, descenders below.
   *
   * Calculated as: textMatrix.f + textRise, then transformed by CTM.
   *
   * @see ISO 32000-1:2008 Section 9.4.2 - Text Positioning
   */
  readonly y: number;

  readonly fontSize: number;
  /**
   * Font resource identifier (e.g., "F1", "/F1").
   * This is the PDF internal name used in Tf operator.
   */
  readonly fontName: string;
  /**
   * Actual font name from BaseFont entry (e.g., "CIDFont+F1", "Helvetica").
   * This is the real font name for rendering, used for @font-face matching.
   */
  readonly baseFont?: string;
  /**
   * Resolved font info for the current scope at the moment of the text run.
   *
   * This avoids ambiguity when the same BaseFont name appears in multiple
   * resource scopes (e.g. Form XObjects) with different encodings.
   */
  readonly fontInfo?: FontInfo;

  /**
   * X coordinate where text ends (after last glyph).
   * Used to calculate text width: width = endX - x
   */
  readonly endX: number;
  /**
   * Effective font size after applying text matrix and CTM scaling.
   * PDF Reference 9.4.4: The actual rendered text size is affected by
   * both the text matrix (Tm) and the current transformation matrix (CTM).
   */
  readonly effectiveFontSize: number;

  /** Text rise (Ts) in text space units. */
  readonly textRise: number;

  // ==========================================================================
  // Text spacing properties (from PDF text state operators)
  // ==========================================================================

  /**
   * Character spacing in PDF points (Tc operator).
   * Added to each character's displacement after glyph width.
   */
  readonly charSpacing: number;

  /**
   * Word spacing in PDF points (Tw operator).
   * Added to space character (0x20) displacement only.
   */
  readonly wordSpacing: number;

  /**
   * Horizontal scaling as percentage (Tz operator).
   * Default: 100 (no scaling).
   */
  readonly horizontalScaling: number;

  /**
   * Snapshot of the full graphics state at the moment the run was created.
   *
   * Used for Type3 glyph rendering where each glyph program inherits the
   * current fill/stroke colors, alpha, line styles, and CTM.
   */
  readonly graphicsState: PdfGraphicsState;
};

export type ParsedText = {
  readonly type: "text";
  readonly runs: readonly TextRun[];
  readonly graphicsState: PdfGraphicsState;
};

export type ParsedImage = {
  readonly type: "image";
  readonly name: string;
  readonly graphicsState: PdfGraphicsState;
};

export type ParsedRasterImage = {
  readonly type: "rasterImage";
  readonly image: PdfImage;
};

export type ParsedElement = ParsedPath | ParsedText | ParsedImage | ParsedRasterImage;

// =============================================================================
// Operand Stack Type
// =============================================================================

export type OperandValue = number | string | readonly (number | string)[];
export type OperandStack = readonly OperandValue[];

// =============================================================================
// Parser Context (Immutable State)
// =============================================================================

/**
 * Text object state for tracking position and font during BT/ET blocks.
 */
export type TextObjectState = {
  readonly textMatrix: PdfMatrix;
  readonly textLineMatrix: PdfMatrix;
  readonly currentFont: string;
  readonly currentBaseFont: string | undefined;
  readonly currentFontInfo: FontInfo | undefined;
  readonly currentFontSize: number;
  readonly currentFontMetrics: FontMetrics;
  readonly currentCodeByteWidth: 1 | 2;
  readonly textRuns: readonly TextRun[];
};

/**
 * Immutable parser context passed to operator handlers.
 *
 * Handlers receive this context and return a new ParserState with updates.
 * This design enables:
 * - Pure functions (no side effects)
 * - Individual testing of each handler
 * - Predictable state transitions
 */
export type ParserContext = {
  readonly operandStack: OperandStack;
  readonly currentPath: readonly PdfPathOp[];
  readonly elements: readonly ParsedElement[];
  readonly inTextObject: boolean;
  readonly textState: TextObjectState;
  readonly fontMappings: FontMappings;
  /**
   * Page bounding box in page space, used as a fallback paint region for operators
   * that fill the current clip (e.g. `sh`) when no clip has been established yet.
   */
  readonly pageBBox: PdfBBox;
  /**
   * Extracted `/Shading` resources for the current page/scope (name → supported shading).
   */
  readonly shadings: ReadonlyMap<string, PdfShading>;
  /**
   * When > 0, enables rasterization for `sh` (shading fill) operators.
   *
   * The value is the maximum of `{width,height}` for the generated raster image.
   */
  readonly shadingMaxSize: number;
  /**
   * When > 0, enables per-pixel clip mask generation for `W`/`W*` clipping paths.
   *
   * The value is the maximum of `{width,height}` for the generated clip mask grid.
   * Set to `0` to keep clip mask generation disabled (bbox-only clipping remains).
   */
  readonly clipPathMaxSize: number;
  /**
   * Extracted `/Pattern` resources for the current page/scope (name → supported pattern).
   */
  readonly patterns: ReadonlyMap<string, PdfPattern>;
  /**
   * Extracted `/ColorSpace` resources for the current page/scope (name → supported color space).
   */
  readonly colorSpaces: ReadonlyMap<string, ParsedNamedColorSpace>;
  /**
   * Extracted `/ExtGState` resources for the current page (name → supported params).
   *
   * This is injected by the native parser to keep operator parsing independent
   * from the native object model.
   */
  readonly extGState: ReadonlyMap<
    string,
    {
      readonly fillAlpha?: number;
      readonly strokeAlpha?: number;
      readonly blendMode?: string;
      readonly softMaskAlpha?: number;
      readonly softMask?: PdfSoftMask;
      readonly lineWidth?: number;
      readonly lineCap?: 0 | 1 | 2;
      readonly lineJoin?: 0 | 1 | 2;
      readonly miterLimit?: number;
      readonly dashArray?: readonly number[];
      readonly dashPhase?: number;
    }
  >;
  /** GraphicsStateStack is mutable by design - we don't include it in immutable context */
};

/**
 * Result returned by operator handlers.
 *
 * Contains only the fields that were modified - undefined fields are unchanged.
 */
export type ParserStateUpdate = {
  readonly operandStack?: OperandStack;
  readonly currentPath?: readonly PdfPathOp[];
  readonly elements?: readonly ParsedElement[];
  readonly inTextObject?: boolean;
  readonly textState?: TextObjectState;
};

// =============================================================================
// Operator Handler Types
// =============================================================================

/**
 * Graphics state operations interface.
 *
 * Passed to handlers that need to modify graphics state.
 * This abstraction allows handlers to be tested without GraphicsStateStack.
 */
export type GraphicsStateOps = {
  readonly push: () => void;
  readonly pop: () => void;
  readonly get: () => PdfGraphicsState;
  readonly concatMatrix: (matrix: PdfMatrix) => void;
  readonly setClipBBox: (bbox: PdfBBox) => void;
  readonly setClipMask: (mask: PdfSoftMask | undefined) => void;
  readonly setBlendMode: (mode: string) => void;
  readonly setSoftMaskAlpha: (alpha: number) => void;
  readonly setSoftMask: (mask: PdfSoftMask | undefined) => void;
  readonly setFillPatternName: (name: string) => void;
  readonly setStrokePatternName: (name: string) => void;
  readonly setFillPatternUnderlyingColorSpace: (space: "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | undefined) => void;
  readonly setStrokePatternUnderlyingColorSpace: (space: "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | undefined) => void;
  readonly setFillPatternColor: (color: PdfGraphicsState["fillPatternColor"] | undefined) => void;
  readonly setStrokePatternColor: (color: PdfGraphicsState["strokePatternColor"] | undefined) => void;
  readonly setFillColorSpaceName: (name: string | undefined) => void;
  readonly setStrokeColorSpaceName: (name: string | undefined) => void;
  readonly setLineWidth: (width: number) => void;
  readonly setLineCap: (cap: 0 | 1 | 2) => void;
  readonly setLineJoin: (join: 0 | 1 | 2) => void;
  readonly setMiterLimit: (limit: number) => void;
  readonly setDashPattern: (array: readonly number[], phase: number) => void;
  readonly setFillGray: (gray: number) => void;
  readonly setStrokeGray: (gray: number) => void;
  readonly setFillRgb: (r: number, g: number, b: number) => void;
  readonly setStrokeRgb: (r: number, g: number, b: number) => void;
  readonly setFillCmyk: (args: { readonly c: number; readonly m: number; readonly y: number; readonly k: number }) => void;
  readonly setStrokeCmyk: (args: { readonly c: number; readonly m: number; readonly y: number; readonly k: number }) => void;
  readonly setFillAlpha: (alpha: number) => void;
  readonly setStrokeAlpha: (alpha: number) => void;
  readonly setCharSpacing: (spacing: number) => void;
  readonly setWordSpacing: (spacing: number) => void;
  readonly setHorizontalScaling: (scale: number) => void;
  readonly setTextLeading: (leading: number) => void;
  readonly setTextRenderingMode: (mode: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  readonly setTextRise: (rise: number) => void;
};

/**
 * Operator handler function signature.
 *
 * Pure function that takes context and graphics state operations,
 * returns state updates.
 */
export type OperatorHandler = (
  ctx: ParserContext,
  gfxOps: GraphicsStateOps
) => ParserStateUpdate;

/**
 * Handler entry with metadata for operator registry.
 */
export type OperatorHandlerEntry = {
  readonly handler: OperatorHandler;
  /** PDF operator category for documentation */
  readonly category: "graphics-state" | "color" | "path" | "paint" | "text" | "xobject";
  /** Brief description of what this operator does */
  readonly description: string;
};
