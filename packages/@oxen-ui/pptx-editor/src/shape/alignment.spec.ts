/**
 * @file Unit tests for shape/alignment.ts
 */

import { describe, expect, it } from "vitest";
import { px } from "@oxen/ooxml/domain/units";
import {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  nudgeShapes,
  type ShapeBoundsWithId,
} from "./alignment";

// =============================================================================
// Test Fixtures
// =============================================================================

const createBounds = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): ShapeBoundsWithId => ({
  id,
  bounds: {
    x: px(x),
    y: px(y),
    width: px(width),
    height: px(height),
  },
});

// =============================================================================
// alignHorizontal Tests
// =============================================================================

describe("alignHorizontal", () => {
  it("returns empty array for less than 2 shapes", () => {
    const shapes = [createBounds("1", 0, 0, 100, 100)];

    expect(alignHorizontal(shapes, "left")).toEqual([]);
    expect(alignHorizontal(shapes, "center")).toEqual([]);
    expect(alignHorizontal(shapes, "right")).toEqual([]);
    expect(alignHorizontal([], "left")).toEqual([]);
  });

  describe("left alignment", () => {
    it("aligns shapes to leftmost edge", () => {
      const shapes = [
        createBounds("1", 50, 0, 100, 100),
        createBounds("2", 100, 50, 80, 80),
        createBounds("3", 10, 100, 60, 60),
      ];

      const updates = alignHorizontal(shapes, "left");

      expect(updates.length).toBe(3);
      // All should have x = 10 (leftmost)
      for (const update of updates) {
        expect(update.bounds.x).toBe(10);
      }
      // Y positions should be preserved
      expect(updates.find((u) => u.id === "1")?.bounds.y).toBe(0);
      expect(updates.find((u) => u.id === "2")?.bounds.y).toBe(50);
      expect(updates.find((u) => u.id === "3")?.bounds.y).toBe(100);
    });
  });

  describe("center alignment", () => {
    it("aligns shapes to average center", () => {
      const shapes = [
        createBounds("1", 0, 0, 100, 100), // center: 50
        createBounds("2", 100, 50, 100, 80), // center: 150
      ];
      // Average center: (50 + 150) / 2 = 100

      const updates = alignHorizontal(shapes, "center");

      expect(updates.length).toBe(2);
      // Shape 1: width 100, so x = 100 - 50 = 50
      expect(updates.find((u) => u.id === "1")?.bounds.x).toBe(50);
      // Shape 2: width 100, so x = 100 - 50 = 50
      expect(updates.find((u) => u.id === "2")?.bounds.x).toBe(50);
    });
  });

  describe("right alignment", () => {
    it("aligns shapes to rightmost edge", () => {
      const shapes = [
        createBounds("1", 0, 0, 100, 100), // right: 100
        createBounds("2", 100, 50, 80, 80), // right: 180
        createBounds("3", 50, 100, 60, 60), // right: 110
      ];

      const updates = alignHorizontal(shapes, "right");

      expect(updates.length).toBe(3);
      // All right edges should be at 180
      expect(updates.find((u) => u.id === "1")?.bounds.x).toBe(80); // 180 - 100
      expect(updates.find((u) => u.id === "2")?.bounds.x).toBe(100); // 180 - 80
      expect(updates.find((u) => u.id === "3")?.bounds.x).toBe(120); // 180 - 60
    });
  });
});

// =============================================================================
// alignVertical Tests
// =============================================================================

describe("alignVertical", () => {
  it("returns empty array for less than 2 shapes", () => {
    const shapes = [createBounds("1", 0, 0, 100, 100)];

    expect(alignVertical(shapes, "top")).toEqual([]);
    expect(alignVertical(shapes, "middle")).toEqual([]);
    expect(alignVertical(shapes, "bottom")).toEqual([]);
  });

  describe("top alignment", () => {
    it("aligns shapes to topmost edge", () => {
      const shapes = [
        createBounds("1", 0, 50, 100, 100),
        createBounds("2", 50, 100, 80, 80),
        createBounds("3", 100, 10, 60, 60),
      ];

      const updates = alignVertical(shapes, "top");

      expect(updates.length).toBe(3);
      // All should have y = 10 (topmost)
      for (const update of updates) {
        expect(update.bounds.y).toBe(10);
      }
      // X positions should be preserved
      expect(updates.find((u) => u.id === "1")?.bounds.x).toBe(0);
      expect(updates.find((u) => u.id === "2")?.bounds.x).toBe(50);
      expect(updates.find((u) => u.id === "3")?.bounds.x).toBe(100);
    });
  });

  describe("middle alignment", () => {
    it("aligns shapes to average middle", () => {
      const shapes = [
        createBounds("1", 0, 0, 100, 100), // middle: 50
        createBounds("2", 50, 100, 80, 100), // middle: 150
      ];
      // Average middle: (50 + 150) / 2 = 100

      const updates = alignVertical(shapes, "middle");

      expect(updates.length).toBe(2);
      // Shape 1: height 100, so y = 100 - 50 = 50
      expect(updates.find((u) => u.id === "1")?.bounds.y).toBe(50);
      // Shape 2: height 100, so y = 100 - 50 = 50
      expect(updates.find((u) => u.id === "2")?.bounds.y).toBe(50);
    });
  });

  describe("bottom alignment", () => {
    it("aligns shapes to bottommost edge", () => {
      const shapes = [
        createBounds("1", 0, 0, 100, 100), // bottom: 100
        createBounds("2", 50, 100, 80, 80), // bottom: 180
        createBounds("3", 100, 50, 60, 60), // bottom: 110
      ];

      const updates = alignVertical(shapes, "bottom");

      expect(updates.length).toBe(3);
      // All bottom edges should be at 180
      expect(updates.find((u) => u.id === "1")?.bounds.y).toBe(80); // 180 - 100
      expect(updates.find((u) => u.id === "2")?.bounds.y).toBe(100); // 180 - 80
      expect(updates.find((u) => u.id === "3")?.bounds.y).toBe(120); // 180 - 60
    });
  });
});

// =============================================================================
// distributeHorizontal Tests
// =============================================================================

describe("distributeHorizontal", () => {
  it("returns empty array for less than 3 shapes", () => {
    const shapes = [
      createBounds("1", 0, 0, 100, 100),
      createBounds("2", 200, 0, 100, 100),
    ];

    expect(distributeHorizontal(shapes)).toEqual([]);
    expect(distributeHorizontal([shapes[0]])).toEqual([]);
    expect(distributeHorizontal([])).toEqual([]);
  });

  it("distributes shapes evenly", () => {
    // Three shapes: leftmost at 0, rightmost at 200 (width 100, so ends at 300)
    // Total space: 300, total widths: 100+50+100=250
    // Gap space: 50, gaps: 2, gap size: 25
    const shapes = [
      createBounds("1", 0, 0, 100, 100), // stays at 0
      createBounds("2", 50, 50, 50, 50), // moves to 125
      createBounds("3", 200, 100, 100, 100), // stays at 200
    ];

    const updates = distributeHorizontal(shapes);

    expect(updates.length).toBe(3);
    // First shape stays at x=0
    expect(updates[0].bounds.x).toBe(0);
    // Second shape: 0 + 100 + 25 = 125
    expect(updates[1].bounds.x).toBe(125);
    // Third shape: 125 + 50 + 25 = 200
    expect(updates[2].bounds.x).toBe(200);
  });

  it("preserves Y positions", () => {
    const shapes = [
      createBounds("1", 0, 10, 100, 100),
      createBounds("2", 50, 20, 50, 50),
      createBounds("3", 200, 30, 100, 100),
    ];

    const updates = distributeHorizontal(shapes);

    expect(updates[0].bounds.y).toBe(10);
    expect(updates[1].bounds.y).toBe(20);
    expect(updates[2].bounds.y).toBe(30);
  });
});

// =============================================================================
// distributeVertical Tests
// =============================================================================

describe("distributeVertical", () => {
  it("returns empty array for less than 3 shapes", () => {
    const shapes = [
      createBounds("1", 0, 0, 100, 100),
      createBounds("2", 0, 200, 100, 100),
    ];

    expect(distributeVertical(shapes)).toEqual([]);
  });

  it("distributes shapes evenly", () => {
    const shapes = [
      createBounds("1", 0, 0, 100, 100), // stays at 0
      createBounds("2", 50, 50, 50, 50), // moves
      createBounds("3", 100, 200, 100, 100), // stays at 200
    ];

    const updates = distributeVertical(shapes);

    expect(updates.length).toBe(3);
    // First shape stays at y=0
    expect(updates[0].bounds.y).toBe(0);
    // Third shape stays at y=200 (was at 200)
    expect(updates[2].bounds.y).toBe(200);
  });

  it("preserves X positions", () => {
    const shapes = [
      createBounds("1", 10, 0, 100, 100),
      createBounds("2", 20, 50, 50, 50),
      createBounds("3", 30, 200, 100, 100),
    ];

    const updates = distributeVertical(shapes);

    expect(updates[0].bounds.x).toBe(10);
    expect(updates[1].bounds.x).toBe(20);
    expect(updates[2].bounds.x).toBe(30);
  });
});

// =============================================================================
// nudgeShapes Tests
// =============================================================================

describe("nudgeShapes", () => {
  it("returns empty array for empty input", () => {
    expect(nudgeShapes([], 10, 20)).toEqual([]);
  });

  it("nudges shapes by delta", () => {
    const shapes = [
      createBounds("1", 0, 0, 100, 100),
      createBounds("2", 50, 50, 80, 80),
    ];

    const updates = nudgeShapes(shapes, 10, 20);

    expect(updates.length).toBe(2);
    expect(updates.find((u) => u.id === "1")?.bounds.x).toBe(10);
    expect(updates.find((u) => u.id === "1")?.bounds.y).toBe(20);
    expect(updates.find((u) => u.id === "2")?.bounds.x).toBe(60);
    expect(updates.find((u) => u.id === "2")?.bounds.y).toBe(70);
  });

  it("handles negative deltas", () => {
    const shapes = [createBounds("1", 100, 100, 50, 50)];

    const updates = nudgeShapes(shapes, -30, -40);

    expect(updates[0].bounds.x).toBe(70);
    expect(updates[0].bounds.y).toBe(60);
  });

  it("preserves width and height", () => {
    const shapes = [createBounds("1", 0, 0, 100, 80)];

    const updates = nudgeShapes(shapes, 10, 10);

    expect(updates[0].bounds.width).toBe(100);
    expect(updates[0].bounds.height).toBe(80);
  });
});
