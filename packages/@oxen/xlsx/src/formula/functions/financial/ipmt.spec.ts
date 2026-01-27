/**
 * @file Unit tests for IPMT (interest payment) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { ipmtFunction } from "./ipmt";

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

describe("IPMT", () => {
  it("computes interest payment for the target period", () => {
    const rate = 0.05 / 12;
    const nper = 60;
    const pv = 10000;
    const interest = expectNumber(evaluate(ipmtFunction, rate, 1, nper, pv), "IPMT result");
    expect(interest).toBeCloseTo(-41.666666666666664, 6);
  });
});
