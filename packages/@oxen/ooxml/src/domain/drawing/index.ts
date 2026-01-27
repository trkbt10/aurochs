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

export type { RelationshipId } from "./relationship";
export type { DrawingExtent, DrawingEffectExtent } from "./extent";
export type {
  DrawingSourceRect,
  BlipCompression,
  DrawingBlip,
  TileFlipMode,
  DrawingTileFill,
  DrawingBlipFill,
} from "./blip";
export type { DrawingTransform } from "./transform";
export type {
  LineCap,
  CompoundLine,
  DrawingOutline,
  DrawingShapeProperties,
} from "./shape-properties";
export type { NonVisualDrawingProps, NonVisualPictureProps } from "./non-visual";
export type { DrawingPicture } from "./picture";

