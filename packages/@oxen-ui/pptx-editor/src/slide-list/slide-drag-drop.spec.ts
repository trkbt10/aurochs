/**
 * @file Slide drag-and-drop tests
 *
 * Tests for D&D logic with gap-based targeting:
 * - Indicator appears between slides, not on them
 * - Drop targets are gaps, not slides
 */

import { describe, it, expect } from "vitest";
import type { SlideWithId } from "@oxen/pptx/app";
import { createIdleDragState } from "./types";
import {
  getDraggingIds,
  getVerticalDropPosition,
  getHorizontalDropPosition,
  calculateTargetIndex,
  createDragStartState,
  updateDragOverGap,
  isValidGapDrop,
  calculateTargetIndexFromGap,
  isGapDragTarget,
} from "./drag-drop";

// =============================================================================
// Test fixtures
// =============================================================================

function createTestSlides(count: number): readonly SlideWithId[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    slide: { shapes: [] },
  }));
}

// =============================================================================
// Drag state
// =============================================================================

describe("createIdleDragState", () => {
  it("creates idle drag state", () => {
    const state = createIdleDragState();
    expect(state.isDragging).toBe(false);
    expect(state.draggingIds).toEqual([]);
    expect(state.targetGapIndex).toBeNull();
  });
});

describe("createDragStartState", () => {
  it("creates dragging state with specified IDs", () => {
    const state = createDragStartState(["slide-1", "slide-2"]);

    expect(state.isDragging).toBe(true);
    expect(state.draggingIds).toEqual(["slide-1", "slide-2"]);
    expect(state.targetGapIndex).toBeNull();
  });
});

// =============================================================================
// Drag start
// =============================================================================

describe("getDraggingIds", () => {
  it("drags single slide when not in selection", () => {
    const selectedIds: readonly string[] = ["slide-1"];
    const draggedSlideId = "slide-3"; // not in selection

    const result = getDraggingIds(selectedIds, draggedSlideId);

    expect(result).toEqual(["slide-3"]);
  });

  it("drags all selected slides when dragging from selection", () => {
    const selectedIds: readonly string[] = ["slide-1", "slide-2", "slide-3"];
    const draggedSlideId = "slide-2"; // in selection

    const result = getDraggingIds(selectedIds, draggedSlideId);

    expect(result).toEqual(["slide-1", "slide-2", "slide-3"]);
  });

  it("drags single slide when selection is empty", () => {
    const selectedIds: readonly string[] = [];
    const draggedSlideId = "slide-1";

    const result = getDraggingIds(selectedIds, draggedSlideId);

    expect(result).toEqual(["slide-1"]);
  });
});

// =============================================================================
// Drop position calculation
// =============================================================================

describe("getVerticalDropPosition", () => {
  it("returns 'before' when cursor is in upper half", () => {
    const rectTop = 100;
    const rectHeight = 100;
    const clientY = 140; // 40% from top = upper half

    const result = getVerticalDropPosition(clientY, rectTop, rectHeight);

    expect(result).toBe("before");
  });

  it("returns 'after' when cursor is in lower half", () => {
    const rectTop = 100;
    const rectHeight = 100;
    const clientY = 160; // 60% from top = lower half

    const result = getVerticalDropPosition(clientY, rectTop, rectHeight);

    expect(result).toBe("after");
  });

  it("returns 'before' when cursor is exactly at midpoint", () => {
    const rectTop = 100;
    const rectHeight = 100;
    const clientY = 150; // exactly at mid

    // At exactly mid, should be "before" (< not <=)
    const result = getVerticalDropPosition(clientY, rectTop, rectHeight);

    expect(result).toBe("after"); // 150 is not < 150
  });
});

describe("getHorizontalDropPosition", () => {
  it("returns 'before' when cursor is in left half", () => {
    const rectLeft = 100;
    const rectWidth = 100;
    const clientX = 140; // 40% from left = left half

    const result = getHorizontalDropPosition(clientX, rectLeft, rectWidth);

    expect(result).toBe("before");
  });

  it("returns 'after' when cursor is in right half", () => {
    const rectLeft = 100;
    const rectWidth = 100;
    const clientX = 160; // 60% from left = right half

    const result = getHorizontalDropPosition(clientX, rectLeft, rectWidth);

    expect(result).toBe("after");
  });
});

// =============================================================================
// Target index calculation
// =============================================================================

describe("calculateTargetIndex", () => {
  const slides = createTestSlides(5);
  // slides: [slide-1, slide-2, slide-3, slide-4, slide-5]
  // indices: [0, 1, 2, 3, 4]

  it("calculates target index for 'before' position", () => {
    // Dropping before slide-3 (index 2) -> target index 2
    const result = calculateTargetIndex(slides, ["slide-5"], 2, "before");

    expect(result).toBe(2);
  });

  it("calculates target index for 'after' position", () => {
    // Dropping after slide-3 (index 2) -> target index 3
    const result = calculateTargetIndex(slides, ["slide-5"], 2, "after");

    expect(result).toBe(3);
  });

  it("adjusts index when dragging from before target", () => {
    // Dragging slide-1 (index 0) to after slide-3 (index 2)
    // Raw target: 3, but since slide-1 will be removed, final target: 2
    const result = calculateTargetIndex(slides, ["slide-1"], 2, "after");

    expect(result).toBe(2);
  });

  it("does not adjust index when dragging from after target", () => {
    // Dragging slide-5 (index 4) to before slide-2 (index 1)
    // Raw target: 1, no adjustment needed
    const result = calculateTargetIndex(slides, ["slide-5"], 1, "before");

    expect(result).toBe(1);
  });

  it("adjusts for multiple slides being dragged from before", () => {
    // Dragging slides 1 and 2 (indices 0, 1) to after slide-4 (index 3)
    // Raw target: 4, adjustment: -2, final: 2
    const result = calculateTargetIndex(
      slides,
      ["slide-1", "slide-2"],
      3,
      "after"
    );

    expect(result).toBe(2);
  });

  it("handles mixed selection (some before, some after target)", () => {
    // Dragging slides 2 and 4 to after slide-3
    // slide-2 is at index 1 (before), slide-4 is at index 3 (after target)
    // Raw target: 3, adjustment: -1 (only slide-2 is before), final: 2
    const result = calculateTargetIndex(
      slides,
      ["slide-2", "slide-4"],
      2,
      "after"
    );

    expect(result).toBe(2);
  });
});

// =============================================================================
// Gap-based drop validation
// =============================================================================

describe("isValidGapDrop", () => {
  const slides = createTestSlides(5);

  it("returns false when not dragging", () => {
    const dragState = createIdleDragState();

    expect(isValidGapDrop(dragState, 2, slides)).toBe(false);
  });

  it("returns false when gap is adjacent to dragged slide (no-op)", () => {
    // Dragging slide-2 (index 1)
    const dragState = createDragStartState(["slide-2"]);

    // Gap 1 is before slide-2, gap 2 is after slide-2 -> both are no-ops
    expect(isValidGapDrop(dragState, 1, slides)).toBe(false);
    expect(isValidGapDrop(dragState, 2, slides)).toBe(false);
  });

  it("returns true for valid gap that causes movement", () => {
    // Dragging slide-2 (index 1)
    const dragState = createDragStartState(["slide-2"]);

    // Gap 0 (before slide-1), gap 3+ are valid
    expect(isValidGapDrop(dragState, 0, slides)).toBe(true);
    expect(isValidGapDrop(dragState, 3, slides)).toBe(true);
    expect(isValidGapDrop(dragState, 4, slides)).toBe(true);
  });

  it("handles contiguous multi-select", () => {
    // Dragging slides 2 and 3 (indices 1, 2)
    const dragState = createDragStartState(["slide-2", "slide-3"]);

    // Gap 1 = before first dragged, Gap 3 = after last dragged = no-op
    expect(isValidGapDrop(dragState, 1, slides)).toBe(false);
    expect(isValidGapDrop(dragState, 3, slides)).toBe(false);

    // Gaps 0, 4, 5 are valid (cause actual movement)
    expect(isValidGapDrop(dragState, 0, slides)).toBe(true);
    expect(isValidGapDrop(dragState, 4, slides)).toBe(true);
  });

  it("allows non-contiguous selection drops", () => {
    // Dragging slides 1 and 3 (indices 0, 2) - not contiguous
    const dragState = createDragStartState(["slide-1", "slide-3"]);

    // All gaps should be valid for non-contiguous (will consolidate)
    expect(isValidGapDrop(dragState, 1, slides)).toBe(true);
    expect(isValidGapDrop(dragState, 2, slides)).toBe(true);
  });
});

// =============================================================================
// Gap drag state management
// =============================================================================

describe("updateDragOverGap", () => {
  it("sets target gap index", () => {
    const state = createDragStartState(["slide-1"]);
    const result = updateDragOverGap(state, 3);

    expect(result.targetGapIndex).toBe(3);
  });

  it("updates target gap index", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetGapIndex: 2,
    };
    const result = updateDragOverGap(state, 4);

    expect(result.targetGapIndex).toBe(4);
  });
});

describe("isGapDragTarget", () => {
  it("returns true when gap is the target", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetGapIndex: 3,
    };

    expect(isGapDragTarget(state, 3)).toBe(true);
  });

  it("returns false when gap is not the target", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetGapIndex: 3,
    };

    expect(isGapDragTarget(state, 2)).toBe(false);
  });

  it("returns false when not dragging", () => {
    const state = createIdleDragState();

    expect(isGapDragTarget(state, 2)).toBe(false);
  });
});

describe("calculateTargetIndexFromGap", () => {
  const slides = createTestSlides(5);

  it("returns gap index when dragging from after", () => {
    // Dragging slide-5 (index 4) to gap 1 (before slide-2)
    const result = calculateTargetIndexFromGap(slides, ["slide-5"], 1);

    expect(result).toBe(1);
  });

  it("adjusts for items moving from before gap", () => {
    // Dragging slide-1 (index 0) to gap 3 (after slide-3)
    // Since slide-1 is removed, the effective index is 3-1=2
    const result = calculateTargetIndexFromGap(slides, ["slide-1"], 3);

    expect(result).toBe(2);
  });

  it("adjusts for multiple items from before", () => {
    // Dragging slides 1 and 2 to gap 4 (after slide-4)
    // Two items removed from before, so 4-2=2
    const result = calculateTargetIndexFromGap(slides, ["slide-1", "slide-2"], 4);

    expect(result).toBe(2);
  });
});
