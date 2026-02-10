/**
 * @file Formula reference colors tests
 */

import { REFERENCE_COLORS, getReferenceColor } from "./formula-reference-colors";

describe("formula-edit/formula-reference-colors", () => {
  it("has exactly 8 colors", () => {
    expect(REFERENCE_COLORS).toHaveLength(8);
  });

  it("all colors are valid hex strings", () => {
    for (const color of REFERENCE_COLORS) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("getReferenceColor cycles through the palette", () => {
    expect(getReferenceColor(0)).toBe(REFERENCE_COLORS[0]);
    expect(getReferenceColor(7)).toBe(REFERENCE_COLORS[7]);
    expect(getReferenceColor(8)).toBe(REFERENCE_COLORS[0]); // wraps
    expect(getReferenceColor(15)).toBe(REFERENCE_COLORS[7]); // wraps
  });
});
