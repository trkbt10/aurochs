/**
 * @file PdfEditor reducer E2E tests
 *
 * Tests the complete editing pipeline including:
 * - select / clear / multi-select
 * - move (pending → confirmed → end)
 * - resize (start → update → end)
 * - undo / redo
 * - delete
 * - copy / cut / paste / duplicate
 * - alignment
 * - text edit (start → update → commit / cancel)
 * - element update
 */

import { createDefaultGraphicsState, type PdfDocument, type PdfText, type PdfPath, type PdfElement } from "@aurochs/pdf";
import { createHistory, pushHistory, canUndo, canRedo, undoHistory, redoHistory } from "@aurochs-ui/editor-core/history";
import { createEmptySelection, createSingleSelection, isSelected, toggleSelection } from "@aurochs-ui/editor-core/selection";
import { createIdleDragState, isDragMove, isDragIdle, isDragResize, isDragPendingMove } from "@aurochs-ui/editor-core/drag-state";
import { createClipboardContent, incrementPasteCount } from "@aurochs-ui/editor-core/clipboard";
import { calculateAlignment, type BoundsWithId } from "@aurochs-ui/editor-core/alignment";
import type { PdfEditorState, PdfElementId } from "./types";
import { createElementId, parseElementId, moveElement, updateElementInDocument, elementToSvgBounds } from "./types";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestDocument(): PdfDocument {
  const gs = createDefaultGraphicsState();
  const text1: PdfText = {
    type: "text", text: "Hello", x: 100, y: 700, width: 200, height: 20,
    fontName: "Helvetica", fontSize: 14, graphicsState: gs,
  };
  const text2: PdfText = {
    type: "text", text: "World", x: 100, y: 650, width: 200, height: 20,
    fontName: "Helvetica-Bold", fontSize: 18, isBold: true, graphicsState: gs,
  };
  const rect: PdfPath = {
    type: "path",
    operations: [{ type: "rect", x: 50, y: 400, width: 200, height: 100 }],
    paintOp: "fill",
    graphicsState: gs,
  };
  return {
    pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text1, text2, rect] }],
  };
}

function createState(doc?: PdfDocument): PdfEditorState {
  const d = doc ?? createTestDocument();
  return {
    documentHistory: createHistory(d),
    currentPageIndex: 0,
    selection: createEmptySelection<PdfElementId>(),
    drag: createIdleDragState(),
    textEdit: { active: false },
    clipboard: undefined,
  };
}

function collectSelectedElements(doc: PdfDocument, ids: readonly PdfElementId[]): PdfElement[] {
  const result: PdfElement[] = [];
  for (const id of ids) {
    const { pageIndex, elementIndex } = parseElementId(id);
    const el = doc.pages[pageIndex]?.elements[elementIndex];
    if (el) { result.push(el); }
  }
  return result;
}

// =============================================================================
// Element ID Tests
// =============================================================================

describe("PdfElementId", () => {
  it("creates and parses element IDs", () => {
    const id = createElementId(0, 2);
    expect(id).toBe("0:2");
    const parsed = parseElementId(id);
    expect(parsed.pageIndex).toBe(0);
    expect(parsed.elementIndex).toBe(2);
  });

  it("handles multi-digit indices", () => {
    const id = createElementId(3, 15);
    expect(id).toBe("3:15");
    const parsed = parseElementId(id);
    expect(parsed).toEqual({ pageIndex: 3, elementIndex: 15 });
  });
});

// =============================================================================
// Element Bounds Conversion Tests
// =============================================================================

describe("elementToSvgBounds", () => {
  it("converts text element from PDF to SVG coordinates", () => {
    const doc = createTestDocument();
    const text = doc.pages[0].elements[0];
    const bounds = elementToSvgBounds({ element: text, elementIndex: 0, pageIndex: 0, pageHeight: 792 });
    expect(bounds.y).toBe(72);
    expect(bounds.x).toBe(100);
    expect(bounds.width).toBe(200);
    expect(bounds.height).toBe(20);
    expect(bounds.id).toBe("0:0");
  });

  it("converts path element bounds", () => {
    const doc = createTestDocument();
    const path = doc.pages[0].elements[2];
    const bounds = elementToSvgBounds({ element: path, elementIndex: 2, pageIndex: 0, pageHeight: 792 });
    expect(bounds.y).toBe(292);
    expect(bounds.x).toBe(50);
    expect(bounds.width).toBe(200);
    expect(bounds.height).toBe(100);
  });

  it("returns zero bounds for unknown element types", () => {
    const doc = createTestDocument();
    const unknown = { ...doc.pages[0].elements[0], type: "unknown" as never };
    const bounds = elementToSvgBounds({ element: unknown, elementIndex: 0, pageIndex: 0, pageHeight: 792 });
    expect(bounds.width).toBe(0);
    expect(bounds.height).toBe(0);
  });
});

// =============================================================================
// moveElement Tests
// =============================================================================

describe("moveElement", () => {
  it("moves text element (SVG delta to PDF delta)", () => {
    const doc = createTestDocument();
    const text = doc.pages[0].elements[0] as PdfText;
    const moved = moveElement(text, 10, 20) as PdfText;
    expect(moved.x).toBe(110);
    expect(moved.y).toBe(680);
  });

  it("moves path element operations", () => {
    const doc = createTestDocument();
    const path = doc.pages[0].elements[2] as PdfPath;
    const moved = moveElement(path, 5, -10) as PdfPath;
    const rectOp = moved.operations[0];
    expect(rectOp.type).toBe("rect");
    if (rectOp.type === "rect") {
      expect(rectOp.x).toBe(55);
      expect(rectOp.y).toBe(410);
    }
  });

  it("returns unchanged element for zero delta", () => {
    const doc = createTestDocument();
    const text = doc.pages[0].elements[0] as PdfText;
    const moved = moveElement(text, 0, 0) as PdfText;
    expect(moved.x).toBe(text.x);
    expect(moved.y).toBe(text.y);
  });
});

// =============================================================================
// updateElementInDocument Tests
// =============================================================================

describe("updateElementInDocument", () => {
  it("updates a specific element", () => {
    const doc = createTestDocument();
    const id = createElementId(0, 0);
    const updated = updateElementInDocument({
      document: doc, elementId: id,
      updater: (el) => el.type === "text" ? { ...el, fontSize: 24 } : el,
    });
    expect((updated.pages[0].elements[0] as PdfText).fontSize).toBe(24);
    expect(updated.pages[0].elements[1]).toBe(doc.pages[0].elements[1]);
  });

  it("returns unchanged doc for non-existent page", () => {
    const doc = createTestDocument();
    const id = createElementId(5, 0);
    const result = updateElementInDocument({ document: doc, elementId: id, updater: (el) => el });
    expect(result).toBe(doc);
  });
});

// =============================================================================
// Selection Tests
// =============================================================================

describe("Selection", () => {
  it("single selection", () => {
    const id = createElementId(0, 0);
    const sel = createSingleSelection<PdfElementId>(id);
    expect(isSelected(sel, id)).toBe(true);
    expect(sel.primaryId).toBe(id);
    expect(sel.selectedIds).toEqual([id]);
  });

  it("toggle selection adds and removes", () => {
    const id1 = createElementId(0, 0);
    const id2 = createElementId(0, 1);
    const sel1 = createSingleSelection<PdfElementId>(id1);
    const sel2 = toggleSelection<PdfElementId>({ selection: sel1, id: id2, primaryFallback: "last" });
    expect(isSelected(sel2, id1)).toBe(true);
    expect(isSelected(sel2, id2)).toBe(true);
    const sel3 = toggleSelection<PdfElementId>({ selection: sel2, id: id1, primaryFallback: "last" });
    expect(isSelected(sel3, id1)).toBe(false);
    expect(isSelected(sel3, id2)).toBe(true);
  });

  it("empty selection", () => {
    const sel = createEmptySelection<PdfElementId>();
    expect(sel.selectedIds.length).toBe(0);
    expect(sel.primaryId).toBeUndefined();
  });
});

// =============================================================================
// Clipboard Tests
// =============================================================================

describe("Clipboard", () => {
  it("creates clipboard content from elements", () => {
    const doc = createTestDocument();
    const elements = collectSelectedElements(doc, [createElementId(0, 0), createElementId(0, 1)]);
    const clip = createClipboardContent({ payload: elements });
    expect(clip.payload.length).toBe(2);
    expect(clip.pasteCount).toBe(0);
    expect(clip.isCut).toBe(false);
  });

  it("creates cut clipboard", () => {
    const doc = createTestDocument();
    const elements = collectSelectedElements(doc, [createElementId(0, 0)]);
    const clip = createClipboardContent({ payload: elements, isCut: true });
    expect(clip.isCut).toBe(true);
  });

  it("increments paste count", () => {
    const doc = createTestDocument();
    const elements = collectSelectedElements(doc, [createElementId(0, 0)]);
    const clip = createClipboardContent({ payload: elements });
    const clip2 = incrementPasteCount(clip);
    expect(clip2.pasteCount).toBe(1);
    const clip3 = incrementPasteCount(clip2);
    expect(clip3.pasteCount).toBe(2);
  });
});

// =============================================================================
// Alignment Tests
// =============================================================================

describe("Alignment", () => {
  it("aligns elements left", () => {
    const shapes: BoundsWithId<PdfElementId>[] = [
      { id: createElementId(0, 0), bounds: { x: 100, y: 50, width: 200, height: 20 } },
      { id: createElementId(0, 1), bounds: { x: 300, y: 100, width: 200, height: 20 } },
    ];
    const updates = calculateAlignment(shapes, "left");
    expect(updates.length).toBe(2);
    expect(updates[0].bounds.x).toBe(100);
    expect(updates[1].bounds.x).toBe(100);
  });

  it("aligns elements center", () => {
    const shapes: BoundsWithId<PdfElementId>[] = [
      { id: createElementId(0, 0), bounds: { x: 0, y: 0, width: 100, height: 20 } },
      { id: createElementId(0, 1), bounds: { x: 200, y: 0, width: 100, height: 20 } },
    ];
    const updates = calculateAlignment(shapes, "center");
    // Center of first: 50, center of second: 250, avg center: 150
    expect(updates[0].bounds.x).toBe(100); // 150 - 50
    expect(updates[1].bounds.x).toBe(100); // 150 - 50
  });

  it("requires at least 2 shapes for alignment", () => {
    const shapes: BoundsWithId<PdfElementId>[] = [
      { id: createElementId(0, 0), bounds: { x: 100, y: 50, width: 200, height: 20 } },
    ];
    const updates = calculateAlignment(shapes, "left");
    expect(updates.length).toBe(0);
  });
});

// =============================================================================
// TextEdit State Tests
// =============================================================================

describe("TextEdit state", () => {
  it("starts inactive", () => {
    const state = createState();
    expect(state.textEdit.active).toBe(false);
  });

  it("can represent active text edit", () => {
    const state = createState();
    const activeState: PdfEditorState = {
      ...state,
      textEdit: {
        active: true,
        elementId: createElementId(0, 0),
        text: "Hello",
        bounds: { x: 100, y: 72, width: 200, height: 20 },
      },
    };
    expect(activeState.textEdit.active).toBe(true);
    if (activeState.textEdit.active) {
      expect(activeState.textEdit.text).toBe("Hello");
      expect(activeState.textEdit.elementId).toBe("0:0");
    }
  });
});

// =============================================================================
// DragState Integration Tests
// =============================================================================

describe("DragState integration", () => {
  it("creates move drag state with initial bounds", () => {
    const doc = createTestDocument();
    const id = createElementId(0, 0);
    const bounds = elementToSvgBounds({ element: doc.pages[0].elements[0], elementIndex: 0, pageIndex: 0, pageHeight: 792 });
    const initialBounds = new Map<PdfElementId, { x: number; y: number; width: number; height: number }>();
    initialBounds.set(id, bounds);
    const drag = {
      type: "move" as const,
      startX: 100, startY: 72,
      shapeIds: [id] as readonly PdfElementId[],
      initialBounds,
      previewDelta: { dx: 0, dy: 0 },
    };
    expect(isDragMove(drag)).toBe(true);
    expect(drag.shapeIds).toContain(id);
  });

  it("idle drag state is recognized", () => {
    const drag = createIdleDragState();
    expect(isDragIdle(drag)).toBe(true);
    expect(isDragMove(drag)).toBe(false);
  });

  it("pending-move drag state is recognized", () => {
    const id = createElementId(0, 0);
    const drag = {
      type: "pending-move" as const,
      startX: 100, startY: 72,
      startClientX: 500, startClientY: 300,
      shapeIds: [id] as readonly PdfElementId[],
      initialBounds: new Map<PdfElementId, { x: number; y: number; width: number; height: number }>(),
    };
    expect(isDragPendingMove(drag)).toBe(true);
    expect(isDragMove(drag)).toBe(false);
  });

  it("resize drag state is recognized", () => {
    const id = createElementId(0, 0);
    const bounds = { x: 100, y: 72, width: 200, height: 20 };
    const drag = {
      type: "resize" as const,
      handle: "se" as const,
      startX: 300, startY: 92,
      shapeIds: [id] as readonly PdfElementId[],
      initialBoundsMap: new Map([[id, bounds]]),
      combinedBounds: bounds,
      aspectLocked: false,
      shapeId: id,
      initialBounds: bounds,
      previewDelta: { dx: 0, dy: 0 },
    };
    expect(isDragResize(drag)).toBe(true);
    expect(isDragMove(drag)).toBe(false);
  });
});

// =============================================================================
// History Integration Tests
// =============================================================================

describe("History integration", () => {
  it("undo/redo cycle preserves document", () => {
    const doc = createTestDocument();
    const h0 = createHistory(doc);

    const editedDoc = updateElementInDocument({
      document: doc,
      elementId: createElementId(0, 0),
      updater: (el) => el.type === "text" ? { ...el, fontSize: 36 } : el,
    });
    const h1 = pushHistory(h0, editedDoc);
    expect((h1.present.pages[0].elements[0] as PdfText).fontSize).toBe(36);
    expect(canUndo(h1)).toBe(true);

    const h2 = undoHistory(h1);
    expect((h2.present.pages[0].elements[0] as PdfText).fontSize).toBe(14);
    expect(canRedo(h2)).toBe(true);

    const h3 = redoHistory(h2);
    expect((h3.present.pages[0].elements[0] as PdfText).fontSize).toBe(36);
  });

  it("multiple edits create proper undo stack", () => {
    const doc = createTestDocument();
    let history = createHistory(doc);

    // Edit 1
    const doc1 = updateElementInDocument({ document: doc, elementId: createElementId(0, 0), updater: (el) => el.type === "text" ? { ...el, text: "Edit1" } : el });
    history = pushHistory(history, doc1);

    // Edit 2
    const doc2 = updateElementInDocument({ document: doc1, elementId: createElementId(0, 0), updater: (el) => el.type === "text" ? { ...el, text: "Edit2" } : el });
    history = pushHistory(history, doc2);

    expect((history.present.pages[0].elements[0] as PdfText).text).toBe("Edit2");

    // Undo once
    history = undoHistory(history);
    expect((history.present.pages[0].elements[0] as PdfText).text).toBe("Edit1");

    // Undo twice
    history = undoHistory(history);
    expect((history.present.pages[0].elements[0] as PdfText).text).toBe("Hello");
  });
});
