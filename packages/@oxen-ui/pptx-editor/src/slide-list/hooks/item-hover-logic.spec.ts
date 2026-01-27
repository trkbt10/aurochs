/**
 * @file Item hover logic tests
 *
 * Comprehensive tests for hover state logic (pure functions).
 */

import { describe, it, expect } from "vitest";
import {
  createInitialHoverState,
  hoverReducer,
  shouldShowHover,
  type ItemHoverState,
  type ItemHoverAction,
} from "./item-hover-logic";

describe("item-hover-logic", () => {
  // ===========================================================================
  // Initial state
  // ===========================================================================

  describe("createInitialHoverState", () => {
    it("creates initial state with isHovered = false", () => {
      const state = createInitialHoverState();
      expect(state.isHovered).toBe(false);
    });
  });

  // ===========================================================================
  // hoverReducer - mouseEnter
  // ===========================================================================

  describe("hoverReducer - mouseEnter", () => {
    it("sets isHovered to true", () => {
      const state: ItemHoverState = { isHovered: false };
      const result = hoverReducer(state, { type: "mouseEnter" });
      expect(result.isHovered).toBe(true);
    });

    it("keeps isHovered true if already true", () => {
      const state: ItemHoverState = { isHovered: true };
      const result = hoverReducer(state, { type: "mouseEnter" });
      expect(result.isHovered).toBe(true);
    });
  });

  // ===========================================================================
  // hoverReducer - mouseLeave
  // ===========================================================================

  describe("hoverReducer - mouseLeave", () => {
    it("sets isHovered to false", () => {
      const state: ItemHoverState = { isHovered: true };
      const result = hoverReducer(state, { type: "mouseLeave" });
      expect(result.isHovered).toBe(false);
    });

    it("keeps isHovered false if already false", () => {
      const state: ItemHoverState = { isHovered: false };
      const result = hoverReducer(state, { type: "mouseLeave" });
      expect(result.isHovered).toBe(false);
    });
  });

  // ===========================================================================
  // hoverReducer - dragStart
  // ===========================================================================

  describe("hoverReducer - dragStart", () => {
    it("clears isHovered when drag starts", () => {
      const state: ItemHoverState = { isHovered: true };
      const result = hoverReducer(state, { type: "dragStart" });
      expect(result.isHovered).toBe(false);
    });

    it("keeps isHovered false if already false", () => {
      const state: ItemHoverState = { isHovered: false };
      const result = hoverReducer(state, { type: "dragStart" });
      expect(result.isHovered).toBe(false);
    });
  });

  // ===========================================================================
  // hoverReducer - clearHover
  // ===========================================================================

  describe("hoverReducer - clearHover", () => {
    it("clears isHovered", () => {
      const state: ItemHoverState = { isHovered: true };
      const result = hoverReducer(state, { type: "clearHover" });
      expect(result.isHovered).toBe(false);
    });

    it("is safe when already false", () => {
      const state: ItemHoverState = { isHovered: false };
      const result = hoverReducer(state, { type: "clearHover" });
      expect(result.isHovered).toBe(false);
    });
  });

  // ===========================================================================
  // hoverReducer - dragStateChanged
  // ===========================================================================

  describe("hoverReducer - dragStateChanged", () => {
    it("clears isHovered when isDragging becomes true", () => {
      const state: ItemHoverState = { isHovered: true };
      const result = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: true,
      });
      expect(result.isHovered).toBe(false);
    });

    it("keeps state when isDragging becomes false", () => {
      const state: ItemHoverState = { isHovered: true };
      const result = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: false,
      });
      expect(result.isHovered).toBe(true);
    });

    it("keeps false state when isDragging becomes false", () => {
      const state: ItemHoverState = { isHovered: false };
      const result = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: false,
      });
      expect(result.isHovered).toBe(false);
    });
  });

  // ===========================================================================
  // shouldShowHover
  // ===========================================================================

  describe("shouldShowHover", () => {
    it("returns true when hovered and not dragging", () => {
      const state: ItemHoverState = { isHovered: true };
      expect(shouldShowHover(state, false)).toBe(true);
    });

    it("returns false when hovered but dragging", () => {
      const state: ItemHoverState = { isHovered: true };
      expect(shouldShowHover(state, true)).toBe(false);
    });

    it("returns false when not hovered and not dragging", () => {
      const state: ItemHoverState = { isHovered: false };
      expect(shouldShowHover(state, false)).toBe(false);
    });

    it("returns false when not hovered and dragging", () => {
      const state: ItemHoverState = { isHovered: false };
      expect(shouldShowHover(state, true)).toBe(false);
    });
  });

  // ===========================================================================
  // Complex scenarios
  // ===========================================================================

  describe("complex scenarios", () => {
    it("handles rapid enter/leave cycles", () => {
      let state = createInitialHoverState();

      // Rapid mouse movements
      state = hoverReducer(state, { type: "mouseEnter" });
      state = hoverReducer(state, { type: "mouseLeave" });
      state = hoverReducer(state, { type: "mouseEnter" });
      state = hoverReducer(state, { type: "mouseLeave" });
      state = hoverReducer(state, { type: "mouseEnter" });

      expect(state.isHovered).toBe(true);
    });

    it("handles hover -> drag start -> drag end -> hover cycle", () => {
      let state = createInitialHoverState();

      // Hover
      state = hoverReducer(state, { type: "mouseEnter" });
      expect(state.isHovered).toBe(true);

      // Drag starts - clears hover
      state = hoverReducer(state, { type: "dragStart" });
      expect(state.isHovered).toBe(false);

      // Drag state changes to true
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: true,
      });
      expect(state.isHovered).toBe(false);

      // Drag ends
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: false,
      });
      expect(state.isHovered).toBe(false);

      // Hover again works
      state = hoverReducer(state, { type: "mouseEnter" });
      expect(state.isHovered).toBe(true);
    });

    it("handles external drag affecting this item", () => {
      let state = createInitialHoverState();

      // Hover on this item
      state = hoverReducer(state, { type: "mouseEnter" });
      expect(state.isHovered).toBe(true);

      // Another item starts dragging (isDragging becomes true)
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: true,
      });
      expect(state.isHovered).toBe(false);

      // shouldShowHover should return false
      expect(shouldShowHover(state, true)).toBe(false);

      // Drag ends
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: false,
      });

      // After drag ends, need to re-enter to show hover
      expect(shouldShowHover(state, false)).toBe(false);

      state = hoverReducer(state, { type: "mouseEnter" });
      expect(shouldShowHover(state, false)).toBe(true);
    });

    it("handles multiple clearHover calls", () => {
      let state = createInitialHoverState();

      state = hoverReducer(state, { type: "mouseEnter" });
      state = hoverReducer(state, { type: "clearHover" });
      state = hoverReducer(state, { type: "clearHover" });
      state = hoverReducer(state, { type: "clearHover" });

      expect(state.isHovered).toBe(false);
    });

    it("handles simultaneous drag and mouse events", () => {
      let state = createInitialHoverState();

      // Mouse enter, then drag starts, then mouse leave during drag
      state = hoverReducer(state, { type: "mouseEnter" });
      state = hoverReducer(state, { type: "dragStart" });
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: true,
      });
      state = hoverReducer(state, { type: "mouseLeave" });

      expect(state.isHovered).toBe(false);
      expect(shouldShowHover(state, true)).toBe(false);
    });

    it("handles drag cancel (no drop)", () => {
      let state = createInitialHoverState();

      // Start with hover
      state = hoverReducer(state, { type: "mouseEnter" });
      expect(shouldShowHover(state, false)).toBe(true);

      // Start drag
      state = hoverReducer(state, { type: "dragStart" });
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: true,
      });

      // Cancel drag (just ends without drop)
      state = hoverReducer(state, {
        type: "dragStateChanged",
        isDragging: false,
      });

      // Should work normally after cancel
      state = hoverReducer(state, { type: "mouseEnter" });
      expect(shouldShowHover(state, false)).toBe(true);
    });
  });

  // ===========================================================================
  // Action sequence simulations
  // ===========================================================================

  describe("action sequence simulations", () => {
    /**
     * Helper to run a sequence of actions
     */
    function runActions(actions: ItemHoverAction[]): ItemHoverState {
      return actions.reduce(
        (state, action) => hoverReducer(state, action),
        createInitialHoverState()
      );
    }

    it("empty sequence returns initial state", () => {
      const state = runActions([]);
      expect(state.isHovered).toBe(false);
    });

    it("single mouseEnter returns hovered", () => {
      const state = runActions([{ type: "mouseEnter" }]);
      expect(state.isHovered).toBe(true);
    });

    it("mouseEnter -> mouseLeave returns not hovered", () => {
      const state = runActions([
        { type: "mouseEnter" },
        { type: "mouseLeave" },
      ]);
      expect(state.isHovered).toBe(false);
    });

    it("complex drag sequence", () => {
      const state = runActions([
        { type: "mouseEnter" },
        { type: "dragStart" },
        { type: "dragStateChanged", isDragging: true },
        { type: "mouseLeave" },
        { type: "dragStateChanged", isDragging: false },
        { type: "mouseEnter" },
      ]);
      expect(state.isHovered).toBe(true);
    });
  });
});
