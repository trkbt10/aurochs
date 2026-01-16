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

import type { PdfPathOp, PdfPaintOp, PdfGraphicsState, PdfMatrix, FontMappings, FontMetrics } from "../../domain";

// =============================================================================
// Parsed Element Types
// =============================================================================

export type ParsedPath = {
  readonly type: "path";
  readonly operations: readonly PdfPathOp[];
  readonly paintOp: PdfPaintOp;
  readonly graphicsState: PdfGraphicsState;
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

export type ParsedElement = ParsedPath | ParsedText | ParsedImage;

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
   * Extracted `/ExtGState` resources for the current page (name → alpha values).
   *
   * This is injected by the native parser to keep operator parsing independent
   * from the native object model.
   */
  readonly extGState: ReadonlyMap<string, { readonly fillAlpha?: number; readonly strokeAlpha?: number }>;
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
  readonly setLineWidth: (width: number) => void;
  readonly setLineCap: (cap: 0 | 1 | 2) => void;
  readonly setLineJoin: (join: 0 | 1 | 2) => void;
  readonly setMiterLimit: (limit: number) => void;
  readonly setDashPattern: (array: readonly number[], phase: number) => void;
  readonly setFillGray: (gray: number) => void;
  readonly setStrokeGray: (gray: number) => void;
  readonly setFillRgb: (r: number, g: number, b: number) => void;
  readonly setStrokeRgb: (r: number, g: number, b: number) => void;
  readonly setFillCmyk: (c: number, m: number, y: number, k: number) => void;
  readonly setStrokeCmyk: (c: number, m: number, y: number, k: number) => void;
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
