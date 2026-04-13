/**
 * @file DSV Parser
 *
 * Converts a token stream from the DSV lexer into an AST (Document > Record > Field).
 *
 * The parser operates in two modes depending on dialect.hasHeader:
 * - With headers: the first record is consumed as column headers,
 *   subsequent records are data rows.
 * - Without headers: all records are data rows.
 *
 * Parser handles:
 * - Assembling tokens into fields and records
 * - Empty line skipping (when dialect.skipEmptyLines is true)
 * - Trailing record terminator (does not create an empty trailing record)
 * - Records with varying field counts (lenient — no error, just different lengths)
 *
 * The parser produces a DsvDocument AST node containing all records.
 * For streaming/iterative use, see parseRecords() which yields records one at a time.
 */

import type { DsvDocument, DsvRecord, DsvField, SourceSpan, SourcePosition } from "./ast";
import type { DsvDialect } from "./dialect";
import { resolveDialect, type DialectName } from "./dialect";
import { createDsvLexer, TokenType, type DsvLexer, type DsvToken } from "./lexer";

// =============================================================================
// Parse options
// =============================================================================

export type DsvParseOptions = {
  /**
   * Dialect to use. Can be a preset name or a partial dialect override.
   * Defaults to CSV_DIALECT.
   */
  readonly dialect?: DialectName | Partial<DsvDialect>;

  /**
   * Explicit column headers. When provided, these override any headers
   * from the first row. If dialect.hasHeader is true AND explicitHeaders
   * is provided, the first row is still consumed but its values are
   * discarded in favor of these.
   */
  readonly headers?: readonly string[];

  /**
   * Maximum number of records to parse (excluding header row).
   * Useful for previewing large files. Undefined = no limit.
   */
  readonly maxRecords?: number;
};

// =============================================================================
// Internal: assemble one record from tokens
// =============================================================================

type RecordResult =
  | { readonly kind: "record"; readonly fields: readonly DsvField[]; readonly span: SourceSpan }
  | { readonly kind: "empty-line" }
  | { readonly kind: "comment" }
  | { readonly kind: "eof" };

/**
 * Read tokens until a complete record is assembled or EOF is reached.
 *
 * A record ends at a RECORD_END token or EOF.
 * Between delimiters and at record boundaries, missing field text implies
 * an empty field (value = "").
 *
 * Token sequence for `a,,b\n`:
 *   FIELD_TEXT("a"), DELIMITER, DELIMITER, FIELD_TEXT("b"), RECORD_END
 * → fields: ["a", "", "b"]
 *
 * Token sequence for `,\n`:
 *   DELIMITER, RECORD_END
 * → fields: ["", ""]
 */
function readRecord(lexer: DsvLexer): RecordResult {
  const first = lexer.peek();

  if (first.type === TokenType.EOF) {
    return { kind: "eof" };
  }

  if (first.type === TokenType.COMMENT) {
    lexer.nextToken(); // consume comment
    return { kind: "comment" };
  }

  // Check for empty line (RECORD_END at start of record)
  if (first.type === TokenType.RECORD_END) {
    lexer.nextToken(); // consume the record end
    return { kind: "empty-line" };
  }

  const fields: DsvField[] = [];
  const recordStart = first.pos;
  // eslint-disable-next-line no-restricted-syntax -- State machine: end position updated as tokens are consumed
  let recordEnd: SourcePosition = first.pos;

  // State: are we expecting a field next?
  // At the start of a record and after each delimiter, a field is expected.
  // If we see a delimiter or record end before a field, it's an empty field.
  // eslint-disable-next-line no-restricted-syntax -- State machine: toggled by delimiter/field transitions
  let expectField = true;

  while (true) {
    const token = lexer.peek();

    if (token.type === TokenType.EOF || token.type === TokenType.RECORD_END) {
      // End of record
      if (expectField) {
        // Trailing delimiter implies an empty field
        // But only if we've already seen at least one delimiter
        // (don't add an empty field for a completely empty record)
        if (fields.length > 0) {
          fields.push(createEmptyField(token.pos));
        }
      }
      if (token.type === TokenType.RECORD_END) {
        lexer.nextToken(); // consume record end
        recordEnd = token.pos;
      } else {
        recordEnd = token.pos;
      }
      break;
    }

    if (token.type === TokenType.DELIMITER) {
      lexer.nextToken(); // consume delimiter
      if (expectField) {
        // Delimiter before any field content → empty field
        fields.push(createEmptyField(token.pos));
      }
      // After a delimiter, we expect a field again
      expectField = true;
      continue;
    }

    if (token.type === TokenType.FIELD_TEXT || token.type === TokenType.QUOTED_FIELD) {
      lexer.nextToken(); // consume the field token
      fields.push(tokenToField(token));
      expectField = false;
      recordEnd = token.endPos;
      continue;
    }

    // Unexpected token type — skip it
    lexer.nextToken();
  }

  // If no fields were collected, this is effectively an empty line
  if (fields.length === 0) {
    return { kind: "empty-line" };
  }

  return {
    kind: "record",
    fields,
    span: { start: recordStart, end: recordEnd },
  };
}

function createEmptyField(pos: SourcePosition): DsvField {
  return {
    type: "field",
    value: "",
    raw: "",
    quoting: "unquoted",
    span: { start: pos, end: pos },
  };
}

function tokenToField(token: DsvToken): DsvField {
  return {
    type: "field",
    value: token.value,
    raw: token.raw,
    quoting: token.type === TokenType.QUOTED_FIELD ? "quoted" : "unquoted",
    span: { start: token.pos, end: token.endPos },
  };
}

// =============================================================================
// Internal: header resolution
// =============================================================================

/**
 * Resolve headers from options and/or the first row of the input.
 */
function resolveHeaders(
  lexer: DsvLexer,
  dialect: DsvDialect,
  options?: DsvParseOptions,
): readonly string[] | undefined {
  if (options?.headers) {
    // Explicit headers provided
    if (dialect.hasHeader) {
      consumeOneRecord(lexer, dialect);
    }
    return options.headers;
  }
  if (dialect.hasHeader) {
    const headerRecord = readNextDataRecord(lexer, dialect);
    if (headerRecord) {
      return headerRecord.fields.map((f) => f.value);
    }
  }
  return undefined;
}

// =============================================================================
// Public API: full document parse
// =============================================================================

/**
 * Parse a DSV string into a DsvDocument AST.
 *
 * @param input - The full DSV text
 * @param options - Parse options (dialect, headers, etc.)
 * @returns DsvDocument AST node
 */
export function parseDsv(
  input: string,
  options?: DsvParseOptions,
): DsvDocument {
  const dialect = resolveDialect(options?.dialect);
  const lexer = createDsvLexer(input, dialect);
  const maxRecords = options?.maxRecords;

  const headers = resolveHeaders(lexer, dialect, options);

  // --- Parse data records ---
  const records: DsvRecord[] = [];
  // eslint-disable-next-line no-restricted-syntax -- Accumulator: incremented per record for 0-based indexing
  let recordIndex = 0;

  while (true) {
    if (maxRecords !== undefined && recordIndex >= maxRecords) {
      break;
    }

    const result = readNextDataRecord(lexer, dialect);
    if (result === undefined) {
      break;
    }

    records.push({
      type: "record",
      fields: result.fields,
      recordIndex,
      span: result.span,
    });
    recordIndex++;
  }

  return {
    type: "document",
    headers,
    records,
  };
}

/**
 * Read the next data record, skipping empty lines and comments as configured.
 * Returns undefined at EOF.
 */
function readNextDataRecord(
  lexer: DsvLexer,
  dialect: DsvDialect,
): { fields: readonly DsvField[]; span: SourceSpan } | undefined {
  while (true) {
    const result = readRecord(lexer);
    switch (result.kind) {
      case "eof":
        return undefined;
      case "comment":
        // Always skip comments
        continue;
      case "empty-line":
        if (dialect.skipEmptyLines) {
          continue;
        }
        // If not skipping empty lines, we still don't produce a record
        // for a truly empty line (no fields at all). This matches
        // the behavior of most CSV parsers: trailing newlines don't
        // create extra records.
        continue;
      case "record":
        return { fields: result.fields, span: result.span };
    }
  }
}

/**
 * Consume one record from the lexer without returning it.
 * Used when discarding the header row.
 */
function consumeOneRecord(lexer: DsvLexer, dialect: DsvDialect): void {
  readNextDataRecord(lexer, dialect);
}

// =============================================================================
// Public API: streaming record iteration
// =============================================================================

/**
 * Parse DSV input and yield records one at a time.
 *
 * This is useful for processing large files without loading the entire
 * document into memory. Each yielded record is fully parsed with fields.
 *
 * @param input - DSV text
 * @param options - Parse options
 * @yields DsvRecord nodes, one per data row
 */
export function* parseRecords(
  input: string,
  options?: DsvParseOptions,
): Generator<DsvRecord, { headers: readonly string[] | undefined }> {
  const dialect = resolveDialect(options?.dialect);
  const lexer = createDsvLexer(input, dialect);
  const maxRecords = options?.maxRecords;

  const headers = resolveHeaders(lexer, dialect, options);

  // --- Yield data records ---
  // eslint-disable-next-line no-restricted-syntax -- Accumulator: incremented per record for 0-based indexing
  let recordIndex = 0;

  while (true) {
    if (maxRecords !== undefined && recordIndex >= maxRecords) {
      break;
    }

    const result = readNextDataRecord(lexer, dialect);
    if (result === undefined) {
      break;
    }

    yield {
      type: "record",
      fields: result.fields,
      recordIndex,
      span: result.span,
    };
    recordIndex++;
  }

  return { headers };
}
