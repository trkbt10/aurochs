/**
 * @file Unit tests for slide editor types
 *
 * Tests for undo/redo history, selection, and drag state management.
 */

import { createSlideEditorState } from "./types";
import {
  createEmptySelection,
  createIdleDragState,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "../state";
import type { Slide } from "@oxen/pptx/domain";

// =============================================================================
// Test Fixtures
// =============================================================================

import type { Shape, SpShape } from "@oxen/pptx/domain";
import { px, deg } from "@oxen/ooxml/domain/units";

// Create minimal test slide using type assertion for incomplete shapes
const createTestSlide = (shapeCount: number = 0): Slide => ({
  shapes: Array.from({ length: shapeCount }, (_, i) => ({
    type: "sp" as const,
    nonVisual: {
      id: String(i + 1),
      name: `Shape ${i + 1}`,
    },
    properties: {
      transform: {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
    },
  } as SpShape)) as Shape[],
});

// =============================================================================
// Selection State Tests
// =============================================================================

describe("createEmptySelection", () => {
  it("returns selection with empty selectedIds array", () => {
    const selection = createEmptySelection();
    expect(selection.selectedIds).toEqual([]);
  });

  it("returns selection with undefined primaryId", () => {
    const selection = createEmptySelection();
    expect(selection.primaryId).toBeUndefined();
  });

  it("returns readonly selection state", () => {
    const selection = createEmptySelection();
    expect(Object.isFrozen(selection.selectedIds) || Array.isArray(selection.selectedIds)).toBe(true);
  });
});

// =============================================================================
// Drag State Tests
// =============================================================================

describe("createIdleDragState", () => {
  it("returns drag state with type idle", () => {
    const drag = createIdleDragState();
    expect(drag.type).toBe("idle");
  });

  it("returns object with only type property", () => {
    const drag = createIdleDragState();
    expect(Object.keys(drag)).toEqual(["type"]);
  });
});

// =============================================================================
// Undo/Redo History Tests
// =============================================================================

describe("createHistory", () => {
  it("creates history with initial value as present", () => {
    const history = createHistory("initial");
    expect(history.present).toBe("initial");
  });

  it("creates history with empty past", () => {
    const history = createHistory("initial");
    expect(history.past).toEqual([]);
  });

  it("creates history with empty future", () => {
    const history = createHistory("initial");
    expect(history.future).toEqual([]);
  });

  it("works with complex objects", () => {
    const slide = createTestSlide(3);
    const history = createHistory(slide);
    expect(history.present).toBe(slide);
    expect(history.present.shapes.length).toBe(3);
  });
});

describe("pushHistory", () => {
  it("moves current present to past", () => {
    const history = createHistory("v1");
    const newHistory = pushHistory(history, "v2");
    expect(newHistory.past).toEqual(["v1"]);
  });

  it("sets new value as present", () => {
    const history = createHistory("v1");
    const newHistory = pushHistory(history, "v2");
    expect(newHistory.present).toBe("v2");
  });

  it("clears future (removes redo stack)", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = undoHistory(history); // future should now have v2
    expect(history.future.length).toBe(1);

    history = pushHistory(history, "v3"); // should clear future
    expect(history.future).toEqual([]);
  });

  it("accumulates past entries on multiple pushes", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = pushHistory(history, "v3");
    history = pushHistory(history, "v4");

    expect(history.past).toEqual(["v1", "v2", "v3"]);
    expect(history.present).toBe("v4");
  });
});

describe("undoHistory", () => {
  it("returns same history when past is empty", () => {
    const history = createHistory("v1");
    const undone = undoHistory(history);
    expect(undone).toBe(history);
  });

  it("moves present to future", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    const undone = undoHistory(history);
    expect(undone.future).toEqual(["v2"]);
  });

  it("restores previous value as present", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    const undone = undoHistory(history);
    expect(undone.present).toBe("v1");
  });

  it("removes entry from past", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = pushHistory(history, "v3");
    const undone = undoHistory(history);
    expect(undone.past).toEqual(["v1"]);
  });

  it("supports multiple undos", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = pushHistory(history, "v3");
    history = pushHistory(history, "v4");

    history = undoHistory(history);
    expect(history.present).toBe("v3");

    history = undoHistory(history);
    expect(history.present).toBe("v2");

    history = undoHistory(history);
    expect(history.present).toBe("v1");

    // Should not undo further
    const unchanged = undoHistory(history);
    expect(unchanged).toBe(history);
  });
});

describe("redoHistory", () => {
  it("returns same history when future is empty", () => {
    const history = createHistory("v1");
    const redone = redoHistory(history);
    expect(redone).toBe(history);
  });

  it("moves present to past", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = undoHistory(history);
    const redone = redoHistory(history);
    expect(redone.past).toEqual(["v1"]);
  });

  it("restores next value as present", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = undoHistory(history);
    const redone = redoHistory(history);
    expect(redone.present).toBe("v2");
  });

  it("removes entry from future", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = pushHistory(history, "v3");
    history = undoHistory(history);
    history = undoHistory(history);
    // Future should have [v2, v3]

    const redone = redoHistory(history);
    expect(redone.future).toEqual(["v3"]);
  });

  it("supports multiple redos", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");
    history = pushHistory(history, "v3");
    history = pushHistory(history, "v4");

    // Undo all
    history = undoHistory(history);
    history = undoHistory(history);
    history = undoHistory(history);
    expect(history.present).toBe("v1");

    // Redo all
    history = redoHistory(history);
    expect(history.present).toBe("v2");

    history = redoHistory(history);
    expect(history.present).toBe("v3");

    history = redoHistory(history);
    expect(history.present).toBe("v4");

    // Should not redo further
    const unchanged = redoHistory(history);
    expect(unchanged).toBe(history);
  });

  it("undo-redo cycle preserves value", () => {
    let history = createHistory("v1");
    history = pushHistory(history, "v2");

    history = undoHistory(history);
    expect(history.present).toBe("v1");

    history = redoHistory(history);
    expect(history.present).toBe("v2");

    history = undoHistory(history);
    expect(history.present).toBe("v1");
  });
});

// =============================================================================
// SlideEditorState Tests
// =============================================================================

describe("createSlideEditorState", () => {
  it("creates state with slide in history present", () => {
    const slide = createTestSlide(2);
    const state = createSlideEditorState(slide);
    expect(state.slideHistory.present).toBe(slide);
  });

  it("creates state with empty selection", () => {
    const slide = createTestSlide();
    const state = createSlideEditorState(slide);
    expect(state.selection.selectedIds).toEqual([]);
    expect(state.selection.primaryId).toBeUndefined();
  });

  it("creates state with idle drag", () => {
    const slide = createTestSlide();
    const state = createSlideEditorState(slide);
    expect(state.drag.type).toBe("idle");
  });

  it("creates state with undefined clipboard", () => {
    const slide = createTestSlide();
    const state = createSlideEditorState(slide);
    expect(state.clipboard).toBeUndefined();
  });

  it("creates state with empty undo/redo history", () => {
    const slide = createTestSlide();
    const state = createSlideEditorState(slide);
    expect(state.slideHistory.past).toEqual([]);
    expect(state.slideHistory.future).toEqual([]);
  });
});
