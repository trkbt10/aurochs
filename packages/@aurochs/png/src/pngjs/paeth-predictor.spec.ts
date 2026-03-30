/**
 * @file Tests for paeth-predictor.ts
 */

import { paethPredictor } from "./paeth-predictor";

describe("paethPredictor", () => {
  it("returns left when pLeft is smallest", () => {
    // paeth = 10+100-100 = 10. |10-10|=0, |10-100|=90, |10-100|=90
    expect(paethPredictor(10, 100, 100)).toBe(10);
  });

  it("returns above when pAbove is smallest", () => {
    // paeth = 100+10-100 = 10. |10-100|=90, |10-10|=0, |10-100|=90
    expect(paethPredictor(100, 10, 100)).toBe(10);
  });

  it("returns upLeft when pUpLeft is smallest", () => {
    // paeth = 50+60-55 = 55. |55-50|=5, |55-60|=5, |55-55|=0
    expect(paethPredictor(50, 60, 55)).toBe(55);
  });

  it("tie between left and above: prefers left", () => {
    // paeth = 5+5-5 = 5. |5-5|=0, |5-5|=0, |5-5|=0
    expect(paethPredictor(5, 5, 5)).toBe(5);
  });

  it("tie left=above but both < upLeft: prefers left", () => {
    // paeth = 10+10-20 = 0. |0-10|=10, |0-10|=10, |0-20|=20
    expect(paethPredictor(10, 10, 20)).toBe(10);
  });

  it("all zeros", () => {
    expect(paethPredictor(0, 0, 0)).toBe(0);
  });

  it("max byte values", () => {
    expect(paethPredictor(255, 255, 255)).toBe(255);
  });

  it("left=0, above=255, upLeft=0 → above closest", () => {
    // paeth = 0+255-0 = 255. |255-0|=255, |255-255|=0, |255-0|=255
    expect(paethPredictor(0, 255, 0)).toBe(255);
  });

  it("left=255, above=0, upLeft=0 → left closest", () => {
    // paeth = 255+0-0 = 255. |255-255|=0, |255-0|=255, |255-0|=255
    expect(paethPredictor(255, 0, 0)).toBe(255);
  });
});
