/**
 * @file Text edit handlers tests
 *
 * Tests for ENTER_TEXT_EDIT, EXIT_TEXT_EDIT, UPDATE_TEXT_BODY actions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, custom/no-as-outside-guard, no-restricted-syntax -- Test file uses flexible typing for mock data */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState, CreationMode } from "../types";
import type { SpShape } from "@oxen/pptx/domain/shape";
import { px } from "@oxen/ooxml/domain/units";
import { createShapeFromMode, getDefaultBoundsForMode } from "../../../../shape/factory";
import { createTestDocument } from "./test-fixtures";

describe("Text Edit Handlers", () => {
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

  describe("ENTER_TEXT_EDIT", () => {
    it("should set text edit state for the correct shape", () => {
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
        expect(state.textEdit.initialTextBody).toBeDefined();
      }
    });

    it("should exit previous text edit when entering new one", () => {
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

      // Enter text edit for shape B directly
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeBId as any,
      });

      // Text edit should be for shape B now
      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeBId);
      }
    });
  });

  describe("EXIT_TEXT_EDIT", () => {
    it("should clear text edit state", () => {
      // Enter text edit
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

      // Exit text edit
      state = presentationEditorReducer(state, {
        type: "EXIT_TEXT_EDIT",
      });

      expect(state.textEdit.type).toBe("inactive");
    });

    it("should preserve selection when exiting text edit", () => {
      // Enter text edit
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId as any,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId as any,
      });

      // Exit text edit
      state = presentationEditorReducer(state, {
        type: "EXIT_TEXT_EDIT",
      });

      // Selection should still be shape A
      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
    });
  });

  describe("UPDATE_TEXT_BODY", () => {
    it("should update the correct shape text", () => {
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

      const newTextBody = {
        bodyProperties: {},
        paragraphs: [{
          properties: {},
          runs: [{ type: "text" as const, text: "Updated Text", properties: {} }],
        }],
      };

      // Update shape A's text
      state = presentationEditorReducer(state, {
        type: "UPDATE_TEXT_BODY",
        shapeId: shapeAId as any,
        textBody: newTextBody,
      });

      // Find shape A and verify its text was updated
      const activeSlide = state.documentHistory.present.slides.find(
        (s) => s.id === state.activeSlideId
      );
      const shapeA = activeSlide?.slide.shapes.find(
        (s) => s.type === "sp" && s.nonVisual.id === shapeAId
      ) as SpShape | undefined;

      expect(shapeA?.textBody?.paragraphs[0]?.runs[0]).toEqual(
        expect.objectContaining({ text: "Updated Text" })
      );

      // Verify shape B was NOT updated
      const shapeB = activeSlide?.slide.shapes.find(
        (s) => s.type === "sp" && s.nonVisual.id === shapeBId
      ) as SpShape | undefined;

      const shapeBFirstRun = shapeB?.textBody?.paragraphs[0]?.runs[0];
      const shapeBText = shapeBFirstRun?.type === "text" ? shapeBFirstRun.text : undefined;
      expect(shapeBText).not.toBe("Updated Text");
    });
  });
});
