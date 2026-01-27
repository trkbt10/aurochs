/**
 * @file Unit tests for WORKDAY datetime function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { datePartsToSerial } from "./serialDate";
import { workdayFunction } from "./workday";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("WORKDAY", () => {
  it("adds workdays skipping weekends", () => {
    const start = datePartsToSerial(2024, 1, 1); // 2024-01-01 (Mon)
    const result = evaluate(workdayFunction, start, 5);
    expect(result).toBe(datePartsToSerial(2024, 1, 8)); // next Mon
  });

  it("with days=0 returns the same date if it is a workday", () => {
    const start = datePartsToSerial(2024, 1, 2); // Tue
    const result = evaluate(workdayFunction, start, 0);
    expect(result).toBe(start);
  });

  it("with days=0 returns next workday for weekend start", () => {
    const saturday = datePartsToSerial(2024, 1, 6);
    const result = evaluate(workdayFunction, saturday, 0);
    expect(result).toBe(datePartsToSerial(2024, 1, 8));
  });

  it("skips holidays", () => {
    const start = datePartsToSerial(2024, 1, 1);
    const holiday = datePartsToSerial(2024, 1, 2);
    const result = evaluate(workdayFunction, start, 1, holiday);
    expect(result).toBe(datePartsToSerial(2024, 1, 3));
  });
});

