/**
 * @file Unit tests for PMT (payment) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { pmtFunction } from "./pmt";

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

describe("PMT", () => {
  it("computes periodic payment", () => {
    const rate = 0.05 / 12;
    const nper = 60;
    const pv = 10000;
    const payment = expectNumber(evaluate(pmtFunction, rate, nper, pv), "PMT payment");
    expect(payment).toBeCloseTo(-188.7123364401099, 6);
  });
});
