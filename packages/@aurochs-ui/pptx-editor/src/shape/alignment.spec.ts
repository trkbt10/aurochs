/**
 * @file Unit tests for shape/alignment.ts
 */

import { px } from "@aurochs-office/drawing-ml/domain/units";
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

const createBounds = ({
  id,
  x,
  y,
  width,
  height,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}): ShapeBoundsWithId => {
  return {
    id,
    bounds: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
    },
  };
};

// =============================================================================
// alignHorizontal Tests
// =============================================================================

describe("alignHorizontal", () => {
  it("returns empty array for less than 2 shapes", () => {
    const shapes = [createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 })];

    expect(alignHorizontal(shapes, "left")).toEqual([]);
    expect(alignHorizontal(shapes, "center")).toEqual([]);
    expect(alignHorizontal(shapes, "right")).toEqual([]);
    expect(alignHorizontal([], "left")).toEqual([]);
  });

  describe("left alignment", () => {
    it("aligns shapes to leftmost edge", () => {
      const shapes = [
        createBounds({ id: "1", x: 50, y: 0, width: 100, height: 100 }),
        createBounds({ id: "2", x: 100, y: 50, width: 80, height: 80 }),
        createBounds({ id: "3", x: 10, y: 100, width: 60, height: 60 }),
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
        createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), // center: 50
        createBounds({ id: "2", x: 100, y: 50, width: 100, height: 80 }), // center: 150
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
        createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), // right: 100
        createBounds({ id: "2", x: 100, y: 50, width: 80, height: 80 }), // right: 180
        createBounds({ id: "3", x: 50, y: 100, width: 60, height: 60 }), // right: 110
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
    const shapes = [createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 })];

    expect(alignVertical(shapes, "top")).toEqual([]);
    expect(alignVertical(shapes, "middle")).toEqual([]);
    expect(alignVertical(shapes, "bottom")).toEqual([]);
  });

  describe("top alignment", () => {
    it("aligns shapes to topmost edge", () => {
      const shapes = [
        createBounds({ id: "1", x: 0, y: 50, width: 100, height: 100 }),
        createBounds({ id: "2", x: 50, y: 100, width: 80, height: 80 }),
        createBounds({ id: "3", x: 100, y: 10, width: 60, height: 60 }),
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
        createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), // middle: 50
        createBounds({ id: "2", x: 50, y: 100, width: 80, height: 100 }), // middle: 150
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
        createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), // bottom: 100
        createBounds({ id: "2", x: 50, y: 100, width: 80, height: 80 }), // bottom: 180
        createBounds({ id: "3", x: 100, y: 50, width: 60, height: 60 }), // bottom: 110
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
    const shapes = [createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), createBounds({ id: "2", x: 200, y: 0, width: 100, height: 100 })];

    expect(distributeHorizontal(shapes)).toEqual([]);
    expect(distributeHorizontal([shapes[0]])).toEqual([]);
    expect(distributeHorizontal([])).toEqual([]);
  });

  it("distributes shapes evenly", () => {
    // Three shapes: leftmost at 0, rightmost at 200 (width 100, so ends at 300)
    // Total space: 300, total widths: 100+50+100=250
    // Gap space: 50, gaps: 2, gap size: 25
    const shapes = [
      createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), // stays at 0
      createBounds({ id: "2", x: 50, y: 50, width: 50, height: 50 }), // moves to 125
      createBounds({ id: "3", x: 200, y: 100, width: 100, height: 100 }), // stays at 200
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
      createBounds({ id: "1", x: 0, y: 10, width: 100, height: 100 }),
      createBounds({ id: "2", x: 50, y: 20, width: 50, height: 50 }),
      createBounds({ id: "3", x: 200, y: 30, width: 100, height: 100 }),
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
    const shapes = [createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), createBounds({ id: "2", x: 0, y: 200, width: 100, height: 100 })];

    expect(distributeVertical(shapes)).toEqual([]);
  });

  it("distributes shapes evenly", () => {
    const shapes = [
      createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), // stays at 0
      createBounds({ id: "2", x: 50, y: 50, width: 50, height: 50 }), // moves
      createBounds({ id: "3", x: 100, y: 200, width: 100, height: 100 }), // stays at 200
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
      createBounds({ id: "1", x: 10, y: 0, width: 100, height: 100 }),
      createBounds({ id: "2", x: 20, y: 50, width: 50, height: 50 }),
      createBounds({ id: "3", x: 30, y: 200, width: 100, height: 100 }),
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
    const shapes = [createBounds({ id: "1", x: 0, y: 0, width: 100, height: 100 }), createBounds({ id: "2", x: 50, y: 50, width: 80, height: 80 })];

    const updates = nudgeShapes(shapes, 10, 20);

    expect(updates.length).toBe(2);
    expect(updates.find((u) => u.id === "1")?.bounds.x).toBe(10);
    expect(updates.find((u) => u.id === "1")?.bounds.y).toBe(20);
    expect(updates.find((u) => u.id === "2")?.bounds.x).toBe(60);
    expect(updates.find((u) => u.id === "2")?.bounds.y).toBe(70);
  });

  it("handles negative deltas", () => {
    const shapes = [createBounds({ id: "1", x: 100, y: 100, width: 50, height: 50 })];

    const updates = nudgeShapes(shapes, -30, -40);

    expect(updates[0].bounds.x).toBe(70);
    expect(updates[0].bounds.y).toBe(60);
  });

  it("preserves width and height", () => {
    const shapes = [createBounds({ id: "1", x: 0, y: 0, width: 100, height: 80 })];

    const updates = nudgeShapes(shapes, 10, 10);

    expect(updates[0].bounds.width).toBe(100);
    expect(updates[0].bounds.height).toBe(80);
  });
});
