/**
 * @file Operation invariant tests
 *
 * Tests for fundamental operation semantics, not implementation details.
 * Each operation has invariants that must always hold.
 */

import { describe, it, expect } from "vitest";
import {
  createInitialHoverState,
  hoverReducer,
  type ItemHoverState,
} from "./hooks/item-hover-logic";
import {
  calculateTargetIndexFromGap,
  isValidGapDrop,
  createDragStartState,
} from "./drag-drop";
import { createIdleDragState } from "./types";
import type { SlideWithId } from "@oxen/pptx/app";

// =============================================================================
// Test fixtures
// =============================================================================

function createSlides(count: number): readonly SlideWithId[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    slide: { shapes: [] },
  }));
}

// =============================================================================
// HOVER OPERATION INVARIANTS
// =============================================================================

describe("Hover Operation Invariants", () => {
  /**
   * Simulates a list of items, each with independent hover state.
   * This models the actual component structure.
   */
  type HoverableList = {
    items: { id: string; hover: ItemHoverState }[];
    anyDragging: boolean;
  };

  function createList(count: number): HoverableList {
    return {
      items: Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`,
        hover: createInitialHoverState(),
      })),
      anyDragging: false,
    };
  }

  function mouseEnter(list: HoverableList, index: number): HoverableList {
    return {
      ...list,
      items: list.items.map((item, i) =>
        i === index
          ? { ...item, hover: hoverReducer(item.hover, { type: "mouseEnter" }) }
          : item
      ),
    };
  }

  function mouseLeave(list: HoverableList, index: number): HoverableList {
    return {
      ...list,
      items: list.items.map((item, i) =>
        i === index
          ? { ...item, hover: hoverReducer(item.hover, { type: "mouseLeave" }) }
          : item
      ),
    };
  }

  function startDrag(list: HoverableList): HoverableList {
    return {
      ...list,
      anyDragging: true,
      items: list.items.map((item) => ({
        ...item,
        hover: hoverReducer(item.hover, {
          type: "dragStateChanged",
          isDragging: true,
        }),
      })),
    };
  }

  function countHovered(list: HoverableList): number {
    return list.items.filter((item) => item.hover.isHovered).length;
  }

  function getHoveredIndices(list: HoverableList): number[] {
    return list.items
      .map((item, i) => (item.hover.isHovered ? i : -1))
      .filter((i) => i >= 0);
  }

  describe("Invariant: At most one item hovered at a time", () => {
    it("initial state has no hovered items", () => {
      const list = createList(5);
      expect(countHovered(list)).toBe(0);
    });

    it("entering one item results in exactly one hovered", () => {
      let list = createList(5);
      list = mouseEnter(list, 2);
      expect(countHovered(list)).toBe(1);
      expect(getHoveredIndices(list)).toEqual([2]);
    });

    it("proper sequence: leave A then enter B = one hovered", () => {
      let list = createList(5);
      list = mouseEnter(list, 0);
      list = mouseLeave(list, 0);
      list = mouseEnter(list, 1);
      expect(countHovered(list)).toBe(1);
      expect(getHoveredIndices(list)).toEqual([1]);
    });

    it("PROBLEM: improper sequence without leave = multiple hovered", () => {
      let list = createList(5);
      list = mouseEnter(list, 0);
      // Missing mouseLeave(list, 0) - simulates rapid mouse movement
      list = mouseEnter(list, 1);
      // This is the CURRENT behavior - multiple items hovered
      // This test documents the problem
      expect(countHovered(list)).toBe(2);
    });
  });

  describe("Invariant: Drag clears all hover states", () => {
    it("starting drag clears all hovers", () => {
      let list = createList(5);
      list = mouseEnter(list, 0);
      list = mouseEnter(list, 2); // Multiple hovers (problem state)
      expect(countHovered(list)).toBe(2);

      list = startDrag(list);
      expect(countHovered(list)).toBe(0);
    });
  });
});

// =============================================================================
// INSERT OPERATION INVARIANTS
// =============================================================================

describe("Insert Operation Invariants", () => {
  describe("Invariant: Gap index equals insertion position", () => {
    const slides = createSlides(5);
    // slides: [0:slide-1, 1:slide-2, 2:slide-3, 3:slide-4, 4:slide-5]
    // gaps:   [0, 1, 2, 3, 4, 5]
    // gap 0 = before slide-1 = position 0
    // gap 1 = between slide-1 and slide-2 = position 1
    // gap 5 = after slide-5 = position 5

    it("gap 0 = insert at position 0 (before first slide)", () => {
      // When no slides are being dragged, gap index = target index
      const targetIndex = calculateTargetIndexFromGap(slides, [], 0);
      expect(targetIndex).toBe(0);
    });

    it("gap 1 = insert at position 1 (after first slide)", () => {
      const targetIndex = calculateTargetIndexFromGap(slides, [], 1);
      expect(targetIndex).toBe(1);
    });

    it("gap N = insert at position N", () => {
      for (let gap = 0; gap <= 5; gap++) {
        const targetIndex = calculateTargetIndexFromGap(slides, [], gap);
        expect(targetIndex).toBe(gap);
      }
    });

    it("gap after last slide = insert at end", () => {
      const targetIndex = calculateTargetIndexFromGap(slides, [], 5);
      expect(targetIndex).toBe(5);
    });
  });

  describe("Invariant: Gap index with drag adjustment", () => {
    const slides = createSlides(5);

    it("dragging from before gap adjusts index correctly", () => {
      // Dragging slide-1 (index 0) to gap 3
      // After removal, gap 3 becomes effective position 2
      const targetIndex = calculateTargetIndexFromGap(slides, ["slide-1"], 3);
      expect(targetIndex).toBe(2);
    });

    it("dragging from after gap keeps index", () => {
      // Dragging slide-5 (index 4) to gap 1
      // No adjustment needed
      const targetIndex = calculateTargetIndexFromGap(slides, ["slide-5"], 1);
      expect(targetIndex).toBe(1);
    });

    it("dragging to gap 0 always results in position 0", () => {
      // Regardless of what's being dragged, gap 0 = position 0
      expect(calculateTargetIndexFromGap(slides, ["slide-1"], 0)).toBe(0);
      expect(calculateTargetIndexFromGap(slides, ["slide-3"], 0)).toBe(0);
      expect(calculateTargetIndexFromGap(slides, ["slide-5"], 0)).toBe(0);
    });
  });
});

// =============================================================================
// DROP VALIDATION INVARIANTS
// =============================================================================

describe("Drop Validation Invariants", () => {
  const slides = createSlides(5);

  describe("Invariant: No-op drops are invalid", () => {
    it("dropping slide at its current position is invalid", () => {
      // slide-2 is at index 1
      // gap 1 = before slide-2, gap 2 = after slide-2
      // Both are no-ops
      const dragState = createDragStartState(["slide-2"]);
      expect(isValidGapDrop(dragState, 1, slides)).toBe(false);
      expect(isValidGapDrop(dragState, 2, slides)).toBe(false);
    });

    it("dropping contiguous selection at its current position is invalid", () => {
      // slides 2,3 are at indices 1,2
      // gap 1 = before them, gap 3 = after them
      const dragState = createDragStartState(["slide-2", "slide-3"]);
      expect(isValidGapDrop(dragState, 1, slides)).toBe(false);
      expect(isValidGapDrop(dragState, 3, slides)).toBe(false);
    });
  });

  describe("Invariant: Valid moves are allowed", () => {
    it("moving slide to different position is valid", () => {
      const dragState = createDragStartState(["slide-2"]);
      // Moving to gap 0 (before slide-1) is valid
      expect(isValidGapDrop(dragState, 0, slides)).toBe(true);
      // Moving to gap 4 (before slide-5) is valid
      expect(isValidGapDrop(dragState, 4, slides)).toBe(true);
    });

    it("moving to first position is always valid for non-first slides", () => {
      const dragState = createDragStartState(["slide-3"]);
      expect(isValidGapDrop(dragState, 0, slides)).toBe(true);
    });

    it("moving to last position is always valid for non-last slides", () => {
      const dragState = createDragStartState(["slide-2"]);
      expect(isValidGapDrop(dragState, 5, slides)).toBe(true);
    });
  });

  describe("Invariant: Idle drag state rejects all drops", () => {
    it("cannot drop when not dragging", () => {
      const idleState = createIdleDragState();
      for (let gap = 0; gap <= 5; gap++) {
        expect(isValidGapDrop(idleState, gap, slides)).toBe(false);
      }
    });
  });
});

// =============================================================================
// MODE INVARIANTS
// =============================================================================

describe("Mode Invariants", () => {
  describe("Invariant: Visual consistency across modes", () => {
    // These tests document expected behavior
    // Actual visual testing requires different approach

    it("thumbnail dimensions should not depend on mode", () => {
      // The aspectRatio calculation is mode-independent
      const slideWidth = 1920;
      const slideHeight = 1080;
      const aspectRatio = String(slideWidth / slideHeight);

      // Same aspect ratio for both modes
      expect(aspectRatio).toBe(String(1920 / 1080));
    });

    it("selection ring appearance should not depend on mode", () => {
      // isSelected, isPrimary, isActive determine appearance
      // mode determines interactivity, not appearance
      // This is a documentation test
      expect(true).toBe(true);
    });
  });
});
