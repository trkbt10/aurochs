/**
 * @file ASCII slide renderer - terminal visualization of slide shapes
 */

export type {
  AsciiRenderableShape,
  AsciiGraphicContent,
  AsciiTableContent,
  AsciiChartContent,
  AsciiDiagramContent,
  Bounds,
} from "./types";
export type { SlideRenderParams } from "./slide-renderer";
export { renderSlideAscii } from "./slide-renderer";
export type { AsciiCanvas, Cell, CellParams, BoxParams, TextParams } from "@aurochs-renderer/drawing-ml/ascii";
export { createCanvas, setCell, drawBox, drawText, renderCanvas, BOX_CHARS } from "@aurochs-renderer/drawing-ml/ascii";
export type { MapperConfig, GridRect } from "@aurochs-renderer/drawing-ml/ascii";
export { createMapperConfig, mapBoundsToGrid } from "@aurochs-renderer/drawing-ml/ascii";
