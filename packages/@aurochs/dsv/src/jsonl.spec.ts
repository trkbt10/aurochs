/**
 * @file JSONL parser/builder tests
 */

import {
  parseJsonl,
  parseJsonlRecords,
  buildJsonl,
  buildJsonlFromDocument,
} from "./jsonl";
import type { JsonlParseError } from "./jsonl";
import type { JsonlRecord } from "./ast";
import { isJsonlRecord } from "./ast";

// =============================================================================
// parseJsonl
// =============================================================================

describe("parseJsonl", () => {
  describe("basic parsing", () => {
    it("parses empty input", () => {
      const { document, errors } = parseJsonl("");
      expect(document.records).toHaveLength(0);
      expect(document.headers).toEqual([]);
      expect(errors).toHaveLength(0);
    });

    it("parses single object", () => {
      const { document } = parseJsonl('{"name":"Alice","age":30}\n');
      expect(document.records).toHaveLength(1);
      expect(document.headers).toEqual(["name", "age"]);
      const rec = document.records[0];
      expect(rec.fields).toHaveLength(2);
      expect(rec.fields[0].key).toBe("name");
      expect(rec.fields[0].value).toBe("Alice");
      expect(rec.fields[0].jsonType).toBe("string");
      expect(rec.fields[1].key).toBe("age");
      expect(rec.fields[1].value).toBe("30");
      expect(rec.fields[1].jsonType).toBe("number");
    });

    it("parses multiple objects", () => {
      const { document } = parseJsonl(
        '{"name":"Alice"}\n{"name":"Bob"}\n',
      );
      expect(document.records).toHaveLength(2);
      expect(document.records[0].fields[0].value).toBe("Alice");
      expect(document.records[1].fields[0].value).toBe("Bob");
    });

    it("derives headers from all records (union of keys)", () => {
      const { document } = parseJsonl(
        '{"a":1}\n{"b":2}\n{"a":3,"c":4}\n',
      );
      expect(document.headers).toEqual(["a", "b", "c"]);
    });
  });

  describe("empty and whitespace lines", () => {
    it("skips empty lines", () => {
      const { document } = parseJsonl('{"a":1}\n\n{"b":2}\n\n');
      expect(document.records).toHaveLength(2);
    });

    it("skips whitespace-only lines", () => {
      const { document } = parseJsonl('{"a":1}\n   \n{"b":2}\n');
      expect(document.records).toHaveLength(2);
    });
  });

  describe("JSON types", () => {
    it("handles string values", () => {
      const { document } = parseJsonl('{"s":"hello"}\n');
      expect(document.records[0].fields[0].jsonType).toBe("string");
      expect(document.records[0].fields[0].jsonValue).toBe("hello");
    });

    it("handles number values", () => {
      const { document } = parseJsonl('{"n":42.5}\n');
      expect(document.records[0].fields[0].jsonType).toBe("number");
      expect(document.records[0].fields[0].jsonValue).toBe(42.5);
    });

    it("handles boolean values", () => {
      const { document } = parseJsonl('{"b":true}\n');
      expect(document.records[0].fields[0].jsonType).toBe("boolean");
      expect(document.records[0].fields[0].jsonValue).toBe(true);
    });

    it("handles null values", () => {
      const { document } = parseJsonl('{"n":null}\n');
      expect(document.records[0].fields[0].jsonType).toBe("null");
      expect(document.records[0].fields[0].value).toBe("");
      expect(document.records[0].fields[0].jsonValue).toBe(null);
    });

    it("handles nested objects", () => {
      const { document } = parseJsonl('{"o":{"a":1}}\n');
      expect(document.records[0].fields[0].jsonType).toBe("object");
      expect(document.records[0].fields[0].value).toBe('{"a":1}');
      expect(document.records[0].fields[0].jsonValue).toEqual({ a: 1 });
    });

    it("handles arrays", () => {
      const { document } = parseJsonl('{"a":[1,2,3]}\n');
      expect(document.records[0].fields[0].jsonType).toBe("array");
      expect(document.records[0].fields[0].value).toBe("[1,2,3]");
      expect(document.records[0].fields[0].jsonValue).toEqual([1, 2, 3]);
    });
  });

  describe("non-object lines", () => {
    it("wraps non-object values in a 'value' field", () => {
      const { document } = parseJsonl('"just a string"\n');
      expect(document.records[0].fields[0].key).toBe("value");
      expect(document.records[0].fields[0].value).toBe("just a string");
    });

    it("wraps null line", () => {
      const { document } = parseJsonl("null\n");
      expect(document.records[0].fields[0].key).toBe("value");
      expect(document.records[0].fields[0].jsonType).toBe("null");
    });

    it("wraps array line", () => {
      const { document } = parseJsonl("[1,2,3]\n");
      expect(document.records[0].fields[0].key).toBe("value");
      expect(document.records[0].fields[0].jsonType).toBe("array");
    });
  });

  describe("error handling", () => {
    it("collects parse errors in lenient mode", () => {
      const { document, errors } = parseJsonl(
        '{"a":1}\nnot json\n{"b":2}\n',
      );
      expect(document.records).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(2);
      expect(errors[0].raw).toBe("not json");
    });

    it("throws in strict mode", () => {
      expect(() =>
        parseJsonl("not json\n", { strict: true }),
      ).toThrow("JSONL parse error at line 1");
    });

    it("handles multiple errors", () => {
      const { errors } = parseJsonl("bad1\nbad2\nbad3\n");
      expect(errors).toHaveLength(3);
    });
  });

  describe("maxRecords", () => {
    it("limits records", () => {
      const { document } = parseJsonl(
        '{"a":1}\n{"a":2}\n{"a":3}\n',
        { maxRecords: 2 },
      );
      expect(document.records).toHaveLength(2);
    });
  });

  describe("BOM and line endings", () => {
    it("handles BOM", () => {
      const { document } = parseJsonl('\uFEFF{"a":1}\n');
      expect(document.records).toHaveLength(1);
    });

    it("handles CRLF", () => {
      const { document } = parseJsonl('{"a":1}\r\n{"b":2}\r\n');
      expect(document.records).toHaveLength(2);
    });

    it("handles CR", () => {
      const { document } = parseJsonl('{"a":1}\r{"b":2}\r');
      expect(document.records).toHaveLength(2);
    });

    it("handles mixed line endings", () => {
      const { document } = parseJsonl('{"a":1}\n{"b":2}\r\n{"c":3}\r');
      expect(document.records).toHaveLength(3);
    });

    it("handles no trailing newline", () => {
      const { document } = parseJsonl('{"a":1}');
      expect(document.records).toHaveLength(1);
    });
  });

  describe("record metadata", () => {
    it("assigns record index", () => {
      const { document } = parseJsonl('{"a":1}\n{"b":2}\n');
      expect(document.records[0].recordIndex).toBe(0);
      expect(document.records[1].recordIndex).toBe(1);
    });

    it("assigns line numbers", () => {
      const { document } = parseJsonl('{"a":1}\n{"b":2}\n');
      expect(document.records[0].line).toBe(1);
      expect(document.records[1].line).toBe(2);
    });

    it("preserves raw line text", () => {
      const { document } = parseJsonl('{"a":1}\n');
      expect(document.records[0].raw).toBe('{"a":1}');
    });
  });
});

// =============================================================================
// parseJsonlRecords (streaming)
// =============================================================================

describe("parseJsonlRecords", () => {
  it("yields records one at a time", () => {
    const records: JsonlRecord[] = [];
    for (const item of parseJsonlRecords('{"a":1}\n{"b":2}\n')) {
      if (isJsonlRecord(item)) {
        records.push(item);
      }
    }
    expect(records).toHaveLength(2);
  });

  it("yields errors for malformed lines", () => {
    const errors: JsonlParseError[] = [];
    for (const item of parseJsonlRecords("bad\n")) {
      if (!isJsonlRecord(item)) {
        errors.push(item as JsonlParseError);
      }
    }
    expect(errors).toHaveLength(1);
  });
});

// =============================================================================
// buildJsonl
// =============================================================================

describe("buildJsonl", () => {
  it("builds from empty array", () => {
    expect(buildJsonl([])).toBe("");
  });

  it("builds from objects", () => {
    const output = buildJsonl([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    expect(output).toBe(
      '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n',
    );
  });

  it("builds with header filtering", () => {
    const output = buildJsonl(
      [{ name: "Alice", age: 30, extra: "x" }],
      { headers: ["name", "age"] },
    );
    expect(output).toBe('{"name":"Alice","age":30}\n');
  });

  it("uses custom line terminator", () => {
    const output = buildJsonl([{ a: 1 }], { lineTerminator: "\r\n" });
    expect(output).toBe('{"a":1}\r\n');
  });
});

// =============================================================================
// buildJsonlFromDocument
// =============================================================================

describe("buildJsonlFromDocument", () => {
  it("round-trips through parse and build", () => {
    const input = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n';
    const { document } = parseJsonl(input);
    const output = buildJsonlFromDocument(document);
    expect(output).toBe(input);
  });
});
