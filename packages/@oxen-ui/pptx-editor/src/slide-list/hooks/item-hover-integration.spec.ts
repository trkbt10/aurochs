/**
 * @file Item hover integration tests
 *
 * Tests for realistic multi-item hover scenarios.
 * These tests simulate the actual behavior in a SlideList with multiple items.
 */

import { describe, it, expect } from "vitest";
import {
  createInitialHoverState,
  hoverReducer,
  shouldShowHover,
  type ItemHoverState,
} from "./item-hover-logic";

/**
 * Simulates a single slide item's hover state
 */
type SlideItemState = {
  id: string;
  hoverState: ItemHoverState;
};

/**
 * Simulates the global list state
 */
type ListState = {
  items: SlideItemState[];
  isAnyDragging: boolean;
  draggingIds: string[];
};

function createListState(count: number): ListState {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      id: `slide-${i + 1}`,
      hoverState: createInitialHoverState(),
    })),
    isAnyDragging: false,
    draggingIds: [],
  };
}

function mouseEnterSlide(state: ListState, slideId: string): ListState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === slideId
        ? { ...item, hoverState: hoverReducer(item.hoverState, { type: "mouseEnter" }) }
        : item
    ),
  };
}

function mouseLeaveSlide(state: ListState, slideId: string): ListState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === slideId
        ? { ...item, hoverState: hoverReducer(item.hoverState, { type: "mouseLeave" }) }
        : item
    ),
  };
}

function startDragSlide(state: ListState, slideId: string): ListState {
  // First, dragStart action on the dragged item
  const itemsAfterDragStart = state.items.map((item) =>
    item.id === slideId
      ? { ...item, hoverState: hoverReducer(item.hoverState, { type: "dragStart" }) }
      : item
  );

  // Then, isAnyDragging becomes true, which should clear ALL hovers
  const itemsAfterDragStateChanged = itemsAfterDragStart.map((item) => ({
    ...item,
    hoverState: hoverReducer(item.hoverState, {
      type: "dragStateChanged",
      isDragging: true,
    }),
  }));

  return {
    ...state,
    items: itemsAfterDragStateChanged,
    isAnyDragging: true,
    draggingIds: [slideId],
  };
}

function endDrag(state: ListState): ListState {
  const itemsAfterDragEnd = state.items.map((item) => ({
    ...item,
    hoverState: hoverReducer(item.hoverState, {
      type: "dragStateChanged",
      isDragging: false,
    }),
  }));

  return {
    ...state,
    items: itemsAfterDragEnd,
    isAnyDragging: false,
    draggingIds: [],
  };
}

function isDeleteButtonVisible(state: ListState, slideId: string): boolean {
  const item = state.items.find((i) => i.id === slideId);
  if (!item) {return false;}
  return shouldShowHover(item.hoverState, state.isAnyDragging);
}

describe("multi-item hover integration", () => {
  // ===========================================================================
  // Basic hover behavior
  // ===========================================================================

  describe("basic hover behavior", () => {
    it("hovering slide 1 shows delete button on slide 1 only", () => {
      let state = createListState(3);

      state = mouseEnterSlide(state, "slide-1");

      expect(isDeleteButtonVisible(state, "slide-1")).toBe(true);
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(false);
    });

    it("moving from slide 1 to slide 2 shows button on slide 2 only", () => {
      let state = createListState(3);

      // Hover slide 1
      state = mouseEnterSlide(state, "slide-1");
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(true);

      // Leave slide 1, enter slide 2
      state = mouseLeaveSlide(state, "slide-1");
      state = mouseEnterSlide(state, "slide-2");

      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(true);
    });

    it("moving out of all slides hides all buttons", () => {
      let state = createListState(3);

      state = mouseEnterSlide(state, "slide-2");
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(true);

      state = mouseLeaveSlide(state, "slide-2");

      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(false);
    });
  });

  // ===========================================================================
  // THE CRITICAL BUG SCENARIO: Drag clears all hovers
  // ===========================================================================

  describe("drag clears all hovers (THE BUG FIX)", () => {
    it("hovering slide 1, then dragging slide 2, hides slide 1's delete button", () => {
      let state = createListState(3);

      // Hover slide 1
      state = mouseEnterSlide(state, "slide-1");
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(true);

      // Start dragging slide 2 (different slide!)
      state = startDragSlide(state, "slide-2");

      // Slide 1's delete button should be hidden because ANY drag is active
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(false);
    });

    it("hovering slide 3, then dragging slide 1, hides slide 3's delete button", () => {
      let state = createListState(3);

      // Hover slide 3
      state = mouseEnterSlide(state, "slide-3");
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(true);

      // Start dragging slide 1
      state = startDragSlide(state, "slide-1");

      // All delete buttons should be hidden
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(false);
    });

    it("all slides' hovers are cleared when any drag starts", () => {
      let state = createListState(5);

      // Hover multiple slides (simulating quick mouse movement)
      state = mouseEnterSlide(state, "slide-2");
      state = mouseEnterSlide(state, "slide-4");

      expect(isDeleteButtonVisible(state, "slide-2")).toBe(true);
      expect(isDeleteButtonVisible(state, "slide-4")).toBe(true);

      // Start dragging slide 3
      state = startDragSlide(state, "slide-3");

      // All delete buttons hidden
      for (let i = 1; i <= 5; i++) {
        expect(isDeleteButtonVisible(state, `slide-${i}`)).toBe(false);
      }
    });
  });

  // ===========================================================================
  // Drag end recovery
  // ===========================================================================

  describe("drag end recovery", () => {
    it("hover works again after drag ends", () => {
      let state = createListState(3);

      // Hover slide 1, then drag slide 2
      state = mouseEnterSlide(state, "slide-1");
      state = startDragSlide(state, "slide-2");

      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);

      // End drag
      state = endDrag(state);

      // Hover should NOT automatically restore (user needs to re-enter)
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);

      // But if user hovers again, it works
      state = mouseEnterSlide(state, "slide-1");
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(true);
    });

    it("can hover different slide after drag ends", () => {
      let state = createListState(3);

      // Hover slide 1, drag slide 1, end drag
      state = mouseEnterSlide(state, "slide-1");
      state = startDragSlide(state, "slide-1");
      state = endDrag(state);

      // Hover slide 3
      state = mouseEnterSlide(state, "slide-3");

      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(true);
    });
  });

  // ===========================================================================
  // Dragging the hovered slide
  // ===========================================================================

  describe("dragging the hovered slide", () => {
    it("dragging the currently hovered slide clears its own hover", () => {
      let state = createListState(3);

      // Hover slide 2
      state = mouseEnterSlide(state, "slide-2");
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(true);

      // Start dragging slide 2 (the hovered one)
      state = startDragSlide(state, "slide-2");

      // Hover should be cleared
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(false);
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe("edge cases", () => {
    it("rapid hover changes during drag are all suppressed", () => {
      let state = createListState(3);

      // Start drag first
      state = startDragSlide(state, "slide-1");

      // Try to hover various slides during drag
      state = mouseEnterSlide(state, "slide-2");
      state = mouseLeaveSlide(state, "slide-2");
      state = mouseEnterSlide(state, "slide-3");

      // None should be visible because drag is active
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-2")).toBe(false);
      expect(isDeleteButtonVisible(state, "slide-3")).toBe(false);
    });

    it("handles empty list gracefully", () => {
      const state = createListState(0);
      expect(state.items.length).toBe(0);
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
    });

    it("handles single item list", () => {
      let state = createListState(1);

      state = mouseEnterSlide(state, "slide-1");
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(true);

      state = startDragSlide(state, "slide-1");
      expect(isDeleteButtonVisible(state, "slide-1")).toBe(false);
    });
  });
});
