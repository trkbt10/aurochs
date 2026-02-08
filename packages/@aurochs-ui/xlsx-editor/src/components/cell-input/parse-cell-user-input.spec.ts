/**
 * @file parse-cell-user-input tests
 */

import { parseCellUserInput } from "./parse-cell-user-input";

describe("parseCellUserInput", () => {
  it("parses empty as CellValue.empty", () => {
    expect(parseCellUserInput("   ")).toEqual({ type: "value", value: { type: "empty" } });
  });

  it("parses TRUE/FALSE as boolean", () => {
    expect(parseCellUserInput("TRUE")).toEqual({ type: "value", value: { type: "boolean", value: true } });
    expect(parseCellUserInput("false")).toEqual({ type: "value", value: { type: "boolean", value: false } });
  });

  it("parses number literals", () => {
    expect(parseCellUserInput("123")).toEqual({ type: "value", value: { type: "number", value: 123 } });
    expect(parseCellUserInput("1e3")).toEqual({ type: "value", value: { type: "number", value: 1000 } });
    expect(parseCellUserInput("-0.5")).toEqual({ type: "value", value: { type: "number", value: -0.5 } });
  });

  it("parses formulas only when expression exists", () => {
    expect(parseCellUserInput("=SUM(A1:A2)")).toEqual({ type: "formula", formula: "SUM(A1:A2)" });
    expect(parseCellUserInput("=")).toEqual({ type: "value", value: { type: "string", value: "=" } });
    expect(parseCellUserInput("=   ")).toEqual({ type: "value", value: { type: "string", value: "=" } });
  });

  it("falls back to string when not number-like", () => {
    expect(parseCellUserInput("123abc")).toEqual({ type: "value", value: { type: "string", value: "123abc" } });
  });
});
