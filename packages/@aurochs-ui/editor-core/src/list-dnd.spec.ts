/**
 * @file List drag-and-drop tests
 *
 * Tests for D&D logic with gap-based targeting:
 * - Indicator appears between items, not on them
 * - Drop targets are gaps, not items
 *
 * Moved from pptx-editor/slide-list/slide-drag-drop.spec.ts.
 */

import {
  createIdleListDragState,
  getDraggingIds,
  createDragStartState,
  updateDragOverGap,
  isValidGapDrop,
  calculateTargetIndexFromGap,
  isGapDragTarget,
} from "./list-dnd";

// =============================================================================
// Test fixtures
// =============================================================================

type TestItem = { readonly id: string };

function createTestItems(count: number): readonly TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
  }));
}

// =============================================================================
// Drag state
// =============================================================================

describe("createIdleListDragState", () => {
  it("creates idle drag state", () => {
    const state = createIdleListDragState();
    expect(state.isDragging).toBe(false);
    expect(state.draggingIds).toEqual([]);
    expect(state.targetGapIndex).toBeNull();
  });
});

describe("createDragStartState", () => {
  it("creates dragging state with specified IDs", () => {
    const state = createDragStartState(["item-1", "item-2"]);

    expect(state.isDragging).toBe(true);
    expect(state.draggingIds).toEqual(["item-1", "item-2"]);
    expect(state.targetGapIndex).toBeNull();
  });
});

// =============================================================================
// Drag start
// =============================================================================

describe("getDraggingIds", () => {
  it("drags single item when not in selection", () => {
    const selectedIds: readonly string[] = ["item-1"];
    const draggedId = "item-3"; // not in selection

    const result = getDraggingIds(selectedIds, draggedId);

    expect(result).toEqual(["item-3"]);
  });

  it("drags all selected items when dragging from selection", () => {
    const selectedIds: readonly string[] = ["item-1", "item-2", "item-3"];
    const draggedId = "item-2"; // in selection

    const result = getDraggingIds(selectedIds, draggedId);

    expect(result).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("drags single item when selection is empty", () => {
    const selectedIds: readonly string[] = [];
    const draggedId = "item-1";

    const result = getDraggingIds(selectedIds, draggedId);

    expect(result).toEqual(["item-1"]);
  });
});

// =============================================================================
// Gap-based drop validation
// =============================================================================

describe("isValidGapDrop", () => {
  const items = createTestItems(5);

  it("returns false when not dragging", () => {
    const dragState = createIdleListDragState();

    expect(isValidGapDrop(dragState, 2, items)).toBe(false);
  });

  it("returns false when gap is adjacent to dragged item (no-op)", () => {
    // Dragging item-2 (index 1)
    const dragState = createDragStartState(["item-2"]);

    // Gap 1 is before item-2, gap 2 is after item-2 -> both are no-ops
    expect(isValidGapDrop(dragState, 1, items)).toBe(false);
    expect(isValidGapDrop(dragState, 2, items)).toBe(false);
  });

  it("returns true for valid gap that causes movement", () => {
    // Dragging item-2 (index 1)
    const dragState = createDragStartState(["item-2"]);

    // Gap 0 (before item-1), gap 3+ are valid
    expect(isValidGapDrop(dragState, 0, items)).toBe(true);
    expect(isValidGapDrop(dragState, 3, items)).toBe(true);
    expect(isValidGapDrop(dragState, 4, items)).toBe(true);
  });

  it("handles contiguous multi-select", () => {
    // Dragging items 2 and 3 (indices 1, 2)
    const dragState = createDragStartState(["item-2", "item-3"]);

    // Gap 1 = before first dragged, Gap 3 = after last dragged = no-op
    expect(isValidGapDrop(dragState, 1, items)).toBe(false);
    expect(isValidGapDrop(dragState, 3, items)).toBe(false);

    // Gaps 0, 4, 5 are valid (cause actual movement)
    expect(isValidGapDrop(dragState, 0, items)).toBe(true);
    expect(isValidGapDrop(dragState, 4, items)).toBe(true);
  });

  it("allows non-contiguous selection drops", () => {
    // Dragging items 1 and 3 (indices 0, 2) - not contiguous
    const dragState = createDragStartState(["item-1", "item-3"]);

    // All gaps should be valid for non-contiguous (will consolidate)
    expect(isValidGapDrop(dragState, 1, items)).toBe(true);
    expect(isValidGapDrop(dragState, 2, items)).toBe(true);
  });
});

// =============================================================================
// Gap drag state management
// =============================================================================

describe("updateDragOverGap", () => {
  it("sets target gap index", () => {
    const state = createDragStartState(["item-1"]);
    const result = updateDragOverGap(state, 3);

    expect(result.targetGapIndex).toBe(3);
  });

  it("updates target gap index", () => {
    const state = {
      ...createDragStartState(["item-1"]),
      targetGapIndex: 2,
    };
    const result = updateDragOverGap(state, 4);

    expect(result.targetGapIndex).toBe(4);
  });
});

describe("isGapDragTarget", () => {
  it("returns true when gap is the target", () => {
    const state = {
      ...createDragStartState(["item-1"]),
      targetGapIndex: 3,
    };

    expect(isGapDragTarget(state, 3)).toBe(true);
  });

  it("returns false when gap is not the target", () => {
    const state = {
      ...createDragStartState(["item-1"]),
      targetGapIndex: 3,
    };

    expect(isGapDragTarget(state, 2)).toBe(false);
  });

  it("returns false when not dragging", () => {
    const state = createIdleListDragState();

    expect(isGapDragTarget(state, 2)).toBe(false);
  });
});

describe("calculateTargetIndexFromGap", () => {
  const items = createTestItems(5);

  it("returns gap index when dragging from after", () => {
    // Dragging item-5 (index 4) to gap 1 (before item-2)
    const result = calculateTargetIndexFromGap(items, ["item-5"], 1);

    expect(result).toBe(1);
  });

  it("adjusts for items moving from before gap", () => {
    // Dragging item-1 (index 0) to gap 3 (after item-3)
    // Since item-1 is removed, the effective index is 3-1=2
    const result = calculateTargetIndexFromGap(items, ["item-1"], 3);

    expect(result).toBe(2);
  });

  it("adjusts for multiple items from before", () => {
    // Dragging items 1 and 2 to gap 4 (after item-4)
    // Two items removed from before, so 4-2=2
    const result = calculateTargetIndexFromGap(items, ["item-1", "item-2"], 4);

    expect(result).toBe(2);
  });

  it("gap 0 always results in position 0", () => {
    expect(calculateTargetIndexFromGap(items, ["item-1"], 0)).toBe(0);
    expect(calculateTargetIndexFromGap(items, ["item-3"], 0)).toBe(0);
    expect(calculateTargetIndexFromGap(items, ["item-5"], 0)).toBe(0);
  });

  it("gap N with no dragged items returns N", () => {
    for (let gap = 0; gap <= 5; gap++) {
      const targetIndex = calculateTargetIndexFromGap(items, [], gap);
      expect(targetIndex).toBe(gap);
    }
  });
});
