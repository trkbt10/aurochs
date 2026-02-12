/**
 * @file DOCX Drawing Components Module
 *
 * React components for rendering DrawingML elements in DOCX documents.
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

// Components
export { Picture, type PictureProps } from "./Picture";
export { InlineDrawing, type InlineDrawingProps } from "./InlineDrawing";
export { AnchorDrawing, type AnchorDrawingProps } from "./AnchorDrawing";
export { FloatingImageOverlay, type FloatingImageOverlayProps } from "./FloatingImageOverlay";
export { WordprocessingShape, type WordprocessingShapeProps } from "./WordprocessingShape";
export { ChartPlaceholder, type ChartPlaceholderProps } from "./ChartPlaceholder";
export { TextBox, type TextBoxProps } from "./TextBox";
