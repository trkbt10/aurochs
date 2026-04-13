/**
 * @file DSV Parser tests
 *
 * Tests the full parsing pipeline: text → tokens → AST.
 * Covers headers, empty fields, varying field counts, streaming, and edge cases.
 */

import { parseDsv, parseRecords } from "./parser";
import type { DsvDocument } from "./ast";

// =============================================================================
// Helpers
// =============================================================================

function values(doc: DsvDocument): string[][] {
  return doc.records.map((r) => r.fields.map((f) => f.value));
}

function firstRecordValues(doc: DsvDocument): string[] {
  return doc.records[0]?.fields.map((f) => f.value) ?? [];
}

// =============================================================================
// Basic parsing
// =============================================================================

describe("DSV Parser", () => {
  describe("basic parsing", () => {
    it("parses empty input", () => {
      const doc = parseDsv("");
      expect(doc.records).toHaveLength(0);
      expect(doc.headers).toBeUndefined();
    });

    it("parses single field with no header", () => {
      const doc = parseDsv("hello", { dialect: { hasHeader: false } });
      expect(doc.records).toHaveLength(1);
      expect(firstRecordValues(doc)).toEqual(["hello"]);
    });

    it("parses CSV with header", () => {
      const doc = parseDsv("name,age\nAlice,30\nBob,25\n");
      expect(doc.headers).toEqual(["name", "age"]);
      expect(doc.records).toHaveLength(2);
      expect(values(doc)).toEqual([
        ["Alice", "30"],
        ["Bob", "25"],
      ]);
    });

    it("parses CSV without header", () => {
      const doc = parseDsv("Alice,30\nBob,25\n", { dialect: { hasHeader: false } });
      expect(doc.headers).toBeUndefined();
      expect(doc.records).toHaveLength(2);
      expect(values(doc)).toEqual([
        ["Alice", "30"],
        ["Bob", "25"],
      ]);
    });

    it("parses TSV", () => {
      const doc = parseDsv("name\tage\nAlice\t30\n", { dialect: "tsv" });
      expect(doc.headers).toEqual(["name", "age"]);
      expect(values(doc)).toEqual([["Alice", "30"]]);
    });

    it("parses European CSV (semicolon delimiter)", () => {
      const doc = parseDsv("name;age\nAlice;30\n", { dialect: "european-csv" });
      expect(doc.headers).toEqual(["name", "age"]);
      expect(values(doc)).toEqual([["Alice", "30"]]);
    });
  });

  // ===========================================================================
  // Header handling
  // ===========================================================================

  describe("header handling", () => {
    it("uses explicit headers when provided", () => {
      const doc = parseDsv("Alice,30\nBob,25\n", {
        dialect: { hasHeader: false },
        headers: ["name", "age"],
      });
      expect(doc.headers).toEqual(["name", "age"]);
      expect(values(doc)).toEqual([
        ["Alice", "30"],
        ["Bob", "25"],
      ]);
    });

    it("discards first row when hasHeader=true and explicit headers provided", () => {
      const doc = parseDsv("x,y\nAlice,30\nBob,25\n", {
        headers: ["name", "age"],
      });
      expect(doc.headers).toEqual(["name", "age"]);
      expect(doc.records).toHaveLength(2);
      expect(values(doc)).toEqual([
        ["Alice", "30"],
        ["Bob", "25"],
      ]);
    });

    it("handles header-only input (no data rows)", () => {
      const doc = parseDsv("name,age\n");
      expect(doc.headers).toEqual(["name", "age"]);
      expect(doc.records).toHaveLength(0);
    });

    it("handles header with empty input after", () => {
      const doc = parseDsv("name,age");
      expect(doc.headers).toEqual(["name", "age"]);
      expect(doc.records).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Empty fields and records
  // ===========================================================================

  describe("empty fields", () => {
    it("parses empty fields between delimiters", () => {
      const doc = parseDsv("a,,b\n", { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["a", "", "b"]);
    });

    it("parses leading empty field", () => {
      const doc = parseDsv(",a,b\n", { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["", "a", "b"]);
    });

    it("parses trailing empty field", () => {
      const doc = parseDsv("a,b,\n", { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["a", "b", ""]);
    });

    it("parses all empty fields", () => {
      const doc = parseDsv(",,\n", { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["", "", ""]);
    });

    it("handles empty quoted field", () => {
      const doc = parseDsv('"",a\n', { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["", "a"]);
    });
  });

  describe("empty lines", () => {
    it("skips empty lines when skipEmptyLines is true", () => {
      const doc = parseDsv("a\n\nb\n\nc\n", {
        dialect: { hasHeader: false, skipEmptyLines: true },
      });
      expect(values(doc)).toEqual([["a"], ["b"], ["c"]]);
    });

    it("skips empty lines by default (empty lines never produce records)", () => {
      const doc = parseDsv("a\n\nb\n", { dialect: { hasHeader: false } });
      expect(values(doc)).toEqual([["a"], ["b"]]);
    });

    it("handles input that is only empty lines", () => {
      const doc = parseDsv("\n\n\n", { dialect: { hasHeader: false } });
      expect(doc.records).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Quoted fields
  // ===========================================================================

  describe("quoted fields in records", () => {
    it("preserves newlines in quoted fields", () => {
      const doc = parseDsv('"line1\nline2",b\n', { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["line1\nline2", "b"]);
    });

    it("preserves delimiters in quoted fields", () => {
      const doc = parseDsv('"a,b",c\n', { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["a,b", "c"]);
    });

    it("handles escaped quotes in records", () => {
      const doc = parseDsv('"say ""hi""",b\n', { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(['say "hi"', "b"]);
    });

    it("round-trips complex quoted content", () => {
      const input = '"he said ""hello, world"""\n';
      const doc = parseDsv(input, { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(['he said "hello, world"']);
    });
  });

  // ===========================================================================
  // Varying field counts (ragged records)
  // ===========================================================================

  describe("ragged records", () => {
    it("handles records with fewer fields than header", () => {
      const doc = parseDsv("a,b,c\n1\n");
      expect(doc.headers).toEqual(["a", "b", "c"]);
      expect(doc.records[0].fields).toHaveLength(1);
    });

    it("handles records with more fields than header", () => {
      const doc = parseDsv("a,b\n1,2,3\n");
      expect(doc.headers).toEqual(["a", "b"]);
      expect(doc.records[0].fields).toHaveLength(3);
    });

    it("handles mixed field counts", () => {
      const doc = parseDsv("a,b\n1\n1,2,3\n");
      expect(doc.records[0].fields).toHaveLength(1);
      expect(doc.records[1].fields).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Record index
  // ===========================================================================

  describe("record indexing", () => {
    it("assigns 0-based record indices", () => {
      const doc = parseDsv("h\na\nb\nc\n");
      expect(doc.records.map((r) => r.recordIndex)).toEqual([0, 1, 2]);
    });

    it("indices exclude header row", () => {
      const doc = parseDsv("header\nfirst\nsecond\n");
      expect(doc.records[0].recordIndex).toBe(0);
      expect(doc.records[0].fields[0].value).toBe("first");
    });
  });

  // ===========================================================================
  // Field quoting info
  // ===========================================================================

  describe("field quoting info", () => {
    it("marks unquoted fields", () => {
      const doc = parseDsv("hello", { dialect: { hasHeader: false } });
      expect(doc.records[0].fields[0].quoting).toBe("unquoted");
    });

    it("marks quoted fields", () => {
      const doc = parseDsv('"hello"', { dialect: { hasHeader: false } });
      expect(doc.records[0].fields[0].quoting).toBe("quoted");
    });

    it("preserves raw text", () => {
      const doc = parseDsv('"hello"', { dialect: { hasHeader: false } });
      expect(doc.records[0].fields[0].raw).toBe('"hello"');
    });
  });

  // ===========================================================================
  // maxRecords
  // ===========================================================================

  describe("maxRecords", () => {
    it("limits number of records parsed", () => {
      const doc = parseDsv("h\na\nb\nc\nd\ne\n", { maxRecords: 3 });
      expect(doc.records).toHaveLength(3);
      expect(values(doc)).toEqual([["a"], ["b"], ["c"]]);
    });

    it("returns all records when maxRecords exceeds count", () => {
      const doc = parseDsv("h\na\nb\n", { maxRecords: 100 });
      expect(doc.records).toHaveLength(2);
    });

    it("maxRecords=0 returns no records", () => {
      const doc = parseDsv("h\na\nb\n", { maxRecords: 0 });
      expect(doc.records).toHaveLength(0);
      expect(doc.headers).toEqual(["h"]);
    });
  });

  // ===========================================================================
  // Comment lines
  // ===========================================================================

  describe("comment lines", () => {
    it("skips comment lines", () => {
      const doc = parseDsv("# comment\nname\nAlice\n", {
        dialect: { commentChar: "#" },
      });
      expect(doc.headers).toEqual(["name"]);
      expect(values(doc)).toEqual([["Alice"]]);
    });

    it("skips multiple comment lines", () => {
      const doc = parseDsv("# c1\n# c2\nname\nAlice\n", {
        dialect: { commentChar: "#" },
      });
      expect(doc.headers).toEqual(["name"]);
    });

    it("does not skip comments in middle of data", () => {
      const doc = parseDsv("name\nAlice\n# comment\nBob\n", {
        dialect: { commentChar: "#" },
      });
      // The "# comment" line is at start of a record, so it is a comment
      expect(values(doc)).toEqual([["Alice"], ["Bob"]]);
    });
  });

  // ===========================================================================
  // Line ending edge cases
  // ===========================================================================

  describe("line ending edge cases", () => {
    it("handles input without trailing newline", () => {
      const doc = parseDsv("h\na", {});
      expect(doc.headers).toEqual(["h"]);
      expect(values(doc)).toEqual([["a"]]);
    });

    it("handles CRLF line endings", () => {
      const doc = parseDsv("h\r\na\r\nb\r\n");
      expect(doc.headers).toEqual(["h"]);
      expect(values(doc)).toEqual([["a"], ["b"]]);
    });

    it("handles CR line endings", () => {
      const doc = parseDsv("h\ra\rb\r");
      expect(doc.headers).toEqual(["h"]);
      expect(values(doc)).toEqual([["a"], ["b"]]);
    });

    it("handles mixed line endings", () => {
      const doc = parseDsv("h\na\r\nb\rc\n");
      expect(doc.headers).toEqual(["h"]);
      expect(values(doc)).toEqual([["a"], ["b"], ["c"]]);
    });
  });

  // ===========================================================================
  // BOM
  // ===========================================================================

  describe("BOM handling", () => {
    it("skips BOM at start of input", () => {
      const doc = parseDsv("\uFEFFname\nAlice\n");
      expect(doc.headers).toEqual(["name"]);
    });
  });

  // ===========================================================================
  // Streaming (parseRecords)
  // ===========================================================================

  describe("streaming (parseRecords)", () => {
    /**
     * Exhaust a generator, collecting yielded values and the return value.
     */
    function exhaust<Y, R>(gen: Generator<Y, R>): { items: Y[]; ret: R } {
      const items: Y[] = [];
      for (;;) {
        const r = gen.next();
        if (r.done) {
          return { items, ret: r.value };
        }
        items.push(r.value);
      }
    }

    it("yields records one at a time", () => {
      const { items: records, ret } = exhaust(parseRecords("h\na\nb\nc\n"));
      expect(records).toHaveLength(3);
      expect(records.map((r) => r.fields[0].value)).toEqual(["a", "b", "c"]);
      expect(ret.headers).toEqual(["h"]);
    });

    it("respects maxRecords", () => {
      const { items: records } = exhaust(parseRecords("h\na\nb\nc\n", { maxRecords: 2 }));
      expect(records).toHaveLength(2);
    });

    it("returns headers in generator return value", () => {
      const { ret } = exhaust(parseRecords("name,age\nAlice,30\n"));
      expect(ret.headers).toEqual(["name", "age"]);
    });
  });

  // ===========================================================================
  // RFC 4180 compliance
  // ===========================================================================

  describe("RFC 4180 compliance", () => {
    it("handles RFC 4180 example 1 (simple)", () => {
      const input = "aaa,bbb,ccc\r\nzzz,yyy,xxx\r\n";
      const doc = parseDsv(input, { dialect: { hasHeader: false } });
      expect(values(doc)).toEqual([
        ["aaa", "bbb", "ccc"],
        ["zzz", "yyy", "xxx"],
      ]);
    });

    it("handles RFC 4180 example 2 (with header)", () => {
      const input = "field_name,field_name,field_name\r\naaa,bbb,ccc\r\nzzz,yyy,xxx\r\n";
      const doc = parseDsv(input);
      expect(doc.headers).toEqual(["field_name", "field_name", "field_name"]);
      expect(values(doc)).toEqual([
        ["aaa", "bbb", "ccc"],
        ["zzz", "yyy", "xxx"],
      ]);
    });

    it("handles RFC 4180 example 3 (quoted fields with CRLF)", () => {
      const input = '"aaa","b\r\nbb","ccc"\r\nzzz,yyy,xxx\r\n';
      const doc = parseDsv(input, { dialect: { hasHeader: false } });
      expect(values(doc)).toEqual([
        ["aaa", "b\nbb", "ccc"],
        ["zzz", "yyy", "xxx"],
      ]);
    });

    it("handles RFC 4180 example 4 (escaped quotes)", () => {
      const input = '"aaa","b""bb","ccc"\r\n';
      const doc = parseDsv(input, { dialect: { hasHeader: false } });
      expect(firstRecordValues(doc)).toEqual(["aaa", 'b"bb', "ccc"]);
    });
  });

  // ===========================================================================
  // Span tracking
  // ===========================================================================

  describe("span tracking", () => {
    it("records have span information", () => {
      const doc = parseDsv("a,b\n", { dialect: { hasHeader: false } });
      const record = doc.records[0];
      expect(record.span.start.line).toBe(1);
      expect(record.span.start.offset).toBe(0);
    });

    it("fields have span information", () => {
      const doc = parseDsv("abc,def\n", { dialect: { hasHeader: false } });
      const field = doc.records[0].fields[0];
      expect(field.span.start.offset).toBe(0);
      expect(field.span.end.offset).toBe(3);
    });

    it("quoted field with embedded newline has correct end line", () => {
      // "a\nb" starts on line 1, ends on line 2
      const doc = parseDsv('"a\nb"\n', { dialect: { hasHeader: false } });
      const field = doc.records[0].fields[0];
      expect(field.span.start.line).toBe(1);
      expect(field.span.end.line).toBe(2);
    });

    it("quoted field with multiple embedded newlines has correct end line", () => {
      // "a\nb\nc" starts on line 1, ends on line 3
      const doc = parseDsv('"a\nb\nc"\n', { dialect: { hasHeader: false } });
      const field = doc.records[0].fields[0];
      expect(field.span.start.line).toBe(1);
      expect(field.span.end.line).toBe(3);
    });

    it("quoted field with CRLF has correct end line", () => {
      const doc = parseDsv('"a\r\nb"\n', { dialect: { hasHeader: false } });
      const field = doc.records[0].fields[0];
      expect(field.span.start.line).toBe(1);
      expect(field.span.end.line).toBe(2);
    });
  });
});
