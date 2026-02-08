/**
 * @file Unit tests for MDETERM matrix function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { mdetermFunction } from "./mdeterm";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

const expectNumber = (value: unknown, label: string): number => {
  expect(typeof value).toBe("number");
  if (typeof value !== "number") {
    throw new Error(`${label} must be number`);
  }
  return value;
};

describe("MDETERM", () => {
  it("computes the determinant of a square matrix", () => {
    const matrix = [
      [1, 2, 3],
      [0, 1, 4],
      [5, 6, 0],
    ];
    const result = expectNumber(evaluate(mdetermFunction, matrix), "MDETERM result");
    expect(result).toBeCloseTo(1, 10);
  });
});
