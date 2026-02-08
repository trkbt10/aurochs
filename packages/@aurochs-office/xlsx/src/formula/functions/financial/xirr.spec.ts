/**
 * @file Unit tests for XIRR (irregular IRR) financial function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { xirrFunction } from "./xirr";

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

describe("XIRR", () => {
  it("solves XIRR for irregular cash flows", () => {
    const cashflows = [-10000, 2750, 4250, 3250, 2750];
    const dates = ["2008-01-01", "2008-03-01", "2008-10-30", "2009-02-15", "2009-04-01"];
    const xirr = expectNumber(evaluate(xirrFunction, cashflows, dates), "XIRR result");

    const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
    const baseDate = toDate(dates[0]);
    const residual = cashflows.reduce((sum, value, index) => {
      const days = (toDate(dates[index]).getTime() - baseDate.getTime()) / 86_400_000;
      return sum + value / (1 + xirr) ** (days / 365);
    }, 0);
    expect(xirr).toBeCloseTo(0.3733625335188314, 6);
    expect(residual).toBeCloseTo(0, 4);
  });
});
