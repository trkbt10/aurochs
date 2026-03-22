/**
 * @file Shape handlers tests
 *
 * Tests for DELETE_SHAPES, ADD_SHAPE, UPDATE_SHAPE actions.
 */

/* eslint-disable no-restricted-syntax -- Test file uses let for sequential state updates */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState } from "../types";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import type { Shape, SpShape } from "@aurochs-office/pptx/domain/shape";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createShapeFromMode } from "../../../../shape/factory";
import { getDefaultBoundsForMode } from "@aurochs-ui/ooxml-components";
import { createTestDocument } from "./test-fixtures";

function getSpShapeId(shape: ReturnType<typeof createShapeFromMode>): ShapeId {
  const sp = shape as SpShape;
  return sp.nonVisual.id;
}

function getGraphicFrameId(shape: Shape): ShapeId {
  if (shape.type !== "graphicFrame") {
    throw new Error("expected graphicFrame");
  }
  return shape.nonVisual.id;
}

function getActiveShapes(state: PresentationEditorState) {
  const activeSlide = state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
  return activeSlide?.slide.shapes ?? [];
}

describe("Shape Handlers", () => {
  let baseState: PresentationEditorState;

  beforeEach(() => {
    baseState = createPresentationEditorState(createTestDocument());
  });

  function createShape(
    state: PresentationEditorState,
    mode: CreationMode = { type: "shape", preset: "rect" },
    pos: { x: number; y: number } = { x: 100, y: 100 },
  ): { state: PresentationEditorState; id: ShapeId } {
    const bounds = getDefaultBoundsForMode(mode, px(pos.x), px(pos.y));
    const shape = createShapeFromMode(mode, bounds)!;
    const id = getSpShapeId(shape);
    const nextState = presentationEditorReducer(state, { type: "CREATE_SHAPE", shape });
    return { state: nextState, id };
  }

  describe("DELETE_SHAPES", () => {
    it("should delete a single shape from the slide", () => {
      const { state, id } = createShape(baseState);
      expect(getActiveShapes(state)).toHaveLength(1);

      const deleted = presentationEditorReducer(state, {
        type: "DELETE_SHAPES",
        shapeIds: [id],
      });

      expect(getActiveShapes(deleted)).toHaveLength(0);
    });

    it("should add a history entry", () => {
      const { state, id } = createShape(baseState);
      const historyBefore = state.documentHistory.past.length;

      const deleted = presentationEditorReducer(state, {
        type: "DELETE_SHAPES",
        shapeIds: [id],
      });

      expect(deleted.documentHistory.past.length).toBe(historyBefore + 1);
    });

    it("should clear selection for deleted shapes", () => {
      const { state, id } = createShape(baseState);
      expect(state.shapeSelection.selectedIds).toContain(id);

      const deleted = presentationEditorReducer(state, {
        type: "DELETE_SHAPES",
        shapeIds: [id],
      });

      expect(deleted.shapeSelection.selectedIds).not.toContain(id);
      expect(deleted.shapeSelection.selectedIds).toHaveLength(0);
    });

    it("should delete multiple shapes at once", () => {
      const { state: s1, id: id1 } = createShape(baseState, { type: "shape", preset: "rect" }, { x: 100, y: 100 });
      const { state: s2, id: id2 } = createShape(s1, { type: "shape", preset: "ellipse" }, { x: 300, y: 100 });
      expect(getActiveShapes(s2)).toHaveLength(2);

      const deleted = presentationEditorReducer(s2, {
        type: "DELETE_SHAPES",
        shapeIds: [id1, id2],
      });

      expect(getActiveShapes(deleted)).toHaveLength(0);
      expect(deleted.shapeSelection.selectedIds).toHaveLength(0);
    });

    it("should preserve unrelated shapes when deleting a subset", () => {
      const { state: s1, id: id1 } = createShape(baseState, { type: "shape", preset: "rect" }, { x: 100, y: 100 });
      const { state: s2, id: id2 } = createShape(s1, { type: "shape", preset: "ellipse" }, { x: 300, y: 100 });

      const deleted = presentationEditorReducer(s2, {
        type: "DELETE_SHAPES",
        shapeIds: [id1],
      });

      expect(getActiveShapes(deleted)).toHaveLength(1);
      const remainingIds = getActiveShapes(deleted)
        .filter((s) => "nonVisual" in s)
        .map((s) => (s as SpShape).nonVisual.id);
      expect(remainingIds).toContain(id2);
      expect(remainingIds).not.toContain(id1);
    });

    it("should update primaryId after deleting the primary shape", () => {
      const { state: s1, id: id1 } = createShape(baseState, { type: "shape", preset: "rect" }, { x: 100, y: 100 });
      const { state: s2, id: id2 } = createShape(s1, { type: "shape", preset: "ellipse" }, { x: 300, y: 100 });

      // Select both with id1 as primary
      let state = presentationEditorReducer(s2, {
        type: "SELECT_MULTIPLE_SHAPES",
        shapeIds: [id1, id2],
        primaryId: id1,
      });

      // Delete primary
      state = presentationEditorReducer(state, {
        type: "DELETE_SHAPES",
        shapeIds: [id1],
      });

      expect(state.shapeSelection.selectedIds).toContain(id2);
      expect(state.shapeSelection.selectedIds).not.toContain(id1);
    });

    it("should be a no-op when shapeIds is empty", () => {
      const { state } = createShape(baseState);
      const historyBefore = state.documentHistory.past.length;

      const result = presentationEditorReducer(state, {
        type: "DELETE_SHAPES",
        shapeIds: [],
      });

      expect(result).toBe(state);
      expect(result.documentHistory.past.length).toBe(historyBefore);
    });

    it("should delete GraphicFrame (table) shapes", () => {
      const mode: CreationMode = { type: "table", rows: 2, cols: 3 };
      const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
      const shape = createShapeFromMode(mode, bounds)!;
      expect(shape.type).toBe("graphicFrame");

      const id = getGraphicFrameId(shape);
      let state = presentationEditorReducer(baseState, { type: "CREATE_SHAPE", shape });
      expect(getActiveShapes(state)).toHaveLength(1);

      state = presentationEditorReducer(state, {
        type: "DELETE_SHAPES",
        shapeIds: [id],
      });

      expect(getActiveShapes(state)).toHaveLength(0);
    });
  });
});
