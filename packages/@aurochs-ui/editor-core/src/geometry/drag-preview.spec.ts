/**
 * @file Unit tests for geometry/drag-preview.ts
 */

import {
  applyMovePreview,
  applyResizePreview,
  applyRotatePreview,
  applyDragPreview,
  calculateResizedDimensions,
  type DragPreviewBounds,
  type MoveDragPreviewInput,
  type ResizeDragPreviewInput,
  type RotateDragPreviewInput,
} from "./drag-preview";

const baseBounds: DragPreviewBounds = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };

// =============================================================================
// applyMovePreview
// =============================================================================

describe("applyMovePreview", () => {
  it("applies delta to shape in drag", () => {
    const drag: MoveDragPreviewInput = {
      shapeIds: ["a"],
      initialBounds: new Map([["a", { x: 100, y: 100, width: 200, height: 100 }]]),
      previewDelta: { dx: 10, dy: 20 },
    };
    const result = applyMovePreview("a", baseBounds, drag);
    expect(result.x).toBe(110);
    expect(result.y).toBe(120);
    expect(result.width).toBe(200);
  });

  it("returns original bounds for shape not in drag", () => {
    const drag: MoveDragPreviewInput = {
      shapeIds: ["b"],
      initialBounds: new Map(),
      previewDelta: { dx: 10, dy: 20 },
    };
    const result = applyMovePreview("a", baseBounds, drag);
    expect(result).toBe(baseBounds);
  });

  it("returns original bounds when initial bounds not found", () => {
    const drag: MoveDragPreviewInput = {
      shapeIds: ["a"],
      initialBounds: new Map(),
      previewDelta: { dx: 10, dy: 20 },
    };
    const result = applyMovePreview("a", baseBounds, drag);
    expect(result).toBe(baseBounds);
  });
});

// =============================================================================
// applyResizePreview
// =============================================================================

describe("applyResizePreview", () => {
  it("scales shape proportionally from SE handle", () => {
    const drag: ResizeDragPreviewInput = {
      handle: "se",
      shapeIds: ["a"],
      initialBoundsMap: new Map([["a", { x: 100, y: 100, width: 200, height: 100 }]]),
      combinedBounds: { x: 100, y: 100, width: 200, height: 100 },
      aspectLocked: false,
      previewDelta: { dx: 50, dy: 25 },
    };
    const result = applyResizePreview("a", baseBounds, drag);
    expect(result.width).toBe(250);
    expect(result.height).toBe(125);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it("returns original bounds for shape not in drag", () => {
    const drag: ResizeDragPreviewInput = {
      handle: "se",
      shapeIds: ["b"],
      initialBoundsMap: new Map(),
      combinedBounds: { x: 0, y: 0, width: 100, height: 100 },
      aspectLocked: false,
      previewDelta: { dx: 10, dy: 10 },
    };
    const result = applyResizePreview("a", baseBounds, drag);
    expect(result).toBe(baseBounds);
  });
});

// =============================================================================
// applyRotatePreview
// =============================================================================

describe("applyRotatePreview", () => {
  it("applies angle delta", () => {
    const drag: RotateDragPreviewInput = {
      shapeIds: ["a"],
      initialRotationsMap: new Map([["a", 45]]),
      previewAngleDelta: 30,
    };
    const result = applyRotatePreview("a", baseBounds, drag);
    expect(result.rotation).toBe(75);
    expect(result.x).toBe(100);
  });

  it("normalizes rotation above 360", () => {
    const drag: RotateDragPreviewInput = {
      shapeIds: ["a"],
      initialRotationsMap: new Map([["a", 350]]),
      previewAngleDelta: 20,
    };
    const result = applyRotatePreview("a", baseBounds, drag);
    expect(result.rotation).toBe(10);
  });

  it("returns original bounds for shape not in drag", () => {
    const drag: RotateDragPreviewInput = {
      shapeIds: ["b"],
      initialRotationsMap: new Map(),
      previewAngleDelta: 45,
    };
    const result = applyRotatePreview("a", baseBounds, drag);
    expect(result).toBe(baseBounds);
  });
});

// =============================================================================
// applyDragPreview (dispatcher)
// =============================================================================

describe("applyDragPreview", () => {
  it("dispatches to move", () => {
    const drag = {
      type: "move" as const,
      shapeIds: ["a"],
      initialBounds: new Map([["a", { x: 100, y: 100, width: 200, height: 100 }]]),
      previewDelta: { dx: 5, dy: 5 },
    };
    const result = applyDragPreview("a", baseBounds, drag);
    expect(result.x).toBe(105);
  });

  it("dispatches to rotate", () => {
    const drag = {
      type: "rotate" as const,
      shapeIds: ["a"],
      initialRotationsMap: new Map([["a", 0]]),
      previewAngleDelta: 90,
    };
    const result = applyDragPreview("a", baseBounds, drag);
    expect(result.rotation).toBe(90);
  });

  it("returns original for unknown drag type", () => {
    const drag = { type: "idle" as const };
    const result = applyDragPreview("a", baseBounds, drag);
    expect(result).toBe(baseBounds);
  });
});

// =============================================================================
// calculateResizedDimensions
// =============================================================================

describe("calculateResizedDimensions", () => {
  it("resizes from SE handle", () => {
    const result = calculateResizedDimensions({
      handle: "se", baseW: 100, baseH: 100, baseX: 0, baseY: 0, dx: 20, dy: 10, aspectLocked: false,
    });
    expect(result.newWidth).toBe(120);
    expect(result.newHeight).toBe(110);
    expect(result.newX).toBe(0);
    expect(result.newY).toBe(0);
  });

  it("resizes from NW handle (inverted)", () => {
    const result = calculateResizedDimensions({
      handle: "nw", baseW: 100, baseH: 100, baseX: 0, baseY: 0, dx: -20, dy: -10, aspectLocked: false,
    });
    expect(result.newWidth).toBe(120);
    expect(result.newHeight).toBe(110);
    expect(result.newX).toBe(-20);
    expect(result.newY).toBe(-10);
  });

  it("enforces minimum size", () => {
    const result = calculateResizedDimensions({
      handle: "se", baseW: 100, baseH: 100, baseX: 0, baseY: 0, dx: -200, dy: -200, aspectLocked: false,
    });
    expect(result.newWidth).toBe(10);
    expect(result.newHeight).toBe(10);
  });

  it("locks aspect ratio from vertical handle", () => {
    const result = calculateResizedDimensions({
      handle: "s", baseW: 200, baseH: 100, baseX: 0, baseY: 0, dx: 0, dy: 50, aspectLocked: true,
    });
    // isVerticalOnly=true → finalWidth = rawHeight * aspect = 150 * 2 = 300
    // finalHeight = rawWidth / aspect = 200 / 2 = 100 (rawWidth unchanged since no widthDelta for "s")
    expect(result.newWidth).toBe(300);
    expect(result.newHeight).toBe(100);
  });
});
