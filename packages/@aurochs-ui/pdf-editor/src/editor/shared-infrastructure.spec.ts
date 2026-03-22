/**
 * @file Shared infrastructure integration tests
 *
 * Proves that the SAME editor-core functions used by pptx-editor work
 * identically with PDF documents. This is the E2E guarantee that the
 * shared infrastructure is truly shared, not merely copy-pasted.
 *
 * Each test explicitly imports from the SAME editor-core modules that
 * pptx-editor uses, and exercises them with PDF data types.
 */

import { createDefaultGraphicsState, type PdfDocument, type PdfText, type PdfPath } from "@aurochs/pdf";

// ---- editor-core/selection (same module as pptx-editor) ----
import {
  createEmptySelection,
  createSingleSelection,
  addToSelection,
  toggleSelection,
  isSelected,
  isSelectionEmpty,
} from "@aurochs-ui/editor-core/selection";

// ---- editor-core/history (same module as pptx-editor) ----
import { createHistory, pushHistory, undoHistory, redoHistory, canUndo, canRedo } from "@aurochs-ui/editor-core/history";

// ---- editor-core/drag-state (same module as pptx-editor) ----
import { createIdleDragState, isDragIdle, isDragMove } from "@aurochs-ui/editor-core/drag-state";
import type { MoveDragState } from "@aurochs-ui/editor-core/drag-state";

// ---- editor-core/geometry (same module as pptx-editor) ----
import { isPointInBounds, applyMovePreview } from "@aurochs-ui/editor-core/geometry";
import type { RotatedBoundsInput } from "@aurochs-ui/editor-core/geometry";

// ---- PDF-specific types ----
import type { PdfElementId } from "./types";
import { createElementId, elementToSvgBounds, moveElement, updateElementInDocument } from "./types";

// =============================================================================
// Fixtures
// =============================================================================

function createTestDoc(): PdfDocument {
  const gs = createDefaultGraphicsState();
  return {
    pages: [{
      pageNumber: 1,
      width: 612,
      height: 792,
      elements: [
        { type: "text", text: "Title", x: 72, y: 720, width: 300, height: 36, fontName: "Helvetica-Bold", fontSize: 36, graphicsState: gs } satisfies PdfText,
        { type: "text", text: "Body", x: 72, y: 680, width: 400, height: 14, fontName: "Helvetica", fontSize: 14, graphicsState: gs } satisfies PdfText,
        { type: "path", operations: [{ type: "rect", x: 72, y: 500, width: 200, height: 100 }], paintOp: "fill", graphicsState: gs } satisfies PdfPath,
      ],
    }],
  };
}

// =============================================================================
// Selection (editor-core/selection)
// =============================================================================

describe("editor-core/selection with PDF elements", () => {
  it("creates empty selection", () => {
    const sel = createEmptySelection<PdfElementId>();
    expect(isSelectionEmpty(sel)).toBe(true);
  });

  it("selects a PDF element by ID", () => {
    const id = createElementId(0, 1);
    const sel = createSingleSelection<PdfElementId>(id);
    expect(isSelected(sel, id)).toBe(true);
    expect(sel.primaryId).toBe("0:1");
  });

  it("multi-selects PDF elements", () => {
    const id1 = createElementId(0, 0);
    const id2 = createElementId(0, 2);
    const sel1 = createSingleSelection<PdfElementId>(id1);
    const sel2 = addToSelection(sel1, id2);
    expect(isSelected(sel2, id1)).toBe(true);
    expect(isSelected(sel2, id2)).toBe(true);
    expect(sel2.selectedIds.length).toBe(2);
  });

  it("toggles PDF element selection", () => {
    const id = createElementId(0, 0);
    const sel1 = createSingleSelection<PdfElementId>(id);
    const sel2 = toggleSelection<PdfElementId>({ selection: sel1, id, primaryFallback: "last" });
    expect(isSelected(sel2, id)).toBe(false);
  });
});

// =============================================================================
// History (editor-core/history)
// =============================================================================

describe("editor-core/history with PDF documents", () => {
  it("tracks PDF document changes", () => {
    const doc = createTestDoc();
    const history = createHistory(doc);
    expect(canUndo(history)).toBe(false);

    const modified = updateElementInDocument({
      document: doc,
      elementId: createElementId(0, 0),
      updater: (el) => el.type === "text" ? { ...el, fontSize: 48 } : el,
    });
    const h2 = pushHistory(history, modified);
    expect(canUndo(h2)).toBe(true);
    expect((h2.present.pages[0].elements[0] as PdfText).fontSize).toBe(48);
  });

  it("undoes PDF document change", () => {
    const doc = createTestDoc();
    const modified = updateElementInDocument({
      document: doc,
      elementId: createElementId(0, 0),
      updater: (el) => el.type === "text" ? { ...el, fontSize: 48 } : el,
    });
    const history = pushHistory(createHistory(doc), modified);
    const undone = undoHistory(history);
    expect((undone.present.pages[0].elements[0] as PdfText).fontSize).toBe(36);
  });

  it("redoes PDF document change", () => {
    const doc = createTestDoc();
    const modified = updateElementInDocument({
      document: doc,
      elementId: createElementId(0, 0),
      updater: (el) => el.type === "text" ? { ...el, fontSize: 48 } : el,
    });
    const history = pushHistory(createHistory(doc), modified);
    const undone = undoHistory(history);
    const redone = redoHistory(undone);
    expect((redone.present.pages[0].elements[0] as PdfText).fontSize).toBe(48);
  });
});

// =============================================================================
// DragState + applyMovePreview (editor-core/drag-state + geometry)
// =============================================================================

describe("editor-core/drag-state with PDF elements", () => {
  it("creates idle drag state", () => {
    const drag = createIdleDragState();
    expect(isDragIdle(drag)).toBe(true);
  });

  it("creates move drag state for PDF element", () => {
    const id = createElementId(0, 0);
    const doc = createTestDoc();
    const bounds = elementToSvgBounds({ element: doc.pages[0].elements[0], elementIndex: 0, pageIndex: 0, pageHeight: 792 });

    const drag: MoveDragState<PdfElementId> = {
      type: "move",
      startX: bounds.x,
      startY: bounds.y,
      shapeIds: [id],
      initialBounds: new Map([[id, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }]]),
      previewDelta: { dx: 50, dy: 30 },
    };

    expect(isDragMove(drag)).toBe(true);
  });

  it("applyMovePreview works with PDF element bounds", () => {
    const id = createElementId(0, 0);
    const doc = createTestDoc();
    const bounds = elementToSvgBounds({ element: doc.pages[0].elements[0], elementIndex: 0, pageIndex: 0, pageHeight: 792 });

    const baseBounds: RotatedBoundsInput = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, rotation: 0 };
    const drag: MoveDragState<PdfElementId> = {
      type: "move",
      startX: bounds.x,
      startY: bounds.y,
      shapeIds: [id],
      initialBounds: new Map([[id, baseBounds]]),
      previewDelta: { dx: 50, dy: 30 },
    };

    const preview = applyMovePreview(id, baseBounds, drag);
    expect(preview.x).toBe(bounds.x + 50);
    expect(preview.y).toBe(bounds.y + 30);
    expect(preview.width).toBe(bounds.width);
  });
});

// =============================================================================
// Hit Detection (editor-core/geometry)
// =============================================================================

describe("editor-core/geometry hit detection with PDF bounds", () => {
  it("detects point inside PDF element bounds", () => {
    const doc = createTestDoc();
    const bounds = elementToSvgBounds({ element: doc.pages[0].elements[0], elementIndex: 0, pageIndex: 0, pageHeight: 792 });
    const inside = isPointInBounds(bounds.x + 10, bounds.y + 5, { ...bounds, rotation: 0 });
    expect(inside).toBe(true);
  });

  it("detects point outside PDF element bounds", () => {
    const doc = createTestDoc();
    const bounds = elementToSvgBounds({ element: doc.pages[0].elements[0], elementIndex: 0, pageIndex: 0, pageHeight: 792 });
    const outside = isPointInBounds(0, 0, { ...bounds, rotation: 0 });
    expect(outside).toBe(false);
  });
});

// =============================================================================
// Full Pipeline: select → move → commit → undo → redo
// =============================================================================

describe("E2E: select → move → commit → undo → redo", () => {
  it("complete editing pipeline with shared infrastructure", () => {
    const doc = createTestDoc();
    const id = createElementId(0, 0);
    const originalText = doc.pages[0].elements[0] as PdfText;

    // 1. Create history
    const history = createHistory(doc);

    // 2. Select element
    const selection = createSingleSelection<PdfElementId>(id);
    expect(isSelected(selection, id)).toBe(true);

    // 3. Compute SVG bounds for hit detection
    const bounds = elementToSvgBounds({ element: originalText, elementIndex: 0, pageIndex: 0, pageHeight: 792 });
    expect(isPointInBounds(bounds.x + 10, bounds.y + 5, { ...bounds, rotation: 0 })).toBe(true);

    // 4. Create drag state
    const drag: MoveDragState<PdfElementId> = {
      type: "move",
      startX: bounds.x,
      startY: bounds.y,
      shapeIds: [id],
      initialBounds: new Map([[id, bounds]]),
      previewDelta: { dx: 100, dy: 50 },
    };

    // 5. Preview shows moved position
    const preview = applyMovePreview(id, { ...bounds, rotation: 0 }, drag);
    expect(preview.x).toBe(bounds.x + 100);
    expect(preview.y).toBe(bounds.y + 50);

    // 6. Commit move to document
    const movedDoc = updateElementInDocument({
      document: doc,
      elementId: id,
      updater: (el) => moveElement(el, 100, 50),
    });
    const movedText = movedDoc.pages[0].elements[0] as PdfText;
    expect(movedText.x).toBe(originalText.x + 100);
    expect(movedText.y).toBe(originalText.y - 50); // PDF Y is inverted

    // 7. Push to history
    const h2 = pushHistory(history, movedDoc);
    expect(canUndo(h2)).toBe(true);

    // 8. Undo restores original position
    const h3 = undoHistory(h2);
    const undoneText = h3.present.pages[0].elements[0] as PdfText;
    expect(undoneText.x).toBe(originalText.x);
    expect(undoneText.y).toBe(originalText.y);

    // 9. Redo restores moved position
    expect(canRedo(h3)).toBe(true);
    const h4 = redoHistory(h3);
    const redoneText = h4.present.pages[0].elements[0] as PdfText;
    expect(redoneText.x).toBe(originalText.x + 100);
  });
});
