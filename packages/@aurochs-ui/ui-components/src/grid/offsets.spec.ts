/**
 * @file Grid offsets utility tests
 */

import { computePrefixSums, findIndexAtOffset } from "./offsets";

describe("office-editor-components/grid/offsets", () => {
  it("computePrefixSums returns length+1 offsets", () => {
    expect(computePrefixSums([10, 20, 5])).toEqual([0, 10, 30, 35]);
  });

  it("findIndexAtOffset finds the correct bucket index", () => {
    const offsets = computePrefixSums([10, 20, 5]);
    expect(findIndexAtOffset(offsets, -1)).toBe(0);
    expect(findIndexAtOffset(offsets, 0)).toBe(0);
    expect(findIndexAtOffset(offsets, 9)).toBe(0);
    expect(findIndexAtOffset(offsets, 10)).toBe(1);
    expect(findIndexAtOffset(offsets, 29)).toBe(1);
    expect(findIndexAtOffset(offsets, 30)).toBe(2);
    expect(findIndexAtOffset(offsets, 34)).toBe(2);
    expect(findIndexAtOffset(offsets, 35)).toBe(2);
    expect(findIndexAtOffset(offsets, 999)).toBe(2);
  });
});
