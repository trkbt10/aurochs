/**
 * @file Cell display text tests
 */

import { formatCellValueForDisplay, formatFormulaScalarForDisplay } from "./cell-display-text";

describe("xlsx-editor/selectors/cell-display-text", () => {
  it("formats numbers using basic built-in style patterns", () => {
    expect(formatCellValueForDisplay({ type: "number", value: 1.2 }, "0")).toBe("1");
    expect(formatCellValueForDisplay({ type: "number", value: 1.2 }, "0.00")).toBe("1.20");
    expect(formatCellValueForDisplay({ type: "number", value: 1234.56 }, "#,##0.00")).toBe("1,234.56");
    expect(formatCellValueForDisplay({ type: "number", value: 0.1234 }, "0.00%")).toBe("12.34%");
    expect(formatCellValueForDisplay({ type: "number", value: 1200 }, "0.00E+00")).toBe("1.20E+03");
  });

  it("formats date serials using date-like format codes", () => {
    // 1900-01-01
    expect(formatCellValueForDisplay({ type: "number", value: 1 }, "yyyy-mm-dd")).toBe("1900-01-01");
    // 1900-03-01 (because 1900-02-29 is reserved as serial 60)
    expect(formatCellValueForDisplay({ type: "number", value: 61 }, "yyyy-mm-dd")).toBe("1900-03-01");
    // 1900-01-01 03:04 (fractional day)
    const serial = 1 + (3 * 60 + 4) / (24 * 60);
    expect(formatCellValueForDisplay({ type: "number", value: serial }, "m/d/yy h:mm")).toBe("1/1/00 3:04");
  });

  it("formats formula scalar numbers with the cell formatCode", () => {
    expect(formatFormulaScalarForDisplay(1.2, "0.00")).toBe("1.20");
    expect(formatFormulaScalarForDisplay({ type: "error", value: "#NAME?" }, "0")).toBe("#NAME?");
  });
});

