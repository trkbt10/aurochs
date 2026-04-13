/**
 * @file JSONL (JSON Lines) Parser and Builder
 *
 * Handles the JSON Lines format (one JSON object per line).
 *
 * JSONL is structurally different from DSV but shares the same
 * Document > Record > Field abstraction. Each line is a complete
 * JSON object, and its properties become fields.
 *
 * Parser handles:
 * - One JSON object per line
 * - Empty lines (skipped)
 * - Lines with only whitespace (skipped)
 * - Malformed JSON lines (collected as errors, not thrown)
 * - BOM at start of file
 * - Mixed line endings (CRLF, LF, CR)
 * - Nested objects/arrays (flattened to string for field value,
 *   but original JSON value preserved in jsonValue)
 *
 * Builder handles:
 * - Objects to JSONL lines
 * - Consistent key ordering (optional)
 * - Streaming output
 *
 * @see https://jsonlines.org/
 */

import type { JsonlDocument, JsonlRecord, JsonlField, JsonlFieldType } from "./ast";

// =============================================================================
// Parse options
// =============================================================================

export type JsonlParseOptions = {
  /**
   * Maximum number of records to parse. Undefined = no limit.
   */
  readonly maxRecords?: number;

  /**
   * If true, malformed lines throw an error.
   * If false (default), malformed lines are skipped and collected in errors.
   */
  readonly strict?: boolean;
};

/**
 * Result of JSONL parsing.
 */
export type JsonlParseResult = {
  /** The parsed document. */
  readonly document: JsonlDocument;
  /** Errors encountered during parsing (line number + message). */
  readonly errors: readonly JsonlParseError[];
};

export type JsonlParseError = {
  /** 1-based line number where the error occurred. */
  readonly line: number;
  /** The raw line text that failed to parse. */
  readonly raw: string;
  /** Error message. */
  readonly message: string;
};

// =============================================================================
// Internal: line splitting
// =============================================================================

/**
 * Split input into lines, handling CR, LF, and CRLF.
 * Does not include the line terminators in the output.
 * Strips BOM from the first line if present.
 *
 * @returns Array of { text, lineNumber } for each line.
 */
function splitLines(input: string): readonly { text: string; lineNumber: number }[] {
  const stripped = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  // Split on any newline variant: CRLF, CR, or LF
  const rawLines = stripped.split(/\r\n|\r|\n/);
  return rawLines.map((text, index) => ({ text, lineNumber: index + 1 }));
}

// =============================================================================
// Internal: JSON value to field
// =============================================================================

function jsonTypeOf(value: unknown): JsonlFieldType {
  if (value === null) {return "null";}
  if (typeof value === "string") {return "string";}
  if (typeof value === "number") {return "number";}
  if (typeof value === "boolean") {return "boolean";}
  if (Array.isArray(value)) {return "array";}
  if (typeof value === "object") {return "object";}
  return "string";
}

function jsonValueToString(value: unknown): string {
  if (value === null) {return "";}
  if (typeof value === "string") {return value;}
  if (typeof value === "number" || typeof value === "boolean") {return String(value);}
  // Objects and arrays → JSON serialization
  return JSON.stringify(value);
}

function objectToFields(obj: Record<string, unknown>, lineNumber: number): JsonlField[] {
  const fields: JsonlField[] = [];
  for (const [key, value] of Object.entries(obj)) {
    fields.push({
      type: "jsonl-field",
      key,
      value: jsonValueToString(value),
      jsonType: jsonTypeOf(value),
      jsonValue: value,
      line: lineNumber,
    });
  }
  return fields;
}

type JsonParseOk = { readonly ok: true; readonly value: unknown };
type JsonParseFail = { readonly ok: false; readonly message: string };

/**
 * Try to parse a JSON string. Returns a result object instead of throwing.
 */
function tryParseJson(text: string): JsonParseOk | JsonParseFail {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse a JSONL string into a JsonlDocument.
 *
 * @param input - The full JSONL text
 * @param options - Parse options
 * @returns Parse result with document and any errors
 */
export function parseJsonl(
  input: string,
  options?: JsonlParseOptions,
): JsonlParseResult {
  const maxRecords = options?.maxRecords;
  const strict = options?.strict ?? false;

  const records: JsonlRecord[] = [];
  const errors: JsonlParseError[] = [];
  const headerSet = new Map<string, number>(); // key → first-seen order

  for (const { text, lineNumber } of splitLines(input)) {
    if (maxRecords !== undefined && records.length >= maxRecords) {
      break;
    }

    // Skip empty/whitespace-only lines
    const trimmed = text.trim();
    if (trimmed === "") {
      continue;
    }

    // Parse JSON
    const parseResult = tryParseJson(trimmed);
    if (!parseResult.ok) {
      if (strict) {
        throw new Error(`JSONL parse error at line ${lineNumber}: ${parseResult.message}`);
      }
      errors.push({ line: lineNumber, raw: text, message: parseResult.message });
      continue;
    }
    const parsed = parseResult.value;

    // JSONL expects each line to be a JSON object (or array, but objects are standard)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      // Non-object values: wrap in a single-field record
      const field: JsonlField = {
        type: "jsonl-field",
        key: "value",
        value: jsonValueToString(parsed),
        jsonType: jsonTypeOf(parsed),
        jsonValue: parsed,
        line: lineNumber,
      };

      // Track header
      if (!headerSet.has("value")) {
        headerSet.set("value", headerSet.size);
      }

      records.push({
        type: "jsonl-record",
        fields: [field],
        raw: text,
        recordIndex: records.length,
        line: lineNumber,
      });
      continue;
    }

    // Object line
    const obj = parsed as Record<string, unknown>;
    const fields = objectToFields(obj, lineNumber);

    // Track headers in first-appearance order
    for (const field of fields) {
      if (!headerSet.has(field.key)) {
        headerSet.set(field.key, headerSet.size);
      }
    }

    records.push({
      type: "jsonl-record",
      fields,
      raw: text,
      recordIndex: records.length,
      line: lineNumber,
    });
  }

  // Build ordered headers from first-appearance order
  const headers = Array.from(headerSet.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key);

  return {
    document: {
      type: "jsonl-document",
      headers,
      records,
    },
    errors,
  };
}

// =============================================================================
// Streaming parser
// =============================================================================

/**
 * Parse JSONL input and yield records one at a time.
 *
 * @param input - JSONL text
 * @param options - Parse options
 * @yields JsonlRecord nodes
 */
export function* parseJsonlRecords(
  input: string,
  options?: JsonlParseOptions,
): Generator<JsonlRecord | JsonlParseError> {
  const maxRecords = options?.maxRecords;
  const strict = options?.strict ?? false;
  // eslint-disable-next-line no-restricted-syntax -- Accumulator: generator cannot use array.length
  let recordIndex = 0;

  for (const { text, lineNumber } of splitLines(input)) {
    if (maxRecords !== undefined && recordIndex >= maxRecords) {
      break;
    }

    const trimmed = text.trim();
    if (trimmed === "") {
      continue;
    }

    const parseResult = tryParseJson(trimmed);
    if (!parseResult.ok) {
      if (strict) {
        throw new Error(`JSONL parse error at line ${lineNumber}: ${parseResult.message}`);
      }
      yield { line: lineNumber, raw: text, message: parseResult.message };
      continue;
    }
    const parsed = parseResult.value;

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      yield {
        type: "jsonl-record",
        fields: [
          {
            type: "jsonl-field",
            key: "value",
            value: jsonValueToString(parsed),
            jsonType: jsonTypeOf(parsed),
            jsonValue: parsed,
            line: lineNumber,
          },
        ],
        raw: text,
        recordIndex,
        line: lineNumber,
      };
    } else {
      const obj = parsed as Record<string, unknown>;
      yield {
        type: "jsonl-record",
        fields: objectToFields(obj, lineNumber),
        raw: text,
        recordIndex,
        line: lineNumber,
      };
    }

    recordIndex++;
  }
}

// =============================================================================
// Builder
// =============================================================================

export type JsonlBuildOptions = {
  /**
   * If provided, only these keys are included and in this order.
   * Otherwise, each object's own key order is used.
   */
  readonly headers?: readonly string[];

  /**
   * Line terminator. Defaults to "\n".
   */
  readonly lineTerminator?: string;
};

/**
 * Build JSONL text from an array of objects.
 *
 * @param objects - Array of objects (one per line)
 * @param options - Build options
 * @returns JSONL text
 */
export function buildJsonl(
  objects: readonly Readonly<Record<string, unknown>>[],
  options?: JsonlBuildOptions,
): string {
  const terminator = options?.lineTerminator ?? "\n";
  const headers = options?.headers;

  const lines: string[] = [];
  for (const obj of objects) {
    if (headers) {
      // Output only specified keys in specified order
      const filtered: Record<string, unknown> = {};
      for (const key of headers) {
        if (key in obj) {
          filtered[key] = obj[key];
        }
      }
      lines.push(JSON.stringify(filtered));
    } else {
      lines.push(JSON.stringify(obj));
    }
  }

  // JSONL: each line ends with a newline
  if (lines.length === 0) {return "";}
  return lines.join(terminator) + terminator;
}

/**
 * Build JSONL text from a JsonlDocument.
 *
 * @param document - JsonlDocument AST
 * @param options - Build options
 * @returns JSONL text
 */
export function buildJsonlFromDocument(
  document: JsonlDocument,
  options?: JsonlBuildOptions,
): string {
  const terminator = options?.lineTerminator ?? "\n";
  const lines: string[] = [];

  for (const record of document.records) {
    const obj: Record<string, unknown> = {};
    for (const field of record.fields) {
      obj[field.key] = field.jsonValue;
    }
    lines.push(JSON.stringify(obj));
  }

  if (lines.length === 0) {return "";}
  return lines.join(terminator) + terminator;
}
