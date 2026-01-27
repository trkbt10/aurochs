/**
 * @file Unit tests for PPMT (principal payment) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { ipmtFunction } from "./ipmt";
import { pmtFunction } from "./pmt";
import { ppmtFunction } from "./ppmt";

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

describe("PPMT", () => {
  it("returns principal component consistent with payment and interest", () => {
    const rate = 0.05 / 12;
    const nper = 60;
    const pv = 10000;
    const payment = expectNumber(evaluate(pmtFunction, rate, nper, pv), "PMT payment");
    const interest = expectNumber(evaluate(ipmtFunction, rate, 1, nper, pv), "IPMT interest");
    const principal = expectNumber(evaluate(ppmtFunction, rate, 1, nper, pv), "PPMT principal");
    expect(principal).toBeCloseTo(payment - interest, 6);
  });
});
