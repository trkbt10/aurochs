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

// Position types (WordprocessingML Drawing - Section 20.4)
export type {
  AlignH,
  AlignV,
  RelFromH,
  RelFromV,
  PositionH,
  PositionV,
  Point2D,
  Size2D,
} from "./position";

// Anchor types (SpreadsheetML Drawing - Section 20.5)
export type {
  CellMarker,
  AnchorClientData,
  AbsoluteAnchor,
  OneCellAnchor,
  TwoCellAnchor,
  EditAs,
} from "./anchor";

// Wrap types (WordprocessingML Drawing - Section 20.4)
export type {
  WrapText,
  WrapPolygon,
  WrapSquare,
  WrapThrough,
  WrapTight,
  WrapTopAndBottom,
} from "./wrap";

// Lock types (DrawingML - Section 20.1.2.2)
export type {
  GraphicFrameLocks,
  GroupLocks,
  ConnectorLocks,
  ContentPartLocks,
  PictureLocks,
  ShapeLocks,
} from "./locks";

// Content types (WordprocessingML Drawing - Section 20.4)
export type {
  BlackWhiteMode,
  ContentPart,
  LinkedTextbox,
  TextboxInfo,
  ConnectionTarget,
} from "./content";
