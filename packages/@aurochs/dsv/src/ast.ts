/**
 * @file DSV/JSONL AST type definitions
 *
 * Abstract Syntax Tree for delimiter-separated values (CSV, TSV, etc.)
 * and JSON Lines format.
 *
 * Hierarchy: Document > Record > Field
 *
 * Design principles:
 * - Immutable (readonly throughout)
 * - Discriminated unions for node types
 * - Position tracking for error reporting
 * - Preserves original representation info (quoting, raw text)
 */

// =============================================================================
// Position tracking
// =============================================================================

/**
 * Source position in the input text.
 *
 * line is 1-based (first line = 1), column is 0-based (first char = 0).
 * offset is the 0-based byte offset from the start of input.
 */
export type SourcePosition = {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
};

/**
 * Span covering a range in the source text.
 */
export type SourceSpan = {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
};

// =============================================================================
// Field node
// =============================================================================

/**
 * Whether the field was quoted in the original source.
 *
 * - "unquoted": bare value (e.g., `hello`)
 * - "quoted": enclosed in quote characters (e.g., `"hello"`)
 *
 * This is important for round-trip fidelity:
 * a field `"123"` (quoted) is semantically a string,
 * whereas `123` (unquoted) may be interpreted as a number.
 */
export type FieldQuoting = "unquoted" | "quoted";

/**
 * A single field (cell) in a record.
 *
 * `value` is the unescaped, decoded content.
 * `raw` is the original text as it appeared in the source (including quotes).
 * `quoting` indicates whether the field was quoted.
 */
export type DsvField = {
  readonly type: "field";
  /** Decoded field value (quotes and escapes resolved). */
  readonly value: string;
  /** Original text in the source (for round-trip). */
  readonly raw: string;
  /** Whether the field was quoted in the source. */
  readonly quoting: FieldQuoting;
  /** Source location. */
  readonly span: SourceSpan;
};

// =============================================================================
// Record node
// =============================================================================

/**
 * A single record (row) in the document.
 *
 * Contains an ordered list of fields.
 * `recordIndex` is the 0-based index of this record in the document
 * (excluding the header row if headers were consumed).
 */
export type DsvRecord = {
  readonly type: "record";
  /** Fields in this record, in column order. */
  readonly fields: readonly DsvField[];
  /** 0-based record index (data rows only, header excluded). */
  readonly recordIndex: number;
  /** Source location covering the entire row. */
  readonly span: SourceSpan;
};

// =============================================================================
// Document node
// =============================================================================

/**
 * The root AST node representing an entire DSV or JSONL document.
 *
 * If `headers` is present, it contains the column names from the first row
 * (or from explicit configuration). Records then represent data rows only.
 */
export type DsvDocument = {
  readonly type: "document";
  /** Column headers, if present (from first row or explicit config). */
  readonly headers: readonly string[] | undefined;
  /** Data records (rows). */
  readonly records: readonly DsvRecord[];
};

// =============================================================================
// JSONL-specific nodes
// =============================================================================

/**
 * A field within a JSONL record.
 *
 * JSONL fields always have a key (the JSON property name) and a typed value.
 * The `jsonType` reflects the original JSON type before string conversion.
 */
export type JsonlFieldType = "string" | "number" | "boolean" | "null" | "object" | "array";

export type JsonlField = {
  readonly type: "jsonl-field";
  /** Property key in the JSON object. */
  readonly key: string;
  /** String representation of the value. */
  readonly value: string;
  /** Original JSON type. */
  readonly jsonType: JsonlFieldType;
  /** Original JSON value (preserves nested structures). */
  readonly jsonValue: unknown;
  /** Source line number (1-based). */
  readonly line: number;
};

/**
 * A single JSONL record (one line = one JSON object).
 */
export type JsonlRecord = {
  readonly type: "jsonl-record";
  /** Fields extracted from the JSON object. */
  readonly fields: readonly JsonlField[];
  /** The raw JSON line text. */
  readonly raw: string;
  /** 0-based record index. */
  readonly recordIndex: number;
  /** Source line number (1-based). */
  readonly line: number;
};

/**
 * Root node for a JSONL document.
 */
export type JsonlDocument = {
  readonly type: "jsonl-document";
  /** Column headers (union of all keys seen, in first-appearance order). */
  readonly headers: readonly string[];
  /** Records. */
  readonly records: readonly JsonlRecord[];
};

// =============================================================================
// Unified types
// =============================================================================

/**
 * Any field node.
 */
export type AnyField = DsvField | JsonlField;

/**
 * Any record node.
 */
export type AnyRecord = DsvRecord | JsonlRecord;

/**
 * Any document node.
 */
export type AnyDocument = DsvDocument | JsonlDocument;

// =============================================================================
// Type guards
// =============================================================================



/** Type guard for DsvField nodes. */
export function isDsvField(node: unknown): node is DsvField {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "field"
  );
}

/** Type guard for DsvRecord nodes. */
export function isDsvRecord(node: unknown): node is DsvRecord {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "record"
  );
}

/** Type guard for DsvDocument nodes. */
export function isDsvDocument(node: unknown): node is DsvDocument {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "document"
  );
}

/** Type guard for JsonlField nodes. */
export function isJsonlField(node: unknown): node is JsonlField {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "jsonl-field"
  );
}

/** Type guard for JsonlRecord nodes. */
export function isJsonlRecord(node: unknown): node is JsonlRecord {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "jsonl-record"
  );
}

/** Type guard for JsonlDocument nodes. */
export function isJsonlDocument(node: unknown): node is JsonlDocument {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "jsonl-document"
  );
}
