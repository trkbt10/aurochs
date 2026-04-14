/**
 * @file XLSX → DSV conversion
 *
 * Converts an XlsxWorksheet from a parsed XLSX workbook into a DsvDocument AST.
 *
 * The conversion extracts cell values and produces a flat tabular representation:
 *
 * - String cells → field value as-is
 * - Number cells → formatted as decimal string (via domain formatNumberByCode)
 * - Boolean cells → "true" / "false"
 * - Date cells → ISO 8601 string (via domain serialToIsoString)
 * - Error cells → error text (e.g., "#DIV/0!")
 * - Empty cells → empty string
 *
 * Header extraction:
 * When `firstRowAsHeaders` is true (default), the first data row is consumed
 * as column headers. The remaining rows become data records.
 *
 * Sparse row handling:
 * XLSX worksheets store only non-empty rows/cells. The converter fills gaps
 * with empty fields to produce a consistent rectangular DsvDocument.
 *
 * Date detection:
 * XLSX dates are stored as numbers with a date number format. The converter
 * inspects the cell's styleId to determine whether a number should be
 * formatted as a date. This relies on the workbook's style sheet being present.
 *
 * Number/date formatting delegates to the domain layer's Single Source of Truth:
 * - `formatNumberByCode` for General number formatting
 * - `serialToIsoString` for date serial → ISO 8601 conversion
 * - `isDateNumFmtId` for date format detection
 *
 * @see ECMA-376 Part 4, Section 18.8.30 (Number Formats)
 */

import type { DsvDocument, DsvRecord, DsvField, SourceSpan } from "@aurochs/dsv";
import type { ConvertResult, ConvertWarning, OnProgress } from "@aurochs-converters/core";
import type { XlsxWorkbook, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { isDateNumFmtId } from "@aurochs-office/xlsx/domain/style/number-format";
import { formatNumberByCode } from "@aurochs-office/xlsx/domain/style/format-value";
import type { StyleId } from "@aurochs-office/xlsx/domain/types";
import { serialToIsoString } from "@aurochs-office/xlsx/domain/date-serial";
import type { XlsxDateSystem } from "@aurochs-office/xlsx/domain/date-system";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for XLSX → DSV conversion.
 */
export type XlsxToDsvOptions = {
  /**
   * Index of the sheet to convert (0-based). Defaults to 0 (first sheet).
   */
  readonly sheetIndex?: number;

  /**
   * Whether to use the first row as column headers.
   * When true (default), the first row's cell values become headers,
   * and subsequent rows become data records.
   * When false, all rows become data records with no headers.
   */
  readonly firstRowAsHeaders?: boolean;

  /**
   * Callback for progress updates.
   */
  readonly onProgress?: OnProgress;
};

// =============================================================================
// Date format detection
// =============================================================================

/**
 * Determine whether a cell's number format represents a date/time.
 *
 * Resolves the cell's styleId → cellXf → numFmtId, then delegates
 * to the domain layer's `isDateNumFmtId`.
 */
function isCellDateFormatted(styleIdValue: StyleId | undefined, styles: XlsxStyleSheet): boolean {
  if (styleIdValue === undefined) {
    return false;
  }

  const xf = styles.cellXfs[styleIdValue as number];
  if (!xf) {
    return false;
  }

  return isDateNumFmtId(xf.numFmtId as number, styles.numberFormats ?? []);
}

// =============================================================================
// Cell value serialization
// =============================================================================

/**
 * Context required for serializing cell values.
 */
type SerializeContext = {
  readonly styles: XlsxStyleSheet;
  readonly dateSystem: XlsxDateSystem;
};

/**
 * Serialize a CellValue to a string for DSV output.
 *
 * Delegates to:
 * - `formatNumberByCode("General")` for plain number formatting (SoT: domain layer)
 * - `serialToIsoString` for date-formatted number cells (SoT: domain date-serial)
 * - `Date.toISOString()` for DateCellValue (already a Date object)
 */
function serializeCellValue(
  cellValue: CellValue,
  cellStyleId: StyleId | undefined,
  ctx: SerializeContext,
): string {
  switch (cellValue.type) {
    case "string":
      return cellValue.value;

    case "number":
      if (isCellDateFormatted(cellStyleId, ctx.styles)) {
        return serialToIsoString(cellValue.value, ctx.dateSystem);
      }
      return formatNumberByCode(cellValue.value, "General");

    case "boolean":
      return cellValue.value ? "true" : "false";

    case "date":
      return cellValue.value.toISOString();

    case "error":
      return cellValue.value;

    case "empty":
      return "";
  }
}

// =============================================================================
// Synthetic AST nodes
// =============================================================================

/**
 * Synthetic source span for generated AST nodes.
 *
 * DSV AST nodes require source position information, but since we're
 * generating a document (not parsing text), we use a zeroed-out span.
 */
const SYNTHETIC_SPAN: SourceSpan = {
  start: { line: 0, column: 0, offset: 0 },
  end: { line: 0, column: 0, offset: 0 },
};

/**
 * Create a synthetic DsvField from a string value.
 */
function createField(value: string): DsvField {
  return {
    type: "field",
    value,
    raw: value,
    quoting: "unquoted",
    span: SYNTHETIC_SPAN,
  };
}

// =============================================================================
// Row geometry analysis
// =============================================================================

/**
 * Determine the column count from a worksheet's rows.
 *
 * XLSX rows are sparse — we need the maximum column index across all rows
 * to produce a consistent rectangular output.
 */
function resolveColumnCount(rows: readonly XlsxRow[]): number {
  return rows.reduce(
    (maxCol, row) => row.cells.reduce(
      (max, cell) => Math.max(max, cell.address.col as number),
      maxCol,
    ),
    0,
  );
}

/**
 * Build a column-indexed map of cells for efficient lookup.
 * Key is 1-based column index.
 */
function indexCellsByColumn(row: XlsxRow): Map<number, Cell> {
  const map = new Map<number, Cell>();
  for (const cell of row.cells) {
    map.set(cell.address.col as number, cell);
  }
  return map;
}

// =============================================================================
// Header/data row extraction
// =============================================================================

/**
 * Result of extracting headers and data rows from sorted rows.
 */
type ExtractedRowData = {
  readonly headers: readonly string[] | undefined;
  readonly dataRows: readonly XlsxRow[];
};

/**
 * Extract headers from the first row and separate data rows.
 */
function extractHeadersAndData(params: {
  readonly sortedRows: readonly XlsxRow[];
  readonly columnCount: number;
  readonly firstRowAsHeaders: boolean;
  readonly ctx: SerializeContext;
}): ExtractedRowData {
  const { sortedRows, columnCount, firstRowAsHeaders, ctx } = params;
  if (!firstRowAsHeaders || sortedRows.length === 0) {
    return { headers: undefined, dataRows: sortedRows };
  }

  const headerRow = sortedRows[0];
  const headerCellMap = indexCellsByColumn(headerRow);

  const headerValues: string[] = [];
  for (let col = 1; col <= columnCount; col++) {
    const cell = headerCellMap.get(col);
    if (cell) {
      headerValues.push(serializeCellValue(cell.value, cell.styleId, ctx));
    } else {
      headerValues.push("");
    }
  }

  return {
    headers: headerValues,
    dataRows: sortedRows.slice(1),
  };
}

/**
 * Convert an XlsxRow into a DsvRecord.
 */
function convertRowToRecord(params: {
  readonly row: XlsxRow;
  readonly recordIndex: number;
  readonly columnCount: number;
  readonly ctx: SerializeContext;
}): DsvRecord {
  const { row, recordIndex, columnCount, ctx } = params;
  const cellMap = indexCellsByColumn(row);

  const fields: DsvField[] = [];
  for (let col = 1; col <= columnCount; col++) {
    const cell = cellMap.get(col);
    if (cell) {
      const value = serializeCellValue(cell.value, cell.styleId, ctx);
      fields.push(createField(value));
    } else {
      fields.push(createField(""));
    }
  }

  return {
    type: "record",
    fields,
    recordIndex,
    span: SYNTHETIC_SPAN,
  };
}

// =============================================================================
// Conversion entry point
// =============================================================================

/**
 * Convert an XlsxWorkbook (or a specific sheet) to a DsvDocument.
 *
 * @param workbook - Parsed XLSX workbook
 * @param options - Conversion options
 * @returns ConvertResult containing the DsvDocument
 */
export function convertXlsxToDsv(
  workbook: XlsxWorkbook,
  options?: XlsxToDsvOptions,
): ConvertResult<DsvDocument> {
  const sheetIndex = options?.sheetIndex ?? 0;
  const firstRowAsHeaders = options?.firstRowAsHeaders ?? true;
  const onProgress = options?.onProgress;
  const warnings: ConvertWarning[] = [];

  // Validate sheet index
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    warnings.push({
      code: "XLSX_INVALID_SHEET_INDEX",
      message: `Sheet index ${sheetIndex} out of range (workbook has ${workbook.sheets.length} sheets)`,
    });

    return {
      data: { type: "document", headers: undefined, records: [] },
      warnings,
    };
  }

  const sheet = workbook.sheets[sheetIndex];
  const ctx: SerializeContext = {
    styles: workbook.styles,
    dateSystem: workbook.dateSystem,
  };
  const totalRows = sheet.rows.length;

  onProgress?.({ current: 0, total: totalRows, phase: "converting" });

  // Determine column count from all rows
  const columnCount = resolveColumnCount(sheet.rows);

  if (columnCount === 0 || sheet.rows.length === 0) {
    return {
      data: { type: "document", headers: undefined, records: [] },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // Sort rows by row number (XLSX rows are not guaranteed to be sorted)
  const sortedRows = [...sheet.rows].sort(
    (a, b) => (a.rowNumber as number) - (b.rowNumber as number),
  );

  // Extract headers and data rows
  const { headers, dataRows } = extractHeadersAndData({ sortedRows, columnCount, firstRowAsHeaders, ctx });

  // Convert data rows to DSV records
  const records = dataRows.map((row, rowIdx) => {
    onProgress?.({ current: rowIdx + 1, total: totalRows, phase: "converting" });
    return convertRowToRecord({ row, recordIndex: rowIdx, columnCount, ctx });
  });

  const document: DsvDocument = {
    type: "document",
    headers,
    records,
  };

  onProgress?.({ current: totalRows, total: totalRows, phase: "done" });

  return {
    data: document,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
