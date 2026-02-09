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
export type { AsciiCanvas, Cell, CellParams, BoxParams, TextParams } from "./ascii-canvas";
export { createCanvas, setCell, drawBox, drawText, renderCanvas, BOX_CHARS } from "./ascii-canvas";
export type { MapperConfig, GridRect } from "./coordinate-mapper";
export { createMapperConfig, mapBoundsToGrid } from "./coordinate-mapper";
