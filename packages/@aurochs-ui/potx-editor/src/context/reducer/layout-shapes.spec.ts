/**
 * @file Layout shape editing e2e tests
 *
 * Tests the full lifecycle of shape operations in potx-editor:
 * creation, selection, deletion, text editing, placeholder editing,
 * keyboard shortcuts, context menu, and undo/redo.
 *
 * Tests are reducer-level (pure function) to avoid dual-React resolution
 * issues while covering the same state transitions that the UI triggers.
 */

import type { Shape, SpShape, CxnShape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { ThemeEditorState, ThemeEditorAction } from "../types";
import { themeEditorReducer, createInitialThemeEditorState } from "./index";
import {
  createSpShape,
  createTextBox,
  createConnector,
  createShapeFromMode,
  createBoundsFromDrag,
  resetShapeCounter,
  generateShapeId,
} from "@aurochs-ui/ooxml-components";
import type { CreationMode, ShapeBounds } from "@aurochs-ui/ooxml-components";

// =============================================================================
// Test Helpers
// =============================================================================

function createBaseState(): ThemeEditorState {
  return createInitialThemeEditorState({
    colorScheme: { dk1: "000000", lt1: "FFFFFF", dk2: "333333", lt2: "EEEEEE", accent1: "4472C4", accent2: "ED7D31" },
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

function makeTextBox(id?: string): SpShape {
  const shapeId = (id ?? generateShapeId()) as ShapeId;
  return createTextBox(shapeId, DEFAULT_BOUNDS);
}

function makeConnector(id?: string): CxnShape {
  const shapeId = (id ?? generateShapeId()) as ShapeId;
  return createConnector(shapeId, { x: px(0), y: px(0), width: px(100), height: px(0) });
}

function makeSpWithPlaceholder(id: string, phType: string, phIdx?: number): SpShape {
  const base = makeRect(id);
  return {
    ...base,
    placeholder: { type: phType as SpShape["placeholder"] extends { type?: infer T } ? T : never, idx: phIdx },
  } as SpShape;
}

function makeSpWithTextBody(id: string, text: string): SpShape {
  const base = makeRect(id);
  return {
    ...base,
    textBody: {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text" as const, text }] }],
    },
  } as SpShape;
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  resetShapeCounter();
});

// ---------------------------------------------------------------------------
// Shape Creation via drag
// ---------------------------------------------------------------------------

describe("Shape creation", () => {
  it("creates a rectangle shape via ADD_LAYOUT_SHAPE", () => {
    const state = withLayout(createBaseState());
    const loaded = withShapes(state, []);
    const rect = makeRect("rect-1");

    const next = reduce(loaded, { type: "ADD_LAYOUT_SHAPE", shape: rect });

    expect(next.layoutEdit.layoutShapes).toHaveLength(1);
    expect(next.layoutEdit.layoutShapes[0]).toEqual(rect);
    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual(["rect-1"]);
    expect(next.layoutEdit.isDirty).toBe(true);
  });

  it("resets creation mode to select after ADD_LAYOUT_SHAPE", () => {
    const state = withLayout(createBaseState());
    const loaded = withShapes(state, []);
    const withMode = reduce(loaded, { type: "SET_CREATION_MODE", mode: { type: "shape", preset: "rect" } });

    expect(withMode.creationMode.type).toBe("shape");

    const next = reduce(withMode, { type: "ADD_LAYOUT_SHAPE", shape: makeRect("r") });

    expect(next.creationMode.type).toBe("select");
  });

  it("creates a textbox shape", () => {
    const state = withShapes(withLayout(createBaseState()), []);
    const tb = makeTextBox("tb-1");
    const next = reduce(state, { type: "ADD_LAYOUT_SHAPE", shape: tb });

    const added = next.layoutEdit.layoutShapes[0] as SpShape;
    expect(added.type).toBe("sp");
    expect(added.nonVisual.textBox).toBe(true);
    expect(added.textBody).toBeDefined();
    expect(added.textBody!.paragraphs).toHaveLength(1);
  });

  it("creates a connector shape", () => {
    const state = withShapes(withLayout(createBaseState()), []);
    const cxn = makeConnector("cxn-1");
    const next = reduce(state, { type: "ADD_LAYOUT_SHAPE", shape: cxn });

    expect(next.layoutEdit.layoutShapes[0].type).toBe("cxnSp");
  });

  it("createShapeFromMode returns shapes for shape/textbox/connector modes", () => {
    const bounds = createBoundsFromDrag({ startX: px(10), startY: px(20), endX: px(200), endY: px(150) });

    const rectShape = createShapeFromMode({ type: "shape", preset: "rect" }, bounds);
    expect(rectShape).toBeDefined();
    expect(rectShape!.type).toBe("sp");

    const tbShape = createShapeFromMode({ type: "textbox" }, bounds);
    expect(tbShape).toBeDefined();
    expect((tbShape as SpShape).nonVisual.textBox).toBe(true);

    const cxnShape = createShapeFromMode({ type: "connector" }, bounds);
    expect(cxnShape).toBeDefined();
    expect(cxnShape!.type).toBe("cxnSp");
  });

  it("createShapeFromMode returns undefined for select/picture modes", () => {
    const bounds = createBoundsFromDrag({ startX: px(0), startY: px(0), endX: px(100), endY: px(100) });
    expect(createShapeFromMode({ type: "select" }, bounds)).toBeUndefined();
    expect(createShapeFromMode({ type: "picture" }, bounds)).toBeUndefined();
  });

  it("createBoundsFromDrag normalizes negative dimensions", () => {
    const bounds = createBoundsFromDrag({ startX: px(200), startY: px(200), endX: px(50), endY: px(50) });
    expect(bounds.x as number).toBe(50);
    expect(bounds.y as number).toBe(50);
    expect(bounds.width as number).toBe(150);
    expect(bounds.height as number).toBe(150);
  });

  it("createBoundsFromDrag enforces minimum 10px size", () => {
    const bounds = createBoundsFromDrag({ startX: px(100), startY: px(100), endX: px(102), endY: px(103) });
    expect(bounds.width as number).toBe(10);
    expect(bounds.height as number).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Creation mode
// ---------------------------------------------------------------------------

describe("Creation mode", () => {
  it("defaults to select mode", () => {
    const state = createBaseState();
    expect(state.creationMode.type).toBe("select");
  });

  it("SET_CREATION_MODE changes mode", () => {
    const state = createBaseState();
    const next = reduce(state, { type: "SET_CREATION_MODE", mode: { type: "shape", preset: "ellipse" } });
    expect(next.creationMode).toEqual({ type: "shape", preset: "ellipse" });
  });

  it("SET_CREATION_MODE to non-select clears selection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("r")]);
    const selected = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "r" as ShapeId, addToSelection: false });
    expect(selected.layoutEdit.layoutSelection.selectedIds).toEqual(["r"]);

    const next = reduce(selected, { type: "SET_CREATION_MODE", mode: { type: "shape", preset: "rect" } });
    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual([]);
  });

  it("SET_CREATION_MODE to select does not clear selection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("r")]);
    const selected = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "r" as ShapeId, addToSelection: false });
    const next = reduce(selected, { type: "SET_CREATION_MODE", mode: { type: "select" } });
    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual(["r"]);
  });

  const POTX_MODES: CreationMode[] = [
    { type: "shape", preset: "rect" },
    { type: "shape", preset: "roundRect" },
    { type: "shape", preset: "ellipse" },
    { type: "shape", preset: "triangle" },
    { type: "shape", preset: "rightArrow" },
    { type: "textbox" },
    { type: "connector" },
  ];

  it.each(POTX_MODES)("supports creation mode: $type", (mode) => {
    const state = reduce(createBaseState(), { type: "SET_CREATION_MODE", mode });
    expect(state.creationMode).toEqual(mode);
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe("Shape selection", () => {
  it("selects a single shape", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b")]);
    const next = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });

    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual(["a"]);
    expect(next.layoutEdit.layoutSelection.primaryId).toBe("a");
  });

  it("adds to selection with addToSelection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b")]);
    const s1 = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const s2 = reduce(s1, { type: "SELECT_LAYOUT_SHAPE", shapeId: "b" as ShapeId, addToSelection: true });

    expect(s2.layoutEdit.layoutSelection.selectedIds).toEqual(["a", "b"]);
    expect(s2.layoutEdit.layoutSelection.primaryId).toBe("b");
  });

  it("toggles selection off with toggle", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b")]);
    const s1 = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const s2 = reduce(s1, { type: "SELECT_LAYOUT_SHAPE", shapeId: "b" as ShapeId, addToSelection: true });
    const s3 = reduce(s2, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: true, toggle: true });

    expect(s3.layoutEdit.layoutSelection.selectedIds).toEqual(["b"]);
  });

  it("selects multiple shapes via SELECT_MULTIPLE_LAYOUT_SHAPES", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b"), makeRect("c")]);
    const next = reduce(state, { type: "SELECT_MULTIPLE_LAYOUT_SHAPES", shapeIds: ["a" as ShapeId, "c" as ShapeId] });

    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual(["a", "c"]);
  });

  it("clears selection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a")]);
    const selected = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const cleared = reduce(selected, { type: "CLEAR_LAYOUT_SHAPE_SELECTION" });

    expect(cleared.layoutEdit.layoutSelection.selectedIds).toEqual([]);
    expect(cleared.layoutEdit.layoutSelection.primaryId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Selection source (click vs marquee)
// ---------------------------------------------------------------------------

describe("Selection source", () => {
  it("defaults to click", () => {
    const state = createBaseState();
    expect(state.layoutEdit.selectionSource).toBe("click");
  });

  it("click selection sets source to click", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a")]);
    const next = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    expect(next.layoutEdit.selectionSource).toBe("click");
  });

  it("shift+click preserves click source", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b")]);
    const s1 = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const s2 = reduce(s1, { type: "SELECT_LAYOUT_SHAPE", shapeId: "b" as ShapeId, addToSelection: true });
    expect(s2.layoutEdit.selectionSource).toBe("click");
    expect(s2.layoutEdit.layoutSelection.selectedIds).toEqual(["a", "b"]);
  });

  it("marquee selection sets source to marquee", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b"), makeRect("c")]);
    const next = reduce(state, { type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: ["a" as ShapeId, "b" as ShapeId], additive: false });

    expect(next.layoutEdit.selectionSource).toBe("marquee");
    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual(["a", "b"]);
    // Marquee selection has no primary — it's a group, not individual focus
    expect(next.layoutEdit.layoutSelection.primaryId).toBeUndefined();
  });

  it("clicking a shape in marquee selection changes source to click and sets primaryId", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b")]);
    const marquee = reduce(state, { type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: ["a" as ShapeId, "b" as ShapeId], additive: false });
    expect(marquee.layoutEdit.selectionSource).toBe("marquee");
    expect(marquee.layoutEdit.layoutSelection.primaryId).toBeUndefined();

    // Click on "a" within the existing selection → focuses "a"
    const focused = reduce(marquee, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: true });
    expect(focused.layoutEdit.selectionSource).toBe("click");
    expect(focused.layoutEdit.layoutSelection.primaryId).toBe("a");
    // Both shapes still selected
    expect(focused.layoutEdit.layoutSelection.selectedIds).toEqual(["a", "b"]);
  });

  it("additive marquee merges with existing selection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b"), makeRect("c")]);
    const s1 = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const s2 = reduce(s1, { type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: ["b" as ShapeId, "c" as ShapeId], additive: true });

    expect(s2.layoutEdit.layoutSelection.selectedIds).toEqual(["a", "b", "c"]);
    expect(s2.layoutEdit.selectionSource).toBe("marquee");
  });

  it("empty non-additive marquee clears selection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a")]);
    const selected = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const next = reduce(selected, { type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: [], additive: false });

    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual([]);
  });

  it("empty additive marquee preserves existing selection", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a")]);
    const selected = reduce(state, { type: "SELECT_LAYOUT_SHAPE", shapeId: "a" as ShapeId, addToSelection: false });
    const next = reduce(selected, { type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: [], additive: true });

    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual(["a"]);
  });

  it("CLEAR_LAYOUT_SHAPE_SELECTION resets source to click", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b")]);
    const marquee = reduce(state, { type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: ["a" as ShapeId, "b" as ShapeId], additive: false });
    const cleared = reduce(marquee, { type: "CLEAR_LAYOUT_SHAPE_SELECTION" });

    expect(cleared.layoutEdit.selectionSource).toBe("click");
  });
});

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

describe("Shape deletion", () => {
  it("deletes selected shapes", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a"), makeRect("b"), makeRect("c")]);
    const next = reduce(state, { type: "DELETE_LAYOUT_SHAPES", shapeIds: ["a" as ShapeId, "c" as ShapeId] });

    expect(next.layoutEdit.layoutShapes).toHaveLength(1);
    expect((next.layoutEdit.layoutShapes[0] as SpShape).nonVisual.id).toBe("b");
    expect(next.layoutEdit.layoutSelection.selectedIds).toEqual([]);
    expect(next.layoutEdit.isDirty).toBe(true);
  });

  it("deletes nothing when no matching IDs", () => {
    const shapes = [makeRect("a")];
    const state = withShapes(withLayout(createBaseState()), shapes);
    const next = reduce(state, { type: "DELETE_LAYOUT_SHAPES", shapeIds: ["nonexistent" as ShapeId] });

    expect(next.layoutEdit.layoutShapes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Text editing
// ---------------------------------------------------------------------------

describe("Text editing", () => {
  it("enters text edit on sp shape with textBody", () => {
    const sp = makeSpWithTextBody("t1", "Hello");
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId });

    expect(next.layoutEdit.textEdit.type).toBe("active");
    if (next.layoutEdit.textEdit.type === "active") {
      expect(next.layoutEdit.textEdit.shapeId).toBe("t1");
      expect(next.layoutEdit.textEdit.initialTextBody.paragraphs[0].runs[0]).toEqual({ type: "text", text: "Hello" });
      expect(next.layoutEdit.textEdit.bounds.x).toBe(sp.properties.transform!.x);
    }
  });

  it("enters text edit on sp shape without textBody (creates empty)", () => {
    const sp = makeRect("r1");
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "r1" as ShapeId });

    expect(next.layoutEdit.textEdit.type).toBe("active");
    if (next.layoutEdit.textEdit.type === "active") {
      expect(next.layoutEdit.textEdit.initialTextBody.paragraphs[0].runs[0]).toEqual({ type: "text", text: "" });
    }
  });

  it("does not enter text edit on connector", () => {
    const cxn = makeConnector("c1");
    const state = withShapes(withLayout(createBaseState()), [cxn]);

    const next = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "c1" as ShapeId });

    expect(next.layoutEdit.textEdit.type).toBe("inactive");
  });

  it("exits text edit", () => {
    const sp = makeSpWithTextBody("t1", "Hello");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const editing = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId });

    const next = reduce(editing, { type: "EXIT_LAYOUT_TEXT_EDIT" });

    expect(next.layoutEdit.textEdit.type).toBe("inactive");
  });

  it("commits text edit and updates shape textBody", () => {
    const sp = makeSpWithTextBody("t1", "Hello");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const editing = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId });

    const newTextBody = {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text" as const, text: "Updated" }] }],
    };
    const next = reduce(editing, { type: "COMMIT_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId, textBody: newTextBody });

    expect(next.layoutEdit.textEdit.type).toBe("inactive");
    const updated = next.layoutEdit.layoutShapes[0] as SpShape;
    expect(updated.textBody!.paragraphs[0].runs[0]).toEqual({ type: "text", text: "Updated" });
    expect(next.layoutEdit.isDirty).toBe(true);
  });

  it("text edit resets when switching layouts", () => {
    const sp = makeSpWithTextBody("t1", "Hello");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const editing = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId });

    const next = reduce(editing, { type: "SELECT_LAYOUT", layoutPath: "ppt/slideLayouts/slideLayout2.xml" });

    expect(next.layoutEdit.textEdit.type).toBe("inactive");
  });
});

// ---------------------------------------------------------------------------
// Placeholder editing
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

    // Connector doesn't have placeholder, shape unchanged
    expect(next.layoutEdit.layoutShapes[0].type).toBe("cxnSp");
  });

  it("placeholder change creates undo history entry", () => {
    const sp = makeRect("s1");
    const state = withShapes(withLayout(createBaseState()), [sp]);

    const next = reduce(state, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "s1" as ShapeId,
      placeholder: { type: "subTitle" },
    });

    // Undo should restore original state
    const undone = reduce(next, { type: "UNDO" });
    const restored = undone.layoutEdit.layoutShapes[0] as SpShape;
    expect(restored.placeholder).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

describe("Undo / Redo", () => {
  it("undoes shape addition", () => {
    const state = withShapes(withLayout(createBaseState()), []);
    const added = reduce(state, { type: "ADD_LAYOUT_SHAPE", shape: makeRect("r") });

    expect(added.layoutEdit.layoutShapes).toHaveLength(1);

    const undone = reduce(added, { type: "UNDO" });
    expect(undone.layoutEdit.layoutShapes).toHaveLength(0);
  });

  it("redoes shape addition", () => {
    const state = withShapes(withLayout(createBaseState()), []);
    const added = reduce(state, { type: "ADD_LAYOUT_SHAPE", shape: makeRect("r") });
    const undone = reduce(added, { type: "UNDO" });
    const redone = reduce(undone, { type: "REDO" });

    expect(redone.layoutEdit.layoutShapes).toHaveLength(1);
  });

  it("undoes shape deletion", () => {
    const shapes = [makeRect("a"), makeRect("b")];
    const state = withShapes(withLayout(createBaseState()), shapes);
    const deleted = reduce(state, { type: "DELETE_LAYOUT_SHAPES", shapeIds: ["a" as ShapeId] });

    expect(deleted.layoutEdit.layoutShapes).toHaveLength(1);

    const undone = reduce(deleted, { type: "UNDO" });
    expect(undone.layoutEdit.layoutShapes).toHaveLength(2);
  });

  it("undoes text edit commit", () => {
    const sp = makeSpWithTextBody("t1", "Original");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const editing = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId });
    const committed = reduce(editing, {
      type: "COMMIT_LAYOUT_TEXT_EDIT",
      shapeId: "t1" as ShapeId,
      textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Changed" }] }] },
    });

    const text = (committed.layoutEdit.layoutShapes[0] as SpShape).textBody!.paragraphs[0].runs[0];
    expect(text).toEqual({ type: "text", text: "Changed" });

    const undone = reduce(committed, { type: "UNDO" });
    const restoredText = (undone.layoutEdit.layoutShapes[0] as SpShape).textBody!.paragraphs[0].runs[0];
    expect(restoredText).toEqual({ type: "text", text: "Original" });
  });

  it("undoes placeholder change", () => {
    const sp = makeRect("s1");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const changed = reduce(state, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "s1" as ShapeId,
      placeholder: { type: "title" },
    });

    expect((changed.layoutEdit.layoutShapes[0] as SpShape).placeholder?.type).toBe("title");

    const undone = reduce(changed, { type: "UNDO" });
    expect((undone.layoutEdit.layoutShapes[0] as SpShape).placeholder).toBeUndefined();
  });

  it("ignores UNDO when no history", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a")]);
    const undone = reduce(state, { type: "UNDO" });
    // Should not crash, state unchanged
    expect(undone.layoutEdit.layoutShapes).toHaveLength(1);
  });

  it("ignores REDO when no future", () => {
    const state = withShapes(withLayout(createBaseState()), [makeRect("a")]);
    const redone = reduce(state, { type: "REDO" });
    expect(redone.layoutEdit.layoutShapes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle (e2e scenario)
// ---------------------------------------------------------------------------

describe("Full lifecycle", () => {
  it("create → select → edit placeholder → edit text → delete → undo → redo", () => {
    // 1. Start with empty layout
    const s0 = withShapes(withLayout(createBaseState()), []);
    expect(s0.layoutEdit.layoutShapes).toHaveLength(0);

    // 2. Switch to rect creation mode
    const s1 = reduce(s0, { type: "SET_CREATION_MODE", mode: { type: "shape", preset: "rect" } });
    expect(s1.creationMode).toEqual({ type: "shape", preset: "rect" });

    // 3. Add a shape (simulates drag creation completing)
    const rect = makeRect("lifecycle-rect");
    const s2 = reduce(s1, { type: "ADD_LAYOUT_SHAPE", shape: rect });
    expect(s2.layoutEdit.layoutShapes).toHaveLength(1);
    expect(s2.creationMode.type).toBe("select"); // reset after add
    expect(s2.layoutEdit.layoutSelection.selectedIds).toEqual(["lifecycle-rect"]);

    // 4. Set placeholder type to "title"
    const s3 = reduce(s2, {
      type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER",
      shapeId: "lifecycle-rect" as ShapeId,
      placeholder: { type: "title", idx: 0 },
    });
    expect((s3.layoutEdit.layoutShapes[0] as SpShape).placeholder?.type).toBe("title");

    // 5. Double-click to enter text edit
    const s4 = reduce(s3, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "lifecycle-rect" as ShapeId });
    expect(s4.layoutEdit.textEdit.type).toBe("active");

    // 6. Commit text
    const s5 = reduce(s4, {
      type: "COMMIT_LAYOUT_TEXT_EDIT",
      shapeId: "lifecycle-rect" as ShapeId,
      textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "Title Text" }] }] },
    });
    expect(s5.layoutEdit.textEdit.type).toBe("inactive");
    expect((s5.layoutEdit.layoutShapes[0] as SpShape).textBody!.paragraphs[0].runs[0]).toEqual({ type: "text", text: "Title Text" });

    // 7. Delete the shape
    const s6 = reduce(s5, { type: "DELETE_LAYOUT_SHAPES", shapeIds: ["lifecycle-rect" as ShapeId] });
    expect(s6.layoutEdit.layoutShapes).toHaveLength(0);

    // 8. Undo deletion → shape returns
    const s7 = reduce(s6, { type: "UNDO" });
    expect(s7.layoutEdit.layoutShapes).toHaveLength(1);
    expect((s7.layoutEdit.layoutShapes[0] as SpShape).textBody!.paragraphs[0].runs[0]).toEqual({ type: "text", text: "Title Text" });

    // 9. Redo deletion → shape gone again
    const s8 = reduce(s7, { type: "REDO" });
    expect(s8.layoutEdit.layoutShapes).toHaveLength(0);
  });

  it("add textbox → double-click → type text → commit → verify", () => {
    const s0 = withShapes(withLayout(createBaseState()), []);

    // Add textbox
    const tb = makeTextBox("tb-lifecycle");
    const s1 = reduce(s0, { type: "ADD_LAYOUT_SHAPE", shape: tb });
    expect(s1.layoutEdit.layoutShapes).toHaveLength(1);

    // Enter text edit
    const s2 = reduce(s1, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "tb-lifecycle" as ShapeId });
    expect(s2.layoutEdit.textEdit.type).toBe("active");

    // Commit text
    const s3 = reduce(s2, {
      type: "COMMIT_LAYOUT_TEXT_EDIT",
      shapeId: "tb-lifecycle" as ShapeId,
      textBody: { bodyProperties: {}, paragraphs: [{ properties: {}, runs: [{ type: "text", text: "My Text" }] }] },
    });

    const shape = s3.layoutEdit.layoutShapes[0] as SpShape;
    expect(shape.textBody!.paragraphs[0].runs[0]).toEqual({ type: "text", text: "My Text" });
    expect(shape.nonVisual.textBox).toBe(true);
  });

  it("add multiple shapes → select all → delete all → undo restores all", () => {
    const s0 = withShapes(withLayout(createBaseState()), []);

    const s1 = reduce(s0, { type: "ADD_LAYOUT_SHAPE", shape: makeRect("m1") });
    const s2 = reduce(s1, { type: "ADD_LAYOUT_SHAPE", shape: makeRect("m2") });
    const s3 = reduce(s2, { type: "ADD_LAYOUT_SHAPE", shape: makeTextBox("m3") });
    expect(s3.layoutEdit.layoutShapes).toHaveLength(3);

    // Select all
    const s4 = reduce(s3, {
      type: "SELECT_MULTIPLE_LAYOUT_SHAPES",
      shapeIds: ["m1" as ShapeId, "m2" as ShapeId, "m3" as ShapeId],
    });
    expect(s4.layoutEdit.layoutSelection.selectedIds).toHaveLength(3);

    // Delete all
    const s5 = reduce(s4, { type: "DELETE_LAYOUT_SHAPES", shapeIds: ["m1" as ShapeId, "m2" as ShapeId, "m3" as ShapeId] });
    expect(s5.layoutEdit.layoutShapes).toHaveLength(0);

    // Undo restores all three
    const s6 = reduce(s5, { type: "UNDO" });
    expect(s6.layoutEdit.layoutShapes).toHaveLength(3);
  });

  it("creation mode escape resets to select", () => {
    // Simulating Escape key: the keyboard handler dispatches SET_CREATION_MODE
    const s0 = reduce(createBaseState(), { type: "SET_CREATION_MODE", mode: { type: "shape", preset: "ellipse" } });
    expect(s0.creationMode.type).toBe("shape");

    const s1 = reduce(s0, { type: "SET_CREATION_MODE", mode: { type: "select" } });
    expect(s1.creationMode.type).toBe("select");
  });

  it("escape during text edit exits text edit", () => {
    const sp = makeSpWithTextBody("t1", "Hello");
    const state = withShapes(withLayout(createBaseState()), [sp]);
    const editing = reduce(state, { type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: "t1" as ShapeId });
    expect(editing.layoutEdit.textEdit.type).toBe("active");

    // Simulating Escape: keyboard handler dispatches EXIT_LAYOUT_TEXT_EDIT
    const exited = reduce(editing, { type: "EXIT_LAYOUT_TEXT_EDIT" });
    expect(exited.layoutEdit.textEdit.type).toBe("inactive");
  });

  it("placeholder cycling: none → title → body → none", () => {
    const sp = makeRect("cycle");
    const s0 = withShapes(withLayout(createBaseState()), [sp]);

    // Set to title
    const s1 = reduce(s0, { type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER", shapeId: "cycle" as ShapeId, placeholder: { type: "title" } });
    expect((s1.layoutEdit.layoutShapes[0] as SpShape).placeholder?.type).toBe("title");

    // Change to body
    const s2 = reduce(s1, { type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER", shapeId: "cycle" as ShapeId, placeholder: { type: "body" } });
    expect((s2.layoutEdit.layoutShapes[0] as SpShape).placeholder?.type).toBe("body");

    // Remove placeholder
    const s3 = reduce(s2, { type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER", shapeId: "cycle" as ShapeId, placeholder: undefined });
    expect((s3.layoutEdit.layoutShapes[0] as SpShape).placeholder).toBeUndefined();

    // Undo all three changes
    const u1 = reduce(s3, { type: "UNDO" });
    expect((u1.layoutEdit.layoutShapes[0] as SpShape).placeholder?.type).toBe("body");
    const u2 = reduce(u1, { type: "UNDO" });
    expect((u2.layoutEdit.layoutShapes[0] as SpShape).placeholder?.type).toBe("title");
    const u3 = reduce(u2, { type: "UNDO" });
    expect((u3.layoutEdit.layoutShapes[0] as SpShape).placeholder).toBeUndefined();
  });
});
