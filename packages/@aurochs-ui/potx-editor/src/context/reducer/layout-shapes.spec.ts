/**
 * @file Layout shape editing tests (reduced scope)
 *
 * Tests for potx-specific reducer actions that remain after delegating
 * canvas interaction (selection, drag, text editing, undo/redo) to
 * PresentationEditorProvider from pptx-editor.
 *
 * Covers:
 * - Placeholder editing (UPDATE_LAYOUT_SHAPE_PLACEHOLDER)
 * - Layout shape sync (SYNC_LAYOUT_SHAPES)
 * - Layout CRUD (INIT_LAYOUT_LIST, ADD_LAYOUT, DELETE_LAYOUT, etc.)
 * - Layout selection & shape loading (SELECT_LAYOUT, LOAD_LAYOUT_SHAPES)
 *
 * Shape interaction tests (selection, drag, creation, text editing, undo/redo)
 * are covered by pptx-editor's PresentationEditorContext tests.
 */

import type { Shape, SpShape, CxnShape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { ThemeEditorState, ThemeEditorAction } from "../types";
import { themeEditorReducer, createInitialThemeEditorState } from "./index";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import {
  createSpShape,
  createConnector,
  resetShapeCounter,
  generateShapeId,
} from "@aurochs-ui/ooxml-components";
import type { ShapeBounds } from "@aurochs-ui/ooxml-components";

// =============================================================================
// Test Helpers
// =============================================================================

function createBaseState(): ThemeEditorState {
  return createInitialThemeEditorState({
    colorScheme: { dk1: "000000", lt1: "FFFFFF", dk2: "333333", lt2: "EEEEEE", accent1: "4472C4", accent2: "ED7D31" },
    fontScheme: EMPTY_FONT_SCHEME,
  });
}

function withLayout(state: ThemeEditorState, layoutPath = "ppt/slideLayouts/slideLayout1.xml"): ThemeEditorState {
  return reduce(
    reduce(state, { type: "INIT_LAYOUT_LIST", layouts: [{ id: layoutPath, name: "Test Layout", type: "blank" }] }),
    { type: "SELECT_LAYOUT", layoutPath },
  );
}

function withShapes(state: ThemeEditorState, shapes: readonly Shape[]): ThemeEditorState {
  return reduce(state, {
    type: "LOAD_LAYOUT_SHAPES",
    layoutPath: state.layoutEdit.activeLayoutPath!,
    shapes,
    bundle: undefined as never,
  });
}

function reduce(state: ThemeEditorState, action: ThemeEditorAction): ThemeEditorState {
  return themeEditorReducer(state, action);
}

const DEFAULT_BOUNDS: ShapeBounds = { x: px(100), y: px(100), width: px(200), height: px(150) };

function makeRect(id?: string): SpShape {
  const shapeId = (id ?? generateShapeId()) as ShapeId;
  return createSpShape(shapeId, DEFAULT_BOUNDS, "rect");
}

function makeSpWithPlaceholder(id: string, phType: string, phIdx?: number): SpShape {
  const base = makeRect(id);
  return {
    ...base,
    placeholder: { type: phType as SpShape["placeholder"] extends { type?: infer T } ? T : never, idx: phIdx },
  } as SpShape;
}

function makeConnector(id?: string): CxnShape {
  const shapeId = (id ?? generateShapeId()) as ShapeId;
  return createConnector(shapeId, { x: px(0), y: px(0), width: px(100), height: px(0) });
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  resetShapeCounter();
});

// ---------------------------------------------------------------------------
// Placeholder Editing (potx-specific)
// ---------------------------------------------------------------------------

describe("Placeholder editing", () => {
  it("sets placeholder on a shape", () => {
    const sp = makeRect("s1");
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "s1" as ShapeId,
      placeholder: { type: "title", idx: 0 },
    });

    const updated = next.layoutEdit.layoutShapes[0] as SpShape;
    expect(updated.placeholder).toEqual({ type: "title", idx: 0 });
    expect(next.layoutEdit.isDirty).toBe(true);
  });

  it("changes placeholder type", () => {
    const sp = makeSpWithPlaceholder("s1", "title", 0);
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "s1" as ShapeId,
      placeholder: { type: "body", idx: 0 },
    });

    const updated = next.layoutEdit.layoutShapes[0] as SpShape;
    expect(updated.placeholder?.type).toBe("body");
  });

  it("removes placeholder (sets undefined)", () => {
    const sp = makeSpWithPlaceholder("s1", "title", 0);
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "s1" as ShapeId,
      placeholder: undefined,
    });

    const updated = next.layoutEdit.layoutShapes[0] as SpShape;
    expect(updated.placeholder).toBeUndefined();
  });

  it("ignores placeholder on non-sp shape", () => {
    const cxn = makeConnector("c1");
    const state = withShapes(withLayout(createBaseState()), [cxn]);

    const next = reduce(state, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "c1" as ShapeId,
      placeholder: { type: "title" },
    });

    expect(next.layoutEdit.layoutShapes[0].type).toBe("cxnSp");
  });
});

// ---------------------------------------------------------------------------
// SYNC_LAYOUT_SHAPES (from PresentationEditorContext)
// ---------------------------------------------------------------------------

describe("SYNC_LAYOUT_SHAPES", () => {
  it("updates shapes for active layout", () => {
    const sp = makeRect("s1");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const newShapes = [makeRect("s2"), makeRect("s3")];

    const next = reduce(state, {
      type: "SYNC_LAYOUT_SHAPES",
      layoutId: state.layoutEdit.activeLayoutPath!,
      shapes: newShapes,
    });

    expect(next.layoutEdit.layoutShapes).toHaveLength(2);
    expect(next.layoutEdit.isDirty).toBe(true);
  });

  it("ignores sync for inactive layout", () => {
    const sp = makeRect("s1");
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, {
      type: "SYNC_LAYOUT_SHAPES",
      layoutId: "some/other/layout.xml",
      shapes: [makeRect("s2")],
    });

    expect(next.layoutEdit.layoutShapes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Layout Selection & Loading
// ---------------------------------------------------------------------------

describe("Layout selection and loading", () => {
  it("SELECT_LAYOUT sets active path and clears shapes", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("s1")]);

    const next = reduce(state, { type: "SELECT_LAYOUT", layoutPath: "ppt/slideLayouts/slideLayout2.xml" });

    expect(next.layoutEdit.activeLayoutPath).toBe("ppt/slideLayouts/slideLayout2.xml");
    expect(next.layoutEdit.layoutShapes).toHaveLength(0);
    expect(next.layoutEdit.isDirty).toBe(false);
  });

  it("LOAD_LAYOUT_SHAPES populates shapes", () => {
    const state = withLayout(createBaseState());
    const shapes = [makeRect("s1"), makeRect("s2")];

    const next = reduce(state, {
      type: "LOAD_LAYOUT_SHAPES",
      layoutPath: state.layoutEdit.activeLayoutPath!,
      shapes,
      bundle: undefined as never,
    });

    expect(next.layoutEdit.layoutShapes).toHaveLength(2);
    expect(next.layoutEdit.isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Layout CRUD
// ---------------------------------------------------------------------------

describe("Layout CRUD", () => {
  it("INIT_LAYOUT_LIST sets layouts", () => {
    const state = createBaseState();
    const layouts = [
      { id: "l1", name: "Title", type: "title" as const },
      { id: "l2", name: "Blank", type: "blank" as const },
    ];

    const next = reduce(state, { type: "INIT_LAYOUT_LIST", layouts });

    expect(next.layoutEdit.layouts).toHaveLength(2);
  });

  it("ADD_LAYOUT appends layout", () => {
    const state = withLayout(createBaseState());

    const next = reduce(state, {
      type: "ADD_LAYOUT",
      layout: { id: "new", name: "New Layout", type: "blank" },
    });

    expect(next.layoutEdit.layouts).toHaveLength(2);
    expect(next.layoutEdit.layouts[1].id).toBe("new");
  });

  it("DELETE_LAYOUT removes layout and resolves active", () => {
    const state = reduce(
      reduce(createBaseState(), {
        type: "INIT_LAYOUT_LIST",
        layouts: [
          { id: "l1", name: "Layout 1", type: "blank" },
          { id: "l2", name: "Layout 2", type: "blank" },
        ],
      }),
      { type: "SELECT_LAYOUT", layoutPath: "l1" },
    );

    const next = reduce(state, { type: "DELETE_LAYOUT", layoutId: "l1" });

    expect(next.layoutEdit.layouts).toHaveLength(1);
    expect(next.layoutEdit.activeLayoutPath).toBe("l2");
  });

  it("DUPLICATE_LAYOUT copies layout after source", () => {
    const state = withLayout(createBaseState());

    const next = reduce(state, {
      type: "DUPLICATE_LAYOUT",
      layoutId: state.layoutEdit.layouts[0].id,
    });

    expect(next.layoutEdit.layouts).toHaveLength(2);
    expect(next.layoutEdit.layouts[1].name).toContain("(Copy)");
  });

  it("REORDER_LAYOUTS moves layout to target index", () => {
    const state = reduce(createBaseState(), {
      type: "INIT_LAYOUT_LIST",
      layouts: [
        { id: "l1", name: "Layout 1", type: "blank" },
        { id: "l2", name: "Layout 2", type: "blank" },
        { id: "l3", name: "Layout 3", type: "blank" },
      ],
    });

    const next = reduce(state, { type: "REORDER_LAYOUTS", layoutId: "l3", toIndex: 0 });

    expect(next.layoutEdit.layouts.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
  });

  it("UPDATE_LAYOUT_ATTRIBUTES updates layout metadata", () => {
    const state = withLayout(createBaseState());
    const layoutId = state.layoutEdit.layouts[0].id;

    const next = reduce(state, {
      type: "UPDATE_LAYOUT_ATTRIBUTES",
      layoutId,
      updates: { name: "Renamed Layout", matchingName: "Custom" },
    });

    expect(next.layoutEdit.layouts[0].name).toBe("Renamed Layout");
    expect(next.layoutEdit.layouts[0].matchingName).toBe("Custom");
  });
});
