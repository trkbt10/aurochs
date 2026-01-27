/**
 * @file Tests for SpreadsheetML number format section IR parser
 */

import { parseNumberFormatSection } from "./number-section";

describe("parseNumberFormatSection", () => {
  it("returns literal for sections without numeric placeholders", () => {
    expect(parseNumberFormatSection("\"10%%\"")).toEqual({ kind: "literal", literal: "10%%" });
    expect(parseNumberFormatSection("N/A")).toEqual({ kind: "literal", literal: "N/A" });
  });

  it("extracts percentCount and patterns", () => {
    const parsed = parseNumberFormatSection("0.0%%");
    if (parsed.kind !== "number") {
      throw new Error("Expected number section");
    }
    expect(parsed.percentCount).toBe(2);
    expect(parsed.integerPattern).toBe("0");
    expect(parsed.fractionPattern).toBe("0%%");
  });

  it("does not count escaped percent signs", () => {
    const parsed = parseNumberFormatSection("0\\%");
    if (parsed.kind !== "number") {
      throw new Error("Expected number section");
    }
    expect(parsed.percentCount).toBe(0);
  });
});

