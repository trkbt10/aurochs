/**
 * @file Selection handlers tests
 *
 * Tests for SELECT_SHAPE, CLEAR_SHAPE_SELECTION, SELECT_MULTIPLE_SHAPES actions
 * and their interaction with text edit state.
 */

/* eslint-disable no-restricted-syntax -- Test file uses let for sequential state updates */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState } from "../types";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import type { SpShape } from "@aurochs-office/pptx/domain/shape";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createShapeFromMode } from "@aurochs-ui/pptx-slide-canvas/shape/factory";
import { getDefaultBoundsForMode } from "@aurochs-ui/ooxml-components";
import { createTestDocument } from "./test-fixtures";

function getSpShapeId(shape: ReturnType<typeof createShapeFromMode>): ShapeId {
  const sp = shape as SpShape;
  return sp.nonVisual.id;
}

describe("Text Edit and Selection Interaction", () => {
  let stateWithTwoShapes: PresentationEditorState;
  let shapeAId: ShapeId;
  let shapeBId: ShapeId;

  beforeEach(() => {
    const doc = createTestDocument();
    let state = createPresentationEditorState(doc);

    // Add shape A with text
    const modeA: CreationMode = { type: "textbox" };
    const boundsA = getDefaultBoundsForMode(modeA, px(100), px(100));
    const shapeA = createShapeFromMode(modeA, boundsA)!;
    shapeAId = getSpShapeId(shapeA);

    state = presentationEditorReducer(state, {
      type: "CREATE_SHAPE",
      shape: shapeA,
    });

    // Add shape B with text
    const modeB: CreationMode = { type: "textbox" };
    const boundsB = getDefaultBoundsForMode(modeB, px(300), px(100));
    const shapeB = createShapeFromMode(modeB, boundsB)!;
    shapeBId = getSpShapeId(shapeB);

    state = presentationEditorReducer(state, {
      type: "CREATE_SHAPE",
      shape: shapeB,
    });

    // Clear selection for clean test start
    state = presentationEditorReducer(state, {
      type: "CLEAR_SHAPE_SELECTION",
    });

    stateWithTwoShapes = state;
  });

  describe("SELECT_SHAPE while text edit is inactive", () => {
    it("should select the shape normally", () => {
      const state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });

      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
      expect(state.shapeSelection.primaryId).toBe(shapeAId);
      expect(state.textEdit.type).toBe("inactive");
    });
  });

  describe("SELECT_SHAPE while text edit is active", () => {
    it("should exit text edit when selecting a different shape", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeAId);
      }

      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeBId,
        addToSelection: false,
      });

      expect(state.textEdit.type).toBe("inactive");
      expect(state.shapeSelection.selectedIds).toContain(shapeBId);
      expect(state.shapeSelection.primaryId).toBe(shapeBId);
    });

    it("should keep text edit active when selecting the same shape", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });

      expect(state.textEdit.type).toBe("active");
      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
    });

    it("should not transfer text edit to newly selected shape", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeAId);
      }

      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeBId,
        addToSelection: false,
      });

      expect(state.textEdit.type).toBe("inactive");
    });
  });

  describe("CLEAR_SHAPE_SELECTION while text edit is active", () => {
    it("should exit text edit when clearing selection", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      expect(state.textEdit.type).toBe("active");

      state = presentationEditorReducer(state, {
        type: "CLEAR_SHAPE_SELECTION",
      });

      expect(state.textEdit.type).toBe("inactive");
      expect(state.shapeSelection.selectedIds).toHaveLength(0);
    });
  });

  describe("SELECT_MULTIPLE_SHAPES while text edit is active", () => {
    it("should exit text edit when selecting multiple shapes", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      expect(state.textEdit.type).toBe("active");

      state = presentationEditorReducer(state, {
        type: "SELECT_MULTIPLE_SHAPES",
        shapeIds: [shapeAId, shapeBId],
      });

      expect(state.textEdit.type).toBe("inactive");
    });
  });

  // ===========================================================================
  // Toggle selection (Cmd/Ctrl+Click)
  // ===========================================================================

  describe("Toggle selection", () => {
    it("should deselect a selected shape with toggle=true", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });

      expect(state.shapeSelection.selectedIds).toContain(shapeAId);

      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: true,
        toggle: true,
      });

      expect(state.shapeSelection.selectedIds).not.toContain(shapeAId);
    });

    it("should add an unselected shape with toggle=true", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });

      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeBId,
        addToSelection: true,
        toggle: true,
      });

      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
      expect(state.shapeSelection.selectedIds).toContain(shapeBId);
    });

    it("should update primaryId after toggle-deselecting the primary shape", () => {
      // Select both shapes
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_MULTIPLE_SHAPES",
        shapeIds: [shapeAId, shapeBId],
        primaryId: shapeAId,
      });

      expect(state.shapeSelection.primaryId).toBe(shapeAId);

      // Toggle-deselect the primary shape
      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: true,
        toggle: true,
      });

      expect(state.shapeSelection.selectedIds).not.toContain(shapeAId);
      expect(state.shapeSelection.selectedIds).toContain(shapeBId);
      // primaryId should fall back to remaining shape
      expect(state.shapeSelection.primaryId).toBe(shapeBId);
    });
  });
});
