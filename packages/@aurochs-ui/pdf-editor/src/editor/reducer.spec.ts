/**
 * @file PDF editor reducer tests
 *
 * Tests every reducer action directly against pdfEditorReducer.
 */

import { createDefaultGraphicsState, type PdfDocument, type PdfText, type PdfPath } from "@aurochs/pdf";
import { canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import { isSelected } from "@aurochs-ui/editor-core/selection";
import { isDragMove, isDragIdle, isDragResize, isDragPendingMove } from "@aurochs-ui/editor-core/drag-state";
import { pdfEditorReducer, createInitialState } from "./reducer";
import type { PdfEditorAction } from "./reducer";
import type { PdfEditorState, PdfElementId } from "./types";
import { createElementId } from "./types";

// =============================================================================
// Fixtures
// =============================================================================

function createTestDoc(): PdfDocument {
  const gs = createDefaultGraphicsState();
  const text1: PdfText = { type: "text", text: "Hello", x: 100, y: 700, width: 200, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs };
  const text2: PdfText = { type: "text", text: "World", x: 300, y: 600, width: 150, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs };
  const rect: PdfPath = { type: "path", operations: [{ type: "rect", x: 50, y: 400, width: 200, height: 100 }], paintOp: "fill", graphicsState: gs };
  return { pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text1, text2, rect] }] };
}

function apply(state: PdfEditorState, ...actions: PdfEditorAction[]): PdfEditorState {
  return actions.reduce(pdfEditorReducer, state);
}

const id0 = createElementId(0, 0);
const id1 = createElementId(0, 1);
const id2 = createElementId(0, 2);

// =============================================================================
// Selection
// =============================================================================

describe("reducer: Selection", () => {
  it("SELECT single element", () => {
    const s = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    expect(isSelected(s.selection, id0)).toBe(true);
    expect(s.selection.primaryId).toBe(id0);
    expect(s.selection.selectedIds.length).toBe(1);
  });

  it("SELECT with addToSelection toggles", () => {
    const s0 = createInitialState(createTestDoc());
    const s1 = apply(s0, { type: "SELECT", elementId: id0, addToSelection: false });
    const s2 = apply(s1, { type: "SELECT", elementId: id1, addToSelection: true });
    expect(isSelected(s2.selection, id0)).toBe(true);
    expect(isSelected(s2.selection, id1)).toBe(true);
  });

  it("CLEAR_SELECTION resets selection and drag", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "CLEAR_SELECTION" });
    expect(s1.selection.selectedIds.length).toBe(0);
    expect(isDragIdle(s1.drag)).toBe(true);
  });
});

// =============================================================================
// Page navigation
// =============================================================================

describe("reducer: SET_PAGE", () => {
  it("changes page and clears selection", () => {
    const doc: PdfDocument = { pages: [
      { pageNumber: 1, width: 612, height: 792, elements: [] },
      { pageNumber: 2, width: 612, height: 792, elements: [] },
    ]};
    const s0 = apply(createInitialState(doc), { type: "SELECT", elementId: createElementId(0, 0), addToSelection: false });
    const s1 = apply(s0, { type: "SET_PAGE", pageIndex: 1 });
    expect(s1.currentPageIndex).toBe(1);
    expect(s1.selection.selectedIds.length).toBe(0);
  });
});

// =============================================================================
// Delete
// =============================================================================

describe("reducer: DELETE_SELECTED", () => {
  it("removes selected elements and pushes history", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "DELETE_SELECTED" });
    expect(s1.documentHistory.present.pages[0].elements.length).toBe(2);
    expect(s1.selection.selectedIds.length).toBe(0);
    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  it("no-op when nothing selected", () => {
    const s0 = createInitialState(createTestDoc());
    const s1 = apply(s0, { type: "DELETE_SELECTED" });
    expect(s1).toBe(s0);
  });
});

// =============================================================================
// Undo / Redo
// =============================================================================

describe("reducer: UNDO / REDO", () => {
  it("UNDO reverts last change", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "DELETE_SELECTED" });
    expect(s1.documentHistory.present.pages[0].elements.length).toBe(2);
    const s2 = apply(s1, { type: "UNDO" });
    expect(s2.documentHistory.present.pages[0].elements.length).toBe(3);
  });

  it("REDO re-applies undone change", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "DELETE_SELECTED" });
    const s2 = apply(s1, { type: "UNDO" });
    const s3 = apply(s2, { type: "REDO" });
    expect(s3.documentHistory.present.pages[0].elements.length).toBe(2);
  });

  it("UNDO no-op when nothing to undo", () => {
    const s0 = createInitialState(createTestDoc());
    expect(apply(s0, { type: "UNDO" })).toBe(s0);
  });

  it("REDO no-op when nothing to redo", () => {
    const s0 = createInitialState(createTestDoc());
    expect(apply(s0, { type: "REDO" })).toBe(s0);
  });
});

// =============================================================================
// Move (pending → confirmed → end)
// =============================================================================

describe("reducer: Move", () => {
  it("START_PENDING_MOVE → pending-move drag state", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300, pageHeight: 792 });
    expect(isDragPendingMove(s1.drag)).toBe(true);
  });

  it("CONFIRM_MOVE below threshold stays pending", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300, pageHeight: 792 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 501, clientY: 300 }); // 1px move < 2px threshold
    expect(isDragPendingMove(s2.drag)).toBe(true);
  });

  it("CONFIRM_MOVE above threshold transitions to move", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300, pageHeight: 792 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 510, clientY: 300 }); // 10px > threshold
    expect(isDragMove(s2.drag)).toBe(true);
  });

  it("UPDATE_MOVE updates preview delta", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300, pageHeight: 792 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 510, clientY: 300 });
    const s3 = apply(s2, { type: "UPDATE_MOVE", currentX: 150, currentY: 72 });
    if (isDragMove(s3.drag)) {
      expect(s3.drag.previewDelta.dx).toBe(50);
    }
  });

  it("END_MOVE commits move to history", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300, pageHeight: 792 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 510, clientY: 300 });
    const s3 = apply(s2, { type: "UPDATE_MOVE", currentX: 150, currentY: 72 });
    const s4 = apply(s3, { type: "END_MOVE" });
    expect(isDragIdle(s4.drag)).toBe(true);
    expect(canUndo(s4.documentHistory)).toBe(true);
    const text = s4.documentHistory.present.pages[0].elements[0] as PdfText;
    expect(text.x).toBe(150); // 100 + 50
  });

  it("END_MOVE from pending-move just clears drag", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300, pageHeight: 792 });
    const s2 = apply(s1, { type: "END_MOVE" });
    expect(isDragIdle(s2.drag)).toBe(true);
    expect(canUndo(s2.documentHistory)).toBe(false);
  });
});

// =============================================================================
// Resize
// =============================================================================

describe("reducer: Resize", () => {
  it("START_RESIZE creates resize drag state", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_RESIZE", handle: "se", startX: 300, startY: 92, pageHeight: 792 });
    expect(isDragResize(s1.drag)).toBe(true);
  });

  it("END_RESIZE with zero delta is no-op", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_RESIZE", handle: "se", startX: 300, startY: 92, pageHeight: 792 });
    const s2 = apply(s1, { type: "END_RESIZE" });
    expect(isDragIdle(s2.drag)).toBe(true);
    expect(canUndo(s2.documentHistory)).toBe(false);
  });
});

// =============================================================================
// Copy / Cut / Paste / Duplicate
// =============================================================================

describe("reducer: Clipboard", () => {
  it("COPY stores selected elements in clipboard", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "COPY" });
    expect(s1.clipboard).toBeDefined();
    expect(s1.clipboard!.payload.length).toBe(1);
    expect(s1.clipboard!.isCut).toBe(false);
  });

  it("CUT stores elements and removes from doc", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "CUT" });
    expect(s1.clipboard!.isCut).toBe(true);
    expect(s1.documentHistory.present.pages[0].elements.length).toBe(2);
    expect(s1.selection.selectedIds.length).toBe(0);
  });

  it("PASTE inserts elements with offset", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "COPY" });
    const s2 = apply(s1, { type: "PASTE" });
    expect(s2.documentHistory.present.pages[0].elements.length).toBe(4); // 3 + 1 pasted
    expect(s2.clipboard!.pasteCount).toBe(1);
  });

  it("PASTE no-op when clipboard empty", () => {
    const s0 = createInitialState(createTestDoc());
    expect(apply(s0, { type: "PASTE" })).toBe(s0);
  });

  it("DUPLICATE copies and inserts with offset", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "DUPLICATE" });
    expect(s1.documentHistory.present.pages[0].elements.length).toBe(4);
    expect(s1.selection.selectedIds.length).toBe(1);
    // New element selected (not the original)
    expect(s1.selection.primaryId).not.toBe(id0);
  });
});

// =============================================================================
// Alignment
// =============================================================================

describe("reducer: ALIGN", () => {
  it("aligns two selected elements left", () => {
    const s0 = apply(
      createInitialState(createTestDoc()),
      { type: "SELECT", elementId: id0, addToSelection: false },
      { type: "SELECT", elementId: id1, addToSelection: true },
    );
    expect(s0.selection.selectedIds.length).toBe(2);
    const s1 = apply(s0, { type: "ALIGN", alignment: "left" });
    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  it("no-op with single selection", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "ALIGN", alignment: "left" });
    expect(s1).toBe(s0);
  });
});

// =============================================================================
// Text Edit
// =============================================================================

describe("reducer: TextEdit", () => {
  it("START_TEXT_EDIT activates with text and bounds", () => {
    const s0 = createInitialState(createTestDoc());
    const s1 = apply(s0, { type: "START_TEXT_EDIT", elementId: id0, text: "Hello", bounds: { x: 100, y: 72, width: 200, height: 20 } });
    expect(s1.textEdit.active).toBe(true);
    if (s1.textEdit.active) {
      expect(s1.textEdit.text).toBe("Hello");
      expect(s1.textEdit.elementId).toBe(id0);
    }
  });

  it("UPDATE_TEXT_EDIT changes text", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "START_TEXT_EDIT", elementId: id0, text: "Hello", bounds: { x: 100, y: 72, width: 200, height: 20 } });
    const s1 = apply(s0, { type: "UPDATE_TEXT_EDIT", text: "Hello World" });
    if (s1.textEdit.active) {
      expect(s1.textEdit.text).toBe("Hello World");
    }
  });

  it("COMMIT_TEXT_EDIT saves text to document and deactivates", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "START_TEXT_EDIT", elementId: id0, text: "Changed", bounds: { x: 100, y: 72, width: 200, height: 20 } });
    const s1 = apply(s0, { type: "COMMIT_TEXT_EDIT" });
    expect(s1.textEdit.active).toBe(false);
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Changed");
    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  it("CANCEL_TEXT_EDIT deactivates without saving", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "START_TEXT_EDIT", elementId: id0, text: "Changed", bounds: { x: 100, y: 72, width: 200, height: 20 } });
    const s1 = apply(s0, { type: "CANCEL_TEXT_EDIT" });
    expect(s1.textEdit.active).toBe(false);
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Hello"); // unchanged
  });
});

// =============================================================================
// UPDATE_ELEMENT
// =============================================================================

describe("reducer: UPDATE_ELEMENT", () => {
  it("updates element and pushes history", () => {
    const s0 = createInitialState(createTestDoc());
    const s1 = apply(s0, { type: "UPDATE_ELEMENT", elementId: id0, updater: (el) => el.type === "text" ? { ...el, fontSize: 36 } : el });
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).fontSize).toBe(36);
    expect(canUndo(s1.documentHistory)).toBe(true);
  });
});
