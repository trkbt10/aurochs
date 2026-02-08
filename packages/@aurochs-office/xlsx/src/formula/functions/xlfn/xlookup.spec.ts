/**
 * @file Unit tests for XLOOKUP function.
 */

import { formulaFunctionHelpers } from "../../functionRegistry";
import { makeEvalArgs, invokeFormulaFunction } from "../testHelpers";
import { xlookupFunction } from "./xlookup";

describe("XLOOKUP", () => {
  it("returns the first column when return_array is multi-column (no spill)", () => {
    const lookupArray = [[1], [2], [3]];
    const returnArray = [
      ["A", "AA"],
      ["B", "BB"],
      ["C", "CC"],
    ];
    expect(invokeFormulaFunction(xlookupFunction, formulaFunctionHelpers, makeEvalArgs(2, lookupArray, returnArray))).toBe("B");
  });

  it("supports binary search ascending (search_mode=2) with approximate next larger (match_mode=1)", () => {
    const lookupValue = 46523;
    const lookupArray = [[9700], ["xyz"], ["xyz"], [160726], [204100], [510300]];
    const returnArray = [[0.1], [0.22], [0.24], [0.32], [0.35], [0.37]];
    const args = makeEvalArgs(lookupValue, lookupArray, returnArray, 0, 1, 2);
    expect(invokeFormulaFunction(xlookupFunction, formulaFunctionHelpers, args)).toBe(0.22);
  });

  it("supports binary search descending (search_mode=-2) with approximate next larger (match_mode=1)", () => {
    const lookupValue = 46523;
    const lookupArray = [[510300], [204100], [160726], [84200], [39475], [9700]];
    const returnArray = [[0.37], [0.35], [0.32], [0.24], [0.22], [0.1]];
    const args = makeEvalArgs(lookupValue, lookupArray, returnArray, 0, 1, -2);
    expect(invokeFormulaFunction(xlookupFunction, formulaFunctionHelpers, args)).toBe(0.24);
  });
});

