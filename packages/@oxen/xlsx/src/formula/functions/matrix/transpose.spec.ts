/**
 * @file Unit tests for TRANSPOSE matrix function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { transposeFunction } from "./transpose";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("TRANSPOSE", () => {
  it("transposes a rectangular matrix", () => {
    const matrix = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const result = evaluate(transposeFunction, matrix);
    expect(result).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it("returns the scalar value when input is not an array", () => {
    const result = evaluate(transposeFunction, 5);
    expect(result).toBe(5);
  });
});
