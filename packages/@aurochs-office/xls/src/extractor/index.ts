/**
 * @file XLS extractor (BIFF parsed stream → XLS domain model)
 */

import type { WorkbookStreamParseResult } from "../biff/workbook-stream";
import type {
  XlsCell,
  XlsCellRange,
  XlsColumn,
  XlsFont,
  XlsFormula,
  XlsNumberFormat,
  XlsRow,
  XlsWorkbook,
  XlsWorksheet,
  XlsXf,
} from "../domain/types";

type EmptyProps = Record<string, never>;

function dimensionsProps(dimensions: XlsWorksheet["dimensions"]): { readonly dimensions: NonNullable<XlsWorksheet["dimensions"]> } | EmptyProps {
  if (!dimensions) {
    return {};
  }
  return { dimensions };
}

function defaultColumnWidthProps(defaultColumnWidthChars: number | undefined): { readonly defaultColumnWidthChars: number } | EmptyProps {
  if (defaultColumnWidthChars === undefined) {
    return {};
  }
  return { defaultColumnWidthChars };
}

function defaultRowHeightProps(
  defaultRowHeightTwips: number | undefined,
  defaultRowZeroHeight: boolean | undefined,
): { readonly defaultRowHeightTwips: number; readonly defaultRowZeroHeight: boolean } | EmptyProps {
  if (defaultRowHeightTwips === undefined || defaultRowZeroHeight === undefined) {
    return {};
  }
  return { defaultRowHeightTwips, defaultRowZeroHeight };
}

/** Extract an `XlsWorkbook` domain model from parsed BIFF workbook stream records. */
export function extractXlsWorkbook(parsed: WorkbookStreamParseResult): XlsWorkbook {
  if (!parsed) {
    throw new Error("extractXlsWorkbook: parsed must be provided");
  }

  const fonts: readonly XlsFont[] = parsed.globals.fonts;
  const numberFormats: readonly XlsNumberFormat[] = parsed.globals.formats;
  const xfs: readonly XlsXf[] = parsed.globals.xfs;

  const sheets: XlsWorksheet[] = parsed.sheets.map((sheet) => {
    const rows: XlsRow[] = sheet.rows.map((r) => ({
      row: r.row,
      ...(r.isStandardHeight ? {} : { heightTwips: r.heightTwips }),
      ...(r.isHeightZero ? { hidden: true } : {}),
      ...(r.xfIndex !== undefined ? { xfIndex: r.xfIndex } : {}),
    }));

    const columns: XlsColumn[] = sheet.columns.map((c) => ({
      colFirst: c.colFirst,
      colLast: c.colLast,
      width256: c.width256,
      ...(c.isHidden ? { hidden: true } : {}),
      ...(c.xfIndex !== undefined ? { xfIndex: c.xfIndex } : {}),
    }));

    const mergeCells: XlsCellRange[] = sheet.mergeCells.map((m) => ({
      firstRow: m.firstRow,
      lastRow: m.lastRow,
      firstCol: m.firstCol,
      lastCol: m.lastCol,
    }));

    const cells: XlsCell[] = sheet.cells.map((cell) => {
      switch (cell.kind) {
        case "number":
          return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "number", value: cell.value } };
        case "string":
          return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "string", value: cell.value } };
        case "boolean":
          return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "boolean", value: cell.value } };
        case "error":
          return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "error", value: cell.value } };
        case "empty":
          return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "empty" } };
        case "formula": {
          const formula: XlsFormula = {
            tokens: cell.formula.tokens,
            alwaysCalc: cell.formula.alwaysCalc,
            calcOnLoad: cell.formula.calcOnLoad,
            isSharedFormula: cell.formula.isSharedFormula,
          };
          switch (cell.resultKind) {
            case "number":
              return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "number", value: cell.value }, formula };
            case "empty":
              return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "empty" }, formula };
            case "boolean":
              return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "boolean", value: cell.value }, formula };
            case "error":
              return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "error", value: cell.value }, formula };
            case "string":
              return { row: cell.row, col: cell.col, xfIndex: cell.xfIndex, value: { type: "string", value: cell.value }, formula };
          }
        }
      }
    });

    return {
      name: sheet.boundsheet.sheetName,
      state: sheet.boundsheet.hiddenState,
      ...dimensionsProps(sheet.dimensions),
      ...defaultColumnWidthProps(sheet.defaultColumnWidth?.defaultCharWidth),
      ...defaultRowHeightProps(sheet.defaultRowHeight?.heightTwips, sheet.defaultRowHeight?.isHeightZero),
      rows,
      columns,
      mergeCells,
      cells,
    };
  });

  return {
    dateSystem: parsed.globals.dateSystem,
    sharedStrings: parsed.globals.sharedStrings?.strings ?? [],
    ...(parsed.globals.palette ? { palette: parsed.globals.palette.colors } : {}),
    fonts,
    numberFormats,
    xfs,
    styles: parsed.globals.styles.map((s) => {
      if (s.kind === "builtIn") {
        return {
          kind: "builtIn",
          styleXfIndex: s.styleXfIndex,
          builtInStyleId: s.builtInStyleId,
          outlineLevel: s.outlineLevel,
        };
      }
      return { kind: "userDefined", styleXfIndex: s.styleXfIndex, name: s.name };
    }),
    sheets,
  };
}
