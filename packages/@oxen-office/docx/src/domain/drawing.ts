/**
 * @file DOCX Drawing Type Definitions
 *
 * This module defines types for inline and floating images in WordprocessingML.
 * Uses shared DrawingML types from ooxml/domain/drawing.
 *
 * Drawing elements in DOCX come from the DrawingML namespace (a:) and
 * WordprocessingML Drawing namespace (wp:).
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

// =============================================================================
// Inline Drawing Types
// =============================================================================

import type {
  DrawingExtent,
  DrawingEffectExtent,
  NonVisualDrawingProps,
  DrawingPicture,
  DrawingShapeProperties,
} from "@oxen-office/ooxml/domain/drawing";
import type { DocxParagraph } from "./paragraph";

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
  /** Shape content */
  readonly wsp?: DocxWordprocessingShape;
  /** Chart reference */
  readonly chart?: DocxChart;
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
  /** Shape content */
  readonly wsp?: DocxWordprocessingShape;
  /** Chart reference */
  readonly chart?: DocxChart;
};

// =============================================================================
// Chart Types
// =============================================================================

/**
 * Chart reference within a drawing.
 *
 * Charts in DOCX are stored as separate parts and referenced by relationship ID.
 * The actual chart data is in word/charts/chartN.xml.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 */
export type DocxChart = {
  readonly type: "chart";
  /** Relationship ID to chart part */
  readonly rId: string;
};

// =============================================================================
// Shape Types
// =============================================================================

/**
 * Text box content within a shape.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.24 (txbxContent - wps:txbx)
 */
export type DocxTextBoxContent = {
  /** Paragraphs within the text box */
  readonly content: readonly DocxParagraph[];
};

/**
 * WordprocessingML Shape (wps:wsp).
 *
 * Represents a shape drawn in a document.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.19 (wsp)
 */
export type DocxWordprocessingShape = {
  /** Non-visual shape properties */
  readonly cNvPr?: NonVisualDrawingProps;
  /** Shape properties (geometry, fill, outline, etc.) */
  readonly spPr?: DrawingShapeProperties;
  /** Shape style (reference to theme style) */
  readonly style?: DocxShapeStyle;
  /** Text body within the shape */
  readonly txbx?: DocxTextBoxContent;
  /** Body properties (text layout within shape) */
  readonly bodyPr?: DocxBodyProperties;
};

/**
 * Shape style reference.
 *
 * @see ECMA-376 Part 1, Section 21.3.2.24 (style)
 */
export type DocxShapeStyle = {
  /** Line reference index */
  readonly lnRef?: number;
  /** Fill reference index */
  readonly fillRef?: number;
  /** Effect reference index */
  readonly effectRef?: number;
  /** Font reference index */
  readonly fontRef?: number;
};

/**
 * Body properties for text within a shape.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.1 (bodyPr)
 */
export type DocxBodyProperties = {
  /** Rotation angle in 60000ths of a degree */
  readonly rot?: number;
  /** Text wrapping within shape */
  readonly wrap?: "none" | "square";
  /** Left inset in EMUs */
  readonly lIns?: number;
  /** Top inset in EMUs */
  readonly tIns?: number;
  /** Right inset in EMUs */
  readonly rIns?: number;
  /** Bottom inset in EMUs */
  readonly bIns?: number;
  /** Vertical anchor */
  readonly anchor?: "t" | "ctr" | "b" | "just" | "dist";
  /** Anchor center */
  readonly anchorCtr?: boolean;
  /** Vertical text */
  readonly vert?: "horz" | "vert" | "vert270" | "wordArtVert" | "eaVert" | "mongolianVert" | "wordArtVertRtl";
  /** Text direction */
  readonly upright?: boolean;
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
