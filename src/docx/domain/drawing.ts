/**
 * @file DOCX Drawing Type Definitions
 *
 * This module defines types for inline and floating images in WordprocessingML.
 * Uses shared DrawingML types from ooxml/domain/drawing.ts.
 *
 * Drawing elements in DOCX come from the DrawingML namespace (a:) and
 * WordprocessingML Drawing namespace (wp:).
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

// Import shared DrawingML types
export type {
  DrawingExtent as DocxExtent,
  DrawingEffectExtent as DocxEffectExtent,
  DrawingSourceRect as DocxSourceRect,
  DrawingBlip as DocxBlip,
  DrawingBlipFill as DocxBlipFill,
  DrawingTileFill as DocxTileFill,
  DrawingTransform as DocxTransform,
  DrawingShapeProperties as DocxShapeProperties,
  DrawingOutline as DocxOutline,
  NonVisualDrawingProps as DocxNonVisualDrawingProps,
  DrawingPicture as DocxPicture,
} from "../../ooxml/domain/drawing";

// =============================================================================
// Inline Drawing Types
// =============================================================================

import type {
  DrawingExtent,
  DrawingEffectExtent,
  NonVisualDrawingProps,
  DrawingPicture,
} from "../../ooxml/domain/drawing";

/**
 * Inline drawing element (wp:inline).
 *
 * Inline drawings are positioned within the text flow.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.8 (inline)
 */
export type DocxInlineDrawing = {
  readonly type: "inline";
  /** Distance from text (in EMUs) */
  readonly distT?: number;
  readonly distB?: number;
  readonly distL?: number;
  readonly distR?: number;
  /** Size */
  readonly extent: DrawingExtent;
  /** Effect extent */
  readonly effectExtent?: DrawingEffectExtent;
  /** Document properties */
  readonly docPr: NonVisualDrawingProps;
  /** Picture content */
  readonly pic?: DrawingPicture;
};

// =============================================================================
// Anchor Drawing Types
// =============================================================================

/**
 * Horizontal position type.
 *
 * @see ECMA-376 Part 1, Section 20.4.3.4 (positionH)
 */
export type DocxPositionH = {
  /** Relative to */
  readonly relativeFrom: "character" | "column" | "insideMargin" | "leftMargin" | "margin" | "outsideMargin" | "page" | "rightMargin";
  /** Position offset in EMUs */
  readonly posOffset?: number;
  /** Alignment */
  readonly align?: "left" | "right" | "center" | "inside" | "outside";
};

/**
 * Vertical position type.
 *
 * @see ECMA-376 Part 1, Section 20.4.3.5 (positionV)
 */
export type DocxPositionV = {
  /** Relative to */
  readonly relativeFrom: "bottomMargin" | "insideMargin" | "line" | "margin" | "outsideMargin" | "page" | "paragraph" | "topMargin";
  /** Position offset in EMUs */
  readonly posOffset?: number;
  /** Alignment */
  readonly align?: "top" | "bottom" | "center" | "inside" | "outside";
};

/**
 * Text wrapping type.
 *
 * @see ECMA-376 Part 1, Section 20.4.3 (Wrapping)
 */
export type DocxWrapType =
  | { readonly type: "none" }
  | { readonly type: "topAndBottom" }
  | { readonly type: "square"; readonly wrapText?: "bothSides" | "left" | "right" | "largest" }
  | { readonly type: "tight"; readonly wrapText?: "bothSides" | "left" | "right" | "largest" }
  | { readonly type: "through"; readonly wrapText?: "bothSides" | "left" | "right" | "largest" };

/**
 * Anchor drawing element (wp:anchor).
 *
 * Anchor drawings are positioned relative to the page/paragraph.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.3 (anchor)
 */
export type DocxAnchorDrawing = {
  readonly type: "anchor";
  /** Distance from text (in EMUs) */
  readonly distT?: number;
  readonly distB?: number;
  readonly distL?: number;
  readonly distR?: number;
  /** Simple positioning mode */
  readonly simplePos?: boolean;
  /** Allow overlap */
  readonly allowOverlap?: boolean;
  /** Behind document text */
  readonly behindDoc?: boolean;
  /** Locked anchor */
  readonly locked?: boolean;
  /** Layout in cell */
  readonly layoutInCell?: boolean;
  /** Relative height */
  readonly relativeHeight?: number;
  /** Horizontal position */
  readonly positionH?: DocxPositionH;
  /** Vertical position */
  readonly positionV?: DocxPositionV;
  /** Size */
  readonly extent: DrawingExtent;
  /** Effect extent */
  readonly effectExtent?: DrawingEffectExtent;
  /** Text wrapping */
  readonly wrap?: DocxWrapType;
  /** Document properties */
  readonly docPr: NonVisualDrawingProps;
  /** Picture content */
  readonly pic?: DrawingPicture;
};

// =============================================================================
// Drawing Type
// =============================================================================

/**
 * Drawing element (w:drawing).
 *
 * Contains either an inline or anchor drawing.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.9 (drawing)
 */
export type DocxDrawing = DocxInlineDrawing | DocxAnchorDrawing;
