/**
 * @file DSV Parse/Build Context
 *
 * The context layer provides semantic interpretation of parsed DSV data.
 * It sits between the raw parser output (AST) and higher-level consumers.
 *
 * Parse context provides:
 * - Header-to-index mapping for O(1) column lookup by name
 * - Record-to-object conversion (using headers as keys)
 * - Field type inference (number, boolean, date, null, string)
 * - Column metadata (inferred types, min/max values, nullability)
 *
 * Build context provides:
 * - Column ordering for output
 * - Dialect configuration for serialization
 * - Header tracking
 *
 * Following the immutable context pattern from @aurochs-office/docx and
 * @aurochs/pdf parser contexts.
 */

import type { DsvDocument, DsvRecord, JsonlDocument, JsonlRecord } from "./ast";
import type { DsvDialect } from "./dialect";
import { CSV_DIALECT } from "./dialect";

// =============================================================================
// Field type inference
// =============================================================================

/**
 * Inferred semantic type of a field value.
 *
 * The parser produces raw strings; the context layer interprets them
 * based on content patterns.
 */
export type InferredFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "date"
  | "datetime";

/**
 * Infer the semantic type of a field value.
 *
 * Rules (applied in order):
 * 1. Empty string or only whitespace → "null"
 * 2. Case-insensitive "true"/"false" → "boolean"
 * 3. Integer pattern (optional sign + digits, no leading zeros except "0") → "integer"
 * 4. Number pattern (integer or decimal, optional scientific notation) → "number"
 * 5. ISO 8601 date (YYYY-MM-DD) → "date"
 * 6. ISO 8601 datetime (YYYY-MM-DDThh:mm:ss[.sss][Z|±hh:mm]) → "datetime"
 * 7. Everything else → "string"
 *
 * Quoted fields that match numeric patterns are still inferred as their
 * numeric type. If the caller wants to treat quoted values as always-string,
 * they should check field.quoting before calling this.
 */
export function inferFieldType(value: string): InferredFieldType {
  // 1. Null / empty
  if (value === "" || value.trim() === "") {
    return "null";
  }

  const trimmed = value.trim();

  // 2. Boolean
  const lower = trimmed.toLowerCase();
  if (lower === "true" || lower === "false") {
    return "boolean";
  }

  // 3. Integer: optional sign, no leading zeros (except lone "0"), digits only
  if (/^[+-]?(?:0|[1-9]\d*)$/.test(trimmed)) {
    return "integer";
  }

  // 4. Number: integer or decimal, optional scientific notation
  // Reject leading zeros (007, 00.5) as they likely represent
  // identifiers (zip codes, phone numbers) rather than numbers.
  // Allow "0", "0.5", "0.0" etc. (single leading zero before decimal point).
  if (/^[+-]?(?:0(?:\.\d*)?|[1-9]\d*\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return "number";
  }

  // 5. ISO 8601 date: YYYY-MM-DD
  if (/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(trimmed)) {
    return "date";
  }

  // 6. ISO 8601 datetime
  if (
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(
      trimmed,
    )
  ) {
    return "datetime";
  }

  // 7. Default: string
  return "string";
}

/**
 * Convert a field value to a typed JavaScript value based on inferred type.
 *
 * @param value - Raw string value
 * @param fieldType - Inferred type (from inferFieldType)
 * @returns Typed value: number, boolean, null, Date, or string
 */
export function coerceFieldValue(
  value: string,
  fieldType: InferredFieldType,
): string | number | boolean | null | Date {
  switch (fieldType) {
    case "null":
      return null;
    case "boolean":
      return value.trim().toLowerCase() === "true";
    case "integer":
      return parseInt(value.trim(), 10);
    case "number":
      return parseFloat(value.trim());
    case "date":
      return new Date(value.trim() + "T00:00:00Z");
    case "datetime":
      return new Date(value.trim());
    case "string":
      return value;
  }
}

// =============================================================================
// Column metadata
// =============================================================================

/**
 * Metadata about a column, derived from analyzing all records.
 */
export type ColumnMeta = {
  /** Column index (0-based). */
  readonly index: number;
  /** Column header name, or undefined if no headers. */
  readonly header: string | undefined;
  /** Most common non-null inferred type across all records. */
  readonly inferredType: InferredFieldType;
  /** All types seen in this column (for mixed-type columns). */
  readonly typeCounts: Readonly<Record<InferredFieldType, number>>;
  /** Number of null/empty values. */
  readonly nullCount: number;
  /** Total number of values analyzed. */
  readonly totalCount: number;
};

/**
 * Analyze column types across all records in a document.
 *
 * @param document - Parsed DSV document
 * @returns Array of ColumnMeta, one per column
 */
export function analyzeColumns(document: DsvDocument): readonly ColumnMeta[] {
  if (document.records.length === 0) {
    // No data — return headers-only metadata if available
    if (document.headers) {
      return document.headers.map((header, index) => ({
        index,
        header,
        inferredType: "string" as InferredFieldType,
        typeCounts: createEmptyTypeCounts(),
        nullCount: 0,
        totalCount: 0,
      }));
    }
    return [];
  }

  // Determine column count from the maximum field count across all records
  const maxFields = document.records.reduce(
    (max, record) => Math.max(max, record.fields.length),
    0,
  );

  const columns: {
    typeCounts: Record<InferredFieldType, number>;
    nullCount: number;
    totalCount: number;
  }[] = [];

  for (let i = 0; i < maxFields; i++) {
    columns.push({
      typeCounts: createEmptyTypeCounts(),
      nullCount: 0,
      totalCount: 0,
    });
  }

  // Analyze each record
  for (const record of document.records) {
    for (let i = 0; i < maxFields; i++) {
      const col = columns[i];
      if (i >= record.fields.length) {
        // Missing field in this record → null
        col.nullCount++;
        col.totalCount++;
        col.typeCounts.null++;
        continue;
      }
      const field = record.fields[i];
      const fieldType = inferFieldType(field.value);
      col.typeCounts[fieldType]++;
      if (fieldType === "null") {
        col.nullCount++;
      }
      col.totalCount++;
    }
  }

  return columns.map((col, index) => {
    // Determine dominant non-null type
    const inferredType = dominantType(col.typeCounts);
    return {
      index,
      header: document.headers?.[index],
      inferredType,
      typeCounts: { ...col.typeCounts },
      nullCount: col.nullCount,
      totalCount: col.totalCount,
    };
  });
}

function createEmptyTypeCounts(): Record<InferredFieldType, number> {
  return {
    string: 0,
    number: 0,
    integer: 0,
    boolean: 0,
    null: 0,
    date: 0,
    datetime: 0,
  };
}

/**
 * Determine the dominant non-null type from type counts.
 * If no non-null types exist, returns "string".
 * If integer and number are both present, prefer number (integer ⊂ number).
 */
function dominantType(counts: Record<InferredFieldType, number>): InferredFieldType {
  const { best, bestCount } = (
    Object.entries(counts) as [InferredFieldType, number][]
  ).reduce(
    (acc, [type, count]) => {
      if (type === "null") {
        return acc;
      }
      if (count > acc.bestCount) {
        return { best: type, bestCount: count };
      }
      return acc;
    },
    { best: "string" as InferredFieldType, bestCount: 0 },
  );

  // If we have a mix of integer and number, prefer number
  if (best === "integer" && counts.number > 0) {
    return "number";
  }

  return bestCount === 0 ? "string" : best;
}

// =============================================================================
// Parse context
// =============================================================================

/**
 * Parse context for semantic interpretation of a DsvDocument.
 *
 * Provides O(1) column lookup by name and record-to-object conversion.
 * Immutable after creation.
 */
export type DsvParseContext = {
  /** The source document. */
  readonly document: DsvDocument;
  /** The dialect used to parse this document. */
  readonly dialect: DsvDialect;
  /** Column headers (empty array if no headers). */
  readonly headers: readonly string[];
  /** Map from header name to column index. */
  readonly headerIndex: ReadonlyMap<string, number>;
  /** Column metadata (type inference results). */
  readonly columns: readonly ColumnMeta[];
  /** Total number of data records. */
  readonly recordCount: number;

  /**
   * Get a field value from a record by column name.
   * Returns undefined if the column doesn't exist or the field is missing.
   */
  readonly getField: (record: DsvRecord, columnName: string) => string | undefined;

  /**
   * Get a field value from a record by column index (0-based).
   * Returns undefined if the index is out of range.
   */
  readonly getFieldByIndex: (record: DsvRecord, index: number) => string | undefined;

  /**
   * Convert a record to a plain object using headers as keys.
   * Fields without headers are ignored.
   * Missing fields get undefined values.
   */
  readonly recordToObject: (record: DsvRecord) => Readonly<Record<string, string | undefined>>;

  /**
   * Convert all records to an array of plain objects.
   */
  readonly toObjects: () => readonly Readonly<Record<string, string | undefined>>[];

  /**
   * Get a typed value from a record by column name,
   * using the column's inferred type for coercion.
   */
  readonly getTypedField: (
    record: DsvRecord,
    columnName: string,
  ) => string | number | boolean | null | Date | undefined;
};

/**
 * Create a parse context for a DsvDocument.
 *
 * @param document - Parsed DSV document
 * @param dialect - Dialect used during parsing (for reference)
 * @returns Immutable parse context
 */
export function createParseContext(
  document: DsvDocument,
  dialect: DsvDialect = CSV_DIALECT,
): DsvParseContext {
  const headers = document.headers ?? [];
  const headerIndex = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    // First occurrence wins for duplicate headers
    if (!headerIndex.has(headers[i])) {
      headerIndex.set(headers[i], i);
    }
  }

  const columns = analyzeColumns(document);

  function getField(record: DsvRecord, columnName: string): string | undefined {
    const idx = headerIndex.get(columnName);
    if (idx === undefined) {return undefined;}
    if (idx >= record.fields.length) {return undefined;}
    return record.fields[idx].value;
  }

  function getFieldByIndex(record: DsvRecord, index: number): string | undefined {
    if (index < 0 || index >= record.fields.length) {return undefined;}
    return record.fields[index].value;
  }

  function recordToObject(record: DsvRecord): Readonly<Record<string, string | undefined>> {
    const obj: Record<string, string | undefined> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = i < record.fields.length ? record.fields[i].value : undefined;
    }
    return obj;
  }

  function toObjects(): readonly Readonly<Record<string, string | undefined>>[] {
    return document.records.map(recordToObject);
  }

  function getTypedField(
    record: DsvRecord,
    columnName: string,
  ): string | number | boolean | null | Date | undefined {
    const idx = headerIndex.get(columnName);
    if (idx === undefined) {return undefined;}
    if (idx >= record.fields.length) {return undefined;}
    const value = record.fields[idx].value;
    const col = columns[idx];
    if (!col) {return value;}
    return coerceFieldValue(value, col.inferredType);
  }

  return {
    document,
    dialect,
    headers,
    headerIndex,
    columns,
    recordCount: document.records.length,
    getField,
    getFieldByIndex,
    recordToObject,
    toObjects,
    getTypedField,
  };
}

// =============================================================================
// Build context
// =============================================================================

/**
 * Build context for generating DSV output.
 *
 * Tracks column ordering and dialect settings for serialization.
 */
export type DsvBuildContext = {
  /** Column headers for output. */
  readonly headers: readonly string[];
  /** Map from header name to column index. */
  readonly headerIndex: ReadonlyMap<string, number>;
  /** Dialect for output formatting. */
  readonly dialect: DsvDialect;
};

/**
 * Create a build context for DSV output generation.
 *
 * @param headers - Column headers for output
 * @param dialect - Dialect for formatting (defaults to CSV)
 * @returns Immutable build context
 */
export function createBuildContext(
  headers: readonly string[],
  dialect: DsvDialect = CSV_DIALECT,
): DsvBuildContext {
  const headerIndex = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    if (!headerIndex.has(headers[i])) {
      headerIndex.set(headers[i], i);
    }
  }
  return { headers, headerIndex, dialect };
}

// =============================================================================
// JSONL context
// =============================================================================

/**
 * Parse context for JSONL documents.
 * Follows the same interface pattern as DsvParseContext.
 */
export type JsonlParseContext = {
  readonly document: JsonlDocument;
  readonly headers: readonly string[];
  readonly headerIndex: ReadonlyMap<string, number>;
  readonly recordCount: number;

  readonly getField: (record: JsonlRecord, key: string) => string | undefined;
  readonly getTypedField: (record: JsonlRecord, key: string) => unknown;
  readonly recordToObject: (record: JsonlRecord) => Readonly<Record<string, unknown>>;
  readonly toObjects: () => readonly Readonly<Record<string, unknown>>[];
};

/**
 * Create a parse context for a JsonlDocument.
 */
export function createJsonlParseContext(document: JsonlDocument): JsonlParseContext {
  const headers = document.headers;
  const headerIndex = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    if (!headerIndex.has(headers[i])) {
      headerIndex.set(headers[i], i);
    }
  }

  function getField(record: JsonlRecord, key: string): string | undefined {
    const field = record.fields.find((f) => f.key === key);
    return field?.value;
  }

  function getTypedField(record: JsonlRecord, key: string): unknown {
    const field = record.fields.find((f) => f.key === key);
    return field?.jsonValue;
  }

  function recordToObject(record: JsonlRecord): Readonly<Record<string, unknown>> {
    const obj: Record<string, unknown> = {};
    for (const field of record.fields) {
      obj[field.key] = field.jsonValue;
    }
    return obj;
  }

  function toObjects(): readonly Readonly<Record<string, unknown>>[] {
    return document.records.map(recordToObject);
  }

  return {
    document,
    headers,
    headerIndex,
    recordCount: document.records.length,
    getField,
    getTypedField,
    recordToObject,
    toObjects,
  };
}
