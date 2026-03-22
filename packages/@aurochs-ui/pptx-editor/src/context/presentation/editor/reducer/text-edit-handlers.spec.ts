/**
 * @file Text edit handlers tests
 *
 * Tests for ENTER_TEXT_EDIT, EXIT_TEXT_EDIT, UPDATE_TEXT_BODY,
 * UPDATE_TEXT_BODY_IN_EDIT actions.
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

describe("Text Edit Handlers", () => {
  let stateWithTwoShapes: PresentationEditorState;
  let shapeAId: ShapeId;
  let shapeBId: ShapeId;

  beforeEach(() => {
    const doc = createTestDocument();
    let state = createPresentationEditorState(doc);

    const modeA: CreationMode = { type: "textbox" };
    const boundsA = getDefaultBoundsForMode(modeA, px(100), px(100));
    const shapeA = createShapeFromMode(modeA, boundsA)!;
    shapeAId = getSpShapeId(shapeA);

    state = presentationEditorReducer(state, {
      type: "CREATE_SHAPE",
      shape: shapeA,
    });

    const modeB: CreationMode = { type: "textbox" };
    const boundsB = getDefaultBoundsForMode(modeB, px(300), px(100));
    const shapeB = createShapeFromMode(modeB, boundsB)!;
    shapeBId = getSpShapeId(shapeB);

    state = presentationEditorReducer(state, {
      type: "CREATE_SHAPE",
      shape: shapeB,
    });

    state = presentationEditorReducer(state, {
      type: "CLEAR_SHAPE_SELECTION",
    });

    stateWithTwoShapes = state;
  });

  describe("ENTER_TEXT_EDIT", () => {
    it("should set text edit state for the correct shape", () => {
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
        expect(state.textEdit.initialTextBody).toBeDefined();
      }
    });

    it("should exit previous text edit when entering new one", () => {
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
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeBId,
      });

      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeBId);
      }
    });
  });

  describe("EXIT_TEXT_EDIT", () => {
    it("should clear text edit state", () => {
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
        type: "EXIT_TEXT_EDIT",
      });

      expect(state.textEdit.type).toBe("inactive");
    });

    it("should preserve selection when exiting text edit", () => {
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
        type: "EXIT_TEXT_EDIT",
      });

      expect(state.shapeSelection.selectedIds).toContain(shapeAId);
    });
  });

  describe("UPDATE_TEXT_BODY", () => {
    it("should update the correct shape text", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      const newTextBody = {
        bodyProperties: {},
        paragraphs: [
          {
            properties: {},
            runs: [{ type: "text" as const, text: "Updated Text", properties: {} }],
          },
        ],
      };

      state = presentationEditorReducer(state, {
        type: "UPDATE_TEXT_BODY",
        shapeId: shapeAId,
        textBody: newTextBody,
      });

      const activeSlide = state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
      const shapeA = activeSlide?.slide.shapes.find((s) => s.type === "sp" && s.nonVisual.id === shapeAId) as
        | SpShape
        | undefined;

      expect(shapeA?.textBody?.paragraphs[0]?.runs[0]).toEqual(expect.objectContaining({ text: "Updated Text" }));

      const shapeB = activeSlide?.slide.shapes.find((s) => s.type === "sp" && s.nonVisual.id === shapeBId) as
        | SpShape
        | undefined;

      const shapeBFirstRun = shapeB?.textBody?.paragraphs[0]?.runs[0];
      const shapeBText = shapeBFirstRun?.type === "text" ? shapeBFirstRun.text : undefined;
      expect(shapeBText).not.toBe("Updated Text");
    });

    it("should add history entry and exit text edit", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      const historyBefore = state.documentHistory.past.length;

      state = presentationEditorReducer(state, {
        type: "UPDATE_TEXT_BODY",
        shapeId: shapeAId,
        textBody: {
          bodyProperties: {},
          paragraphs: [{ properties: {}, runs: [{ type: "text" as const, text: "Done" }] }],
        },
      });

      expect(state.documentHistory.past.length).toBe(historyBefore + 1);
      expect(state.textEdit.type).toBe("inactive");
    });
  });

  describe("UPDATE_TEXT_BODY_IN_EDIT", () => {
    it("should update text body without exiting text edit mode", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      const newTextBody = {
        bodyProperties: {},
        paragraphs: [
          {
            properties: {},
            runs: [{ type: "text" as const, text: "In-progress edit" }],
          },
        ],
      };

      state = presentationEditorReducer(state, {
        type: "UPDATE_TEXT_BODY_IN_EDIT",
        shapeId: shapeAId,
        textBody: newTextBody,
      });

      const activeSlide = state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
      const shapeA = activeSlide?.slide.shapes.find((s) => s.type === "sp" && s.nonVisual.id === shapeAId) as
        | SpShape
        | undefined;
      expect(shapeA?.textBody?.paragraphs[0]?.runs[0]).toEqual(
        expect.objectContaining({ text: "In-progress edit" }),
      );

      expect(state.textEdit.type).toBe("active");
      if (state.textEdit.type === "active") {
        expect(state.textEdit.shapeId).toBe(shapeAId);
      }
    });

    it("should add history entry while staying in text edit", () => {
      let state = presentationEditorReducer(stateWithTwoShapes, {
        type: "SELECT_SHAPE",
        shapeId: shapeAId,
        addToSelection: false,
      });
      state = presentationEditorReducer(state, {
        type: "ENTER_TEXT_EDIT",
        shapeId: shapeAId,
      });

      const historyBefore = state.documentHistory.past.length;

      state = presentationEditorReducer(state, {
        type: "UPDATE_TEXT_BODY_IN_EDIT",
        shapeId: shapeAId,
        textBody: {
          bodyProperties: {},
          paragraphs: [{ properties: {}, runs: [{ type: "text" as const, text: "step" }] }],
        },
      });

      expect(state.documentHistory.past.length).toBe(historyBefore + 1);
      expect(state.textEdit.type).toBe("active");
    });
  });
});
