/**
 * @file Slide item hover hook tests
 *
 * Tests for list-level hover state management.
 */

import { describe, it, expect } from "vitest";
import type { SlideItemHoverState } from "./useSlideItemHover";

// =============================================================================
// Pure logic tests (no React needed)
// =============================================================================

/**
 * Pure logic extracted for testing
 */
type HoverAction =
  | { type: "enter"; slideId: string }
  | { type: "leave"; slideId: string }
  | { type: "clear" };

function hoverReducer(
  state: SlideItemHoverState,
  action: HoverAction
): SlideItemHoverState {
  switch (action.type) {
    case "enter":
      return { hoveredSlideId: action.slideId };
    case "leave":
      // Only clear if leaving the currently hovered item
      return state.hoveredSlideId === action.slideId
        ? { hoveredSlideId: null }
        : state;
    case "clear":
      return { hoveredSlideId: null };
  }
}

function createInitialState(): SlideItemHoverState {
  return { hoveredSlideId: null };
}

describe("useSlideItemHover logic", () => {
  describe("Invariant: At most one item hovered", () => {
    it("initial state has no hovered item", () => {
      const state = createInitialState();
      expect(state.hoveredSlideId).toBeNull();
    });

    it("entering an item sets it as hovered", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      expect(state.hoveredSlideId).toBe("slide-1");
    });

    it("entering another item replaces the hovered item", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-2" });
      expect(state.hoveredSlideId).toBe("slide-2");
    });

    it("rapid enter sequence results in last item hovered", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-2" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-3" });
      expect(state.hoveredSlideId).toBe("slide-3");
    });
  });

  describe("Leave behavior", () => {
    it("leaving the hovered item clears hover", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      state = hoverReducer(state, { type: "leave", slideId: "slide-1" });
      expect(state.hoveredSlideId).toBeNull();
    });

    it("leaving a non-hovered item does nothing", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "enter", slideId: "slide-2" });
      state = hoverReducer(state, { type: "leave", slideId: "slide-1" });
      expect(state.hoveredSlideId).toBe("slide-2");
    });

    it("stale leave after enter is ignored", () => {
      let state = createInitialState();
      // User hovers slide-1, then quickly moves to slide-2
      // Enter slide-1, Enter slide-2, Leave slide-1 (stale)
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-2" });
      state = hoverReducer(state, { type: "leave", slideId: "slide-1" });
      // slide-2 should still be hovered
      expect(state.hoveredSlideId).toBe("slide-2");
    });
  });

  describe("Clear behavior", () => {
    it("clear removes hover state", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      state = hoverReducer(state, { type: "clear" });
      expect(state.hoveredSlideId).toBeNull();
    });

    it("clear is idempotent", () => {
      let state = createInitialState();
      state = hoverReducer(state, { type: "clear" });
      state = hoverReducer(state, { type: "clear" });
      expect(state.hoveredSlideId).toBeNull();
    });
  });

  describe("Real-world sequences", () => {
    it("hover -> drag -> release -> hover works correctly", () => {
      let state = createInitialState();

      // User hovers slide-1
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      expect(state.hoveredSlideId).toBe("slide-1");

      // User starts dragging (clear all hovers)
      state = hoverReducer(state, { type: "clear" });
      expect(state.hoveredSlideId).toBeNull();

      // User finishes drag, hovers slide-3
      state = hoverReducer(state, { type: "enter", slideId: "slide-3" });
      expect(state.hoveredSlideId).toBe("slide-3");
    });

    it("rapid mouse movement across multiple slides", () => {
      let state = createInitialState();

      // Mouse moves: 1 -> 2 -> 3 -> 2 -> 1 -> out
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-2" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-3" });
      expect(state.hoveredSlideId).toBe("slide-3");

      state = hoverReducer(state, { type: "enter", slideId: "slide-2" });
      state = hoverReducer(state, { type: "enter", slideId: "slide-1" });
      expect(state.hoveredSlideId).toBe("slide-1");

      state = hoverReducer(state, { type: "leave", slideId: "slide-1" });
      expect(state.hoveredSlideId).toBeNull();
    });
  });
});
