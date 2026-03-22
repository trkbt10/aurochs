/**
 * @file Reducer integration test for slide editing operations
 *
 * Cross-cutting integration tests that individual handler specs do NOT cover:
 * - Parametrized verification across all element types (textbox, shapes, table, chart, diagram)
 * - Combined multi-step workflows (create → move → resize → rotate → delete)
 * - Full undo/redo round-trip verification
 * - Multi-select operations (simultaneous move/delete)
 *
 * Single-operation correctness for each handler is covered by colocated specs:
 *   drag-handlers.spec.ts, shape-handlers.spec.ts, creation-handlers.spec.ts,
 *   selection-handlers.spec.ts, text-edit-handlers.spec.ts
 */

/* eslint-disable no-restricted-syntax -- Test file uses let for sequential state updates */

// Test globals (describe, it, expect, beforeEach) injected by the runner
import {
  presentationEditorReducer,
  createPresentationEditorState,
} from "../src/context/presentation/editor/reducer/reducer";
import type { PresentationEditorState, PresentationEditorAction } from "../src/context/presentation/editor/types";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import { getDefaultBoundsForMode } from "@aurochs-ui/ooxml-components";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { createShapeFromMode } from "../src/shape/factory";
import { createTestDocument } from "../src/context/presentation/editor/reducer/test-fixtures";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";

// =============================================================================
// Helpers
// =============================================================================

function dispatchAll(state: PresentationEditorState, actions: PresentationEditorAction[]): PresentationEditorState {
  for (const action of actions) {
    state = presentationEditorReducer(state, action);
  }
  return state;
}

function getActiveShapes(state: PresentationEditorState): readonly Shape[] {
  const activeSlide = state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
  return activeSlide?.slide.shapes ?? [];
}

function getShapeById(state: PresentationEditorState, id: ShapeId): Shape | undefined {
  return getActiveShapes(state).find((s) => "nonVisual" in s && s.nonVisual.id === id);
}

function shapeId(shape: Shape): ShapeId {
  if (!("nonVisual" in shape)) {throw new Error("Shape missing nonVisual");}
  return shape.nonVisual.id;
}

// =============================================================================
// Element Types
// =============================================================================

type ElementDef = { name: string; mode: CreationMode };

const ELEMENTS: ElementDef[] = [
  { name: "textbox", mode: { type: "textbox" } },
  { name: "shape (rect)", mode: { type: "shape", preset: "rect" } },
  { name: "shape (ellipse)", mode: { type: "shape", preset: "ellipse" } },
  { name: "table (3x4)", mode: { type: "table", rows: 3, cols: 4 } },
  { name: "chart (bar)", mode: { type: "chart", chartType: "bar" } },
  { name: "diagram (process)", mode: { type: "diagram", diagramType: "process" } },
];

// =============================================================================
// Tests
// =============================================================================

describe("Slide Editing Operations - Integration", () => {
  let baseState: PresentationEditorState;

  beforeEach(() => {
    baseState = createPresentationEditorState(createTestDocument());
  });

  function createElement(
    element: ElementDef,
    pos: { x: number; y: number } = { x: 100, y: 100 },
  ): { state: PresentationEditorState; id: ShapeId } {
    const bounds = getDefaultBoundsForMode(element.mode, px(pos.x), px(pos.y));
    const shape = createShapeFromMode(element.mode, bounds)!;
    const state = presentationEditorReducer(baseState, { type: "CREATE_SHAPE", shape });
    return { state, id: shapeId(shape) };
  }

  // ===========================================================================
  // 1. All element types: move/resize/rotate/delete each produce correct transforms
  // ===========================================================================

  describe("Move across all element types", () => {
    for (const element of ELEMENTS) {
      it(`should move ${element.name}`, () => {
        const { state, id } = createElement(element);
        const t0 = getShapeTransform(getShapeById(state, id)!)!;

        const moved = dispatchAll(state, [
          { type: "START_MOVE", startX: px(t0.x as number), startY: px(t0.y as number) },
          { type: "PREVIEW_MOVE", dx: px(50), dy: px(30) },
          { type: "COMMIT_DRAG" },
        ]);

        const t1 = getShapeTransform(getShapeById(moved, id)!)!;
        expect(t1.x as number).toBe((t0.x as number) + 50);
        expect(t1.y as number).toBe((t0.y as number) + 30);
      });
    }
  });

  describe("Resize across all element types", () => {
    for (const element of ELEMENTS) {
      it(`should resize ${element.name}`, () => {
        const { state, id } = createElement(element);
        const t0 = getShapeTransform(getShapeById(state, id)!)!;

        const resized = dispatchAll(state, [
          { type: "START_RESIZE", handle: "se", startX: px(200), startY: px(200), aspectLocked: false },
          { type: "PREVIEW_RESIZE", dx: px(60), dy: px(40) },
          { type: "COMMIT_DRAG" },
        ]);

        const t1 = getShapeTransform(getShapeById(resized, id)!)!;
        expect(t1.width as number).toBeCloseTo((t0.width as number) + 60, 5);
        expect(t1.height as number).toBeCloseTo((t0.height as number) + 40, 5);
      });
    }
  });

  describe("Rotate across all element types", () => {
    for (const element of ELEMENTS) {
      it(`should rotate ${element.name} by 45 degrees`, () => {
        const { state, id } = createElement(element);
        const t0 = getShapeTransform(getShapeById(state, id)!)!;
        const cx = (t0.x as number) + (t0.width as number) / 2;
        const cy = (t0.y as number) + (t0.height as number) / 2;
        const startY = (t0.y as number) - 50;
        const startAngle = Math.atan2(startY - cy, cx - cx) * (180 / Math.PI);

        const rotated = dispatchAll(state, [
          { type: "START_ROTATE", startX: px(cx), startY: px(startY) },
          { type: "PREVIEW_ROTATE", currentAngle: deg(startAngle + 45) },
          { type: "COMMIT_DRAG" },
        ]);

        const t1 = getShapeTransform(getShapeById(rotated, id)!)!;
        expect(t1.rotation as number).toBe(45);
      });
    }
  });

  describe("Delete across all element types", () => {
    for (const element of ELEMENTS) {
      it(`should delete ${element.name} and allow undo`, () => {
        const { state, id } = createElement(element);

        let s = presentationEditorReducer(state, { type: "DELETE_SHAPES", shapeIds: [id] });
        expect(getActiveShapes(s)).toHaveLength(0);

        s = presentationEditorReducer(s, { type: "UNDO" });
        expect(getActiveShapes(s)).toHaveLength(1);
        expect(getShapeById(s, id)).toBeDefined();
      });
    }
  });

  // ===========================================================================
  // 2. Combined workflow: full lifecycle with undo/redo
  // ===========================================================================

  describe("Combined workflow", () => {
    for (const element of ELEMENTS) {
      it(`create → move → resize → rotate → delete for ${element.name} with full undo`, () => {
        const { state: s1, id } = createElement(element);
        const t0 = getShapeTransform(getShapeById(s1, id)!)!;

        // Move
        const s2 = dispatchAll(s1, [
          { type: "START_MOVE", startX: px(t0.x as number), startY: px(t0.y as number) },
          { type: "PREVIEW_MOVE", dx: px(50), dy: px(50) },
          { type: "COMMIT_DRAG" },
        ]);

        // Resize
        const s3 = dispatchAll(s2, [
          { type: "START_RESIZE", handle: "se", startX: px(200), startY: px(200), aspectLocked: false },
          { type: "PREVIEW_RESIZE", dx: px(30), dy: px(20) },
          { type: "COMMIT_DRAG" },
        ]);

        // Rotate
        const t2 = getShapeTransform(getShapeById(s3, id)!)!;
        const cx = (t2.x as number) + (t2.width as number) / 2;
        const cy = (t2.y as number) + (t2.height as number) / 2;
        const rotStartY = (t2.y as number) - 50;
        const startAngle = Math.atan2(rotStartY - cy, cx - cx) * (180 / Math.PI);

        const s4 = dispatchAll(s3, [
          { type: "START_ROTATE", startX: px(cx), startY: px(rotStartY) },
          { type: "PREVIEW_ROTATE", currentAngle: deg(startAngle + 90) },
          { type: "COMMIT_DRAG" },
        ]);

        // Delete
        const s5 = presentationEditorReducer(s4, { type: "DELETE_SHAPES", shapeIds: [id] });
        expect(getActiveShapes(s5)).toHaveLength(0);
        expect(s5.documentHistory.past).toHaveLength(5); // create + move + resize + rotate + delete

        // Undo all 5 steps → empty slide
        let sUndo = s5;
        for (let i = 0; i < 5; i++) {
          sUndo = presentationEditorReducer(sUndo, { type: "UNDO" });
        }
        expect(getActiveShapes(sUndo)).toHaveLength(0);
        expect(sUndo.documentHistory.past).toHaveLength(0);

        // Redo all 5 steps
        let sRedo = sUndo;
        for (let i = 0; i < 5; i++) {
          sRedo = presentationEditorReducer(sRedo, { type: "REDO" });
        }
        expect(getActiveShapes(sRedo)).toHaveLength(0); // after delete
        expect(sRedo.documentHistory.past).toHaveLength(5);
      });
    }
  });

  // ===========================================================================
  // 3. Multi-select operations
  // ===========================================================================

  describe("Multi-select operations", () => {
    it("should move multiple elements together", () => {
      const { state: s1, id: id1 } = createElement(ELEMENTS[0]);
      const bounds2 = getDefaultBoundsForMode(ELEMENTS[1].mode, px(300), px(200));
      const shape2 = createShapeFromMode(ELEMENTS[1].mode, bounds2)!;
      const id2 = shapeId(shape2);

      let s2 = presentationEditorReducer(s1, { type: "CREATE_SHAPE", shape: shape2 });
      s2 = presentationEditorReducer(s2, {
        type: "SELECT_MULTIPLE_SHAPES",
        shapeIds: [id1, id2],
        primaryId: id1,
      });

      const t1Before = getShapeTransform(getShapeById(s2, id1)!)!;
      const t2Before = getShapeTransform(getShapeById(s2, id2)!)!;

      const s3 = dispatchAll(s2, [
        { type: "START_MOVE", startX: px(200), startY: px(150) },
        { type: "PREVIEW_MOVE", dx: px(40), dy: px(60) },
        { type: "COMMIT_DRAG" },
      ]);

      const t1After = getShapeTransform(getShapeById(s3, id1)!)!;
      const t2After = getShapeTransform(getShapeById(s3, id2)!)!;
      expect(t1After.x as number).toBe((t1Before.x as number) + 40);
      expect(t1After.y as number).toBe((t1Before.y as number) + 60);
      expect(t2After.x as number).toBe((t2Before.x as number) + 40);
      expect(t2After.y as number).toBe((t2Before.y as number) + 60);
    });

    it("should delete multiple selected elements at once", () => {
      const { state: s1, id: id1 } = createElement(ELEMENTS[0]);
      const bounds2 = getDefaultBoundsForMode(ELEMENTS[3].mode, px(300), px(200));
      const shape2 = createShapeFromMode(ELEMENTS[3].mode, bounds2)!;
      const id2 = shapeId(shape2);

      let s2 = presentationEditorReducer(s1, { type: "CREATE_SHAPE", shape: shape2 });
      expect(getActiveShapes(s2)).toHaveLength(2);

      s2 = presentationEditorReducer(s2, { type: "DELETE_SHAPES", shapeIds: [id1, id2] });
      expect(getActiveShapes(s2)).toHaveLength(0);
      expect(s2.shapeSelection.selectedIds).toHaveLength(0);
    });
  });

  // ===========================================================================
  // 4. Undo/Redo round-trip for each operation type
  // ===========================================================================

  describe("Undo/Redo round-trip", () => {
    for (const element of ELEMENTS) {
      it(`should undo move and redo for ${element.name}`, () => {
        const { state, id } = createElement(element);
        const t0 = getShapeTransform(getShapeById(state, id)!)!;

        let s = dispatchAll(state, [
          { type: "START_MOVE", startX: px(t0.x as number), startY: px(t0.y as number) },
          { type: "PREVIEW_MOVE", dx: px(100), dy: px(200) },
          { type: "COMMIT_DRAG" },
        ]);

        // Undo
        s = presentationEditorReducer(s, { type: "UNDO" });
        const tUndo = getShapeTransform(getShapeById(s, id)!)!;
        expect(tUndo.x as number).toBe(t0.x as number);
        expect(tUndo.y as number).toBe(t0.y as number);

        // Redo
        s = presentationEditorReducer(s, { type: "REDO" });
        const tRedo = getShapeTransform(getShapeById(s, id)!)!;
        expect(tRedo.x as number).toBe((t0.x as number) + 100);
        expect(tRedo.y as number).toBe((t0.y as number) + 200);
      });

      it(`should undo resize for ${element.name}`, () => {
        const { state, id } = createElement(element);
        const t0 = getShapeTransform(getShapeById(state, id)!)!;

        let s = dispatchAll(state, [
          { type: "START_RESIZE", handle: "se", startX: px(200), startY: px(200), aspectLocked: false },
          { type: "PREVIEW_RESIZE", dx: px(80), dy: px(60) },
          { type: "COMMIT_DRAG" },
        ]);

        s = presentationEditorReducer(s, { type: "UNDO" });
        const tUndo = getShapeTransform(getShapeById(s, id)!)!;
        expect(tUndo.width as number).toBe(t0.width as number);
        expect(tUndo.height as number).toBe(t0.height as number);
      });
    }
  });
});
