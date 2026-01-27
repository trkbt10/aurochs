/**
 * @file Unit tests for SUBTOTAL function.
 */

import { formulaFunctionHelpers } from "../../functionRegistry";
import { makeEvalArgs, invokeFormulaFunction } from "../testHelpers";
import { subtotalFunction } from "./subtotal";

describe("SUBTOTAL", () => {
  it("supports function numbers 101-111 (same aggregation, ignoring hidden rows semantics)", () => {
    const range = [[1], [2], [3], [4]];
    expect(invokeFormulaFunction(subtotalFunction, formulaFunctionHelpers, makeEvalArgs(9, range))).toBe(10);
    expect(invokeFormulaFunction(subtotalFunction, formulaFunctionHelpers, makeEvalArgs(109, range))).toBe(10);
  });
});

