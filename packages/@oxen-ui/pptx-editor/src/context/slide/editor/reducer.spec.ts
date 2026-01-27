/**
 * @file Unit tests for SlideEditorContext reducer
 *
 * Tests the slide editor state management including:
 * - Shape selection (single, multi, clear)
 * - Shape mutations (update, delete, add, reorder)
 * - Drag operations (move, resize, rotate)
 * - Undo/Redo
 * - Copy/Paste
 */

import { slideEditorReducer } from "./reducer";
import type { Slide, SpShape, Shape } from "@oxen/pptx/domain";
import { px, deg } from "@oxen/ooxml/domain/units";
import {
  createSlideEditorState,
  type SlideEditorState,
  type SlideEditorAction,
} from "./types";

// =============================================================================
// Test Fixtures
// =============================================================================

// Cast to SpShape since we're creating minimal test fixtures
const createTestShape = (
  id: string,
  name: string,
  x: number = 0,
  y: number = 0,
  width: number = 100,
  height: number = 100
): SpShape => ({
  type: "sp",
  nonVisual: { id, name },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
  },
} as SpShape);

const createTestSlide = (shapeCount: number = 0): Slide => ({
  shapes: Array.from({ length: shapeCount }, (_, i) =>
    createTestShape(String(i + 1), `Shape ${i + 1}`, i * 50, i * 50)
  ) as Shape[],
});

// Helper to dispatch multiple actions
const dispatchAll = (
  initialState: SlideEditorState,
  actions: SlideEditorAction[]
): SlideEditorState => {
  return actions.reduce(
    (state, action) => slideEditorReducer(state, action),
    initialState
  );
};

// Helper to get shape ID from a shape (handles union type)
const getShapeId = (shape: Shape): string | undefined =>
  "nonVisual" in shape ? shape.nonVisual.id : undefined;

// Helper to get all shape IDs from slide
const getShapeIds = (slide: Slide): string[] =>
  slide.shapes.map((s) => getShapeId(s)).filter((id): id is string => id !== undefined);

// =============================================================================
// Selection Tests
// =============================================================================

describe("SlideEditorContext Reducer - Selection", () => {
  it("starts with empty selection", () => {
    const state = createSlideEditorState(createTestSlide(3));
    expect(state.selection.selectedIds).toEqual([]);
    expect(state.selection.primaryId).toBeUndefined();
  });

  it("SELECT action selects a single shape", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });

    expect(newState.selection.selectedIds).toEqual(["1"]);
    expect(newState.selection.primaryId).toBe("1");
  });

  it("SELECT replaces previous selection when addToSelection is false", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "2",
      addToSelection: false,
    });

    expect(state.selection.selectedIds).toEqual(["2"]);
    expect(state.selection.primaryId).toBe("2");
  });

  it("SELECT with addToSelection adds to existing selection", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "2",
      addToSelection: true,
    });

    expect(state.selection.selectedIds).toEqual(["1", "2"]);
    expect(state.selection.primaryId).toBe("2");
  });

  it("SELECT with addToSelection toggles off already selected shape", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = dispatchAll(state, [
      { type: "SELECT", shapeId: "1", addToSelection: false },
      { type: "SELECT", shapeId: "2", addToSelection: true },
      { type: "SELECT", shapeId: "1", addToSelection: true },
    ]);

    expect(state.selection.selectedIds).toEqual(["2"]);
  });

  it("SELECT_MULTIPLE selects multiple shapes at once", () => {
    const state = createSlideEditorState(createTestSlide(5));
    const newState = slideEditorReducer(state, {
      type: "SELECT_MULTIPLE",
      shapeIds: ["1", "3", "5"],
    });

    expect(newState.selection.selectedIds).toEqual(["1", "3", "5"]);
    expect(newState.selection.primaryId).toBe("1");
  });

  it("CLEAR_SELECTION removes all selections", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT_MULTIPLE",
      shapeIds: ["1", "2", "3"],
    });
    state = slideEditorReducer(state, { type: "CLEAR_SELECTION" });

    expect(state.selection.selectedIds).toEqual([]);
    expect(state.selection.primaryId).toBeUndefined();
  });
});

// =============================================================================
// Shape Mutation Tests
// =============================================================================

describe("SlideEditorContext Reducer - Shape Mutations", () => {
  it("UPDATE_SHAPE updates a shape", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "UPDATE_SHAPE",
      shapeId: "1",
      updater: (shape) => ({
        ...shape,
        nonVisual: { ...(shape as SpShape).nonVisual, name: "Updated Name" },
      }),
    });

    const updatedShape = newState.slideHistory.present.shapes.find(
      (s) => "nonVisual" in s && s.nonVisual.id === "1"
    ) as SpShape | undefined;
    expect(updatedShape?.nonVisual.name).toBe("Updated Name");
  });

  it("DELETE_SHAPES removes shapes by ID", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1", "3"],
    });

    expect(newState.slideHistory.present.shapes.length).toBe(1);
    expect(getShapeId(newState.slideHistory.present.shapes[0])).toBe("2");
  });

  it("DELETE_SHAPES clears selection for deleted shapes", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT_MULTIPLE",
      shapeIds: ["1", "2"],
    });
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });

    expect(state.selection.selectedIds).toEqual(["2"]);
  });

  it("ADD_SHAPE adds a new shape", () => {
    const state = createSlideEditorState(createTestSlide(2));
    const newShape = createTestShape("99", "New Shape", 200, 200);
    const newState = slideEditorReducer(state, {
      type: "ADD_SHAPE",
      shape: newShape,
    });

    expect(newState.slideHistory.present.shapes.length).toBe(3);
    expect(getShapeId(newState.slideHistory.present.shapes[2])).toBe("99");
    expect(newState.selection.selectedIds).toEqual(["99"]);
  });

  it("REORDER_SHAPE front moves shape to end", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "REORDER_SHAPE",
      shapeId: "1",
      direction: "front",
    });

    const ids = getShapeIds(newState.slideHistory.present);
    expect(ids).toEqual(["2", "3", "1"]);
  });

  it("REORDER_SHAPE back moves shape to start", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "REORDER_SHAPE",
      shapeId: "3",
      direction: "back",
    });

    const ids = getShapeIds(newState.slideHistory.present);
    expect(ids).toEqual(["3", "1", "2"]);
  });

  it("REORDER_SHAPE forward moves shape one position forward", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "REORDER_SHAPE",
      shapeId: "1",
      direction: "forward",
    });

    const ids = getShapeIds(newState.slideHistory.present);
    expect(ids).toEqual(["2", "1", "3"]);
  });

  it("REORDER_SHAPE backward moves shape one position backward", () => {
    const state = createSlideEditorState(createTestSlide(3));
    const newState = slideEditorReducer(state, {
      type: "REORDER_SHAPE",
      shapeId: "2",
      direction: "backward",
    });

    const ids = getShapeIds(newState.slideHistory.present);
    expect(ids).toEqual(["2", "1", "3"]);
  });
});

// =============================================================================
// Undo/Redo Tests
// =============================================================================

describe("SlideEditorContext Reducer - Undo/Redo", () => {
  it("canUndo is false initially (past is empty)", () => {
    const state = createSlideEditorState(createTestSlide(3));
    expect(state.slideHistory.past.length).toBe(0);
  });

  it("past grows after mutation", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });

    expect(state.slideHistory.past.length).toBe(1);
  });

  it("UNDO restores previous state", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });
    expect(state.slideHistory.present.shapes.length).toBe(2);

    state = slideEditorReducer(state, { type: "UNDO" });
    expect(state.slideHistory.present.shapes.length).toBe(3);
  });

  it("future grows after undo", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });
    state = slideEditorReducer(state, { type: "UNDO" });

    expect(state.slideHistory.future.length).toBe(1);
  });

  it("REDO restores undone state", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });
    state = slideEditorReducer(state, { type: "UNDO" });
    expect(state.slideHistory.present.shapes.length).toBe(3);

    state = slideEditorReducer(state, { type: "REDO" });
    expect(state.slideHistory.present.shapes.length).toBe(2);
  });

  it("new mutation clears redo stack (future)", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });
    state = slideEditorReducer(state, { type: "UNDO" });
    expect(state.slideHistory.future.length).toBe(1);

    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["2"],
    });
    expect(state.slideHistory.future.length).toBe(0);
  });

  it("multiple undo/redo cycle works correctly", () => {
    let state = createSlideEditorState(createTestSlide(3));

    // Make 3 changes
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["2"],
    });
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["3"],
    });
    expect(state.slideHistory.present.shapes.length).toBe(0);

    // Undo all
    state = slideEditorReducer(state, { type: "UNDO" });
    expect(state.slideHistory.present.shapes.length).toBe(1);

    state = slideEditorReducer(state, { type: "UNDO" });
    expect(state.slideHistory.present.shapes.length).toBe(2);

    state = slideEditorReducer(state, { type: "UNDO" });
    expect(state.slideHistory.present.shapes.length).toBe(3);

    // Redo all
    state = slideEditorReducer(state, { type: "REDO" });
    expect(state.slideHistory.present.shapes.length).toBe(2);

    state = slideEditorReducer(state, { type: "REDO" });
    expect(state.slideHistory.present.shapes.length).toBe(1);

    state = slideEditorReducer(state, { type: "REDO" });
    expect(state.slideHistory.present.shapes.length).toBe(0);
  });
});

// =============================================================================
// Copy/Paste Tests
// =============================================================================

describe("SlideEditorContext Reducer - Copy/Paste", () => {
  it("COPY stores selected shapes in clipboard", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT_MULTIPLE",
      shapeIds: ["1", "2"],
    });
    state = slideEditorReducer(state, { type: "COPY" });

    expect(state.clipboard).toBeDefined();
    expect(state.clipboard?.shapes.length).toBe(2);
  });

  it("COPY does nothing when nothing selected", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, { type: "COPY" });

    expect(state.clipboard).toBeUndefined();
  });

  it("PASTE adds shapes from clipboard", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, { type: "COPY" });
    state = slideEditorReducer(state, { type: "PASTE" });

    expect(state.slideHistory.present.shapes.length).toBe(4);
  });

  it("PASTE does nothing when clipboard empty", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, { type: "PASTE" });

    expect(state.slideHistory.present.shapes.length).toBe(3);
  });

  it("PASTE selects pasted shapes", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, { type: "COPY" });
    state = slideEditorReducer(state, { type: "PASTE" });

    // Pasted shape should be selected, not original
    expect(state.selection.selectedIds.length).toBe(1);
    expect(state.selection.selectedIds[0]).not.toBe("1");
  });

  it("PASTE creates new unique IDs", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, { type: "COPY" });
    state = slideEditorReducer(state, { type: "PASTE" });

    const allIds = getShapeIds(state.slideHistory.present);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("PASTE offsets position each time", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, { type: "COPY" });
    state = slideEditorReducer(state, { type: "PASTE" });
    state = slideEditorReducer(state, { type: "PASTE" });

    expect(state.slideHistory.present.shapes.length).toBe(5);

    const shape4 = state.slideHistory.present.shapes[3] as SpShape;
    const shape5 = state.slideHistory.present.shapes[4] as SpShape;
    expect(shape4.properties.transform!.x).not.toBe(
      shape5.properties.transform!.x
    );
  });

  it("pasteCount increments with each paste", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, { type: "COPY" });
    expect(state.clipboard?.pasteCount).toBe(0);

    state = slideEditorReducer(state, { type: "PASTE" });
    expect(state.clipboard?.pasteCount).toBe(1);

    state = slideEditorReducer(state, { type: "PASTE" });
    expect(state.clipboard?.pasteCount).toBe(2);
  });
});

// =============================================================================
// Drag State Tests
// =============================================================================

describe("SlideEditorContext Reducer - Drag State", () => {
  it("starts with idle drag state", () => {
    const state = createSlideEditorState(createTestSlide(3));
    expect(state.drag.type).toBe("idle");
  });

  it("START_MOVE sets move drag state", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "START_MOVE",
      startX: px(100),
      startY: px(100),
    });

    expect(state.drag.type).toBe("move");
    if (state.drag.type === "move") {
      expect(state.drag.shapeIds).toEqual(["1"]);
      expect(state.drag.startX).toBe(100);
      expect(state.drag.startY).toBe(100);
      expect(state.drag.initialBounds.size).toBe(1);
    }
  });

  it("START_MOVE does nothing when nothing selected", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "START_MOVE",
      startX: px(100),
      startY: px(100),
    });

    expect(state.drag.type).toBe("idle");
  });

  it("START_RESIZE sets resize drag state", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "START_RESIZE",
      handle: "se",
      startX: px(100),
      startY: px(100),
      aspectLocked: false,
    });

    expect(state.drag.type).toBe("resize");
    if (state.drag.type === "resize") {
      expect(state.drag.handle).toBe("se");
      expect(state.drag.shapeId).toBe("1");
      expect(state.drag.aspectLocked).toBe(false);
    }
  });

  it("START_RESIZE does nothing when nothing selected", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "START_RESIZE",
      handle: "se",
      startX: px(100),
      startY: px(100),
      aspectLocked: false,
    });

    expect(state.drag.type).toBe("idle");
  });

  it("START_ROTATE sets rotate drag state", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "START_ROTATE",
      startX: px(150),
      startY: px(0),
    });

    expect(state.drag.type).toBe("rotate");
    if (state.drag.type === "rotate") {
      expect(state.drag.shapeId).toBe("1");
      expect(state.drag.centerX).toBeDefined();
      expect(state.drag.centerY).toBeDefined();
    }
  });

  it("END_DRAG returns to idle", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "START_MOVE",
      startX: px(100),
      startY: px(100),
    });
    expect(state.drag.type).toBe("move");

    state = slideEditorReducer(state, { type: "END_DRAG" });
    expect(state.drag.type).toBe("idle");
  });
});

// =============================================================================
// SET_SLIDE Tests
// =============================================================================

describe("SlideEditorContext Reducer - SET_SLIDE", () => {
  it("SET_SLIDE replaces entire slide", () => {
    let state = createSlideEditorState(createTestSlide(3));
    const newSlide = createTestSlide(5);

    state = slideEditorReducer(state, { type: "SET_SLIDE", slide: newSlide });

    expect(state.slideHistory.present.shapes.length).toBe(5);
  });

  it("SET_SLIDE clears selection", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT_MULTIPLE",
      shapeIds: ["1", "2"],
    });
    const newSlide = createTestSlide(5);

    state = slideEditorReducer(state, { type: "SET_SLIDE", slide: newSlide });

    expect(state.selection.selectedIds).toEqual([]);
  });

  it("SET_SLIDE resets history", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "DELETE_SHAPES",
      shapeIds: ["1"],
    });
    expect(state.slideHistory.past.length).toBe(1);

    const newSlide = createTestSlide(5);
    state = slideEditorReducer(state, { type: "SET_SLIDE", slide: newSlide });

    expect(state.slideHistory.past.length).toBe(0);
    expect(state.slideHistory.future.length).toBe(0);
  });

  it("SET_SLIDE resets drag state", () => {
    let state = createSlideEditorState(createTestSlide(3));
    state = slideEditorReducer(state, {
      type: "SELECT",
      shapeId: "1",
      addToSelection: false,
    });
    state = slideEditorReducer(state, {
      type: "START_MOVE",
      startX: px(100),
      startY: px(100),
    });
    expect(state.drag.type).toBe("move");

    const newSlide = createTestSlide(5);
    state = slideEditorReducer(state, { type: "SET_SLIDE", slide: newSlide });

    expect(state.drag.type).toBe("idle");
  });
});
