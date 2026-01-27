/**
 * @file Cell Parser Tests
 *
 * Tests for parsing cell elements from worksheet XML in XLSX files.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import { parseFormula, parseCellValue, parseCell } from "./cell";
import { createDefaultParseContext, createParseContext } from "./context";
import { createDefaultStyleSheet } from "../domain/style/types";

/**
 * Helper to parse XML string and get the root element.
 */
function parseRoot(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

describe("parseFormula", () => {
  it("should parse a simple formula", () => {
    const xml = `<f>SUM(A1:A10)</f>`;
    const result = parseFormula(parseRoot(xml));
    expect(result.expression).toBe("SUM(A1:A10)");
    expect(result.type).toBe("normal");
    expect(result.ref).toBeUndefined();
    expect(result.sharedIndex).toBeUndefined();
    expect(result.calculateAlways).toBeUndefined();
  });

  it("should parse formula with type attribute", () => {
    const xml = `<f t="array" ref="A1:A5">SUM(B1:B5)</f>`;
    const result = parseFormula(parseRoot(xml));
    expect(result.expression).toBe("SUM(B1:B5)");
    expect(result.type).toBe("array");
    expect(result.ref).toEqual({
      start: { col: 1, row: 1, colAbsolute: false, rowAbsolute: false },
      end: { col: 1, row: 5, colAbsolute: false, rowAbsolute: false },
    });
  });

  it("should parse shared formula with si attribute", () => {
    const xml = `<f t="shared" ref="A1:A10" si="0">A1+1</f>`;
    const result = parseFormula(parseRoot(xml));
    expect(result.type).toBe("shared");
    expect(result.sharedIndex).toBe(0);
    expect(result.ref).toBeDefined();
  });

  it("should parse formula with ca attribute", () => {
    const xml = `<f ca="1">NOW()</f>`;
    const result = parseFormula(parseRoot(xml));
    expect(result.calculateAlways).toBe(true);
  });

  it("should handle empty formula", () => {
    const xml = `<f></f>`;
    const result = parseFormula(parseRoot(xml));
    expect(result.expression).toBe("");
    expect(result.type).toBe("normal");
  });
});

describe("parseCellValue", () => {
  const defaultContext = createDefaultParseContext();

  it("should parse number value (default type)", () => {
    const xml = `<c r="A1"><v>42.5</v></c>`;
    const result = parseCellValue(parseRoot(xml), undefined, defaultContext);
    expect(result).toEqual({ type: "number", value: 42.5 });
  });

  it("should parse number value with explicit type", () => {
    const xml = `<c r="A1"><v>123</v></c>`;
    const result = parseCellValue(parseRoot(xml), "n", defaultContext);
    expect(result).toEqual({ type: "number", value: 123 });
  });

  it("should parse empty cell as empty value", () => {
    const xml = `<c r="A1"></c>`;
    const result = parseCellValue(parseRoot(xml), undefined, defaultContext);
    expect(result).toEqual({ type: "empty" });
  });

  it("should parse empty cell with explicit n type as empty", () => {
    const xml = `<c r="A1"><v></v></c>`;
    const result = parseCellValue(parseRoot(xml), "n", defaultContext);
    expect(result).toEqual({ type: "empty" });
  });

  it("should parse boolean true value", () => {
    const xml = `<c r="A1"><v>1</v></c>`;
    const result = parseCellValue(parseRoot(xml), "b", defaultContext);
    expect(result).toEqual({ type: "boolean", value: true });
  });

  it("should parse boolean false value", () => {
    const xml = `<c r="A1"><v>0</v></c>`;
    const result = parseCellValue(parseRoot(xml), "b", defaultContext);
    expect(result).toEqual({ type: "boolean", value: false });
  });

  it("should parse error value", () => {
    const xml = `<c r="A1"><v>#DIV/0!</v></c>`;
    const result = parseCellValue(parseRoot(xml), "e", defaultContext);
    expect(result).toEqual({ type: "error", value: "#DIV/0!" });
  });

  it("should parse various error values", () => {
    const errors = [
      "#NULL!",
      "#DIV/0!",
      "#VALUE!",
      "#REF!",
      "#NAME?",
      "#NUM!",
      "#N/A",
      "#GETTING_DATA",
    ];
    for (const error of errors) {
      const xml = `<c r="A1"><v>${error}</v></c>`;
      const result = parseCellValue(parseRoot(xml), "e", defaultContext);
      expect(result).toEqual({ type: "error", value: error });
    }
  });

  it("should parse formula string result", () => {
    const xml = `<c r="A1"><v>Hello World</v></c>`;
    const result = parseCellValue(parseRoot(xml), "str", defaultContext);
    expect(result).toEqual({ type: "string", value: "Hello World" });
  });

  it("should parse shared string reference", () => {
    const context = createParseContext(
      ["First", "Second", "Third"],
      createDefaultStyleSheet(),
      { sheets: [], dateSystem: "1900" },
      new Map(),
    );
    const xml = `<c r="A1"><v>1</v></c>`;
    const result = parseCellValue(parseRoot(xml), "s", context);
    expect(result).toEqual({ type: "string", value: "Second" });
  });

  it("should handle missing shared string gracefully", () => {
    const context = createParseContext(
      ["Only one"],
      createDefaultStyleSheet(),
      { sheets: [], dateSystem: "1900" },
      new Map(),
    );
    const xml = `<c r="A1"><v>99</v></c>`;
    const result = parseCellValue(parseRoot(xml), "s", context);
    expect(result).toEqual({ type: "string", value: "" });
  });

  it("should parse inline string", () => {
    const xml = `<c r="A1"><is><t>Inline Text</t></is></c>`;
    const result = parseCellValue(parseRoot(xml), "inlineStr", defaultContext);
    expect(result).toEqual({ type: "string", value: "Inline Text" });
  });

  it("should handle empty inline string", () => {
    const xml = `<c r="A1"><is><t></t></is></c>`;
    const result = parseCellValue(parseRoot(xml), "inlineStr", defaultContext);
    expect(result).toEqual({ type: "string", value: "" });
  });

  it("should handle missing inline string element", () => {
    const xml = `<c r="A1"></c>`;
    const result = parseCellValue(parseRoot(xml), "inlineStr", defaultContext);
    expect(result).toEqual({ type: "string", value: "" });
  });

  it("should parse date value", () => {
    const xml = `<c r="A1"><v>2024-01-15T10:30:00Z</v></c>`;
    const result = parseCellValue(parseRoot(xml), "d", defaultContext);
    expect(result.type).toBe("date");
    if (result.type === "date") {
      expect(result.value.toISOString()).toBe("2024-01-15T10:30:00.000Z");
    }
  });

  it("should handle unknown type as string", () => {
    const xml = `<c r="A1"><v>some value</v></c>`;
    const result = parseCellValue(parseRoot(xml), "unknown", defaultContext);
    expect(result).toEqual({ type: "string", value: "some value" });
  });
});

describe("parseCell", () => {
  const defaultContext = createDefaultParseContext();

  it("should parse a simple number cell", () => {
    const xml = `<c r="A1"><v>42</v></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.address).toEqual({
      col: 1,
      row: 1,
      colAbsolute: false,
      rowAbsolute: false,
    });
    expect(result.value).toEqual({ type: "number", value: 42 });
    expect(result.formula).toBeUndefined();
    expect(result.styleId).toBeUndefined();
  });

  it("should parse cell with style index", () => {
    const xml = `<c r="B2" s="5"><v>100</v></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.address.col).toBe(2);
    expect(result.address.row).toBe(2);
    expect(result.styleId).toBe(5);
  });

  it("should parse cell with formula", () => {
    const xml = `<c r="C3"><f>A1+B1</f><v>10</v></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.formula).toMatchObject({ type: "normal", expression: "A1+B1" });
    expect(result.value).toEqual({ type: "number", value: 10 });
  });

  it("should parse cell with shared string type", () => {
    const context = createParseContext(
      ["Hello", "World"],
      createDefaultStyleSheet(),
      { sheets: [], dateSystem: "1900" },
      new Map(),
    );
    const xml = `<c r="D4" t="s"><v>0</v></c>`;
    const result = parseCell(parseRoot(xml), context);
    expect(result.value).toEqual({ type: "string", value: "Hello" });
  });

  it("should parse cell with boolean type", () => {
    const xml = `<c r="E5" t="b"><v>1</v></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.value).toEqual({ type: "boolean", value: true });
  });

  it("should parse cell with error type", () => {
    const xml = `<c r="F6" t="e"><v>#REF!</v></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.value).toEqual({ type: "error", value: "#REF!" });
  });

  it("should parse cell at column AA", () => {
    const xml = `<c r="AA1"><v>1</v></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.address.col).toBe(27);
    expect(result.address.row).toBe(1);
  });

  it("should throw error if r attribute is missing", () => {
    const xml = `<c><v>42</v></c>`;
    expect(() => parseCell(parseRoot(xml), defaultContext)).toThrow(
      "Cell element missing 'r' attribute",
    );
  });

  it("should parse cell with all attributes", () => {
    const context = createParseContext(
      ["Test Value"],
      createDefaultStyleSheet(),
      { sheets: [], dateSystem: "1900" },
      new Map(),
    );
    const xml = `<c r="Z100" t="s" s="10"><f>A1</f><v>0</v></c>`;
    const result = parseCell(parseRoot(xml), context);
    expect(result.address.col).toBe(26);
    expect(result.address.row).toBe(100);
    expect(result.value).toEqual({ type: "string", value: "Test Value" });
    expect(result.formula).toMatchObject({ type: "normal", expression: "A1" });
    expect(result.styleId).toBe(10);
  });

  it("should parse empty cell", () => {
    const xml = `<c r="A1"></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.value).toEqual({ type: "empty" });
  });

  it("should parse cell with inline string", () => {
    const xml = `<c r="A1" t="inlineStr"><is><t>Inline Content</t></is></c>`;
    const result = parseCell(parseRoot(xml), defaultContext);
    expect(result.value).toEqual({ type: "string", value: "Inline Content" });
  });
});
