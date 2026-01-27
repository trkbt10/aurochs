/**
 * @file Unit tests for FREQUENCY matrix/statistical function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { frequencyFunction } from "./frequency";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("FREQUENCY", () => {
  it("computes frequency counts for ascending bins", () => {
    const data: EvalResult = [5, 15, 25, null, "ignored"];
    const bins = [10, 20];
    const result = evaluate(frequencyFunction, data, bins);
    expect(result).toEqual([[1], [1], [1]]);
  });

  it("rejects unsorted bins", () => {
    expect(() => evaluate(frequencyFunction, [1, 2, 3], [10, 5])).toThrowError(/ascending/);
  });
});
