/**
 * @file DSV Lexer tests
 *
 * Tests the tokenizer for CSV, TSV, and custom delimiter formats.
 * Covers RFC 4180 compliance, edge cases, and dialect variations.
 */

import { createDsvLexer, TokenType, type DsvToken, type DsvLexer } from "./lexer";
import { CSV_DIALECT, TSV_DIALECT, MYSQL_DIALECT, createDialect } from "./dialect";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Consume all remaining tokens from a lexer (excluding EOF).
 */
function consumeAll(lexer: DsvLexer): DsvToken[] {
  const tokens: DsvToken[] = [];
  for (;;) {
    const token = lexer.nextToken();
    if (token.type === TokenType.EOF) {
      return tokens;
    }
    tokens.push(token);
  }
}

function tokenize(input: string, dialect = CSV_DIALECT): DsvToken[] {
  const lexer = createDsvLexer(input, dialect);
  const tokens: DsvToken[] = [];
  for (;;) {
    const token = lexer.nextToken();
    tokens.push(token);
    if (token.type === TokenType.EOF) {
      return tokens;
    }
  }
}

function tokenTypes(input: string, dialect = CSV_DIALECT): TokenType[] {
  return tokenize(input, dialect).map((t) => t.type);
}

function fieldValues(input: string, dialect = CSV_DIALECT): string[] {
  return tokenize(input, dialect)
    .filter((t) => t.type === TokenType.FIELD_TEXT || t.type === TokenType.QUOTED_FIELD)
    .map((t) => t.value);
}

// =============================================================================
// Basic tokenization
// =============================================================================

describe("DSV Lexer", () => {
  describe("basic tokenization", () => {
    it("tokenizes empty input", () => {
      const tokens = tokenize("");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it("tokenizes a single field", () => {
      expect(fieldValues("hello")).toEqual(["hello"]);
    });

    it("tokenizes comma-separated fields", () => {
      expect(fieldValues("a,b,c")).toEqual(["a", "b", "c"]);
    });

    it("tokenizes fields with trailing newline", () => {
      expect(fieldValues("a,b,c\n")).toEqual(["a", "b", "c"]);
    });

    it("tokenizes multiple records", () => {
      const types = tokenTypes("a,b\nc,d\n");
      expect(types).toEqual([
        TokenType.FIELD_TEXT,
        TokenType.DELIMITER,
        TokenType.FIELD_TEXT,
        TokenType.RECORD_END,
        TokenType.FIELD_TEXT,
        TokenType.DELIMITER,
        TokenType.FIELD_TEXT,
        TokenType.RECORD_END,
        TokenType.EOF,
      ]);
    });

    it("tokenizes tab-separated fields", () => {
      expect(fieldValues("a\tb\tc", TSV_DIALECT)).toEqual(["a", "b", "c"]);
    });
  });

  // ===========================================================================
  // Quoting (RFC 4180)
  // ===========================================================================

  describe("quoting (RFC 4180)", () => {
    it("parses a quoted field", () => {
      const tokens = tokenize('"hello"');
      expect(tokens[0].type).toBe(TokenType.QUOTED_FIELD);
      expect(tokens[0].value).toBe("hello");
    });

    it("parses quoted field with escaped quote (double-quote)", () => {
      expect(fieldValues('"he said ""hello"""')).toEqual(['he said "hello"']);
    });

    it("parses quoted field containing delimiter", () => {
      expect(fieldValues('"a,b",c')).toEqual(["a,b", "c"]);
    });

    it("parses quoted field containing newline", () => {
      expect(fieldValues('"line1\nline2"')).toEqual(["line1\nline2"]);
    });

    it("parses quoted field containing CRLF", () => {
      expect(fieldValues('"line1\r\nline2"')).toEqual(["line1\nline2"]);
    });

    it("parses quoted field containing CR", () => {
      expect(fieldValues('"line1\rline2"')).toEqual(["line1\nline2"]);
    });

    it("handles empty quoted field", () => {
      expect(fieldValues('""')).toEqual([""]);
    });

    it("handles quoted field with only escaped quotes", () => {
      expect(fieldValues('""""')).toEqual(['"']);
    });

    it("handles multiple consecutive escaped quotes", () => {
      expect(fieldValues('""""""')).toEqual(['""']);
    });

    it("handles mixed quoted and unquoted fields", () => {
      expect(fieldValues('a,"b",c')).toEqual(["a", "b", "c"]);
    });

    it("preserves leading/trailing spaces in quoted fields", () => {
      expect(fieldValues('" hello "')).toEqual([" hello "]);
    });
  });

  // ===========================================================================
  // Backslash escaping
  // ===========================================================================

  describe("backslash escaping", () => {
    it("handles backslash-escaped quote", () => {
      expect(fieldValues('"he said \\"hello\\""', MYSQL_DIALECT)).toEqual([
        'he said "hello"',
      ]);
    });

    it("handles backslash-escaped newline", () => {
      expect(fieldValues('"line1\\nline2"', MYSQL_DIALECT)).toEqual(["line1\nline2"]);
    });

    it("handles backslash-escaped tab", () => {
      expect(fieldValues('"col1\\tcol2"', MYSQL_DIALECT)).toEqual(["col1\tcol2"]);
    });

    it("handles backslash-escaped backslash", () => {
      expect(fieldValues('"path\\\\to\\\\file"', MYSQL_DIALECT)).toEqual([
        "path\\to\\file",
      ]);
    });

    it("handles backslash-escaped null byte", () => {
      expect(fieldValues('"null\\0byte"', MYSQL_DIALECT)).toEqual(["null\0byte"]);
    });

    it("handles trailing backslash (literal)", () => {
      const tokens = tokenize('"trailing\\', MYSQL_DIALECT);
      // Unclosed quoted field with trailing backslash → literal backslash
      expect(tokens[0].value).toBe("trailing\\");
    });

    it("handles backslash before non-special character (literal)", () => {
      expect(fieldValues('"hello\\world"', MYSQL_DIALECT)).toEqual(["helloworld"]);
    });
  });

  // ===========================================================================
  // Empty fields and delimiters
  // ===========================================================================

  describe("empty fields", () => {
    it("handles leading empty field", () => {
      // At the lexer level, leading empty field is represented by
      // DELIMITER as the first token. The parser assembles empty fields.
      const types = tokenTypes(",a");
      expect(types).toEqual([
        TokenType.DELIMITER,
        TokenType.FIELD_TEXT,
        TokenType.EOF,
      ]);
    });

    it("handles trailing empty field", () => {
      // "a," → field "a", delimiter, then record end
      // The parser handles trailing empty field, not the lexer
      const tokens = tokenize("a,\n");
      expect(tokens[0]).toMatchObject({ type: TokenType.FIELD_TEXT, value: "a" });
      expect(tokens[1]).toMatchObject({ type: TokenType.DELIMITER });
      expect(tokens[2]).toMatchObject({ type: TokenType.RECORD_END });
    });

    it("handles multiple consecutive delimiters", () => {
      // At the lexer level, empty fields between delimiters are not
      // emitted as tokens — the parser infers them from consecutive delimiters.
      const types = tokenTypes(",,,");
      expect(types).toEqual([
        TokenType.DELIMITER,
        TokenType.DELIMITER,
        TokenType.DELIMITER,
        TokenType.EOF,
      ]);
    });

    it("handles empty line", () => {
      const types = tokenTypes("\n");
      expect(types).toEqual([TokenType.RECORD_END, TokenType.EOF]);
    });

    it("handles multiple empty lines", () => {
      const types = tokenTypes("\n\n\n");
      expect(types).toEqual([
        TokenType.RECORD_END,
        TokenType.RECORD_END,
        TokenType.RECORD_END,
        TokenType.EOF,
      ]);
    });
  });

  // ===========================================================================
  // Line endings
  // ===========================================================================

  describe("line endings", () => {
    it("handles LF", () => {
      expect(fieldValues("a\nb")).toEqual(["a", "b"]);
    });

    it("handles CRLF", () => {
      expect(fieldValues("a\r\nb")).toEqual(["a", "b"]);
    });

    it("handles CR", () => {
      expect(fieldValues("a\rb")).toEqual(["a", "b"]);
    });

    it("handles mixed line endings", () => {
      expect(fieldValues("a\nb\r\nc\rd")).toEqual(["a", "b", "c", "d"]);
    });

    it("CRLF counts as single record end", () => {
      const types = tokenTypes("a\r\nb");
      const recordEnds = types.filter((t) => t === TokenType.RECORD_END);
      expect(recordEnds).toHaveLength(1);
    });
  });

  // ===========================================================================
  // BOM handling
  // ===========================================================================

  describe("BOM handling", () => {
    it("skips BOM at start of input", () => {
      expect(fieldValues("\uFEFFa,b")).toEqual(["a", "b"]);
    });

    it("BOM does not affect position tracking", () => {
      const tokens = tokenize("\uFEFFhello");
      // Position should account for BOM skip
      expect(tokens[0].pos.offset).toBe(1);
      expect(tokens[0].pos.column).toBe(1);
    });

    it("BOM in middle of input is not skipped", () => {
      // BOM only special at position 0
      expect(fieldValues("a,\uFEFFb")).toEqual(["a", "\uFEFFb"]);
    });
  });

  // ===========================================================================
  // Comment lines
  // ===========================================================================

  describe("comment lines", () => {
    const commentDialect = createDialect({ commentChar: "#" });

    it("recognizes comment at start of record", () => {
      const tokens = tokenize("# this is a comment\na,b", commentDialect);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe(" this is a comment");
    });

    it("does not treat # in middle of field as comment", () => {
      expect(fieldValues("a#b,c", commentDialect)).toEqual(["a#b", "c"]);
    });

    it("does not treat # after delimiter as comment", () => {
      const tokens = tokenize("a,#b", commentDialect);
      const fieldTokens = tokens.filter(
        (t) => t.type === TokenType.FIELD_TEXT || t.type === TokenType.QUOTED_FIELD,
      );
      expect(fieldTokens).toHaveLength(2);
    });

    it("handles multiple comment lines", () => {
      const tokens = tokenize("# comment 1\n# comment 2\na,b", commentDialect);
      const comments = tokens.filter((t) => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(2);
    });

    it("ignores comments when commentChar is undefined", () => {
      const tokens = tokenize("# not a comment", CSV_DIALECT);
      expect(tokens[0].type).toBe(TokenType.FIELD_TEXT);
      expect(tokens[0].value).toBe("# not a comment");
    });

    it("recognizes comment after leading whitespace when trimFields is true", () => {
      const trimCommentDialect = createDialect({ commentChar: "#", trimFields: true });
      const tokens = tokenize("  # indented comment\na,b", trimCommentDialect);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe(" indented comment");
    });

    it("does not treat leading-whitespace comment without trimFields", () => {
      // Without trimFields, "  # comment" is a normal field, not a comment
      const tokens = tokenize("  # not comment\n", commentDialect);
      expect(tokens[0].type).toBe(TokenType.FIELD_TEXT);
    });
  });

  // ===========================================================================
  // Position tracking
  // ===========================================================================

  describe("position tracking", () => {
    it("tracks position on single line", () => {
      const tokens = tokenize("abc,def");
      expect(tokens[0].pos).toEqual({ line: 1, column: 0, offset: 0 });
      expect(tokens[1].pos).toEqual({ line: 1, column: 3, offset: 3 }); // delimiter
      expect(tokens[2].pos).toEqual({ line: 1, column: 4, offset: 4 });
    });

    it("tracks line numbers across records", () => {
      const tokens = tokenize("a\nb\nc");
      const fields = tokens.filter((t) => t.type === TokenType.FIELD_TEXT);
      expect(fields[0].pos.line).toBe(1);
      expect(fields[1].pos.line).toBe(2);
      expect(fields[2].pos.line).toBe(3);
    });

    it("tracks line numbers in quoted fields with newlines", () => {
      const tokens = tokenize('"line1\nline2"\na');
      // After the quoted field (which spans 2 lines), the next field is on line 3
      const fields = tokens.filter(
        (t) => t.type === TokenType.FIELD_TEXT || t.type === TokenType.QUOTED_FIELD,
      );
      expect(fields[0].pos.line).toBe(1);
      expect(fields[1].pos.line).toBe(3);
    });
  });

  // ===========================================================================
  // Trimming
  // ===========================================================================

  describe("field trimming", () => {
    const trimDialect = createDialect({ trimFields: true });

    it("trims whitespace from unquoted fields", () => {
      expect(fieldValues(" hello , world ", trimDialect)).toEqual(["hello", "world"]);
    });

    it("does not trim quoted fields", () => {
      // Quoted fields are QUOTED_FIELD type, their value already excludes quotes
      // The trimming applies to FIELD_TEXT tokens only
      const tokens = tokenize('" hello "', trimDialect);
      expect(tokens[0].type).toBe(TokenType.QUOTED_FIELD);
      expect(tokens[0].value).toBe(" hello ");
    });

    it("preserves raw text even when trimming", () => {
      const tokens = tokenize(" hello ", trimDialect);
      expect(tokens[0].value).toBe("hello");
      expect(tokens[0].raw).toBe(" hello ");
    });
  });

  // ===========================================================================
  // Peek
  // ===========================================================================

  describe("peek", () => {
    it("peek does not consume token", () => {
      const lexer = createDsvLexer("a,b", CSV_DIALECT);
      const peeked = lexer.peek();
      const next = lexer.nextToken();
      expect(peeked).toEqual(next);
    });

    it("multiple peeks return same token", () => {
      const lexer = createDsvLexer("a,b", CSV_DIALECT);
      const peek1 = lexer.peek();
      const peek2 = lexer.peek();
      expect(peek1).toEqual(peek2);
    });

    it("peek does not change position()", () => {
      const lexer = createDsvLexer("a,b", CSV_DIALECT);
      const posBefore = lexer.position();
      lexer.peek();
      const posAfter = lexer.position();
      expect(posAfter).toEqual(posBefore);
    });

    it("position advances after nextToken consumes peeked token", () => {
      const lexer = createDsvLexer("a,b", CSV_DIALECT);
      const posBefore = lexer.position();
      expect(posBefore.offset).toBe(0);

      lexer.peek(); // peek "a" — should not move position
      expect(lexer.position().offset).toBe(0);

      lexer.nextToken(); // consume "a" — now position should advance
      expect(lexer.position().offset).toBe(1); // past "a"
    });

    it("peek followed by full iteration produces correct tokens", () => {
      const lexer = createDsvLexer("x,y\n", CSV_DIALECT);
      // Peek first token
      const peeked = lexer.peek();
      expect(peeked.type).toBe(TokenType.FIELD_TEXT);
      expect(peeked.value).toBe("x");

      // Now consume all tokens via nextToken
      const tokens = consumeAll(lexer);
      expect(tokens.map((t) => t.type)).toEqual([
        TokenType.FIELD_TEXT,
        TokenType.DELIMITER,
        TokenType.FIELD_TEXT,
        TokenType.RECORD_END,
      ]);
      expect(tokens[0].value).toBe("x");
      expect(tokens[2].value).toBe("y");
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe("edge cases", () => {
    it("handles field with only whitespace", () => {
      expect(fieldValues("   ")).toEqual(["   "]);
    });

    it("handles very long field", () => {
      const long = "x".repeat(100_000);
      expect(fieldValues(long)).toEqual([long]);
    });

    it("handles Unicode characters", () => {
      expect(fieldValues("日本語,emoji🎉,中文")).toEqual(["日本語", "emoji🎉", "中文"]);
    });

    it("handles quoted field with Unicode", () => {
      expect(fieldValues('"日本語,含むフィールド"')).toEqual(["日本語,含むフィールド"]);
    });

    it("handles unclosed quoted field (lenient)", () => {
      const tokens = tokenize('"unclosed');
      expect(tokens[0].type).toBe(TokenType.QUOTED_FIELD);
      expect(tokens[0].value).toBe("unclosed");
    });

    it("handles characters after closing quote (lenient)", () => {
      // "hello"world → quoted field "hello", "world" discarded
      const tokens = tokenize('"hello"world,next');
      expect(tokens[0].type).toBe(TokenType.QUOTED_FIELD);
      expect(tokens[0].value).toBe("hello");
      expect(tokens[2].type).toBe(TokenType.FIELD_TEXT);
      expect(tokens[2].value).toBe("next");
    });

    it("handles semicolon delimiter", () => {
      const dialect = createDialect({ delimiter: ";" });
      expect(fieldValues("a;b;c", dialect)).toEqual(["a", "b", "c"]);
    });

    it("handles pipe delimiter", () => {
      const dialect = createDialect({ delimiter: "|" });
      expect(fieldValues("a|b|c", dialect)).toEqual(["a", "b", "c"]);
    });

    it("handles single-quote quoting", () => {
      const dialect = createDialect({ quoteChar: "'" });
      expect(fieldValues("'hello,world'", dialect)).toEqual(["hello,world"]);
    });

    it("handles no quoting (quoteChar undefined)", () => {
      const dialect = createDialect({ quoteChar: undefined });
      expect(fieldValues('"not,quoted"', dialect)).toEqual(['"not', 'quoted"']);
    });
  });
});
