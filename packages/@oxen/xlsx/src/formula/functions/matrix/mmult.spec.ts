/**
 * @file Unit tests for MMULT matrix function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { mmultFunction } from "./mmult";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("MMULT", () => {
  it("computes the matrix product of compatible matrices", () => {
    const left = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const right = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    const result = evaluate(mmultFunction, left, right);
    expect(result).toEqual([
      [58, 64],
      [139, 154],
    ]);
  });

  it("rejects non-conformable matrices", () => {
    expect(() => evaluate(mmultFunction, [[1, 2]], [[3, 4]])).toThrowError(/columns/i);
  });
});
