/**
 * @file Drag state tests
 */

import { describe, it, expect } from "vitest";
import { px, deg } from "@oxen/ooxml/domain/units";
import {
  createIdleDragState,
  isDragIdle,
  isDragMove,
  isDragResize,
  isDragRotate,
} from "./drag";
import type { DragState, MoveDragState, ResizeDragState, RotateDragState } from "./drag";

describe("createIdleDragState", () => {
  it("creates idle state", () => {
    const state = createIdleDragState();
    expect(state.type).toBe("idle");
  });
});

describe("isDragIdle", () => {
  it("returns true for idle state", () => {
    const state = createIdleDragState();
    expect(isDragIdle(state)).toBe(true);
  });

  it("returns false for move state", () => {
    const state: MoveDragState = {
      type: "move",
      startX: px(0),
      startY: px(0),
      shapeIds: ["shape1"],
      initialBounds: new Map(),
      previewDelta: { dx: px(0), dy: px(0) },
    };
    expect(isDragIdle(state)).toBe(false);
  });
});

describe("isDragMove", () => {
  it("returns true for move state", () => {
    const state: MoveDragState = {
      type: "move",
      startX: px(0),
      startY: px(0),
      shapeIds: ["shape1"],
      initialBounds: new Map(),
      previewDelta: { dx: px(0), dy: px(0) },
    };
    expect(isDragMove(state)).toBe(true);
  });

  it("returns false for idle state", () => {
    const state = createIdleDragState();
    expect(isDragMove(state)).toBe(false);
  });
});

describe("isDragResize", () => {
  it("returns true for resize state", () => {
    const state: ResizeDragState = {
      type: "resize",
      handle: "se",
      startX: px(0),
      startY: px(0),
      shapeIds: ["shape1"],
      initialBoundsMap: new Map(),
      combinedBounds: { x: px(0), y: px(0), width: px(100), height: px(100) },
      aspectLocked: false,
      shapeId: "shape1",
      initialBounds: { x: px(0), y: px(0), width: px(100), height: px(100) },
      previewDelta: { dx: px(0), dy: px(0) },
    };
    expect(isDragResize(state)).toBe(true);
  });

  it("returns false for move state", () => {
    const state: MoveDragState = {
      type: "move",
      startX: px(0),
      startY: px(0),
      shapeIds: ["shape1"],
      initialBounds: new Map(),
      previewDelta: { dx: px(0), dy: px(0) },
    };
    expect(isDragResize(state)).toBe(false);
  });
});

describe("isDragRotate", () => {
  it("returns true for rotate state", () => {
    const state: RotateDragState = {
      type: "rotate",
      startAngle: deg(0),
      shapeIds: ["shape1"],
      initialRotationsMap: new Map(),
      initialBoundsMap: new Map(),
      centerX: px(50),
      centerY: px(50),
      shapeId: "shape1",
      initialRotation: deg(0),
      previewAngleDelta: deg(0),
    };
    expect(isDragRotate(state)).toBe(true);
  });

  it("returns false for resize state", () => {
    const state: ResizeDragState = {
      type: "resize",
      handle: "se",
      startX: px(0),
      startY: px(0),
      shapeIds: ["shape1"],
      initialBoundsMap: new Map(),
      combinedBounds: { x: px(0), y: px(0), width: px(100), height: px(100) },
      aspectLocked: false,
      shapeId: "shape1",
      initialBounds: { x: px(0), y: px(0), width: px(100), height: px(100) },
      previewDelta: { dx: px(0), dy: px(0) },
    };
    expect(isDragRotate(state)).toBe(false);
  });
});

describe("type guards compose correctly", () => {
  it("exactly one guard returns true for any state", () => {
    const states: DragState[] = [
      createIdleDragState(),
      {
        type: "move",
        startX: px(0),
        startY: px(0),
        shapeIds: ["shape1"],
        initialBounds: new Map(),
        previewDelta: { dx: px(0), dy: px(0) },
      },
      {
        type: "resize",
        handle: "se",
        startX: px(0),
        startY: px(0),
        shapeIds: ["shape1"],
        initialBoundsMap: new Map(),
        combinedBounds: { x: px(0), y: px(0), width: px(100), height: px(100) },
        aspectLocked: false,
        shapeId: "shape1",
        initialBounds: { x: px(0), y: px(0), width: px(100), height: px(100) },
        previewDelta: { dx: px(0), dy: px(0) },
      },
      {
        type: "rotate",
        startAngle: deg(0),
        shapeIds: ["shape1"],
        initialRotationsMap: new Map(),
        initialBoundsMap: new Map(),
        centerX: px(50),
        centerY: px(50),
        shapeId: "shape1",
        initialRotation: deg(0),
        previewAngleDelta: deg(0),
      },
    ];

    for (const state of states) {
      const guards = [isDragIdle, isDragMove, isDragResize, isDragRotate];
      const trueCount = guards.filter((guard) => guard(state)).length;
      expect(trueCount).toBe(1);
    }
  });
});
