/**
 * @file Drag handlers tests
 *
 * Tests for drag preview and commit actions: PREVIEW_MOVE, COMMIT_DRAG,
 * PREVIEW_RESIZE, PREVIEW_ROTATE.
 */

/* eslint-disable no-restricted-syntax -- Test file uses let for sequential state updates */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState, CreationMode } from "../types";
import type { Shape } from "@oxen/pptx/domain";
import { px, deg } from "@oxen/ooxml/domain/units";
import { createShapeFromMode, getDefaultBoundsForMode } from "../../../../shape/factory";
import { createTestDocument } from "./test-fixtures";

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
