/**
 * @file Builder tests
 */

import { buildDsv, buildRecord, buildDsvFromObjects, createDsvStreamBuilder } from "./builder";
import { parseDsv } from "./parser";

// =============================================================================
// buildDsv
// =============================================================================

describe("buildDsv", () => {
  it("builds empty document", () => {
    expect(
      buildDsv({ type: "document", headers: undefined, records: [] }),
    ).toBe("");
  });

  it("builds document with headers only", () => {
    expect(
      buildDsv({ type: "document", headers: ["name", "age"], records: [] }),
    ).toBe("name,age\r\n");
  });

  it("builds document with headers and records", () => {
    const doc = parseDsv("name,age\nAlice,30\nBob,25\n");
    const output = buildDsv(doc);
    expect(output).toBe("name,age\r\nAlice,30\r\nBob,25\r\n");
  });

  it("quotes fields containing delimiter", () => {
    const doc = parseDsv('"a,b",c\n', { dialect: { hasHeader: false } });
    const output = buildDsv(doc);
    expect(output).toBe('"a,b",c\r\n');
  });

  it("quotes fields containing newline", () => {
    const doc = parseDsv('"line1\nline2"\n', { dialect: { hasHeader: false } });
    const output = buildDsv(doc);
    expect(output).toBe('"line1\nline2"\r\n');
  });

  it("escapes quotes in fields (double-quote)", () => {
    const doc = parseDsv('"say ""hi"""\n', { dialect: { hasHeader: false } });
    const output = buildDsv(doc);
    expect(output).toBe('"say ""hi"""\r\n');
  });

  it("uses TSV dialect", () => {
    const doc = parseDsv("a\tb\n1\t2\n", { dialect: "tsv" });
    const output = buildDsv(doc, { dialect: "tsv" });
    expect(output).toBe("a\tb\n1\t2\n");
  });

  it("uses quotePolicy: all", () => {
    const doc = parseDsv("a,b\n", { dialect: { hasHeader: false } });
    const output = buildDsv(doc, { dialect: { quotePolicy: "all" } });
    expect(output).toBe('"a","b"\r\n');
  });

  it("uses quotePolicy: non-numeric", () => {
    const doc = parseDsv("hello,42\n", { dialect: { hasHeader: false } });
    const output = buildDsv(doc, { dialect: { quotePolicy: "non-numeric" } });
    expect(output).toBe('"hello",42\r\n');
  });

  it("uses quotePolicy: none", () => {
    const doc = parseDsv('"a,b",c\n', { dialect: { hasHeader: false } });
    const output = buildDsv(doc, { dialect: { quotePolicy: "none" } });
    // quotePolicy: none doesn't quote, even if field contains comma
    expect(output).toBe("a,b,c\r\n");
  });

  it("handles backslash escape strategy in output", () => {
    const doc = parseDsv('"say \\"hi\\""', { dialect: "mysql" });
    const output = buildDsv(doc, { dialect: "mysql" });
    // The value is: say "hi"
    // With backslash escaping: "say \"hi\""
    expect(output).toContain('\\"');
  });

  it("quotes fields with leading/trailing whitespace when trimFields is true", () => {
    // Build a document with a field that has leading/trailing whitespace
    const doc = parseDsv('" hello "\n', {
      dialect: { hasHeader: false, trimFields: true },
    });
    // The parsed value should be " hello " (quoted fields are not trimmed)
    expect(doc.records[0].fields[0].value).toBe(" hello ");

    // When building, the field should be quoted to preserve whitespace
    const output = buildDsv(doc, { dialect: { trimFields: true } });
    expect(output).toBe('" hello "\r\n');
  });

  it("round-trips fields with whitespace under trimFields dialect", () => {
    const trimDialect = { hasHeader: false, trimFields: true };
    const doc = parseDsv('" a ",b\n', { dialect: trimDialect });
    const output = buildDsv(doc, { dialect: trimDialect });
    const doc2 = parseDsv(output, { dialect: trimDialect });
    expect(doc2.records[0].fields[0].value).toBe(" a ");
    expect(doc2.records[0].fields[1].value).toBe("b");
  });
});

// =============================================================================
// buildRecord
// =============================================================================

describe("buildRecord", () => {
  it("builds a single record line", () => {
    const doc = parseDsv("a,b,c\n", { dialect: { hasHeader: false } });
    expect(buildRecord(doc.records[0])).toBe("a,b,c");
  });

  it("does not include trailing newline", () => {
    const doc = parseDsv("hello\n", { dialect: { hasHeader: false } });
    expect(buildRecord(doc.records[0])).toBe("hello");
  });
});

// =============================================================================
// buildDsvFromObjects
// =============================================================================

describe("buildDsvFromObjects", () => {
  it("builds from empty array", () => {
    expect(buildDsvFromObjects([])).toBe("");
  });

  it("builds from objects with inferred headers", () => {
    const output = buildDsvFromObjects([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    expect(output).toBe("name,age\r\nAlice,30\r\nBob,25\r\n");
  });

  it("builds from objects with explicit headers", () => {
    const output = buildDsvFromObjects(
      [
        { name: "Alice", age: 30, extra: "x" },
        { name: "Bob", age: 25, extra: "y" },
      ],
      { headers: ["age", "name"] },
    );
    expect(output).toBe("age,name\r\n30,Alice\r\n25,Bob\r\n");
  });

  it("handles null/undefined values as empty string", () => {
    const output = buildDsvFromObjects([
      { a: "x", b: null, c: undefined },
    ]);
    expect(output).toBe("a,b,c\r\nx,,\r\n");
  });

  it("builds TSV from objects", () => {
    const output = buildDsvFromObjects(
      [{ name: "Alice", age: 30 }],
      { dialect: "tsv" },
    );
    expect(output).toBe("name\tage\nAlice\t30\n");
  });
});

// =============================================================================
// DsvStreamBuilder
// =============================================================================

describe("DsvStreamBuilder", () => {
  it("builds incrementally", () => {
    const builder = createDsvStreamBuilder({
      headers: ["name", "age"],
    });
    builder.writeHeader();
    builder.writeRow(["Alice", "30"]);
    builder.writeRow(["Bob", "25"]);
    expect(builder.toString()).toBe("name,age\r\nAlice,30\r\nBob,25\r\n");
  });

  it("writeObject uses headers for column order", () => {
    const builder = createDsvStreamBuilder({
      headers: ["b", "a"],
    });
    builder.writeHeader();
    builder.writeObject({ a: "1", b: "2" });
    expect(builder.toString()).toBe("b,a\r\n2,1\r\n");
  });

  it("toLines returns lines without terminators", () => {
    const builder = createDsvStreamBuilder({
      headers: ["x"],
    });
    builder.writeHeader();
    builder.writeRow(["1"]);
    expect(builder.toLines()).toEqual(["x", "1"]);
  });

  it("handles TSV dialect", () => {
    const builder = createDsvStreamBuilder({
      headers: ["a", "b"],
      dialect: "tsv",
    });
    builder.writeHeader();
    builder.writeRow(["1", "2"]);
    expect(builder.toString()).toBe("a\tb\n1\t2\n");
  });
});

// =============================================================================
// Round-trip tests
// =============================================================================

describe("round-trip (parse → build → parse)", () => {
  const testCases = [
    { name: "simple CSV", input: "name,age\r\nAlice,30\r\nBob,25\r\n" },
    { name: "quoted fields", input: 'a,"b,c"\r\n"d""e",f\r\n' },
    {
      name: "newlines in fields",
      input: 'a,"line1\nline2"\r\n"line3\nline4",b\r\n',
    },
  ];

  for (const { name, input } of testCases) {
    it(`round-trips ${name}`, () => {
      const doc1 = parseDsv(input, { dialect: { hasHeader: false } });
      const output = buildDsv(doc1);
      const doc2 = parseDsv(output, { dialect: { hasHeader: false } });

      const vals1 = doc1.records.map((r) => r.fields.map((f) => f.value));
      const vals2 = doc2.records.map((r) => r.fields.map((f) => f.value));
      expect(vals2).toEqual(vals1);
    });
  }
});
