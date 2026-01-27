/**
 * @file Style collection upsert helpers
 *
 * Utilities for inserting style components into `XlsxStyleSheet` collections while preserving
 * de-duplication semantics (return existing IDs when an identical entry already exists).
 */

import type { XlsxBorder } from "../border";
import type { XlsxFill } from "../fill";
import type { XlsxFont } from "../font";
import type { XlsxNumberFormat } from "../number-format";
import type { XlsxCellXf, XlsxStyleSheet } from "../types";
import { borderId, fillId, fontId, numFmtId, styleId, type BorderId, type FillId, type FontId, type NumFmtId, type StyleId } from "../../types";
import { isEqualBorder, isEqualCellXf, isEqualFill, isEqualFont } from "./equality";

export type UpsertFontResult = { readonly styles: XlsxStyleSheet; readonly fontId: FontId };
export type UpsertFillResult = { readonly styles: XlsxStyleSheet; readonly fillId: FillId };
export type UpsertBorderResult = { readonly styles: XlsxStyleSheet; readonly borderId: BorderId };
export type UpsertNumberFormatResult = { readonly styles: XlsxStyleSheet; readonly numFmtId: NumFmtId };
export type UpsertCellXfResult = { readonly styles: XlsxStyleSheet; readonly styleId: StyleId };

/**
 * Insert a font into `styles.fonts` if it doesn't already exist, and return its `fontId`.
 */
export function upsertFont(styles: XlsxStyleSheet, font: XlsxFont): UpsertFontResult {
  const existingIndex = styles.fonts.findIndex((candidate) => isEqualFont(candidate, font));
  if (existingIndex >= 0) {
    return { styles, fontId: fontId(existingIndex) };
  }
  return { styles: { ...styles, fonts: [...styles.fonts, font] }, fontId: fontId(styles.fonts.length) };
}

/**
 * Insert a fill into `styles.fills` if it doesn't already exist, and return its `fillId`.
 */
export function upsertFill(styles: XlsxStyleSheet, fill: XlsxFill): UpsertFillResult {
  const existingIndex = styles.fills.findIndex((candidate) => isEqualFill(candidate, fill));
  if (existingIndex >= 0) {
    return { styles, fillId: fillId(existingIndex) };
  }
  return { styles: { ...styles, fills: [...styles.fills, fill] }, fillId: fillId(styles.fills.length) };
}

/**
 * Insert a border into `styles.borders` if it doesn't already exist, and return its `borderId`.
 */
export function upsertBorder(styles: XlsxStyleSheet, border: XlsxBorder): UpsertBorderResult {
  const existingIndex = styles.borders.findIndex((candidate) => isEqualBorder(candidate, border));
  if (existingIndex >= 0) {
    return { styles, borderId: borderId(existingIndex) };
  }
  return { styles: { ...styles, borders: [...styles.borders, border] }, borderId: borderId(styles.borders.length) };
}

function nextCustomNumFmtId(numberFormats: readonly XlsxNumberFormat[]): number {
  const max = numberFormats.reduce<number>((acc, entry) => Math.max(acc, entry.numFmtId), 163);
  return Math.max(164, max + 1);
}

/**
 * Ensure a custom number format exists for `formatCode`, assigning a new `numFmtId` if needed.
 */
export function upsertCustomNumberFormat(styles: XlsxStyleSheet, formatCode: string): UpsertNumberFormatResult {
  const existing = styles.numberFormats.find((candidate) => candidate.formatCode === formatCode);
  if (existing) {
    return { styles, numFmtId: existing.numFmtId };
  }
  const nextId = nextCustomNumFmtId(styles.numberFormats);
  const entry: XlsxNumberFormat = { numFmtId: numFmtId(nextId), formatCode };
  return { styles: { ...styles, numberFormats: [...styles.numberFormats, entry] }, numFmtId: entry.numFmtId };
}

/**
 * Reference a built-in number format by ID without modifying the styles collection.
 */
export function useBuiltinNumberFormat(styles: XlsxStyleSheet, builtinId: number): UpsertNumberFormatResult {
  void styles;
  return { styles, numFmtId: numFmtId(builtinId) };
}

/**
 * Insert a cell format (xf) into `styles.cellXfs` if it doesn't already exist, and return its `styleId`.
 */
export function upsertCellXf(styles: XlsxStyleSheet, xf: XlsxCellXf): UpsertCellXfResult {
  const existingIndex = styles.cellXfs.findIndex((candidate) => isEqualCellXf(candidate, xf));
  if (existingIndex >= 0) {
    return { styles, styleId: styleId(existingIndex) };
  }
  return { styles: { ...styles, cellXfs: [...styles.cellXfs, xf] }, styleId: styleId(styles.cellXfs.length) };
}
