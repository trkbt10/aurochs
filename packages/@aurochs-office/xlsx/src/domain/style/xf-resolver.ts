/**
 * @file Cell XF resolver (SpreadsheetML)
 *
 * Resolves effective `styleId` for a cell (cell → row → column) and returns
 * the merged CellXf (cellXfs + cellStyleXfs xfId) that should be used for rendering.
 *
 * This is the canonical XF resolution logic shared by all rendering layers
 * (SVG renderer, React UI, etc.).
 *
 * @see ECMA-376 Part 4, Section 18.8.45 (xf - Cell Format)
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row → s attribute)
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col → style attribute)
 */

import type { CellAddress } from "../cell/address";
import type { Cell } from "../cell/types";
import type { XlsxWorksheet } from "../workbook";
import type { XlsxStyleSheet, XlsxCellXf } from "./types";

function getColumnStyleId(sheet: XlsxWorksheet, colNumber: number): number | undefined {
  for (const def of sheet.columns ?? []) {
    if ((def.min as number) <= colNumber && colNumber <= (def.max as number)) {
      return def.styleId as number | undefined;
    }
  }
  return undefined;
}

function getRowStyleId(sheet: XlsxWorksheet, rowNumber: number): number | undefined {
  const row = sheet.rows.find((r) => (r.rowNumber as number) === rowNumber);
  return row?.styleId as number | undefined;
}

/**
 * Resolve the effective `styleId` for a cell address based on SpreadsheetML inheritance:
 * cell → row → column.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (c → s attribute)
 */
export function resolveEffectiveStyleId(
  sheet: XlsxWorksheet,
  address: CellAddress,
  cell: Cell | undefined,
): number | undefined {
  return (
    (cell?.styleId as number | undefined) ??
    getRowStyleId(sheet, address.row as number) ??
    getColumnStyleId(sheet, address.col as number)
  );
}

function getCellXf(styles: XlsxStyleSheet, styleId: number | undefined): XlsxCellXf | undefined {
  const idx = typeof styleId === "number" ? styleId : 0;
  if (idx < 0) {
    return styles.cellXfs[0];
  }
  return styles.cellXfs[idx] ?? styles.cellXfs[0];
}

/**
 * Merge a cell XF with its base cell style XF (via xfId).
 *
 * Each `applyXxx` flag controls whether the cell XF's value overrides
 * the base cell style XF's value. When `applyXxx !== false` (default true),
 * the cell XF wins; otherwise the base value is used.
 *
 * @see ECMA-376 Part 4, Section 18.8.45 (xf)
 */
function mergeCellXf(styles: XlsxStyleSheet, xf: XlsxCellXf): XlsxCellXf {
  const base = xf.xfId !== undefined ? styles.cellStyleXfs[xf.xfId] : undefined;
  if (!base) {
    return xf;
  }

  const applyFont = xf.applyFont !== false;
  const applyFill = xf.applyFill !== false;
  const applyBorder = xf.applyBorder !== false;
  const applyAlignment = xf.applyAlignment !== false;
  const applyNumberFormat = xf.applyNumberFormat !== false;
  const applyProtection = xf.applyProtection !== false;

  return {
    numFmtId: applyNumberFormat ? xf.numFmtId : base.numFmtId,
    fontId: applyFont ? xf.fontId : base.fontId,
    fillId: applyFill ? xf.fillId : base.fillId,
    borderId: applyBorder ? xf.borderId : base.borderId,
    xfId: xf.xfId,
    alignment: applyAlignment ? (xf.alignment ?? base.alignment) : base.alignment,
    protection: applyProtection ? (xf.protection ?? base.protection) : base.protection,
    applyNumberFormat: xf.applyNumberFormat,
    applyFont: xf.applyFont,
    applyFill: xf.applyFill,
    applyBorder: xf.applyBorder,
    applyAlignment: xf.applyAlignment,
    applyProtection: xf.applyProtection,
  };
}

/**
 * Resolve a merged CellXf from a `styleId`, applying `cellStyleXfs[xfId]` as the base when present.
 */
export function resolveMergedCellXfFromStyleId(styles: XlsxStyleSheet, styleId: number | undefined): XlsxCellXf {
  const xf = getCellXf(styles, styleId) ?? styles.cellXfs[0]!;
  return mergeCellXf(styles, xf);
}

/**
 * Resolve both the effective styleId (cell → row → column) and its merged CellXf.
 */
export function resolveCellXf(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
}): { readonly styleId: number | undefined; readonly xf: XlsxCellXf } {
  const { styles, sheet, address, cell } = params;
  const styleId = resolveEffectiveStyleId(sheet, address, cell);
  return { styleId, xf: resolveMergedCellXfFromStyleId(styles, styleId) };
}
