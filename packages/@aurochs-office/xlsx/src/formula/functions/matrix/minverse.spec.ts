/**
 * @file Unit tests for MINVERSE matrix function.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { minverseFunction } from "./minverse";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

const isNumberMatrix = (value: unknown): value is number[][] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "number"));
};

const expectNumberMatrix = (value: unknown, label: string): number[][] => {
  expect(isNumberMatrix(value)).toBe(true);
  if (!isNumberMatrix(value)) {
    throw new Error(`${label} must be numeric matrix`);
  }
  return value;
};

describe("MINVERSE", () => {
  it("computes the inverse of a square matrix", () => {
    const matrix = [
      [4, 7],
      [2, 6],
    ];
    const result = expectNumberMatrix(evaluate(minverseFunction, matrix), "MINVERSE result");
    expect(result[0]?.[0]).toBeCloseTo(0.6, 10);
    expect(result[0]?.[1]).toBeCloseTo(-0.7, 10);
    expect(result[1]?.[0]).toBeCloseTo(-0.2, 10);
    expect(result[1]?.[1]).toBeCloseTo(0.4, 10);
  });

  it("rejects singular matrices", () => {
    expect(() =>
      evaluate(minverseFunction, [
        [1, 2],
        [2, 4],
      ]),
    ).toThrowError(/non-singular/);
  });
});
