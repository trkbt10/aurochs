/**
 * @file DSV Builder
 *
 * Converts DSV AST nodes back into formatted text (CSV, TSV, etc.).
 *
 * The builder is the inverse of the parser: it takes DsvDocument/DsvRecord
 * nodes and produces a string in the configured dialect.
 *
 * Builder handles:
 * - Quote policy (minimal, all, non-numeric, none)
 * - Quote character escaping (double or backslash strategy)
 * - Record terminator normalization
 * - Header row generation
 * - Object-to-record conversion (for convenience)
 *
 * The builder does NOT perform type inference or coercion.
 * Values are serialized as-is. Callers should convert typed values
 * to strings before passing them to the builder.
 */

import type { DsvDocument, DsvRecord } from "./ast";
import type { DsvDialect, EscapeStrategy } from "./dialect";
import { CSV_DIALECT, resolveDialect, type DialectName } from "./dialect";
import type { DsvBuildContext } from "./context";
import { createBuildContext } from "./context";

// =============================================================================
// Build options
// =============================================================================

export type DsvBuildOptions = {
  /**
   * Dialect for output formatting.
   * Can be a preset name or partial dialect override.
   */
  readonly dialect?: DialectName | Partial<DsvDialect>;
};

// =============================================================================
// Field quoting logic
// =============================================================================

/**
 * Determine whether a field value needs quoting based on the dialect's quote policy.
 *
 * @param value - Field value to check
 * @param dialect - Dialect configuration
 * @returns true if the field should be quoted
 */
function needsQuoting(value: string, dialect: DsvDialect): boolean {
  if (dialect.quoteChar === undefined) {
    return false; // Quoting disabled
  }

  switch (dialect.quotePolicy) {
    case "all":
      return true;

    case "none":
      return false;

    case "non-numeric":
      // Quote everything except values that look like numbers
      return !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value);

    case "minimal": {
      // Quote only when necessary: field contains delimiter, quote char,
      // or record terminator characters
      if (value.length === 0) {
        return false; // Empty fields don't need quoting
      }

      // When trimFields is enabled, fields with leading/trailing whitespace
      // must be quoted to preserve the whitespace on round-trip.
      if (dialect.trimFields && value !== value.trim()) {
        return true;
      }

      const delimiter = dialect.delimiter;
      const quoteChar = dialect.quoteChar;
      for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (ch === delimiter || ch === quoteChar || ch === "\n" || ch === "\r") {
          return true;
        }
      }
      return false;
    }
  }
}

/**
 * Escape and quote a field value according to the dialect.
 *
 * @param value - Raw field value
 * @param dialect - Dialect configuration
 * @returns Serialized field text (with quotes if needed)
 */
function escapeFieldContent(value: string, quoteChar: string, strategy: EscapeStrategy): string {
  if (strategy === "backslash") {
    return escapeBackslash(value, quoteChar);
  }
  // Double escaping (RFC 4180): double the quote character
  return value.replaceAll(quoteChar, quoteChar + quoteChar);
}

function escapeBackslash(value: string, quoteChar: string): string {
  const parts: string[] = [];
  for (const ch of value) {
    if (ch === "\\") {
      parts.push("\\\\");
    } else if (ch === quoteChar) {
      parts.push("\\" + quoteChar);
    } else if (ch === "\n") {
      parts.push("\\n");
    } else if (ch === "\r") {
      parts.push("\\r");
    } else if (ch === "\t") {
      parts.push("\\t");
    } else if (ch === "\0") {
      parts.push("\\0");
    } else {
      parts.push(ch);
    }
  }
  return parts.join("");
}

function serializeField(value: string, dialect: DsvDialect): string {
  if (!needsQuoting(value, dialect)) {
    return value;
  }

  const quoteChar = dialect.quoteChar!;
  const escaped = escapeFieldContent(value, quoteChar, dialect.escapeStrategy);

  return quoteChar + escaped + quoteChar;
}

// =============================================================================
// Document building
// =============================================================================

/**
 * Build a DSV string from a DsvDocument AST.
 *
 * @param document - The document to serialize
 * @param options - Build options (dialect)
 * @returns Formatted DSV string
 */
export function buildDsv(document: DsvDocument, options?: DsvBuildOptions): string {
  const dialect = resolveDialect(options?.dialect);
  const parts: string[] = [];
  const terminator = dialect.recordTerminator;

  // Write header row
  if (document.headers && document.headers.length > 0) {
    parts.push(
      document.headers.map((h) => serializeField(h, dialect)).join(dialect.delimiter),
    );
    parts.push(terminator);
  }

  // Write data records
  for (const record of document.records) {
    parts.push(
      record.fields.map((f) => serializeField(f.value, dialect)).join(dialect.delimiter),
    );
    parts.push(terminator);
  }

  return parts.join("");
}

/**
 * Build a single record line from a DsvRecord.
 *
 * @param record - Record to serialize
 * @param dialect - Dialect configuration
 * @returns Single line of DSV text (without trailing record terminator)
 */
export function buildRecord(record: DsvRecord, dialect: DsvDialect = CSV_DIALECT): string {
  return record.fields.map((f) => serializeField(f.value, dialect)).join(dialect.delimiter);
}

// =============================================================================
// Object-based building (convenience)
// =============================================================================

/**
 * Build DSV text from an array of plain objects.
 *
 * Headers are derived from the first object's keys (in insertion order),
 * or can be explicitly provided in options.
 *
 * @param objects - Array of records as key-value objects
 * @param options - Build options including optional explicit headers
 * @returns Formatted DSV string
 */
export function buildDsvFromObjects(
  objects: readonly Readonly<Record<string, unknown>>[],
  options?: DsvBuildOptions & { readonly headers?: readonly string[] },
): string {
  if (objects.length === 0) {
    return "";
  }

  const dialect = resolveDialect(options?.dialect);
  const headers = options?.headers ?? Object.keys(objects[0]);
  const ctx = createBuildContext(headers, dialect);

  return buildDsvFromObjectsWithContext(objects, ctx);
}

/**
 * Build DSV text from objects using a pre-created build context.
 *
 * @param objects - Array of records as key-value objects
 * @param ctx - Build context with headers and dialect
 * @returns Formatted DSV string
 */
export function buildDsvFromObjectsWithContext(
  objects: readonly Readonly<Record<string, unknown>>[],
  ctx: DsvBuildContext,
): string {
  const { headers, dialect } = ctx;
  const parts: string[] = [];
  const terminator = dialect.recordTerminator;

  // Header row
  if (headers.length > 0) {
    parts.push(headers.map((h) => serializeField(h, dialect)).join(dialect.delimiter));
    parts.push(terminator);
  }

  // Data rows
  for (const obj of objects) {
    const values = headers.map((h) => {
      const val = obj[h];
      if (val === null || val === undefined) {return "";}
      return String(val);
    });
    parts.push(values.map((v) => serializeField(v, dialect)).join(dialect.delimiter));
    parts.push(terminator);
  }

  return parts.join("");
}

// =============================================================================
// Streaming builder
// =============================================================================

/**
 * Create a streaming DSV builder that produces output incrementally.
 *
 * Usage:
 * ```typescript
 * const builder = createDsvStreamBuilder({ headers: ["a", "b"] });
 * builder.writeHeader();
 * builder.writeRow(["1", "2"]);
 * builder.writeRow(["3", "4"]);
 * const result = builder.toString();
 * ```
 */
export type DsvStreamBuilder = {
  /** Write the header row. Call once at the beginning. */
  readonly writeHeader: () => void;
  /** Write a data row from an array of string values. */
  readonly writeRow: (values: readonly string[]) => void;
  /** Write a data row from a record object (using headers for column order). */
  readonly writeObject: (obj: Readonly<Record<string, unknown>>) => void;
  /** Get the accumulated output. */
  readonly toString: () => string;
  /** Get the accumulated output as an array of lines (without terminators). */
  readonly toLines: () => readonly string[];
};

/**
 * Create a streaming DSV builder that produces output incrementally.
 *
 * @param options - Headers and optional dialect
 * @returns Builder with writeHeader/writeRow/writeObject/toString/toLines methods
 */
export function createDsvStreamBuilder(options: {
  readonly headers: readonly string[];
  readonly dialect?: DialectName | Partial<DsvDialect>;
}): DsvStreamBuilder {
  const dialect = resolveDialect(options.dialect);
  const headers = options.headers;
  const parts: string[] = [];
  const terminator = dialect.recordTerminator;

  function writeHeader(): void {
    parts.push(
      headers.map((h) => serializeField(h, dialect)).join(dialect.delimiter) + terminator,
    );
  }

  function writeRow(values: readonly string[]): void {
    parts.push(
      values.map((v) => serializeField(v, dialect)).join(dialect.delimiter) + terminator,
    );
  }

  function writeObject(obj: Readonly<Record<string, unknown>>): void {
    const values = headers.map((h) => {
      const val = obj[h];
      if (val === null || val === undefined) {return "";}
      return String(val);
    });
    writeRow(values);
  }

  function toString(): string {
    return parts.join("");
  }

  function toLines(): readonly string[] {
    return parts.map((p) => p.slice(0, -terminator.length));
  }

  return { writeHeader, writeRow, writeObject, toString, toLines };
}
