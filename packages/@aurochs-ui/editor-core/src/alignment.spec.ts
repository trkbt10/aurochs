/**
 * @file Unit tests for alignment.ts
 */

import {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  nudgeShapes,
  calculateAlignment,
  type BoundsWithId,
} from "./alignment";

const shapes: BoundsWithId[] = [
  { id: "a", bounds: { x: 10, y: 10, width: 50, height: 30 } },
  { id: "b", bounds: { x: 100, y: 80, width: 60, height: 40 } },
  { id: "c", bounds: { x: 200, y: 50, width: 40, height: 20 } },
];

describe("alignHorizontal", () => {
  it("returns empty for less than 2 shapes", () => {
    expect(alignHorizontal([shapes[0]], "left")).toEqual([]);
  });

  it("aligns left to minimum x", () => {
    const result = alignHorizontal(shapes, "left");
    expect(result.every((u) => u.bounds.x === 10)).toBe(true);
    expect(result[1].bounds.y).toBe(80); // y unchanged
  });

  it("aligns right to maximum right edge", () => {
    const result = alignHorizontal(shapes, "right");
    const maxRight = 240; // 200 + 40
    expect(result[0].bounds.x).toBe(maxRight - 50);
    expect(result[1].bounds.x).toBe(maxRight - 60);
    expect(result[2].bounds.x).toBe(maxRight - 40);
  });

  it("aligns center to average center x", () => {
    const result = alignHorizontal(shapes, "center");
    // centers: 35, 130, 220 → avg = 128.33...
    const centerA = result[0].bounds.x + result[0].bounds.width / 2;
    const centerB = result[1].bounds.x + result[1].bounds.width / 2;
    expect(centerA).toBeCloseTo(centerB, 5);
  });
});

describe("alignVertical", () => {
  it("aligns top", () => {
    const result = alignVertical(shapes, "top");
    expect(result.every((u) => u.bounds.y === 10)).toBe(true);
  });

  it("aligns bottom", () => {
    const result = alignVertical(shapes, "bottom");
    const maxBottom = 120; // 80 + 40
    expect(result[0].bounds.y).toBe(maxBottom - 30);
    expect(result[1].bounds.y).toBe(maxBottom - 40);
    expect(result[2].bounds.y).toBe(maxBottom - 20);
  });
});

describe("distributeHorizontal", () => {
  it("returns empty for less than 3 shapes", () => {
    expect(distributeHorizontal(shapes.slice(0, 2))).toEqual([]);
  });

  it("distributes evenly", () => {
    const result = distributeHorizontal(shapes);
    expect(result.length).toBe(3);
    // Sorted by x: a(10), b(100), c(200)
    // Total space: 240 - 10 = 230
    // Total width: 50 + 60 + 40 = 150
    // Gap: (230 - 150) / 2 = 40
    expect(result[0].bounds.x).toBe(10);
    expect(result[1].bounds.x).toBeCloseTo(10 + 50 + 40, 5);
    expect(result[2].bounds.x).toBeCloseTo(10 + 50 + 40 + 60 + 40, 5);
  });
});

describe("distributeVertical", () => {
  it("distributes evenly vertically", () => {
    const result = distributeVertical(shapes);
    expect(result.length).toBe(3);
  });
});

describe("nudgeShapes", () => {
  it("offsets all shapes", () => {
    const result = nudgeShapes(shapes, 5, -3);
    expect(result[0].bounds.x).toBe(15);
    expect(result[0].bounds.y).toBe(7);
    expect(result[1].bounds.x).toBe(105);
  });
});

describe("calculateAlignment", () => {
  it("dispatches to correct function", () => {
    expect(calculateAlignment(shapes, "left").length).toBe(3);
    expect(calculateAlignment(shapes, "top").length).toBe(3);
    expect(calculateAlignment(shapes, "distributeH").length).toBe(3);
    expect(calculateAlignment(shapes, "distributeV").length).toBe(3);
  });
});
