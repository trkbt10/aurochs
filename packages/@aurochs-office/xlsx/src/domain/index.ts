/**
 * @file XLSX Domain Types
 *
 * Public entry point for SpreadsheetML domain types.
 * Consumers use these types to build XlsxWorkbook objects programmatically.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

// Branded types and constructors
export type { RowIndex, ColIndex, StyleId, FontId, FillId, BorderId, NumFmtId } from "./types";
export { rowIdx, colIdx, styleId, fontId, fillId, borderId, numFmtId } from "./types";

// Date system
export type { XlsxDateSystem } from "./date-system";

// Cell types
export type { CellAddress, CellRange } from "./cell/address";
export type { Cell, CellValue, StringCellValue, NumberCellValue, BooleanCellValue, ErrorCellValue, DateCellValue, EmptyCellValue } from "./cell/types";
export type { Formula } from "./cell/formula";

// Style types
export type { XlsxStyleSheet, XlsxCellXf, XlsxCellStyle, XlsxAlignment, XlsxProtection } from "./style/types";
export type { XlsxFont, XlsxColor } from "./style/font";
export type { XlsxFill, XlsxPatternFill } from "./style/fill";
export type { XlsxBorder, XlsxBorderEdge } from "./style/border";
export type { XlsxNumberFormat } from "./style/number-format";

// Workbook / worksheet types
export type { XlsxWorkbook, XlsxWorksheet, XlsxRow, XlsxColumnDef, XlsxSheetView, XlsxDefinedName } from "./workbook";

// Drawing types
export type {
  XlsxDrawing,
  XlsxDrawingAnchor,
  XlsxTwoCellAnchor,
  XlsxOneCellAnchor,
  XlsxAbsoluteAnchor,
  XlsxCellAnchorOffset,
  XlsxExtent,
  XlsxAbsolutePosition,
  XlsxNonVisualProperties,
  XlsxDrawingContent,
  XlsxPicture,
  XlsxShape,
  XlsxChartFrame,
  XlsxGroupShape,
  XlsxConnectionShape,
  XlsxEditAs,
} from "./drawing/types";
