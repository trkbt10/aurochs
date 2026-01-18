/**
 * @file Common DrawingML Types for OOXML processing
 *
 * These types represent DrawingML concepts shared across Office Open XML formats.
 * Both PPTX and DOCX use these types for images, shapes, and other graphics.
 *
 * The container elements differ by format:
 * - PPTX: p:pic (PresentationML)
 * - DOCX: wp:inline, wp:anchor (WordprocessingDrawingML)
 *
 * @see ECMA-376 Part 1, Section 20.1 (DrawingML)
 * @see ECMA-376 Part 1, Section 20.2 (DrawingML - Picture)
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import type { EMU } from "./units";

// =============================================================================
// Relationship Reference Types
// =============================================================================

/**
 * Relationship ID for embedded or linked resources.
 * Format-agnostic - used by both PPTX and DOCX.
 */
export type RelationshipId = string;

// =============================================================================
// Extent (Size) Types
// =============================================================================

/**
 * Extent specifies the size of an object in EMUs.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.7 (extent)
 * @see ECMA-376 Part 1, Section 20.1.7.3 (ext)
 */
export type DrawingExtent = {
  /** Width in EMUs */
  readonly cx: EMU;
  /** Height in EMUs */
  readonly cy: EMU;
};

/**
 * Effect extent specifies additional space around an object for effects.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.6 (effectExtent)
 */
export type DrawingEffectExtent = {
  /** Left extent in EMUs */
  readonly l: EMU;
  /** Top extent in EMUs */
  readonly t: EMU;
  /** Right extent in EMUs */
  readonly r: EMU;
  /** Bottom extent in EMUs */
  readonly b: EMU;
};

// =============================================================================
// Source Rectangle (Cropping)
// =============================================================================

/**
 * Source rectangle for cropping.
 * Values are in percentage (0-100000 = 0-100%).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.55 (srcRect)
 */
export type DrawingSourceRect = {
  readonly l?: number;
  readonly t?: number;
  readonly r?: number;
  readonly b?: number;
};

// =============================================================================
// Blip (Image Reference) Types
// =============================================================================

/**
 * Blip compression state.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.13 (blip, cstate attribute)
 */
export type BlipCompression = "email" | "hqprint" | "print" | "screen" | "none";

/**
 * Blip reference to an image.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.13 (blip)
 */
export type DrawingBlip = {
  /** Relationship ID to the embedded image file */
  readonly rEmbed?: RelationshipId;
  /** Relationship ID to linked image */
  readonly rLink?: RelationshipId;
  /** Compression state */
  readonly cstate?: BlipCompression;
};

/**
 * Tile flip mode for tiled fills.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.66 (ST_TileFlipMode)
 */
export type TileFlipMode = "none" | "x" | "y" | "xy";

/**
 * Tile fill configuration.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */
export type DrawingTileFill = {
  /** Horizontal offset in EMUs */
  readonly tx?: EMU;
  /** Vertical offset in EMUs */
  readonly ty?: EMU;
  /** Horizontal scale percentage (100000 = 100%) */
  readonly sx?: number;
  /** Vertical scale percentage (100000 = 100%) */
  readonly sy?: number;
  /** Tile flip mode */
  readonly flip?: TileFlipMode;
  /** Alignment */
  readonly algn?: string;
};

/**
 * Blip fill for an image.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type DrawingBlipFill = {
  /** Blip reference */
  readonly blip?: DrawingBlip;
  /** Stretch fill mode (true if stretch element present) */
  readonly stretch?: boolean;
  /** Tile fill configuration */
  readonly tile?: DrawingTileFill;
  /** Source rectangle (for cropping) */
  readonly srcRect?: DrawingSourceRect;
};

// =============================================================================
// Transform Types
// =============================================================================

/**
 * Transform for a shape or picture.
 *
 * @see ECMA-376 Part 1, Section 20.1.7.6 (xfrm)
 */
export type DrawingTransform = {
  /** X offset in EMUs */
  readonly offX?: EMU;
  /** Y offset in EMUs */
  readonly offY?: EMU;
  /** Width in EMUs */
  readonly extCx?: EMU;
  /** Height in EMUs */
  readonly extCy?: EMU;
  /** Rotation in 60000ths of a degree */
  readonly rot?: number;
  /** Flip horizontal */
  readonly flipH?: boolean;
  /** Flip vertical */
  readonly flipV?: boolean;
};

// =============================================================================
// Outline Types
// =============================================================================

/**
 * Line cap type.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.31 (ST_LineCap)
 */
export type LineCap = "flat" | "rnd" | "sq";

/**
 * Compound line type.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.33 (ST_CompoundLine)
 */
export type CompoundLine = "sng" | "dbl" | "thickThin" | "thinThick" | "tri";

/**
 * Outline properties.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */
export type DrawingOutline = {
  /** Width in EMUs */
  readonly w?: EMU;
  /** Cap type */
  readonly cap?: LineCap;
  /** Compound type */
  readonly cmpd?: CompoundLine;
  /** No fill */
  readonly noFill?: boolean;
  /** Solid fill color (hex) */
  readonly solidFill?: string;
};

// =============================================================================
// Shape Properties Types
// =============================================================================

/**
 * Shape properties for a picture or shape.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.35 (spPr)
 */
export type DrawingShapeProperties = {
  /** Transform */
  readonly xfrm?: DrawingTransform;
  /** Preset geometry */
  readonly prstGeom?: string;
  /** No fill */
  readonly noFill?: boolean;
  /** Solid fill color (hex) */
  readonly solidFill?: string;
  /** Outline */
  readonly ln?: DrawingOutline;
};

// =============================================================================
// Non-Visual Properties Types
// =============================================================================

/**
 * Non-visual drawing properties.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.8 (cNvPr)
 * @see ECMA-376 Part 1, Section 20.4.2.4 (docPr)
 */
export type NonVisualDrawingProps = {
  /** Unique identifier */
  readonly id: number;
  /** Name of the drawing object */
  readonly name: string;
  /** Description (alt text) */
  readonly descr?: string;
  /** Title */
  readonly title?: string;
  /** Hidden */
  readonly hidden?: boolean;
};

// =============================================================================
// Picture Types
// =============================================================================

/**
 * Non-visual picture properties.
 *
 * @see ECMA-376 Part 1, Section 20.2.2.5 (nvPicPr)
 */
export type NonVisualPictureProps = {
  /** Common non-visual properties */
  readonly cNvPr?: NonVisualDrawingProps;
};

/**
 * Picture element (pic:pic).
 *
 * @see ECMA-376 Part 1, Section 20.2.2.6 (pic)
 */
export type DrawingPicture = {
  /** Non-visual properties */
  readonly nvPicPr?: NonVisualPictureProps;
  /** Blip fill */
  readonly blipFill?: DrawingBlipFill;
  /** Shape properties */
  readonly spPr?: DrawingShapeProperties;
};
