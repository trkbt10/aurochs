/**
 * @file Unit tests for TEXT function.
 */

import { createLiteralNode, invokeLazyFormulaFunction } from "../testHelpers";
import { textFunction } from "./text";

const evaluate = (value: number, formatText: string) => {
  return invokeLazyFormulaFunction(textFunction, [createLiteralNode(value), createLiteralNode(formatText)]);
};

describe("TEXT", () => {
  it("applies fixed decimals", () => {
    expect(evaluate(12.344, "0.00")).toBe("12.34");
    expect(evaluate(12.3, "0.00")).toBe("12.30");
  });

  it("pads integer digits with zeros", () => {
    expect(evaluate(12.3, "000.00")).toBe("012.30");
  });

  it("supports currency prefixes", () => {
    expect(evaluate(12.3, "£000.00")).toBe("£012.30");
    expect(evaluate(12.34, "$#.#")).toBe("$12.3");
  });

  it("adds default sign for negative values without an explicit negative section", () => {
    expect(evaluate(-12.3, "$###.00")).toBe("-$12.30");
    expect(evaluate(-12.3, "###.##")).toBe("-12.3");
  });

  it("applies thousands grouping", () => {
    expect(evaluate(314159, "#,##0.00")).toBe("314,159.00");
    expect(evaluate(314159, "$000,000,000")).toBe("$000,314,159");
  });
});
