/**
 * @file Branded Type Constructor Tests
 *
 * Tests for domain type constructors that enforce ECMA-376 constraints.
 */

import { sheetId } from "./types";

describe("sheetId", () => {
  it("should accept positive integers", () => {
    expect(sheetId(1)).toBe(1);
    expect(sheetId(42)).toBe(42);
    expect(sheetId(9999)).toBe(9999);
  });

  it("should throw for zero", () => {
    expect(() => sheetId(0)).toThrow(/positive integer/);
  });

  it("should throw for negative values", () => {
    expect(() => sheetId(-1)).toThrow(/positive integer/);
  });

  it("should throw for non-integer values", () => {
    expect(() => sheetId(1.5)).toThrow(/positive integer/);
    expect(() => sheetId(0.1)).toThrow(/positive integer/);
  });

  it("should throw for NaN", () => {
    expect(() => sheetId(NaN)).toThrow(/positive integer/);
  });

  it("should throw for Infinity", () => {
    expect(() => sheetId(Infinity)).toThrow(/positive integer/);
  });
});
