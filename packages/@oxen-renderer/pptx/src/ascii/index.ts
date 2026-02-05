/**
 * @file ASCII slide renderer - terminal visualization of slide shapes
 */

export type { AsciiRenderableShape, Bounds } from "./types";
export type { SlideRenderParams } from "./slide-renderer";
export { renderSlideAscii } from "./slide-renderer";
export type { AsciiCanvas, Cell, CellParams, BoxParams, TextParams } from "@oxen-renderer/drawing-ml/ascii";
export { createCanvas, setCell, drawBox, drawText, renderCanvas, BOX_CHARS } from "@oxen-renderer/drawing-ml/ascii";
export type { MapperConfig, GridRect } from "@oxen-renderer/drawing-ml/ascii";
export { createMapperConfig, mapBoundsToGrid } from "@oxen-renderer/drawing-ml/ascii";
