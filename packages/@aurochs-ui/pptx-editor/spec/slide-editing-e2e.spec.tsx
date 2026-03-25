/**
 * @file E2E integration test verifying editor UI reflects editing operations
 *
 * Renders SlideCanvas with real reducer-driven state and verifies:
 * - Shape hit areas (data-shape-id) appear in DOM after creation
 * - Selection boxes appear when shapes are selected
 * - Hit areas disappear after deletion
 * - Selection box bounds reflect drag preview during move/resize/rotate
 * - After commit, shape hit areas reflect new positions/dimensions
 *
 * Tests all element types: textbox, shape (rect/ellipse), table, chart, diagram.
 */

// @vitest-environment jsdom

/* eslint-disable custom/no-as-outside-guard, no-restricted-syntax -- Test file */

// jsdom lacks SVG text measurement APIs — stub them for rendering tests
if (typeof globalThis.SVGElement !== "undefined") {
  const proto = globalThis.SVGElement.prototype as Record<string, unknown>;
  if (!proto.getComputedTextLength) {
    proto.getComputedTextLength = function () { return 0; };
  }
  if (!proto.getSubStringLength) {
    proto.getSubStringLength = function () { return 0; };
  }
  if (!proto.getNumberOfChars) {
    proto.getNumberOfChars = function () { return 0; };
  }
  if (!proto.getBBox) {
    proto.getBBox = function () { return { x: 0, y: 0, width: 0, height: 0 }; };
  }
}

import { render } from "@testing-library/react";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import { getDefaultBoundsForMode } from "@aurochs-ui/ooxml-components";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import {
  presentationEditorReducer,
  createPresentationEditorState,
} from "../src/context/presentation/editor/reducer/reducer";
import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../src/context/presentation/editor/types";
import { createShapeFromMode } from "@aurochs-ui/pptx-slide-canvas/shape/factory";
import { createTestDocument } from "../src/context/presentation/editor/reducer/test-fixtures";
import { collectShapeRenderData } from "@aurochs-ui/pptx-slide-canvas/shape/traverse";
import { SlideCanvas } from "@aurochs-ui/pptx-slide-canvas/slide/SlideCanvas";
import { prepareSlide } from "../src/resource/register-slide-resources";

// =============================================================================
// Helpers
// =============================================================================

function dispatchAll(state: PresentationEditorState, actions: PresentationEditorAction[]): PresentationEditorState {
  for (const action of actions) {
    state = presentationEditorReducer(state, action);
  }
  return state;
}

function getActiveSlide(state: PresentationEditorState) {
  return state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
}

function shapeId(shape: Shape): ShapeId {
  if (!("nonVisual" in shape)) {throw new Error("Shape missing nonVisual");}
  return shape.nonVisual.id;
}

function createContextMenuActions() {
  return {
    hasSelection: false,
    hasClipboard: false,
    isMultiSelect: false,
    canGroup: false,
    canUngroup: false,
    canAlign: false,
    canDistribute: false,
    copy: () => undefined,
    cut: () => undefined,
    paste: () => undefined,
    duplicateSelected: () => undefined,
    deleteSelected: () => undefined,
    bringToFront: () => undefined,
    bringForward: () => undefined,
    sendBackward: () => undefined,
    sendToBack: () => undefined,
    group: () => undefined,
    ungroup: () => undefined,
    alignLeft: () => undefined,
    alignCenter: () => undefined,
    alignRight: () => undefined,
    alignTop: () => undefined,
    alignMiddle: () => undefined,
    alignBottom: () => undefined,
    distributeHorizontally: () => undefined,
    distributeVertically: () => undefined,
  };
}

/** Find a shape by nonVisual.id, or undefined if not found or id is undefined */
function findShapeByNonVisualId(shapes: Shape[], id: string | undefined): Shape | undefined {
  if (!id) {return undefined;}
  return shapes.find((s) => "nonVisual" in s && s.nonVisual.id === id);
}

/**
 * Render the SlideCanvas with the given editor state and return query helpers.
 */
function renderCanvas(state: PresentationEditorState) {
  const activeSlide = getActiveSlide(state);
  const slide = activeSlide?.slide ?? { shapes: [] };
  const doc = state.documentHistory.present;

  const selectedShapes: Shape[] = [];
  for (const id of state.shapeSelection.selectedIds) {
    const shape = slide.shapes.find((s) => "nonVisual" in s && s.nonVisual.id === id);
    if (shape) {selectedShapes.push(shape);}
  }
  const primaryShape = findShapeByNonVisualId(slide.shapes, state.shapeSelection.primaryId);

  // Populate ResourceStore for editor-created charts/diagrams (mimics PresentationEditor useMemo)
  const resourceStore = createResourceStore();
  prepareSlide(slide, resourceStore);

  const result = render(
    <SlideCanvas
      slide={slide}
      selection={state.shapeSelection}
      drag={state.drag}
      width={doc.slideWidth}
      height={doc.slideHeight}
      primaryShape={primaryShape}
      selectedShapes={selectedShapes}
      contextMenuActions={createContextMenuActions()}
      resourceStore={resourceStore}
      onSelect={() => undefined}
      onSelectMultiple={() => undefined}
      onClearSelection={() => undefined}
      onStartMove={() => undefined}
      onStartResize={() => undefined}
      onStartRotate={() => undefined}
      onDoubleClick={() => undefined}
    />,
  );

  return {
    container: result.container,
    /** All hit area rect elements with data-shape-id (excludes renderer g elements) */
    getHitAreas: () => result.container.querySelectorAll<SVGRectElement>("rect[data-shape-id]"),
    /** Get hit area rect for a specific shape ID */
    getHitArea: (id: ShapeId) => result.container.querySelector<SVGRectElement>(`rect[data-shape-id="${id}"]`),
    /** Get all SVG rects that look like selection boxes (stroke, no fill) */
    getSelectionBoxes: () => {
      const allRects = result.container.querySelectorAll<SVGRectElement>("svg rect");
      return Array.from(allRects).filter((rect) => {
        const fill = rect.getAttribute("fill");
        const stroke = rect.getAttribute("stroke");
        const pointerEvents = rect.getAttribute("pointer-events") ?? rect.style.pointerEvents;
        // Selection boxes have fill="none", a non-transparent stroke, and pointer-events="none"
        return fill === "none" && stroke && stroke !== "none" && pointerEvents === "none";
      });
    },
    unmount: result.unmount,
    rerender: result.rerender,
  };
}

// =============================================================================
// Element Definitions
// =============================================================================

type ElementDef = {
  name: string;
  mode: CreationMode;
};

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

describe("Slide Editing E2E - UI Rendering", () => {
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
  // 1. CREATE → hit area appears in DOM
  // ===========================================================================

  describe("CREATE: hit area appears", () => {
    for (const element of ELEMENTS) {
      it(`should render a hit area for created ${element.name}`, () => {
        const { state, id } = createElement(element);
        const { getHitArea, getHitAreas, unmount } = renderCanvas(state);

        expect(getHitAreas().length).toBe(1);
        const hitArea = getHitArea(id);
        expect(hitArea).not.toBeNull();
        expect(hitArea!.getAttribute("data-shape-id")).toBe(id);

        unmount();
      });
    }
  });

  // ===========================================================================
  // 2. SELECT → selection box appears
  // ===========================================================================

  describe("SELECT: selection box appears", () => {
    for (const element of ELEMENTS) {
      it(`should render a selection box when ${element.name} is selected`, () => {
        const { state, id } = createElement(element);

        // Shape is already selected after CREATE_SHAPE
        expect(state.shapeSelection.selectedIds).toContain(id);

        const { getSelectionBoxes, unmount } = renderCanvas(state);
        const selectionBoxes = getSelectionBoxes();

        // At least one selection box should exist
        expect(selectionBoxes.length).toBeGreaterThanOrEqual(1);

        unmount();
      });

      it(`should NOT render a selection box when ${element.name} is deselected`, () => {
        const { state } = createElement(element);

        const deselected = presentationEditorReducer(state, { type: "CLEAR_SHAPE_SELECTION" });
        expect(deselected.shapeSelection.selectedIds).toHaveLength(0);

        const { getSelectionBoxes, unmount } = renderCanvas(deselected);
        const selectionBoxes = getSelectionBoxes();
        expect(selectionBoxes.length).toBe(0);

        unmount();
      });
    }
  });

  // ===========================================================================
  // 3. DELETE → hit area disappears from DOM
  // ===========================================================================

  describe("DELETE: hit area disappears", () => {
    for (const element of ELEMENTS) {
      it(`should remove hit area when ${element.name} is deleted`, () => {
        const { state, id } = createElement(element);

        const deleted = presentationEditorReducer(state, {
          type: "DELETE_SHAPES",
          shapeIds: [id],
        });

        const { getHitAreas, getHitArea, unmount } = renderCanvas(deleted);
        expect(getHitAreas().length).toBe(0);
        expect(getHitArea(id)).toBeNull();

        unmount();
      });
    }
  });

  // ===========================================================================
  // 4. MOVE COMMIT → hit area position updates
  // ===========================================================================

  describe("MOVE COMMIT: hit area position updates", () => {
    for (const element of ELEMENTS) {
      it(`should update hit area position after moving ${element.name}`, () => {
        const { state, id } = createElement(element);

        // Get initial hit area position
        const { getHitArea: getInitialHit, unmount: unmountInitial } = renderCanvas(state);
        const initialHitArea = getInitialHit(id)!;
        const initialX = Number(initialHitArea.getAttribute("x"));
        const initialY = Number(initialHitArea.getAttribute("y"));
        unmountInitial();

        // Perform move commit
        const moved = dispatchAll(state, [
          { type: "START_MOVE", startX: px(initialX), startY: px(initialY) },
          { type: "PREVIEW_MOVE", dx: px(50), dy: px(30) },
          { type: "COMMIT_DRAG" },
        ]);

        // Verify hit area moved
        const { getHitArea: getMovedHit, unmount: unmountMoved } = renderCanvas(moved);
        const movedHitArea = getMovedHit(id)!;
        const movedX = Number(movedHitArea.getAttribute("x"));
        const movedY = Number(movedHitArea.getAttribute("y"));

        expect(movedX).toBeCloseTo(initialX + 50, 0);
        expect(movedY).toBeCloseTo(initialY + 30, 0);

        unmountMoved();
      });
    }
  });

  // ===========================================================================
  // 5. RESIZE COMMIT → hit area dimensions update
  // ===========================================================================

  describe("RESIZE COMMIT: hit area dimensions update", () => {
    for (const element of ELEMENTS) {
      it(`should update hit area dimensions after resizing ${element.name}`, () => {
        const { state, id } = createElement(element);

        // Get initial dimensions
        const { getHitArea: getInitialHit, unmount: unmountInitial } = renderCanvas(state);
        const initialHitArea = getInitialHit(id)!;
        const initialWidth = Number(initialHitArea.getAttribute("width"));
        const initialHeight = Number(initialHitArea.getAttribute("height"));
        unmountInitial();

        // Resize from SE handle
        const resized = dispatchAll(state, [
          { type: "START_RESIZE", handle: "se", startX: px(200), startY: px(200), aspectLocked: false },
          { type: "PREVIEW_RESIZE", dx: px(60), dy: px(40) },
          { type: "COMMIT_DRAG" },
        ]);

        // Verify hit area resized
        const { getHitArea: getResizedHit, unmount: unmountResized } = renderCanvas(resized);
        const resizedHitArea = getResizedHit(id)!;
        const resizedWidth = Number(resizedHitArea.getAttribute("width"));
        const resizedHeight = Number(resizedHitArea.getAttribute("height"));

        expect(resizedWidth).toBeCloseTo(initialWidth + 60, 0);
        expect(resizedHeight).toBeCloseTo(initialHeight + 40, 0);

        unmountResized();
      });
    }
  });

  // ===========================================================================
  // 6. ROTATE COMMIT → hit area parent g has rotation transform
  // ===========================================================================

  describe("ROTATE COMMIT: rotation reflects in hit area group transform", () => {
    for (const element of ELEMENTS) {
      it(`should reflect rotation in hit area group transform for ${element.name}`, () => {
        const { state, id } = createElement(element);

        // Get initial shape transform for angle calculation
        const activeSlide = getActiveSlide(state)!;
        const renderData = collectShapeRenderData(activeSlide.slide.shapes);
        const shapeData = renderData.find((r) => r.id === id)!;
        const centerX = shapeData.x + shapeData.width / 2;
        const centerY = shapeData.y + shapeData.height / 2;

        const startX = centerX;
        const startY = shapeData.y - 50;
        const startAngle = Math.atan2(startY - centerY, startX - centerX) * (180 / Math.PI);

        // Rotate by 45 degrees
        const rotated = dispatchAll(state, [
          { type: "START_ROTATE", startX: px(startX), startY: px(startY) },
          { type: "PREVIEW_ROTATE", currentAngle: deg(startAngle + 45) },
          { type: "COMMIT_DRAG" },
        ]);

        // Verify rotation in DOM via the hit area's parent group transform
        const { getHitArea, unmount } = renderCanvas(rotated);
        const hitArea = getHitArea(id)!;
        const parentG = hitArea.parentElement as unknown as SVGGElement;
        const transform = parentG.getAttribute("transform") ?? "";

        // The parent g should have a rotate transform
        expect(transform).toMatch(/rotate\(/);
        // The rotation value should be 45 degrees
        expect(transform).toContain("45");

        unmount();
      });
    }
  });

  // ===========================================================================
  // 7. UNDO → UI restores previous state
  // ===========================================================================

  describe("UNDO: UI restores previous rendering", () => {
    for (const element of ELEMENTS) {
      it(`should restore hit area position after undoing move of ${element.name}`, () => {
        const { state, id } = createElement(element);

        // Get initial position
        const { getHitArea: getInitialHit, unmount: unmountInitial } = renderCanvas(state);
        const initialX = Number(getInitialHit(id)!.getAttribute("x"));
        const initialY = Number(getInitialHit(id)!.getAttribute("y"));
        unmountInitial();

        // Move
        let s = dispatchAll(state, [
          { type: "START_MOVE", startX: px(initialX), startY: px(initialY) },
          { type: "PREVIEW_MOVE", dx: px(100), dy: px(100) },
          { type: "COMMIT_DRAG" },
        ]);

        // Undo
        s = presentationEditorReducer(s, { type: "UNDO" });

        const { getHitArea, unmount } = renderCanvas(s);
        const restoredX = Number(getHitArea(id)!.getAttribute("x"));
        const restoredY = Number(getHitArea(id)!.getAttribute("y"));

        expect(restoredX).toBeCloseTo(initialX, 0);
        expect(restoredY).toBeCloseTo(initialY, 0);

        unmount();
      });

      it(`should remove hit area after undoing creation of ${element.name}`, () => {
        const { state, id } = createElement(element);

        // Undo creation
        const undone = presentationEditorReducer(state, { type: "UNDO" });

        const { getHitAreas, getHitArea, unmount } = renderCanvas(undone);
        expect(getHitAreas().length).toBe(0);
        expect(getHitArea(id)).toBeNull();

        unmount();
      });
    }
  });

  // ===========================================================================
  // 8. MOVE PREVIEW → selection box reflects preview (SlideCanvas computes
  //    selectedBounds using applyDragPreview)
  // ===========================================================================

  describe("MOVE PREVIEW: selection box reflects drag preview", () => {
    for (const element of ELEMENTS) {
      it(`should show selection box at preview position during move of ${element.name}`, () => {
        const { state, id } = createElement(element);

        // Get initial position from rendered hit area
        const { getHitArea: getInitialHit, unmount: unmountInitial } = renderCanvas(state);
        const initialHitArea = getInitialHit(id)!;
        const initialX = Number(initialHitArea.getAttribute("x"));
        const initialY = Number(initialHitArea.getAttribute("y"));
        unmountInitial();

        // Start move and preview
        const previewing = dispatchAll(state, [
          { type: "START_MOVE", startX: px(initialX), startY: px(initialY) },
          { type: "PREVIEW_MOVE", dx: px(80), dy: px(60) },
        ]);

        // The selection box should use applyDragPreview to show at preview position.
        // SlideCanvas internally computes selectedBounds using applyDragPreview.
        const { getHitArea, getSelectionBoxes, unmount } = renderCanvas(previewing);
        const hitArea = getHitArea(id)!;
        const hitX = Number(hitArea.getAttribute("x"));
        const hitY = Number(hitArea.getAttribute("y"));

        // Hit area stays at original position (preview doesn't mutate document)
        expect(hitX).toBeCloseTo(initialX, 0);
        expect(hitY).toBeCloseTo(initialY, 0);

        // Selection box should exist at the preview position
        const selectionBoxes = getSelectionBoxes();
        expect(selectionBoxes.length).toBeGreaterThanOrEqual(1);

        // Find the selection box - it should be offset by the preview delta
        const selBox = selectionBoxes[0];
        const selX = Number(selBox.getAttribute("x"));
        const selY = Number(selBox.getAttribute("y"));

        expect(selX).toBeCloseTo(initialX + 80, 0);
        expect(selY).toBeCloseTo(initialY + 60, 0);

        unmount();
      });
    }
  });

  // ===========================================================================
  // 9. Multiple elements → correct hit area count
  // ===========================================================================

  describe("Multiple elements", () => {
    it("should render hit areas for all created elements", () => {
      let state = baseState;

      const ids: ShapeId[] = [];
      for (const element of ELEMENTS) {
        const bounds = getDefaultBoundsForMode(element.mode, px(50 + ids.length * 100), px(50));
        const shape = createShapeFromMode(element.mode, bounds)!;
        ids.push(shapeId(shape));
        state = presentationEditorReducer(state, { type: "CREATE_SHAPE", shape });
      }

      const { getHitAreas, unmount } = renderCanvas(state);
      expect(getHitAreas().length).toBe(ELEMENTS.length);

      unmount();
    });

    it("should remove only deleted element's hit area", () => {
      // Create two elements
      const { state: s1, id: id1 } = createElement(ELEMENTS[0]);
      const bounds2 = getDefaultBoundsForMode(ELEMENTS[1].mode, px(300), px(200));
      const shape2 = createShapeFromMode(ELEMENTS[1].mode, bounds2)!;
      const id2 = shapeId(shape2);
      let s2 = presentationEditorReducer(s1, { type: "CREATE_SHAPE", shape: shape2 });

      // Delete first element only
      s2 = presentationEditorReducer(s2, { type: "DELETE_SHAPES", shapeIds: [id1] });

      const { getHitAreas, getHitArea, unmount } = renderCanvas(s2);
      expect(getHitAreas().length).toBe(1);
      expect(getHitArea(id1)).toBeNull();
      expect(getHitArea(id2)).not.toBeNull();

      unmount();
    });
  });

  // ===========================================================================
  // 10. Combined workflow → UI reflects full lifecycle
  // ===========================================================================

  describe("Combined workflow: create → move → resize → delete", () => {
    for (const element of ELEMENTS) {
      it(`should reflect full lifecycle for ${element.name}`, () => {
        // Create
        const { state: s1, id } = createElement(element);

        const { getHitAreas: getHit1, unmount: u1 } = renderCanvas(s1);
        expect(getHit1().length).toBe(1);
        u1();

        // Get initial position
        const activeSlide = getActiveSlide(s1)!;
        const renderData = collectShapeRenderData(activeSlide.slide.shapes);
        const initial = renderData.find((r) => r.id === id)!;

        // Move
        const s2 = dispatchAll(s1, [
          { type: "START_MOVE", startX: px(initial.x), startY: px(initial.y) },
          { type: "PREVIEW_MOVE", dx: px(50), dy: px(30) },
          { type: "COMMIT_DRAG" },
        ]);

        const { getHitArea: getHit2, unmount: u2 } = renderCanvas(s2);
        expect(Number(getHit2(id)!.getAttribute("x"))).toBeCloseTo(initial.x + 50, 0);
        expect(Number(getHit2(id)!.getAttribute("y"))).toBeCloseTo(initial.y + 30, 0);
        u2();

        // Resize
        const s3 = dispatchAll(s2, [
          { type: "START_RESIZE", handle: "se", startX: px(200), startY: px(200), aspectLocked: false },
          { type: "PREVIEW_RESIZE", dx: px(40), dy: px(20) },
          { type: "COMMIT_DRAG" },
        ]);

        const { getHitArea: getHit3, unmount: u3 } = renderCanvas(s3);
        expect(Number(getHit3(id)!.getAttribute("width"))).toBeCloseTo(initial.width + 40, 0);
        expect(Number(getHit3(id)!.getAttribute("height"))).toBeCloseTo(initial.height + 20, 0);
        u3();

        // Delete
        const s4 = presentationEditorReducer(s3, { type: "DELETE_SHAPES", shapeIds: [id] });

        const { getHitAreas: getHit4, unmount: u4 } = renderCanvas(s4);
        expect(getHit4().length).toBe(0);
        u4();

        // Undo delete → element reappears
        const s5 = presentationEditorReducer(s4, { type: "UNDO" });

        const { getHitAreas: getHit5, getHitArea: getHit5ById, unmount: u5 } = renderCanvas(s5);
        expect(getHit5().length).toBe(1);
        expect(getHit5ById(id)).not.toBeNull();
        u5();
      });
    }
  });

  // ===========================================================================
  // 11. Diagram rendering: [Diagram] placeholder must NOT appear
  // ===========================================================================

  describe("Diagram rendering: no [Diagram] placeholder", () => {
    const DIAGRAM_TYPES = ["process", "cycle", "hierarchy", "relationship"] as const;

    for (const diagramType of DIAGRAM_TYPES) {
      it(`should NOT render [Diagram] placeholder for ${diagramType} diagram`, () => {
        const mode: CreationMode = { type: "diagram", diagramType };
        const { state } = createElement({ name: `diagram (${diagramType})`, mode });

        const { container, unmount } = renderCanvas(state);

        // [Diagram] placeholder text must not exist
        const textElements = container.querySelectorAll("text");
        const placeholderText = Array.from(textElements).find(
          (el) => el.textContent === "[Diagram]",
        );
        expect(placeholderText).toBeUndefined();

        // data-diagram-content should exist (shapes rendered)
        const diagramContent = container.querySelector("[data-diagram-content]");
        expect(diagramContent).not.toBeNull();

        unmount();
      });
    }

    it("should throw when ResourceStore is empty (no silent fallback)", () => {
      const mode: CreationMode = { type: "diagram", diagramType: "process" };
      const bounds = getDefaultBoundsForMode(mode, px(100), px(100));
      const shape = createShapeFromMode(mode, bounds)!;
      const state = presentationEditorReducer(baseState, { type: "CREATE_SHAPE", shape });
      const activeSlide = getActiveSlide(state);
      const slide = activeSlide?.slide ?? { shapes: [] };
      const doc = state.documentHistory.present;

      // Intentionally do NOT populate ResourceStore → must throw, not silently show placeholder
      expect(() => {
        render(
          <SlideCanvas
            slide={slide}
            selection={state.shapeSelection}
            drag={state.drag}
            width={doc.slideWidth}
            height={doc.slideHeight}
            primaryShape={undefined}
            selectedShapes={[]}
            contextMenuActions={createContextMenuActions()}
            onSelect={() => undefined}
            onSelectMultiple={() => undefined}
            onClearSelection={() => undefined}
            onStartMove={() => undefined}
            onStartResize={() => undefined}
            onStartRotate={() => undefined}
          />,
        );
      }).toThrow("DiagramContainer");
    });
  });
});
