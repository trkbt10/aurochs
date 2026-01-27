/**
 * @file Unit tests for NPV (net present value) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { npvFunction } from "./npv";

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

describe("NPV", () => {
  it("computes net present value", () => {
    const rate = 0.05 / 12;
    const cashflows = [3000, 4200, 6800];
    const npv = expectNumber(evaluate(npvFunction, rate, cashflows), "NPV result");
    const expected = cashflows.reduce((sum, value, index) => sum + value / (1 + rate) ** (index + 1), 0);
    expect(npv).toBeCloseTo(expected, 6);
  });
});
