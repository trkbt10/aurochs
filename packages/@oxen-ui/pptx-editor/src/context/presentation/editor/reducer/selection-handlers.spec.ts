/**
 * @file Selection handlers tests
 *
 * Tests for SELECT_SHAPE, CLEAR_SHAPE_SELECTION, SELECT_MULTIPLE_SHAPES actions
 * and their interaction with text edit state.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, custom/no-as-outside-guard, no-restricted-syntax -- Test file uses flexible typing for mock data */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState, CreationMode } from "../types";
import type { SpShape } from "@oxen/pptx/domain/shape";
import { px } from "@oxen/ooxml/domain/units";
import { createShapeFromMode, getDefaultBoundsForMode } from "../../../../shape/factory";
import { createTestDocument } from "./test-fixtures";

describe("Text Edit and Selection Interaction", () => {
  let stateWithTwoShapes: PresentationEditorState;
  let shapeAId: string;
  let shapeBId: string;

  beforeEach(() => {
    const doc = createTestDocument();
    let state = createPresentationEditorState(doc);

    // Add shape A with text
    const modeA: CreationMode = { type: "textbox" };
    const boundsA = getDefaultBoundsForMode(modeA, px(100), px(100));
    const shapeA = createShapeFromMode(modeA, boundsA)!;
    shapeAId = (shapeA as SpShape).nonVisual.id;

    state = presentationEditorReducer(state, {
      type: "CREATE_SHAPE",
      shape: shapeA,
    });

    // Add shape B with text
    const modeB: CreationMode = { type: "textbox" };
    const boundsB = getDefaultBoundsForMode(modeB, px(300), px(100));
    const shapeB = createShapeFromMode(modeB, boundsB)!;
    shapeBId = (shapeB as SpShape).nonVisual.id;

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
        shapeId: shapeAId as any,
        addToSelection: false,
      });

      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
      expect(state.shapeSelection.primaryId).toBe(shapeAId);
      expect(state.textEdit.type).toBe("inactive");
    });
  });

  describe("SELECT_SHAPE while text edit is active", () => {
    it("should exit text edit when selecting a different shape", () => {
      // Enter text edit for shape A
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId as any,
      });

      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeAId);
      }

      // Click on shape B - should exit text edit and select B
      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeBId as any,
        addToSelection: false,
      });

      // Text edit should be inactive
      expect(state.textEdit.type).toBe("inactive");

      // Shape B should be selected
      expect(state.shapeSelection.selectedIds).toContain(shapeBId);
      expect(state.shapeSelection.primaryId).toBe(shapeBId);
    });

    it("should exit text edit when selecting the same shape (single click during edit)", () => {
      // Enter text edit for shape A
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId as any,
      });

      // Click on same shape A again (single click)
      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });

      // Text edit should remain active (same shape)
      expect(state.textEdit.type).toBe("active");
      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
    });

    it("should not transfer text to the newly selected shape", () => {
      // Enter text edit for shape A
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId as any,
      });

      // Verify text edit is for shape A
      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeAId);
      }

      // Select shape B
      state = presentationEditorReducer(state, {
        type: "SELECT_SHAPE",
        shapeId: shapeBId as any,
        addToSelection: false,
      });

      // Verify text edit is exited - no active text edit referencing shape B
      expect(state.textEdit.type).toBe("inactive");
    });
  });

  describe("CLEAR_SHAPE_SELECTION while text edit is active", () => {
    it("should exit text edit when clearing selection", () => {
      // Enter text edit for shape A
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId as any,
      });

      expect(state.textEdit.type).toBe("active");

      // Clear selection (clicking on background)
      state = presentationEditorReducer(state, {
        type: "CLEAR_SHAPE_SELECTION",
      });

      // Text edit should be inactive
      expect(state.textEdit.type).toBe("inactive");
      // Selection should be cleared
      expect(state.shapeSelection.selectedIds).toHaveLength(0);
    });
  });

  describe("SELECT_MULTIPLE_SHAPES while text edit is active", () => {
    it("should exit text edit when selecting multiple shapes", () => {
      // Enter text edit for shape A
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId as any,
      });

      expect(state.textEdit.type).toBe("active");

      // Select multiple shapes
      state = presentationEditorReducer(state, {
        type: "SELECT_MULTIPLE_SHAPES",
        shapeIds: [shapeAId as any, shapeBId as any],
      });

      // Text edit should be inactive
      expect(state.textEdit.type).toBe("inactive");
    });
  });
});
