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
export const BOX_CHARS = _BOX_CHARS;
/** Table-drawing characters used for table borders */
export const TABLE_CHARS = _TABLE_CHARS;
/** Create a new blank canvas of the given dimensions */
export const createCanvas: typeof _createCanvas = _createCanvas;
/** Set a single cell on the canvas */
export const setCell: typeof _setCell = _setCell;
/** Draw a box outline on the canvas */
export const drawBox: typeof _drawBox = _drawBox;
/** Draw text on the canvas */
export const drawText: typeof _drawText = _drawText;
/** Truncate text to fit within a given width */
export const truncateText: typeof _truncateText = _truncateText;
/** Render the canvas to a string */
export const renderCanvas: typeof _renderCanvas = _renderCanvas;
