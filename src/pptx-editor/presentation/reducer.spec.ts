/**
 * @file Presentation editor reducer tests
 *
 * Tests for shape creation and other editor actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  presentationEditorReducer,
  createPresentationEditorState,
} from "./reducer";
import type { PresentationDocument, PresentationEditorState, CreationMode } from "./types";
import type { Slide, Shape } from "../../pptx/domain";
import type { SpShape } from "../../pptx/domain/shape";
import { px, deg } from "../../pptx/domain/types";
import { createShapeFromMode, getDefaultBoundsForMode } from "../shape/factory";

// =============================================================================
// Test Fixtures
// =============================================================================

function createEmptySlide(): Slide {
  return { shapes: [] };
}

function createTestDocument(): PresentationDocument {
  return {
    presentation: {
      slideSize: { width: px(960), height: px(540) },
    },
    slides: [{ id: "slide-1", slide: createEmptySlide() }],
    slideWidth: px(960),
    slideHeight: px(540),
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: {
      resolve: () => undefined,
      getMimeType: () => undefined,
      getFilePath: () => undefined,
      readFile: () => null,
      getResourceByType: () => undefined,
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("presentationEditorReducer", () => {
  let initialState: PresentationEditorState;

  beforeEach(() => {
    initialState = createPresentationEditorState(createTestDocument());
  });

  describe("SET_CREATION_MODE", () => {
    it("should update creation mode to shape", () => {
      const shapeMode: CreationMode = { type: "shape", preset: "rect" };
      const newState = presentationEditorReducer(initialState, {
        type: "SET_CREATION_MODE",
        mode: shapeMode,
      });

      expect(newState.creationMode).toEqual(shapeMode);
    });

    it("should clear selection when entering creation mode", () => {
      // First select a shape
      const stateWithSelection = {
        ...initialState,
        shapeSelection: {
          selectedIds: ["shape-1" as any],
          primaryId: "shape-1" as any,
        },
      };

      const shapeMode: CreationMode = { type: "shape", preset: "rect" };
      const newState = presentationEditorReducer(stateWithSelection, {
        type: "SET_CREATION_MODE",
        mode: shapeMode,
      });

      expect(newState.shapeSelection.selectedIds).toHaveLength(0);
    });

    it("should preserve selection when returning to select mode", () => {
      const stateWithSelection = {
        ...initialState,
        shapeSelection: {
          selectedIds: ["shape-1" as any],
          primaryId: "shape-1" as any,
        },
      };

      const selectMode: CreationMode = { type: "select" };
      const newState = presentationEditorReducer(stateWithSelection, {
        type: "SET_CREATION_MODE",
        mode: selectMode,
      });

      expect(newState.shapeSelection.selectedIds).toHaveLength(1);
    });
  });

  describe("CREATE_SHAPE", () => {
    it("should add a shape to the active slide", () => {
      const mode: CreationMode = { type: "shape", preset: "rect" };
      const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
      const shape = createShapeFromMode(mode, bounds);

      expect(shape).toBeDefined();

      const newState = presentationEditorReducer(initialState, {
        type: "CREATE_SHAPE",
        shape: shape!,
      });

      const activeSlide = newState.documentHistory.present.slides.find(
        (s) => s.id === newState.activeSlideId
      );
      expect(activeSlide?.slide.shapes).toHaveLength(1);
    });

    it("should select the created shape", () => {
      const mode: CreationMode = { type: "shape", preset: "rect" };
      const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
      const shape = createShapeFromMode(mode, bounds) as SpShape;

      expect(shape).toBeDefined();

      const newState = presentationEditorReducer(initialState, {
        type: "CREATE_SHAPE",
        shape,
      });

      expect(newState.shapeSelection.selectedIds).toHaveLength(1);
      expect(newState.shapeSelection.primaryId).toBe(shape.nonVisual.id);
    });

    it("should return to select mode after creating shape", () => {
      // First set to shape creation mode
      const shapeMode: CreationMode = { type: "shape", preset: "rect" };
      let state = presentationEditorReducer(initialState, {
        type: "SET_CREATION_MODE",
        mode: shapeMode,
      });

      expect(state.creationMode.type).toBe("shape");

      // Create a shape
      const bounds = getDefaultBoundsForMode(shapeMode, px(100), px(100));
      const shape = createShapeFromMode(shapeMode, bounds)!;

      state = presentationEditorReducer(state, {
        type: "CREATE_SHAPE",
        shape,
      });

      // Should return to select mode
      expect(state.creationMode.type).toBe("select");
    });
  });
});

describe("createShapeFromMode", () => {
  it("should create a rectangle shape", () => {
    const mode: CreationMode = { type: "shape", preset: "rect" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    const geometry = shape.properties.geometry;
    expect(geometry?.type).toBe("preset");
    if (geometry?.type === "preset") {
      expect(geometry.preset).toBe("rect");
    }
    expect(shape.nonVisual.id).toBeTruthy();
  });

  it("should create an ellipse shape", () => {
    const mode: CreationMode = { type: "shape", preset: "ellipse" };
    const bounds = getDefaultBoundsForMode(mode, px(200), px(200));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    const geometry = shape.properties.geometry;
    expect(geometry?.type).toBe("preset");
    if (geometry?.type === "preset") {
      expect(geometry.preset).toBe("ellipse");
    }
  });

  it("should create a right arrow shape", () => {
    const mode: CreationMode = { type: "shape", preset: "rightArrow" };
    const bounds = getDefaultBoundsForMode(mode, px(300), px(300));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    const geometry = shape.properties.geometry;
    expect(geometry?.type).toBe("preset");
    if (geometry?.type === "preset") {
      expect(geometry.preset).toBe("rightArrow");
    }
  });

  it("should create a text box", () => {
    const mode: CreationMode = { type: "textbox" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds) as SpShape;

    expect(shape).toBeDefined();
    expect(shape.type).toBe("sp");
    expect(shape.nonVisual.textBox).toBe(true);
    expect(shape.textBody).toBeDefined();
  });

  it("should create a connector", () => {
    const mode: CreationMode = { type: "connector" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();
    expect(shape?.type).toBe("cxnSp");
  });

  it("should return undefined for select mode", () => {
    const mode: CreationMode = { type: "select" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeUndefined();
  });

  it("should return undefined for picture mode", () => {
    const mode: CreationMode = { type: "picture" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeUndefined();
  });

  it("should create a table", () => {
    const mode: CreationMode = { type: "table", rows: 3, cols: 4 };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds);

    expect(shape).toBeDefined();
    expect(shape?.type).toBe("graphicFrame");
  });
});

// =============================================================================
// Drag Preview and Commit Tests
// =============================================================================

describe("Drag Preview and Commit", () => {
  let stateWithShape: PresentationEditorState;

  beforeEach(() => {
    const doc = createTestDocument();
    const baseState = createPresentationEditorState(doc);

    // Add a shape to the document
    const mode: CreationMode = { type: "shape", preset: "rect" };
    const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
    const shape = createShapeFromMode(mode, bounds)!;

    stateWithShape = presentationEditorReducer(baseState, {
      type: "CREATE_SHAPE",
      shape,
    });
  });

  describe("PREVIEW_MOVE", () => {
    it("should update previewDelta without adding to history", () => {
      // Start move
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_MOVE",
        startX: px(100),
        startY: px(100),
      });

      const historyLengthBefore = state.documentHistory.past.length;

      // Preview move
      state = presentationEditorReducer(state, {
        type: "PREVIEW_MOVE",
        dx: px(50),
        dy: px(30),
      });

      // History should not change
      expect(state.documentHistory.past.length).toBe(historyLengthBefore);

      // Preview delta should be updated
      expect(state.drag.type).toBe("move");
      if (state.drag.type === "move") {
        expect(state.drag.previewDelta.dx).toEqual(px(50));
        expect(state.drag.previewDelta.dy).toEqual(px(30));
      }
    });

    it("should not affect state when not in move drag mode", () => {
      // Don't start drag
      const state = presentationEditorReducer(stateWithShape, {
        type: "PREVIEW_MOVE",
        dx: px(50),
        dy: px(30),
      });

      // Should return same state
      expect(state).toBe(stateWithShape);
    });
  });

  describe("COMMIT_DRAG", () => {
    it("should apply move and add single history entry", () => {
      // Start move
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_MOVE",
        startX: px(100),
        startY: px(100),
      });

      // Preview move
      state = presentationEditorReducer(state, {
        type: "PREVIEW_MOVE",
        dx: px(50),
        dy: px(30),
      });

      const historyLengthBefore = state.documentHistory.past.length;

      // Commit
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      // History should have one more entry
      expect(state.documentHistory.past.length).toBe(historyLengthBefore + 1);

      // Drag should be idle
      expect(state.drag.type).toBe("idle");

      // Shape position should be updated
      const activeSlide = state.documentHistory.present.slides.find(
        (s) => s.id === state.activeSlideId
      );
      const updatedShape = activeSlide?.slide.shapes[0] as Shape;
      expect(updatedShape).toBeDefined();
      if (updatedShape && "transform" in updatedShape) {
        expect((updatedShape.transform.x as number)).toBe(150); // 100 + 50
        expect((updatedShape.transform.y as number)).toBe(130); // 100 + 30
      }
    });

    it("should not add history entry when no actual movement", () => {
      // Start move
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_MOVE",
        startX: px(100),
        startY: px(100),
      });

      const historyLengthBefore = state.documentHistory.past.length;

      // Commit without preview (dx=0, dy=0)
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      // History should not change
      expect(state.documentHistory.past.length).toBe(historyLengthBefore);

      // Drag should be idle
      expect(state.drag.type).toBe("idle");
    });

    it("should handle COMMIT_DRAG when not dragging", () => {
      // Commit without starting drag
      const state = presentationEditorReducer(stateWithShape, { type: "COMMIT_DRAG" });

      // Should return same state
      expect(state).toBe(stateWithShape);
    });
  });

  describe("PREVIEW_RESIZE", () => {
    it("should update previewDelta without adding to history", () => {
      // Start resize
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        aspectLocked: false,
      });

      const historyLengthBefore = state.documentHistory.past.length;

      // Preview resize
      state = presentationEditorReducer(state, {
        type: "PREVIEW_RESIZE",
        dx: px(50),
        dy: px(30),
      });

      // History should not change
      expect(state.documentHistory.past.length).toBe(historyLengthBefore);

      // Preview delta should be updated
      expect(state.drag.type).toBe("resize");
      if (state.drag.type === "resize") {
        expect(state.drag.previewDelta.dx).toEqual(px(50));
        expect(state.drag.previewDelta.dy).toEqual(px(30));
      }
    });
  });

  describe("PREVIEW_ROTATE", () => {
    it("should update previewAngleDelta without adding to history", () => {
      // Start rotate
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_ROTATE",
        startX: px(150),
        startY: px(50),
      });

      const historyLengthBefore = state.documentHistory.past.length;

      // Preview rotate
      state = presentationEditorReducer(state, {
        type: "PREVIEW_ROTATE",
        currentAngle: deg(45),
      });

      // History should not change
      expect(state.documentHistory.past.length).toBe(historyLengthBefore);

      // Preview angle delta should be updated
      expect(state.drag.type).toBe("rotate");
      if (state.drag.type === "rotate") {
        expect(state.drag.previewAngleDelta).toBeDefined();
      }
    });
  });
});
