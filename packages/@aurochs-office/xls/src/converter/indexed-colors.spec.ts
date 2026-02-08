/**
 * @file XLS indexed color mapping tests
 */

import { buildXlsxIndexedColorsFromXlsPalette } from "./indexed-colors";

describe("buildXlsxIndexedColorsFromXlsPalette", () => {
  it("overrides indexed slots 8.. with palette colors", () => {
    const indexed = buildXlsxIndexedColorsFromXlsPalette(["FF010203", "FFFF0010"]);
    expect(indexed).toHaveLength(64);
    expect(indexed[7]).toBe("FF00FFFF");
    expect(indexed[8]).toBe("FF010203");
    expect(indexed[9]).toBe("FFFF0010");
    expect(indexed[10]).toBe("FFFF0000");
  });

  it("throws on too many palette colors", () => {
    expect(() => buildXlsxIndexedColorsFromXlsPalette(new Array(57).fill("FF000000"))).toThrow(/too many/i);
  });

  it("throws on invalid color strings", () => {
    expect(() => buildXlsxIndexedColorsFromXlsPalette(["not-a-color"])).toThrow(/invalid ARGB/i);
  });
});
