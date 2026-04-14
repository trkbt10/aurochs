/**
 * @file DSV → XLSX conversion
 *
 * Converts a DsvDocument (CSV, TSV, etc.) into an XlsxWorkbook domain model.
 *
 * The conversion preserves semantic information by using the DSV context layer's
 * type inference to map field values to appropriate XLSX cell types:
 *
 * - Quoted fields are always treated as strings (quoting signals "this is text")
 * - Unquoted fields are type-inferred: integer/number → NumberCellValue,
 *   boolean → BooleanCellValue, date/datetime → DateCellValue, null → EmptyCellValue
 * - DSV headers become the first row of the worksheet
 *
 * Date handling:
 * Excel stores dates as serial numbers. The conversion uses the 1900 date system
 * (default for Windows Excel). Date fields produce NumberCellValue with a date
 * format style applied, because XLSX represents dates as styled numbers rather
 * than a distinct cell type in the XML layer.
 *
 * @see ECMA-376 Part 4, Section 18.17.4.1 (Date and Time Formatting)
 */

import type { DsvDocument, DsvField, DsvRecord } from "@aurochs/dsv";
import { inferFieldType, coerceFieldValue, analyzeColumns } from "@aurochs/dsv";
import type { InferredFieldType, ColumnMeta } from "@aurochs/dsv";
import type { ConvertResult, ConvertWarning, OnProgress } from "@aurochs-converters/core";
import type { XlsxWorkbook, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import { createWorksheet, createWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import { stringValue } from "@aurochs-office/xlsx/domain/cell/types";
import { cellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import { createDateStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { StyleId } from "@aurochs-office/xlsx/domain/types";
import { rowIdx } from "@aurochs-office/xlsx/domain/types";
import { dateToSerial } from "@aurochs-office/xlsx/domain/date-serial";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for DSV → XLSX conversion.
 */
export type DsvToXlsxOptions = {
  /** Sheet name for the output worksheet. Defaults to "Sheet1". */
  readonly sheetName?: string;

  /**
   * Whether to respect quoting information for type inference.
   *
   * When true (default), quoted fields are always treated as string cells
   * regardless of their content. A quoted "123" becomes a string cell,
   * not a number cell. This preserves the original intent of quoting
   * (e.g., zip codes like "00501" that look like numbers but aren't).
   *
   * When false, all fields are type-inferred based on content alone.
   */
  readonly respectQuoting?: boolean;

  /**
   * Callback for progress updates.
   */
  readonly onProgress?: OnProgress;
};

// =============================================================================
// Cell conversion
// =============================================================================

/**
 * Style IDs for date/datetime cell formats.
 */
type DateStyleIds = {
  readonly dateStyleId: StyleId;
  readonly datetimeStyleId: StyleId;
};

/**
 * Parameters for converting a DSV field into an XLSX cell.
 */
type ConvertFieldParams = {
  readonly field: DsvField;
  readonly col: number;
  readonly row: number;
  readonly columnMeta: ColumnMeta | undefined;
  readonly respectQuoting: boolean;
} & DateStyleIds;

/**
 * Convert a DSV field to an XLSX cell.
 *
 * The conversion strategy depends on the field's quoting and inferred type:
 *
 * - Quoted fields (when respectQuoting=true): always string
 * - "null" (empty/whitespace): empty cell
 * - "integer" / "number": number cell
 * - "boolean": boolean cell
 * - "date" / "datetime": number cell with date serial + date style
 * - "string": string cell
 */
function convertField(params: ConvertFieldParams): Cell {
  const { field, col, row, columnMeta, respectQuoting, dateStyleId, datetimeStyleId } = params;
  const address = cellAddress(col, row);

  // Quoted fields → always string (preserves intent of quoting)
  if (respectQuoting && field.quoting === "quoted") {
    return { address, value: { type: "string", value: field.value } };
  }

  // Per-field type inference first — null/empty fields should always produce
  // empty cells regardless of the column's dominant type.
  // For non-null fields, use column-level inference for consistency
  // (e.g., a column that's mostly integers should treat all non-null values as integers).
  const perFieldType = inferFieldType(field.value);
  const fieldType = resolveFieldType(perFieldType, columnMeta);

  return convertValueToCell({ address, value: field.value, fieldType, dateStyleId, datetimeStyleId });
}

/**
 * Resolve the effective field type: null fields stay null regardless of column inference.
 */
function resolveFieldType(perFieldType: InferredFieldType, columnMeta: ColumnMeta | undefined): InferredFieldType {
  if (perFieldType === "null") {
    return "null";
  }
  return columnMeta?.inferredType ?? perFieldType;
}

/**
 * Parameters for converting a string value with a known type into a Cell.
 */
type ConvertValueToCellParams = {
  readonly address: ReturnType<typeof cellAddress>;
  readonly value: string;
  readonly fieldType: InferredFieldType;
} & DateStyleIds;

/**
 * Convert a string value with a known type into a Cell.
 */
function convertValueToCell(params: ConvertValueToCellParams): Cell {
  const { address, value, fieldType, dateStyleId, datetimeStyleId } = params;

  switch (fieldType) {
    case "null":
      return { address, value: { type: "empty" } };

    case "integer":
    case "number": {
      const coerced = coerceFieldValue(value, fieldType);
      if (typeof coerced !== "number" || !Number.isFinite(coerced)) {
        return { address, value: { type: "string", value } };
      }
      return { address, value: { type: "number", value: coerced } };
    }

    case "boolean": {
      const coerced = coerceFieldValue(value, fieldType);
      return { address, value: { type: "boolean", value: coerced === true } };
    }

    case "date": {
      const coerced = coerceFieldValue(value, fieldType);
      if (!(coerced instanceof Date) || isNaN(coerced.getTime())) {
        return { address, value: { type: "string", value } };
      }
      return { address, value: { type: "number", value: dateToSerial(coerced) }, styleId: dateStyleId };
    }

    case "datetime": {
      const coerced = coerceFieldValue(value, fieldType);
      if (!(coerced instanceof Date) || isNaN(coerced.getTime())) {
        return { address, value: { type: "string", value } };
      }
      return { address, value: { type: "number", value: dateToSerial(coerced) }, styleId: datetimeStyleId };
    }

    case "string":
      return { address, value: { type: "string", value } };
  }
}

// =============================================================================
// Row building
// =============================================================================

/**
 * Build the header row from DSV headers.
 */
function buildHeaderRow(headers: readonly string[], rowNumber: number): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells: headers.map((header, i) => ({
      address: cellAddress(i + 1, rowNumber),
      value: stringValue(header),
    })),
  };
}

/**
 * Build a data row from a DSV record.
 */
function buildDataRow(
  record: DsvRecord,
  params: {
    readonly rowNumber: number;
    readonly columns: readonly ColumnMeta[];
    readonly respectQuoting: boolean;
  } & DateStyleIds,
): XlsxRow {
  const { rowNumber, columns, respectQuoting, dateStyleId, datetimeStyleId } = params;

  return {
    rowNumber: rowIdx(rowNumber),
    cells: record.fields.map((field, fieldIdx) =>
      convertField({
        field,
        col: fieldIdx + 1,
        row: rowNumber,
        columnMeta: columns[fieldIdx],
        respectQuoting,
        dateStyleId,
        datetimeStyleId,
      }),
    ),
  };
}

// =============================================================================
// Conversion entry point
// =============================================================================

/**
 * Convert a DsvDocument to an XlsxWorkbook.
 *
 * Headers (if present) become the first data row of the worksheet.
 * Each subsequent DSV record becomes a row with typed cells.
 *
 * @param document - Parsed DSV document
 * @param options - Conversion options
 * @returns ConvertResult containing the XlsxWorkbook
 */
export function convertDsvToXlsx(
  document: DsvDocument,
  options?: DsvToXlsxOptions,
): ConvertResult<XlsxWorkbook> {
  const sheetName = options?.sheetName ?? "Sheet1";
  const respectQuoting = options?.respectQuoting ?? true;
  const onProgress = options?.onProgress;
  const warnings: ConvertWarning[] = [];

  const totalRecords = document.records.length;
  onProgress?.({ current: 0, total: totalRecords + 1, phase: "preparing" });

  // Prepare styles with date formats (SoT: domain layer)
  const { styles, dateStyleId, datetimeStyleId } = createDateStyleSheet();

  // Analyze columns for consistent type inference across all records
  const columns = analyzeColumns(document);

  // Build rows: header row (if present) followed by data rows
  const hasHeaders = document.headers !== undefined && document.headers.length > 0;
  const headerRows = hasHeaders ? [buildHeaderRow(document.headers!, 1)] : [];
  const dataStartRow = hasHeaders ? 2 : 1;

  const dataRows = document.records.map((record, recordIdx) => {
    if (document.headers && record.fields.length > document.headers.length) {
      warnings.push({
        code: "DSV_EXTRA_FIELDS",
        message: `Record ${recordIdx} has ${record.fields.length} fields but only ${document.headers.length} headers`,
        where: `record[${recordIdx}]`,
      });
    }

    onProgress?.({ current: recordIdx + 1, total: totalRecords + 1, phase: "converting" });

    return buildDataRow(record, {
      rowNumber: dataStartRow + recordIdx,
      columns,
      respectQuoting,
      dateStyleId,
      datetimeStyleId,
    });
  });

  const rows = [...headerRows, ...dataRows];

  const worksheet = createWorksheet({ name: sheetName, rows });
  const workbook = createWorkbook({
    sheets: [worksheet],
    styles,
    sharedStrings: collectSharedStrings(rows),
  });

  onProgress?.({ current: totalRecords + 1, total: totalRecords + 1, phase: "done" });

  return {
    data: workbook,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Collect all unique string values from rows for the shared string table.
 */
function collectSharedStrings(rows: readonly XlsxRow[]): readonly string[] {
  const seen = new Set<string>();
  const strings: string[] = [];

  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.value.type === "string" && !seen.has(cell.value.value)) {
        seen.add(cell.value.value);
        strings.push(cell.value.value);
      }
    }
  }

  return strings;
}
