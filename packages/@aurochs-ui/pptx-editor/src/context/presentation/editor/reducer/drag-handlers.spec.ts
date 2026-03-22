/**
 * @file Drag handlers tests
 *
 * Tests for drag preview and commit actions: PREVIEW_MOVE, COMMIT_DRAG,
 * PREVIEW_RESIZE, PREVIEW_ROTATE, END_DRAG, pending drag flow.
 */

/* eslint-disable no-restricted-syntax -- Test file uses let for sequential state updates */
import { presentationEditorReducer, createPresentationEditorState } from "./reducer";
import type { PresentationEditorState } from "../types";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { SpShape } from "@aurochs-office/pptx/domain/shape";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { createShapeFromMode } from "../../../../shape/factory";
import { getDefaultBoundsForMode } from "@aurochs-ui/ooxml-components";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";
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
      const activeSlide = state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
      const updatedShape = activeSlide?.slide.shapes[0] as Shape;
      expect(updatedShape).toBeDefined();
      if (updatedShape && "transform" in updatedShape) {
        expect(updatedShape.transform.x as number).toBe(150); // 100 + 50
        expect(updatedShape.transform.y as number).toBe(130); // 100 + 30
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

  // ===========================================================================
  // Resize commit
  // ===========================================================================

  describe("Resize commit", () => {
    it("should apply resize from SE handle and add history entry", () => {
      const initialShape = stateWithShape.documentHistory.present.slides[0].slide.shapes[0];
      const initialTransform = getShapeTransform(initialShape)!;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        aspectLocked: false,
      });

      state = presentationEditorReducer(state, {
        type: "PREVIEW_RESIZE",
        dx: px(60),
        dy: px(40),
      });

      const historyBefore = state.documentHistory.past.length;
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      expect(state.documentHistory.past.length).toBe(historyBefore + 1);
      expect(state.drag.type).toBe("idle");

      const updatedShape = state.documentHistory.present.slides[0].slide.shapes[0];
      const updatedTransform = getShapeTransform(updatedShape)!;
      expect(updatedTransform.width as number).toBeCloseTo((initialTransform.width as number) + 60, 5);
      expect(updatedTransform.height as number).toBeCloseTo((initialTransform.height as number) + 40, 5);
    });

    it("should apply resize from NW handle (position and size change)", () => {
      const initialShape = stateWithShape.documentHistory.present.slides[0].slide.shapes[0];
      const initialTransform = getShapeTransform(initialShape)!;
      const initialX = initialTransform.x as number;
      const initialY = initialTransform.y as number;
      const initialWidth = initialTransform.width as number;
      const initialHeight = initialTransform.height as number;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "nw",
        startX: px(initialX),
        startY: px(initialY),
        aspectLocked: false,
      });

      state = presentationEditorReducer(state, {
        type: "PREVIEW_RESIZE",
        dx: px(-30),
        dy: px(-20),
      });

      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      const updatedTransform = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      expect(updatedTransform.x as number).toBeCloseTo(initialX - 30, 5);
      expect(updatedTransform.y as number).toBeCloseTo(initialY - 20, 5);
      expect(updatedTransform.width as number).toBeCloseTo(initialWidth + 30, 5);
      expect(updatedTransform.height as number).toBeCloseTo(initialHeight + 20, 5);
    });

    it("should enforce minimum size of 10", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;
      const initialWidth = initialTransform.width as number;
      const initialHeight = initialTransform.height as number;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        aspectLocked: false,
      });

      // Shrink way beyond zero
      state = presentationEditorReducer(state, {
        type: "PREVIEW_RESIZE",
        dx: px(-initialWidth - 100),
        dy: px(-initialHeight - 100),
      });

      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      const updatedTransform = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      expect(updatedTransform.width as number).toBeGreaterThanOrEqual(10);
      expect(updatedTransform.height as number).toBeGreaterThanOrEqual(10);
    });

    it("should not add history entry when resize delta is zero", () => {
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        aspectLocked: false,
      });

      const historyBefore = state.documentHistory.past.length;
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      expect(state.documentHistory.past.length).toBe(historyBefore);
      expect(state.drag.type).toBe("idle");
    });

    it("should preserve aspect ratio when aspectLocked is true", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;
      const initialWidth = initialTransform.width as number;
      const initialHeight = initialTransform.height as number;
      const aspectRatio = initialWidth / initialHeight;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        aspectLocked: true,
      });

      state = presentationEditorReducer(state, {
        type: "PREVIEW_RESIZE",
        dx: px(100),
        dy: px(50),
      });

      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      const updatedTransform = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      const newAspect = (updatedTransform.width as number) / (updatedTransform.height as number);
      expect(newAspect).toBeCloseTo(aspectRatio, 2);
    });
  });

  // ===========================================================================
  // Rotate commit
  // ===========================================================================

  describe("Rotate commit", () => {
    it("should apply rotation and add history entry", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;
      const cx = (initialTransform.x as number) + (initialTransform.width as number) / 2;
      const cy = (initialTransform.y as number) + (initialTransform.height as number) / 2;
      const startY = (initialTransform.y as number) - 50;
      const startAngle = Math.atan2(startY - cy, cx - cx) * (180 / Math.PI);

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_ROTATE",
        startX: px(cx),
        startY: px(startY),
      });

      state = presentationEditorReducer(state, {
        type: "PREVIEW_ROTATE",
        currentAngle: deg(startAngle + 45),
      });

      const historyBefore = state.documentHistory.past.length;
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      expect(state.documentHistory.past.length).toBe(historyBefore + 1);
      expect(state.drag.type).toBe("idle");

      const updatedTransform = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      expect(updatedTransform.rotation as number).toBe(45);
    });

    it("should not add history entry when rotation delta is zero", () => {
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_ROTATE",
        startX: px(150),
        startY: px(50),
      });

      const historyBefore = state.documentHistory.past.length;
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      expect(state.documentHistory.past.length).toBe(historyBefore);
    });

    it("should normalize rotation to 0-360 range", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;
      const cx = (initialTransform.x as number) + (initialTransform.width as number) / 2;
      const cy = (initialTransform.y as number) + (initialTransform.height as number) / 2;
      const startY = (initialTransform.y as number) - 50;
      const startAngle = Math.atan2(startY - cy, cx - cx) * (180 / Math.PI);

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_ROTATE",
        startX: px(cx),
        startY: px(startY),
      });

      // Rotate by -90 degrees
      state = presentationEditorReducer(state, {
        type: "PREVIEW_ROTATE",
        currentAngle: deg(startAngle - 90),
      });

      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      const rotation = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!.rotation as number;
      expect(rotation).toBeGreaterThanOrEqual(0);
      expect(rotation).toBeLessThan(360);
      expect(rotation).toBe(270);
    });
  });

  // ===========================================================================
  // END_DRAG (cancel without applying)
  // ===========================================================================

  describe("END_DRAG", () => {
    it("should cancel move without applying changes", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;
      const historyBefore = stateWithShape.documentHistory.past.length;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_MOVE",
        startX: px(initialTransform.x as number),
        startY: px(initialTransform.y as number),
      });

      state = presentationEditorReducer(state, {
        type: "PREVIEW_MOVE",
        dx: px(500),
        dy: px(500),
      });

      state = presentationEditorReducer(state, { type: "END_DRAG" });

      expect(state.drag.type).toBe("idle");
      const currentTransform = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      expect(currentTransform.x as number).toBe(initialTransform.x as number);
      expect(currentTransform.y as number).toBe(initialTransform.y as number);
      expect(state.documentHistory.past.length).toBe(historyBefore);
    });

    it("should cancel resize without applying changes", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        aspectLocked: false,
      });

      state = presentationEditorReducer(state, {
        type: "PREVIEW_RESIZE",
        dx: px(999),
        dy: px(999),
      });

      state = presentationEditorReducer(state, { type: "END_DRAG" });

      expect(state.drag.type).toBe("idle");
      const currentTransform = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      expect(currentTransform.width as number).toBe(initialTransform.width as number);
    });
  });

  // ===========================================================================
  // Pending drag → confirm flow
  // ===========================================================================

  describe("Pending drag flow", () => {
    it("should transition START_PENDING_MOVE → CONFIRM_MOVE → active move", () => {
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_PENDING_MOVE",
        startX: px(100),
        startY: px(100),
        startClientX: 200,
        startClientY: 200,
      });

      expect(state.drag.type).toBe("pending-move");

      state = presentationEditorReducer(state, { type: "CONFIRM_MOVE" });
      expect(state.drag.type).toBe("move");
      if (state.drag.type === "move") {
        expect(state.drag.previewDelta.dx).toEqual(px(0));
        expect(state.drag.previewDelta.dy).toEqual(px(0));
      }
    });

    it("should transition START_PENDING_RESIZE → CONFIRM_RESIZE → active resize", () => {
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_PENDING_RESIZE",
        handle: "se",
        startX: px(200),
        startY: px(200),
        startClientX: 300,
        startClientY: 300,
        aspectLocked: false,
      });

      expect(state.drag.type).toBe("pending-resize");

      state = presentationEditorReducer(state, { type: "CONFIRM_RESIZE" });
      expect(state.drag.type).toBe("resize");
    });

    it("should transition START_PENDING_ROTATE → CONFIRM_ROTATE → active rotate", () => {
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_PENDING_ROTATE",
        startX: px(150),
        startY: px(50),
        startClientX: 250,
        startClientY: 150,
      });

      expect(state.drag.type).toBe("pending-rotate");

      state = presentationEditorReducer(state, { type: "CONFIRM_ROTATE" });
      expect(state.drag.type).toBe("rotate");
    });

    it("should discard pending move on COMMIT_DRAG (no threshold reached)", () => {
      let state = presentationEditorReducer(stateWithShape, {
        type: "START_PENDING_MOVE",
        startX: px(100),
        startY: px(100),
        startClientX: 200,
        startClientY: 200,
      });

      const historyBefore = state.documentHistory.past.length;
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      expect(state.drag.type).toBe("idle");
      expect(state.documentHistory.past.length).toBe(historyBefore);
    });

    it("should complete full pending move workflow with transform update", () => {
      const initialTransform = getShapeTransform(stateWithShape.documentHistory.present.slides[0].slide.shapes[0])!;

      let state = presentationEditorReducer(stateWithShape, {
        type: "START_PENDING_MOVE",
        startX: px(initialTransform.x as number),
        startY: px(initialTransform.y as number),
        startClientX: 200,
        startClientY: 200,
      });

      state = presentationEditorReducer(state, { type: "CONFIRM_MOVE" });
      state = presentationEditorReducer(state, { type: "PREVIEW_MOVE", dx: px(75), dy: px(-25) });
      state = presentationEditorReducer(state, { type: "COMMIT_DRAG" });

      const updated = getShapeTransform(state.documentHistory.present.slides[0].slide.shapes[0])!;
      expect(updated.x as number).toBe((initialTransform.x as number) + 75);
      expect(updated.y as number).toBe((initialTransform.y as number) - 25);
    });
  });
});
