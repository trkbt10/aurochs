/**
 * @file Cell style details resolver (SpreadsheetML)
 *
 * Expands resolved CellXf into referenced font/fill/border objects for UI editors.
 */

import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import type { Cell } from "@oxen/xlsx/domain/cell/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { XlsxStyleSheet, XlsxCellXf } from "@oxen/xlsx/domain/style/types";
import type { XlsxFont } from "@oxen/xlsx/domain/style/font";
import type { XlsxFill } from "@oxen/xlsx/domain/style/fill";
import type { XlsxBorder } from "@oxen/xlsx/domain/style/border";
import { resolveFormatCode } from "@oxen/xlsx/domain/style/number-format";
import { resolveCellXf } from "./cell-xf";

export type ResolvedCellStyleDetails = {
  readonly styleId: number | undefined;
  readonly xf: XlsxCellXf;
  readonly font: XlsxFont;
  readonly fill: XlsxFill;
  readonly border: XlsxBorder;
  readonly formatCode: string;
};

/**
 * Resolve the effective style details for a cell location.
 *
 * Expands the referenced style ids in the resolved xf into concrete font/fill/border objects so
 * UI components can render and edit selection formatting without manual indirection.
 */
export function resolveCellStyleDetails(params: {
  readonly styles: XlsxStyleSheet;
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
}): ResolvedCellStyleDetails {
  const { styles, sheet, address, cell } = params;
  const { styleId, xf } = resolveCellXf({ styles, sheet, address, cell });
  const font = styles.fonts[xf.fontId] ?? styles.fonts[0]!;
  const fill = styles.fills[xf.fillId] ?? styles.fills[0]!;
  const border = styles.borders[xf.borderId] ?? styles.borders[0]!;
  const formatCode = resolveFormatCode(xf.numFmtId, styles.numberFormats);
  return { styleId, xf, font, fill, border, formatCode };
}
