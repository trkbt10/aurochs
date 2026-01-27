/**
 * @file Cell Serializer Tests
 *
 * Tests for serializing cell elements to XML.
 */

import { serializeElement } from "@oxen/xml";
import type { Cell, CellValue } from "../domain/cell/types";
import type { Formula, DataTableFormula } from "../domain/cell/formula";
import type { CellAddress } from "../domain/cell/address";
import { colIdx, rowIdx, styleId } from "../domain/types";
import {
  serializeCell,
  serializeCellValue,
  serializeFormula,
  type SharedStringTable,
} from "./cell";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a simple cell address (relative, no absolute references)
 */
function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

/**
 * Mock SharedStringTable for testing
 */
function createMockSharedStrings(): SharedStringTable {
  const strings: string[] = [];
  const indexMap = new Map<string, number>();

  return {
    getIndex(value: string): number | undefined {
      return indexMap.get(value);
    },
    addString(value: string): number {
      const existing = indexMap.get(value);
      if (existing !== undefined) {
        return existing;
      }
      const index = strings.length;
      strings.push(value);
      indexMap.set(value, index);
      return index;
    },
  };
}

// =============================================================================
// serializeFormula Tests
// =============================================================================

describe("serializeFormula", () => {
  it("should serialize normal formula", () => {
    const formula: Formula = {
      expression: "SUM(A1:A10)",
      type: "normal",
    };
    const element = serializeFormula(formula);
    const xml = serializeElement(element);
    expect(xml).toBe("<f>SUM(A1:A10)</f>");
  });

  it("should serialize normal formula without t attribute", () => {
    const formula: Formula = {
      expression: "A1+B1",
      type: "normal",
    };
    const element = serializeFormula(formula);
    expect(element.attrs.t).toBeUndefined();
  });

  it("should serialize shared formula with si attribute", () => {
    const formula: Formula = {
      expression: "A2*2",
      type: "shared",
      ref: { start: addr(2, 2), end: addr(2, 10) },
      sharedIndex: 0,
    };
    const element = serializeFormula(formula);
    const xml = serializeElement(element);
    expect(xml).toBe('<f t="shared" ref="B2:B10" si="0">A2*2</f>');
  });

  it("should serialize array formula with ref attribute", () => {
    const formula: Formula = {
      expression: "{SUM(B1:B10)}",
      type: "array",
      ref: { start: addr(1, 1), end: addr(1, 10) },
    };
    const element = serializeFormula(formula);
    const xml = serializeElement(element);
    expect(xml).toBe('<f t="array" ref="A1:A10">{SUM(B1:B10)}</f>');
  });

  it("should serialize formula with calculate always flag", () => {
    const formula: Formula = {
      expression: "NOW()",
      type: "normal",
      calculateAlways: true,
    };
    const element = serializeFormula(formula);
    const xml = serializeElement(element);
    expect(xml).toBe('<f ca="1">NOW()</f>');
  });

  it("should serialize data table formula", () => {
    const formula: DataTableFormula = {
      expression: "",
      type: "dataTable",
      ref: { start: addr(2, 2), end: addr(5, 5) },
      dt2D: true,
      dtr: true,
      r1: "A1",
      r2: "B1",
    };
    const element = serializeFormula(formula);
    const xml = serializeElement(element);
    expect(xml).toContain('t="dataTable"');
    expect(xml).toContain('dt2D="1"');
    expect(xml).toContain('dtr="1"');
    expect(xml).toContain('r1="A1"');
    expect(xml).toContain('r2="B1"');
  });

  it("should serialize empty formula expression", () => {
    const formula: Formula = {
      expression: "",
      type: "shared",
      sharedIndex: 1,
    };
    const element = serializeFormula(formula);
    const xml = serializeElement(element);
    expect(xml).toBe('<f t="shared" si="1"/>');
  });
});

// =============================================================================
// serializeCellValue Tests
// =============================================================================

describe("serializeCellValue", () => {
  it("should serialize number value", () => {
    const value: CellValue = { type: "number", value: 42 };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.t).toBeUndefined(); // Number type is default, omitted
    expect(result.v).toBe("42");
  });

  it("should serialize non-finite number values as #NUM! errors", () => {
    const sharedStrings = createMockSharedStrings();

    const cases: number[] = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const v of cases) {
      const value: CellValue = { type: "number", value: v };
      const result = serializeCellValue(value, sharedStrings);
      expect(result.t).toBe("e");
      expect(result.v).toBe("#NUM!");
    }
  });

  it("should serialize float number value", () => {
    const value: CellValue = { type: "number", value: 3.14159 };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.v).toBe("3.14159");
  });

  it("should serialize negative number value", () => {
    const value: CellValue = { type: "number", value: -123.45 };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.v).toBe("-123.45");
  });

  it("should serialize zero", () => {
    const value: CellValue = { type: "number", value: 0 };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.v).toBe("0");
  });

  it("should serialize string value with shared strings", () => {
    const value: CellValue = { type: "string", value: "Hello" };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.t).toBe("s");
    expect(result.v).toBe("0"); // First string gets index 0
  });

  it("should reuse existing shared string index", () => {
    const sharedStrings = createMockSharedStrings();
    sharedStrings.addString("Hello");
    sharedStrings.addString("World");

    const value: CellValue = { type: "string", value: "Hello" };
    const result = serializeCellValue(value, sharedStrings);
    expect(result.v).toBe("0"); // Existing index
  });

  it("should serialize boolean true", () => {
    const value: CellValue = { type: "boolean", value: true };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.t).toBe("b");
    expect(result.v).toBe("1");
  });

  it("should serialize boolean false", () => {
    const value: CellValue = { type: "boolean", value: false };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.t).toBe("b");
    expect(result.v).toBe("0");
  });

  it("should serialize error values", () => {
    const errorCodes = [
      "#NULL!",
      "#DIV/0!",
      "#VALUE!",
      "#REF!",
      "#NAME?",
      "#NUM!",
      "#N/A",
      "#GETTING_DATA",
    ] as const;

    const sharedStrings = createMockSharedStrings();

    for (const errorCode of errorCodes) {
      const value: CellValue = { type: "error", value: errorCode };
      const result = serializeCellValue(value, sharedStrings);
      expect(result.t).toBe("e");
      expect(result.v).toBe(errorCode);
    }
  });

  it("should serialize date value as serial number", () => {
    // January 1, 2020 should be 43831 in Excel serial date
    const value: CellValue = { type: "date", value: new Date(2020, 0, 1) };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.t).toBeUndefined(); // Date is stored as number
    expect(result.v).toBeDefined();
    // Verify it's approximately correct (accounting for timezone)
    const serialDate = parseFloat(result.v!);
    expect(serialDate).toBeGreaterThan(43830);
    expect(serialDate).toBeLessThan(43832);
  });

  it("should serialize empty value", () => {
    const value: CellValue = { type: "empty" };
    const sharedStrings = createMockSharedStrings();
    const result = serializeCellValue(value, sharedStrings);
    expect(result.t).toBeUndefined();
    expect(result.v).toBeUndefined();
  });
});

// =============================================================================
// serializeCell Tests
// =============================================================================

describe("serializeCell", () => {
  it("should serialize cell with number value", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 42 },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A1"><v>42</v></c>');
  });

  it("should serialize cell with non-finite number value as #NUM! error", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: Number.POSITIVE_INFINITY },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A1" t="e"><v>#NUM!</v></c>');
  });

  it("should serialize cell with string value", () => {
    const cell: Cell = {
      address: addr(2, 1),
      value: { type: "string", value: "Hello" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="B1" t="s"><v>0</v></c>');
  });

  it("should serialize cell with boolean value", () => {
    const cell: Cell = {
      address: addr(3, 1),
      value: { type: "boolean", value: true },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="C1" t="b"><v>1</v></c>');
  });

  it("should serialize cell with error value", () => {
    const cell: Cell = {
      address: addr(4, 1),
      value: { type: "error", value: "#DIV/0!" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="D1" t="e"><v>#DIV/0!</v></c>');
  });

  it("should serialize cell with style", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 100 },
      styleId: styleId(5),
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A1" s="5"><v>100</v></c>');
  });

  it("should omit style attribute when styleId is 0", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 100 },
      styleId: styleId(0),
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A1"><v>100</v></c>');
  });

  it("should serialize cell with formula", () => {
    const cell: Cell = {
      address: addr(6, 1),
      value: { type: "number", value: 55 },
      formula: { type: "normal", expression: "SUM(A1:A10)" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="F1"><f>SUM(A1:A10)</f><v>55</v></c>');
  });

  it("should serialize empty cell", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "empty" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A1"/>');
  });

  it("should serialize cell at A1 position", () => {
    const sharedStrings = createMockSharedStrings();
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 1 },
    };
    const xml = serializeElement(serializeCell(cell, sharedStrings));
    expect(xml).toContain('r="A1"');
  });

  it("should serialize cell at Z1 position", () => {
    const sharedStrings = createMockSharedStrings();
    const cell: Cell = {
      address: addr(26, 1),
      value: { type: "number", value: 1 },
    };
    const xml = serializeElement(serializeCell(cell, sharedStrings));
    expect(xml).toContain('r="Z1"');
  });

  it("should serialize cell at AA1 position", () => {
    const sharedStrings = createMockSharedStrings();
    const cell: Cell = {
      address: addr(27, 1),
      value: { type: "number", value: 1 },
    };
    const xml = serializeElement(serializeCell(cell, sharedStrings));
    expect(xml).toContain('r="AA1"');
  });

  it("should serialize cell at A100 position", () => {
    const sharedStrings = createMockSharedStrings();
    const cell: Cell = {
      address: addr(1, 100),
      value: { type: "number", value: 1 },
    };
    const xml = serializeElement(serializeCell(cell, sharedStrings));
    expect(xml).toContain('r="A100"');
  });

  it("should serialize cell with absolute address", () => {
    const cell: Cell = {
      address: {
        col: colIdx(1),
        row: rowIdx(1),
        colAbsolute: true,
        rowAbsolute: true,
      },
      value: { type: "number", value: 42 },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="$A$1"><v>42</v></c>');
  });
});

// =============================================================================
// Attribute Order Tests
// =============================================================================

describe("Attribute order", () => {
  it("should have r attribute first, then s, then t", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "string", value: "test" },
      styleId: styleId(1),
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);

    // Check attribute order in the object
    const keys = Object.keys(element.attrs);
    expect(keys[0]).toBe("r");
    expect(keys[1]).toBe("s");
    expect(keys[2]).toBe("t");
  });
});

// =============================================================================
// Child Element Order Tests
// =============================================================================

describe("Child element order", () => {
  it("should have formula element before value element", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 55 },
      formula: { type: "normal", expression: "SUM(A1:A10)" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);

    const fPos = xml.indexOf("<f>");
    const vPos = xml.indexOf("<v>");
    expect(fPos).toBeLessThan(vPos);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge cases", () => {
  it("should handle very large numbers", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 1e308 },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("<v>1e+308</v>");
  });

  it("should handle very small numbers", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 1e-10 },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toContain("1e-10");
  });

  it("should handle empty string", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "string", value: "" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A1" t="s"><v>0</v></c>');
  });

  it("should handle string with special characters", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "string", value: "Hello <World> & \"Friends\"" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    // The shared strings table will store the string as-is
    // XML escaping happens at serialization time
    expect(element.attrs.t).toBe("s");
  });

  it("should handle formula with special characters", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 10 },
      formula: { type: "normal", expression: "IF(A1>5,\"Yes\",\"No\")" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    // XML serializer should escape special characters
    expect(xml).toContain("<f>");
    expect(xml).toContain("</f>");
  });
});

// =============================================================================
// Round-trip Tests
// =============================================================================

describe("Round-trip compatibility", () => {
  it("should produce XML compatible with parser for number cell", () => {
    const cell: Cell = {
      address: addr(1, 1),
      value: { type: "number", value: 42 },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    // Verify structure matches expected format
    expect(xml).toBe('<c r="A1"><v>42</v></c>');
  });

  it("should produce XML compatible with parser for string cell", () => {
    const sharedStrings = createMockSharedStrings();
    sharedStrings.addString("Hello");
    sharedStrings.addString("World");

    const cell: Cell = {
      address: addr(2, 3),
      value: { type: "string", value: "World" },
      styleId: styleId(2),
    };
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="B3" s="2" t="s"><v>1</v></c>');
  });

  it("should produce XML compatible with parser for formula cell", () => {
    const cell: Cell = {
      address: addr(1, 10),
      value: { type: "number", value: 45 },
      formula: { type: "normal", expression: "SUM(A1:A9)" },
    };
    const sharedStrings = createMockSharedStrings();
    const element = serializeCell(cell, sharedStrings);
    const xml = serializeElement(element);
    expect(xml).toBe('<c r="A10"><f>SUM(A1:A9)</f><v>45</v></c>');
  });
});
