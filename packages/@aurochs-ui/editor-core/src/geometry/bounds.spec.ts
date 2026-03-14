/**
 * @file Unit tests for geometry/bounds.ts
 */

import {
  getCombinedBoundsWithRotation,
  type RotatedBoundsInput,
} from "./bounds";

// =============================================================================
// getCombinedBoundsWithRotation Tests
// =============================================================================

describe("getCombinedBoundsWithRotation", () => {
  it("returns undefined for empty array", () => {
    const result = getCombinedBoundsWithRotation([]);
    expect(result).toBeUndefined();
  });

  it("returns bounds unchanged for single non-rotated shape", () => {
    const boundsList: RotatedBoundsInput[] = [{ x: 10, y: 20, width: 100, height: 50, rotation: 0 }];
    const result = getCombinedBoundsWithRotation(boundsList);

    expect(result).toBeDefined();
    expect(result?.x).toBe(10);
    expect(result?.y).toBe(20);
    expect(result?.width).toBe(100);
    expect(result?.height).toBe(50);
  });

  it("calculates combined bounds for multiple non-rotated shapes", () => {
    const boundsList: RotatedBoundsInput[] = [
      { x: 0, y: 0, width: 50, height: 50, rotation: 0 },
      { x: 100, y: 100, width: 50, height: 50, rotation: 0 },
    ];
    const result = getCombinedBoundsWithRotation(boundsList);

    expect(result).toBeDefined();
    expect(result?.x).toBe(0);
    expect(result?.y).toBe(0);
    expect(result?.width).toBe(150);
    expect(result?.height).toBe(150);
  });

  it("expands bounds for rotated rectangle", () => {
    const boundsList: RotatedBoundsInput[] = [{ x: 0, y: 0, width: 100, height: 100, rotation: 45 }];
    const result = getCombinedBoundsWithRotation(boundsList);

    expect(result).toBeDefined();
    const expectedHalf = 50 * Math.sqrt(2);
    expect(result?.x).toBeCloseTo(50 - expectedHalf, 1);
    expect(result?.y).toBeCloseTo(50 - expectedHalf, 1);
    expect(result?.width).toBeCloseTo(expectedHalf * 2, 1);
    expect(result?.height).toBeCloseTo(expectedHalf * 2, 1);
  });

  it("handles 90 degree rotation correctly", () => {
    const boundsList: RotatedBoundsInput[] = [{ x: 0, y: 0, width: 100, height: 50, rotation: 90 }];
    const result = getCombinedBoundsWithRotation(boundsList);

    expect(result).toBeDefined();
    expect(result?.x).toBeCloseTo(25, 1);
    expect(result?.y).toBeCloseTo(-25, 1);
    expect(result?.width).toBeCloseTo(50, 1);
    expect(result?.height).toBeCloseTo(100, 1);
  });

  it("combines rotated and non-rotated shapes", () => {
    const boundsList: RotatedBoundsInput[] = [
      { x: 0, y: 0, width: 50, height: 50, rotation: 0 },
      { x: 100, y: 0, width: 50, height: 50, rotation: 45 },
    ];
    const result = getCombinedBoundsWithRotation(boundsList);

    expect(result).toBeDefined();
    expect(result?.x).toBe(0);
    expect(result?.y).toBeLessThan(0);
    expect(result?.width).toBeGreaterThan(150);
    expect(result?.height).toBeGreaterThan(50);
  });
});
