import { parseFormula } from "./parser";
import { colIdx, rowIdx } from "../domain/types";

describe("parseFormula", () => {
  it("parses references", () => {
    expect(parseFormula("A1")).toEqual({
      type: "Reference",
      reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
    });

    expect(parseFormula("$B$2")).toEqual({
      type: "Reference",
      reference: { col: colIdx(2), row: rowIdx(2), colAbsolute: true, rowAbsolute: true },
    });
  });

  it("parses sheet-qualified references", () => {
    expect(parseFormula("Sheet1!A1")).toEqual({
      type: "Reference",
      reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      sheetName: "Sheet1",
    });
  });

  it("parses ranges", () => {
    expect(parseFormula("A1:B2")).toEqual({
      type: "Range",
      range: {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      },
    });
  });

  it("parses operator precedence", () => {
    expect(parseFormula("1+2*3")).toEqual({
      type: "Binary",
      operator: "+",
      left: { type: "Literal", value: 1 },
      right: {
        type: "Binary",
        operator: "*",
        left: { type: "Literal", value: 2 },
        right: { type: "Literal", value: 3 },
      },
    });
  });

  it("parses function calls", () => {
    expect(parseFormula("SUM(A1,2)")).toEqual({
      type: "Function",
      name: "SUM",
      args: [
        { type: "Reference", reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false } },
        { type: "Literal", value: 2 },
      ],
    });
  });

  it("parses error literals", () => {
    expect(parseFormula("#REF!")).toEqual({
      type: "Literal",
      value: { type: "error", value: "#REF!" },
    });
  });
});
