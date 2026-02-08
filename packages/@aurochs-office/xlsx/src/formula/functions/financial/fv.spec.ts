/**
 * @file Unit tests for FV (future value) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { fvFunction } from "./fv";

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

describe("FV", () => {
  it("computes future value of recurring payments", () => {
    const rate = 0.05 / 12;
    const nper = 60;
    const futureValue = expectNumber(evaluate(fvFunction, rate, nper, -200), "FV result");
    const expected = -(0 * (1 + rate) ** nper + (-200 * ((1 + rate) ** nper - 1)) / rate);
    expect(futureValue).toBeCloseTo(expected, 6);
  });
});
