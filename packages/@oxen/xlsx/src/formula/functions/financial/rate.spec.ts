/**
 * @file Unit tests for RATE (interest rate) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { pmtFunction } from "./pmt";
import { rateFunction } from "./rate";

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

const computeBalance = (rate: number, periods: number, payment: number, pv: number): number => {
  if (rate === 0) {
    return pv + payment * periods;
  }
  const factor = (1 + rate) ** periods;
  return pv * factor + (payment * (factor - 1)) / rate;
};

describe("RATE", () => {
  it("solves for rate that zeros present value", () => {
    const rate = 0.05 / 12;
    const nper = 60;
    const pv = 10000;
    const payment = expectNumber(evaluate(pmtFunction, rate, nper, pv), "PMT payment");
    const computedRate = expectNumber(evaluate(rateFunction, nper, payment, pv), "RATE result");

    const balance = computeBalance(computedRate, nper, payment, pv);

    expect(computedRate).toBeCloseTo(rate, 6);
    expect(balance).toBeCloseTo(0, 4);
  });
});
