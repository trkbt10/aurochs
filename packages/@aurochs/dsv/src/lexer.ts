/**
 * @file DSV Lexer (Tokenizer)
 *
 * Converts a DSV (CSV/TSV/etc.) string into a stream of tokens.
 *
 * Design: Stateful cursor-based lexer that processes input character by
 * character, following the pattern established by @aurochs/xml lexer.
 * Produces tokens on demand via `nextToken()`.
 *
 * The lexer operates at the character level and handles:
 * - RFC 4180 compliant quoting (double-quote escaping)
 * - Backslash escape strategy (MySQL-style)
 * - Mixed line endings (CRLF, LF, CR)
 * - BOM detection and skipping
 * - Comment lines
 * - Position tracking for every token
 *
 * Token types:
 * - FIELD_TEXT: unquoted field content
 * - QUOTED_FIELD: entire quoted field (after unescaping)
 * - DELIMITER: field separator
 * - RECORD_END: end of a record (newline)
 * - COMMENT: a comment line
 * - EOF: end of input
 *
 * @see https://www.rfc-editor.org/rfc/rfc4180
 */

import type { DsvDialect } from "./dialect";
import type { SourcePosition } from "./ast";

// =============================================================================
// Token types
// =============================================================================

export const TokenType = {
  /** Unquoted field content. Value is the raw text. */
  FIELD_TEXT: "FIELD_TEXT",
  /** Quoted field. Value is the unescaped content (quotes stripped). */
  QUOTED_FIELD: "QUOTED_FIELD",
  /** Field delimiter (comma, tab, etc.). */
  DELIMITER: "DELIMITER",
  /** Record terminator (newline). */
  RECORD_END: "RECORD_END",
  /** Comment line (# ...). Value is the comment text. */
  COMMENT: "COMMENT",
  /** End of input. */
  EOF: "EOF",
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

/**
 * Token produced by the lexer.
 */
export type DsvToken = {
  readonly type: TokenType;
  /** Decoded value (unquoted content for QUOTED_FIELD, raw text otherwise). */
  readonly value: string;
  /** Raw text as it appeared in the source. */
  readonly raw: string;
  /** Start position in source. */
  readonly pos: SourcePosition;
  /** End position in source (cursor position after this token). */
  readonly endPos: SourcePosition;
};

// =============================================================================
// Lexer interface
// =============================================================================

export type DsvLexer = {
  /** Get the next token. */
  readonly nextToken: () => DsvToken;
  /** Peek at the next token without consuming it. */
  readonly peek: () => DsvToken;
  /** Current position in the source. */
  readonly position: () => SourcePosition;
};

// =============================================================================
// Character codes (for fast comparison)
// =============================================================================

const CH_LF = 0x0a; // \n
const CH_CR = 0x0d; // \r
const CH_BACKSLASH = 0x5c; // \
const CH_BOM = 0xfeff; // BOM

/**
 * Find the index of the first non-whitespace (space/tab) character
 * starting from `from`. Returns `input.length` if none found.
 */
function findNonWhitespace(input: string, from: number): number {
  const match = input.slice(from).search(/[^ \t]/);
  return match === -1 ? input.length : from + match;
}

// =============================================================================
// Lexer implementation
// =============================================================================

/**
 * Create a DSV lexer for the given input and dialect.
 *
 * @param input - The full DSV text to tokenize
 * @param dialect - Dialect configuration
 * @returns Lexer with nextToken/peek/position methods
 */
export function createDsvLexer(input: string, dialect: DsvDialect): DsvLexer {
  // eslint-disable-next-line no-restricted-syntax -- Cursor state: mutable by design for streaming character-by-character lexer
  let offset = 0;
  // eslint-disable-next-line no-restricted-syntax -- Cursor state: line tracking
  let line = 1;
  // eslint-disable-next-line no-restricted-syntax -- Cursor state: column tracking
  let column = 0;

  // --- Dialect characters ---
  const delimiterCode = dialect.delimiter.charCodeAt(0);
  const quoteCode = dialect.quoteChar?.charCodeAt(0);
  const commentCode = dialect.commentChar?.charCodeAt(0);
  const hasQuoting = dialect.quoteChar !== undefined;
  const escapeStrategy = dialect.escapeStrategy;

  // eslint-disable-next-line no-restricted-syntax -- Lookahead buffer for peek()
  let peeked: DsvToken | undefined;
  // eslint-disable-next-line no-restricted-syntax -- Saved cursor position after peek read, restored on nextToken consume
  let peekedCursorAfter:
    | { offset: number; line: number; column: number; atRecordStart: boolean }
    | undefined;

  // --- BOM handling ---
  // Skip BOM at the very start of input if present.
  if (input.charCodeAt(0) === CH_BOM) {
    offset = 1;
    column = 1;
  }

  // eslint-disable-next-line no-restricted-syntax -- Lexer state: tracks record boundary for comment detection
  let atRecordStart = true;

  // =========================================================================
  // Position helpers
  // =========================================================================

  function currentPos(): SourcePosition {
    return { line, column, offset };
  }

  function charCode(): number {
    return input.charCodeAt(offset);
  }

  function atEnd(): boolean {
    return offset >= input.length;
  }

  /**
   * Advance the cursor by one character, updating line/column tracking.
   */
  function advance(): void {
    const code = charCode();
    offset++;
    if (code === CH_CR) {
      // CR or CRLF → newline
      if (!atEnd() && charCode() === CH_LF) {
        offset++; // consume the LF in CRLF
      }
      line++;
      column = 0;
    } else if (code === CH_LF) {
      line++;
      column = 0;
    } else {
      column++;
    }
  }

  /**
   * Check if the current character is a record terminator (CR, LF, or CRLF).
   */
  function isRecordTerminator(): boolean {
    const code = charCode();
    return code === CH_CR || code === CH_LF;
  }

  // =========================================================================
  // Token readers
  // =========================================================================

  /**
   * Read a newline (CR, LF, or CRLF) and return a RECORD_END token.
   */
  function readRecordEnd(): DsvToken {
    const startPos = currentPos();
    const startOffset = offset;
    advance(); // handles CRLF as one step
    return {
      type: TokenType.RECORD_END,
      value: "\n",
      raw: input.slice(startOffset, offset),
      pos: startPos,
      endPos: currentPos(),
    };
  }

  /**
   * Read a comment line (from comment char to end of line).
   */
  function readComment(): DsvToken {
    const startPos = currentPos();
    const startOffset = offset;
    // Skip the comment character
    advance();
    // Read until end of line or end of input
    while (!atEnd() && !isRecordTerminator()) {
      advance();
    }
    const raw = input.slice(startOffset, offset);
    // The value is everything after the comment char
    const value = raw.slice(1);
    // Consume the line ending if present (the comment "owns" the newline)
    if (!atEnd() && isRecordTerminator()) {
      advance();
    }
    return {
      type: TokenType.COMMENT,
      value,
      raw: input.slice(startOffset, offset),
      pos: startPos,
      endPos: currentPos(),
    };
  }

  /**
   * Read a quoted field.
   *
   * Handles:
   * - RFC 4180 double-quote escaping: `""` → `"`
   * - Backslash escaping: `\"` → `"`, `\\` → `\`, `\n` → newline, `\t` → tab
   * - Newlines inside quotes (they are part of the field, not record terminators)
   *
   * After the closing quote, any characters before the next delimiter or
   * record terminator are discarded (lenient parsing for malformed input).
   */
  function readQuotedField(): DsvToken {
    const startPos = currentPos();
    const startOffset = offset;
    const parts: string[] = [];

    // Skip opening quote
    offset++;
    column++;

    // eslint-disable-next-line no-restricted-syntax -- Loop state: set to true when closing quote is found
    let closed = false;

    while (!atEnd()) {
      const code = charCode();

      if (escapeStrategy === "backslash" && code === CH_BACKSLASH) {
        // Backslash escape
        offset++;
        column++;
        if (atEnd()) {
          // Trailing backslash → literal backslash
          parts.push("\\");
          break;
        }
        const escapedChar = input[offset];
        offset++;
        column++;
        switch (escapedChar) {
          case "n":
            parts.push("\n");
            break;
          case "t":
            parts.push("\t");
            break;
          case "r":
            parts.push("\r");
            break;
          case "0":
            parts.push("\0");
            break;
          default:
            // \\, \", or any other char → literal char
            parts.push(escapedChar);
            break;
        }
        continue;
      }

      if (code === quoteCode) {
        // Potential end of quoted field, or escaped quote
        if (
          escapeStrategy === "double" &&
          offset + 1 < input.length &&
          input.charCodeAt(offset + 1) === quoteCode
        ) {
          // Doubled quote → single quote character
          parts.push(dialect.quoteChar!);
          offset += 2;
          column += 2;
          continue;
        }
        // Closing quote
        offset++;
        column++;
        closed = true;
        break;
      }

      // Track newlines inside quoted fields
      if (code === CH_CR || code === CH_LF) {
        if (code === CH_CR) {
          parts.push("\n"); // Normalize CR/CRLF to LF inside quoted fields
          offset++;
          if (!atEnd() && charCode() === CH_LF) {
            offset++; // skip LF of CRLF
          }
        } else {
          parts.push("\n");
          offset++;
        }
        line++;
        column = 0;
        continue;
      }

      // Regular character
      parts.push(input[offset]);
      offset++;
      column++;
    }

    // If not closed, the quoted field extends to end of input (lenient).
    // We don't error — we treat the rest as field content.
    // This matches behavior of most CSV parsers.

    if (closed) {
      // Skip any trailing characters after the closing quote
      // until the next delimiter, record terminator, or EOF.
      // This handles malformed input like: "hello"world,next
      // where "world" is discarded.
      while (!atEnd()) {
        const code = charCode();
        if (code === delimiterCode || code === CH_CR || code === CH_LF) {
          break;
        }
        offset++;
        column++;
      }
    }

    const raw = input.slice(startOffset, offset);
    return {
      type: TokenType.QUOTED_FIELD,
      value: parts.join(""),
      raw,
      pos: startPos,
      endPos: currentPos(),
    };
  }

  /**
   * Read an unquoted field.
   *
   * Reads until delimiter, record terminator, or EOF.
   * If trimFields is enabled, leading/trailing whitespace is trimmed from value
   * but raw preserves the original text.
   */
  function readUnquotedField(): DsvToken {
    const startPos = currentPos();
    const startOffset = offset;

    while (!atEnd()) {
      const code = charCode();
      if (code === delimiterCode || code === CH_CR || code === CH_LF) {
        break;
      }
      offset++;
      column++;
    }

    const raw = input.slice(startOffset, offset);
    const value = dialect.trimFields ? raw.trim() : raw;

    return {
      type: TokenType.FIELD_TEXT,
      value,
      raw,
      pos: startPos,
      endPos: currentPos(),
    };
  }

  /**
   * Read a delimiter token.
   */
  function readDelimiter(): DsvToken {
    const startPos = currentPos();
    const raw = input[offset];
    offset++;
    column++;
    return {
      type: TokenType.DELIMITER,
      value: raw,
      raw,
      pos: startPos,
      endPos: currentPos(),
    };
  }

  // =========================================================================
  // Main tokenization
  // =========================================================================

  function readNextToken(): DsvToken {
    if (atEnd()) {
      const eofPos = currentPos();
      return {
        type: TokenType.EOF,
        value: "",
        raw: "",
        pos: eofPos,
        endPos: eofPos,
      };
    }

    const code = charCode();

    // Comment detection: only at the start of a record.
    // When trimFields is true, skip leading whitespace before checking
    // for the comment character, as documented in dialect.commentChar.
    if (atRecordStart && commentCode !== undefined) {
      if (code === commentCode) {
        return readComment();
      }
      if (dialect.trimFields) {
        // Look ahead past whitespace to see if comment char follows
        const commentStart = findNonWhitespace(input, offset);
        if (commentStart < input.length && input.charCodeAt(commentStart) === commentCode) {
          // Advance past the leading whitespace to the comment char
          column += commentStart - offset;
          offset = commentStart;
          return readComment();
        }
      }
    }

    // Record terminator
    if (code === CH_CR || code === CH_LF) {
      atRecordStart = true;
      return readRecordEnd();
    }

    // Delimiter
    if (code === delimiterCode) {
      atRecordStart = false;
      return readDelimiter();
    }

    // Quoted field
    if (hasQuoting && code === quoteCode) {
      atRecordStart = false;
      return readQuotedField();
    }

    // Unquoted field
    atRecordStart = false;
    return readUnquotedField();
  }

  // =========================================================================
  // Public interface
  // =========================================================================

  function nextToken(): DsvToken {
    if (peeked !== undefined) {
      const token = peeked;
      peeked = undefined;
      // Advance cursor to the state after the peeked token was read
      if (peekedCursorAfter !== undefined) {
        offset = peekedCursorAfter.offset;
        line = peekedCursorAfter.line;
        column = peekedCursorAfter.column;
        atRecordStart = peekedCursorAfter.atRecordStart;
        peekedCursorAfter = undefined;
      }
      return token;
    }
    return readNextToken();
  }

  function peek(): DsvToken {
    if (peeked === undefined) {
      // Save cursor state before reading
      const savedOffset = offset;
      const savedLine = line;
      const savedColumn = column;
      const savedAtRecordStart = atRecordStart;

      peeked = readNextToken();

      // Save the cursor state after reading (for nextToken to restore)
      peekedCursorAfter = {
        offset,
        line,
        column,
        atRecordStart,
      };

      // Restore cursor state so position() is unaffected by peek
      offset = savedOffset;
      line = savedLine;
      column = savedColumn;
      atRecordStart = savedAtRecordStart;
    }
    return peeked;
  }

  function position(): SourcePosition {
    return currentPos();
  }

  return { nextToken, peek, position };
}
