/**
 * @file Unit tests for ISEVEN function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { isEvenFunction } from "./iseven";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("ISEVEN", () => {
  it("returns true for even integers", () => {
    expect(evaluate(isEvenFunction, 2)).toBe(true);
    expect(evaluate(isEvenFunction, -2)).toBe(true);
  });

  it("returns false for odd integers", () => {
    expect(evaluate(isEvenFunction, 3)).toBe(false);
    expect(evaluate(isEvenFunction, -1)).toBe(false);
  });

  it("truncates fractional inputs before parity check", () => {
    expect(evaluate(isEvenFunction, 2.9)).toBe(true);
    expect(evaluate(isEvenFunction, 3.1)).toBe(false);
  });
});

