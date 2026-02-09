/**
 * @file Local wrappers for ASCII canvas from drawing-ml shared primitives
 */

import type {
  Cell as _Cell,
  AsciiCanvas as _AsciiCanvas,
  CellParams as _CellParams,
  BoxParams as _BoxParams,
  TextParams as _TextParams,
} from "@aurochs-renderer/drawing-ml/ascii";

import {
  BOX_CHARS as _BOX_CHARS,
  TABLE_CHARS as _TABLE_CHARS,
  createCanvas as _createCanvas,
  setCell as _setCell,
  drawBox as _drawBox,
  drawText as _drawText,
  truncateText as _truncateText,
  renderCanvas as _renderCanvas,
} from "@aurochs-renderer/drawing-ml/ascii";

/** A single character cell on the ASCII canvas */
export type Cell = _Cell;
/** The ASCII canvas grid */
export type AsciiCanvas = _AsciiCanvas;
/** Parameters for setting a single cell */
export type CellParams = _CellParams;
/** Parameters for drawing a box */
export type BoxParams = _BoxParams;
/** Parameters for drawing text */
export type TextParams = _TextParams;

/** Box-drawing characters used for shape borders */
export const BOX_CHARS = { ..._BOX_CHARS } as typeof _BOX_CHARS;
/** Table-drawing characters used for table borders */
export const TABLE_CHARS = { ..._TABLE_CHARS } as typeof _TABLE_CHARS;

/** Create a new blank canvas of the given dimensions */
export function createCanvas(width: number, height: number): AsciiCanvas {
  return _createCanvas(width, height);
}

/** Set a single cell on the canvas */
export function setCell(params: CellParams): void {
  _setCell(params);
}

/** Draw a box outline on the canvas */
export function drawBox(params: BoxParams): void {
  _drawBox(params);
}

/** Draw text on the canvas */
export function drawText(params: TextParams): void {
  _drawText(params);
}

/** Truncate text to fit within a given width */
export function truncateText(text: string, maxLen: number): string {
  return _truncateText(text, maxLen);
}

/** Render the canvas to a string */
export function renderCanvas(canvas: AsciiCanvas): string {
  return _renderCanvas(canvas);
}
