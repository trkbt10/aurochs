/**
 * @file Unit tests for XMATCH function.
 */

import { formulaFunctionHelpers } from "../../functionRegistry";
import { makeEvalArgs, invokeFormulaFunction } from "../testHelpers";
import { xmatchFunction } from "./xmatch";

describe("XMATCH", () => {
  it("supports next smaller match on descending vectors (match_mode=-1)", () => {
    const lookupValue = 15000;
    const lookupArray = [[42000], [35000], [25000], [15901], [13801], [12181], [9201]];
    const args = makeEvalArgs(lookupValue, lookupArray, -1);
    expect(invokeFormulaFunction(xmatchFunction, formulaFunctionHelpers, args)).toBe(5);
  });

  it("supports exact match on text vectors (match_mode=0)", () => {
    const lookupValue = "B";
    const lookupArray = [["A"], ["B"], ["C"]];
    const args = makeEvalArgs(lookupValue, lookupArray);
    expect(invokeFormulaFunction(xmatchFunction, formulaFunctionHelpers, args)).toBe(2);
  });
});

