/**
 * @file XLS domain → XLSX domain converter
 */

import type { CellRange } from "../../xlsx/domain/cell/address";
import type { Cell, CellValue } from "../../xlsx/domain/cell/types";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow, XlsxColumnDef } from "../../xlsx/domain/workbook";
import { colIdx, rowIdx, styleId as createStyleId } from "../../xlsx/domain/types";
import type { XlsCell, XlsCellRange, XlsDimensions, XlsWorkbook, XlsWorksheet } from "../domain/types";
import type { XlsParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";
import { convertXlsStylesToXlsxStyles } from "./styles";
import { tryConvertBiffRpnToFormulaExpression } from "../formula/biff-rpn-to-expression";

function resolveStyleIdFromXfIndex(
  xfIndex: number,
  xfIndexToStyleId: readonly (ReturnType<typeof createStyleId> | undefined)[],
  where: string,
  ctx: XlsParseContext,
): ReturnType<typeof createStyleId> {
  if (!Number.isInteger(xfIndex) || xfIndex < 0 || xfIndex >= xfIndexToStyleId.length) {
    try {
      throw new Error(`${where}: XF index out of range: ${xfIndex} (known=${xfIndexToStyleId.length})`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "XF_INDEX_OUT_OF_RANGE",
          where,
          message: `XF index out of range; using default styleId(0): ${xfIndex}`,
          meta: { xfIndex, known: xfIndexToStyleId.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
    return createStyleId(0);
  }
  const resolved = xfIndexToStyleId[xfIndex];
  if (resolved === undefined) {
    try {
      throw new Error(`${where}: XF index has no mapped styleId: ${xfIndex} (known=${xfIndexToStyleId.length})`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "XF_INDEX_OUT_OF_RANGE",
          where,
          message: `XF index has no mapped styleId; using default styleId(0): ${xfIndex}`,
          meta: { xfIndex, known: xfIndexToStyleId.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
  return resolved ?? createStyleId(0);
}

function toCellValue(value: XlsCell["value"]): CellValue {
  switch (value.type) {
    case "number":
      return value;
    case "string":
      return value;
    case "boolean":
      return value;
    case "error":
      return value;
    case "empty":
      return value;
  }
}

function toXlsxFormula(cell: XlsCell, ctx: XlsParseContext): Cell["formula"] | undefined {
  if (!cell.formula) {
    return undefined;
  }
  if (cell.formula.isSharedFormula) {
    return undefined;
  }

  const expression = tryConvertBiffRpnToFormulaExpression(cell.formula.tokens, { baseRow: cell.row, baseCol: cell.col }, ctx);
  if (!expression) {
    return undefined;
  }

  const calculateAlways = cell.formula.alwaysCalc || cell.formula.calcOnLoad;
  if (calculateAlways) {
    return { expression, type: "normal", calculateAlways: true };
  }
  return { expression, type: "normal" };
}

function toXlsxCell(
  cell: XlsCell,
  xfIndexToStyleId: readonly (ReturnType<typeof createStyleId> | undefined)[],
  ctx: XlsParseContext,
): Cell {
  const style = resolveStyleIdFromXfIndex(cell.xfIndex, xfIndexToStyleId, "Cell", ctx);
  const formula = toXlsxFormula(cell, ctx);
  return {
    address: {
      row: rowIdx(cell.row + 1),
      col: colIdx(cell.col + 1),
      rowAbsolute: false,
      colAbsolute: false,
    },
    value: toCellValue(cell.value),
    ...(formula ? { formula } : {}),
    styleId: style,
  };
}

function toXlsxRangeFromDimensions(d: XlsDimensions): CellRange | undefined {
  if (d.firstRow === 0 && d.lastRowExclusive === 0 && d.firstCol === 0 && d.lastColExclusive === 0) {
    return undefined;
  }
  return {
    start: { row: rowIdx(d.firstRow + 1), col: colIdx(d.firstCol + 1), rowAbsolute: false, colAbsolute: false },
    end: { row: rowIdx(d.lastRowExclusive), col: colIdx(d.lastColExclusive), rowAbsolute: false, colAbsolute: false },
  };
}

function toXlsxRange(r: XlsCellRange): CellRange {
  return {
    start: { row: rowIdx(r.firstRow + 1), col: colIdx(r.firstCol + 1), rowAbsolute: false, colAbsolute: false },
    end: { row: rowIdx(r.lastRow + 1), col: colIdx(r.lastCol + 1), rowAbsolute: false, colAbsolute: false },
  };
}

function toXlsxColumns(
  cols: XlsWorksheet["columns"],
  xfIndexToStyleId: readonly (ReturnType<typeof createStyleId> | undefined)[],
  ctx: XlsParseContext,
): readonly XlsxColumnDef[] | undefined {
  if (cols.length === 0) {
    return undefined;
  }
  return cols.map((c) => ({
    min: colIdx(c.colFirst + 1),
    max: colIdx(c.colLast + 1),
    width: c.width256 / 256,
    ...(c.hidden ? { hidden: true } : {}),
    ...(c.xfIndex !== undefined ? { styleId: resolveStyleIdFromXfIndex(c.xfIndex, xfIndexToStyleId, "Column", ctx) } : {}),
  }));
}

function toXlsxRows(
  sheet: XlsWorksheet,
  xfIndexToStyleId: readonly (ReturnType<typeof createStyleId> | undefined)[],
  ctx: XlsParseContext,
): readonly XlsxRow[] {
  const rowMap = new Map<number, XlsxRow>();

  for (const cell of sheet.cells) {
    const rowNumber = cell.row + 1;
    const current = rowMap.get(rowNumber);
    const xlsxCell = toXlsxCell(cell, xfIndexToStyleId, ctx);
    if (!current) {
      rowMap.set(rowNumber, { rowNumber: rowIdx(rowNumber), cells: [xlsxCell] });
    } else {
      rowMap.set(rowNumber, { ...current, cells: [...current.cells, xlsxCell] });
    }
  }

  for (const row of sheet.rows) {
    const rowNumber = row.row + 1;
    const current = rowMap.get(rowNumber) ?? { rowNumber: rowIdx(rowNumber), cells: [] };

    const hidden = row.hidden ?? false;
    const height = row.heightTwips !== undefined ? row.heightTwips / 20 : undefined;
    const customHeight = row.heightTwips !== undefined ? true : undefined;
    const rowStyleId = row.xfIndex !== undefined ? resolveStyleIdFromXfIndex(row.xfIndex, xfIndexToStyleId, "Row", ctx) : undefined;

    rowMap.set(rowNumber, {
      ...current,
      ...(height !== undefined ? { height, customHeight } : {}),
      ...(hidden ? { hidden: true } : {}),
      ...(rowStyleId ? { styleId: rowStyleId } : {}),
    });
  }

  const rows = Array.from(rowMap.values());
  rows.sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
  return rows.map((r) => ({ ...r, cells: [...r.cells].sort((a, b) => (a.address.col as number) - (b.address.col as number)) }));
}

function toXlsxWorksheet(
  sheet: XlsWorksheet,
  sheetId: number,
  dateSystem: XlsWorkbook["dateSystem"],
  xfIndexToStyleId: readonly (ReturnType<typeof createStyleId> | undefined)[],
  ctx: XlsParseContext,
): XlsxWorksheet {
  const dimension = sheet.dimensions ? toXlsxRangeFromDimensions(sheet.dimensions) : undefined;
  const mergeCells = sheet.mergeCells.length ? sheet.mergeCells.map(toXlsxRange) : undefined;
  const columns = toXlsxColumns(sheet.columns, xfIndexToStyleId, ctx);
  const rows = toXlsxRows(sheet, xfIndexToStyleId, ctx);

  const sheetFormatPr: { defaultRowHeight?: number; defaultColWidth?: number; zeroHeight?: boolean } = {};
  if (sheet.defaultRowHeightTwips !== undefined) {
    sheetFormatPr.defaultRowHeight = sheet.defaultRowHeightTwips / 20;
  }
  if (sheet.defaultColumnWidthChars !== undefined) {
    sheetFormatPr.defaultColWidth = sheet.defaultColumnWidthChars;
  }
  if (sheet.defaultRowZeroHeight !== undefined) {
    sheetFormatPr.zeroHeight = sheet.defaultRowZeroHeight;
  }

  return {
    dateSystem,
    name: sheet.name,
    sheetId,
    state: sheet.state,
    dimension,
    ...(columns ? { columns } : {}),
    rows,
    ...(mergeCells ? { mergeCells } : {}),
    ...(Object.keys(sheetFormatPr).length ? { sheetFormatPr } : {}),
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

/** Convert an `XlsWorkbook` domain model into an `XlsxWorkbook`. */
export function convertXlsToXlsx(xls: XlsWorkbook, ctx: XlsParseContext = { mode: "strict" }): XlsxWorkbook {
  if (!xls) {
    throw new Error("convertXlsToXlsx: xls must be provided");
  }

  const { styles, xfIndexToStyleId } = convertXlsStylesToXlsxStyles(xls, ctx);
  const sheets: XlsxWorksheet[] = xls.sheets.map((s, idx) => toXlsxWorksheet(s, idx + 1, xls.dateSystem, xfIndexToStyleId, ctx));
  return {
    dateSystem: xls.dateSystem,
    sheets,
    styles,
    sharedStrings: xls.sharedStrings,
  };
}
