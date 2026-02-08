/**
 * @file Unit tests for IRR (internal rate of return) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { irrFunction } from "./irr";

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

describe("IRR", () => {
  it("solves internal rate of return", () => {
    const cashflows = [-10000, 3000, 4200, 6800];
    const irr = expectNumber(evaluate(irrFunction, cashflows), "IRR result");
    const residual = cashflows.reduce((sum, value, index) => sum + value / (1 + irr) ** index, 0);
    expect(irr).toBeCloseTo(0.16340560068898924, 6);
    expect(residual).toBeCloseTo(0, 4);
  });
});
