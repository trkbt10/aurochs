/**
 * @file ASCII rendering primitives shared across format renderers
 */

export type { Bounds } from "./types";
export type { AsciiCanvas, Cell, CellParams, BoxParams, TextParams } from "./ascii-canvas";
export { createCanvas, setCell, drawBox, drawText, truncateText, renderCanvas, BOX_CHARS, TABLE_CHARS } from "./ascii-canvas";
export type { MapperConfig, GridRect } from "./coordinate-mapper";
export { createMapperConfig, mapBoundsToGrid } from "./coordinate-mapper";
export { wrapText } from "./text-utils";
export type { AsciiTableParams } from "./table-renderer";
export { renderAsciiTable } from "./table-renderer";
