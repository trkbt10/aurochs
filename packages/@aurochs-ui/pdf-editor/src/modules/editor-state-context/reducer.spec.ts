/**
 * @file PDF editor reducer tests
 *
 * Tests every reducer action directly against pdfEditorReducer.
 */

import { createDefaultGraphicsState, type PdfDocument, type PdfText, type PdfPath, createElementId } from "@aurochs/pdf";
import { canUndo } from "@aurochs-ui/editor-core/history";
import { isSelected } from "@aurochs-ui/editor-core/selection";
import { isDragMove, isDragIdle, isDragResize, isDragRotate, isDragPendingMove } from "@aurochs-ui/editor-core/drag-state";
import { pdfEditorReducer, createInitialState } from "./reducer";
import type { PdfEditorAction } from "./reducer";
import type { PdfEditorState } from "./types";

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
const _id2 = createElementId(0, 2);

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
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300 });
    expect(isDragPendingMove(s1.drag)).toBe(true);
  });

  it("CONFIRM_MOVE below threshold stays pending", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 501, clientY: 300 }); // 1px move < 2px threshold
    expect(isDragPendingMove(s2.drag)).toBe(true);
  });

  it("CONFIRM_MOVE above threshold transitions to move", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 510, clientY: 300 }); // 10px > threshold
    expect(isDragMove(s2.drag)).toBe(true);
  });

  it("UPDATE_MOVE updates preview delta", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300 });
    const s2 = apply(s1, { type: "CONFIRM_MOVE", clientX: 510, clientY: 300 });
    const s3 = apply(s2, { type: "UPDATE_MOVE", currentX: 150, currentY: 72 });
    if (isDragMove(s3.drag)) {
      expect(s3.drag.previewDelta.dx).toBe(50);
    }
  });

  it("END_MOVE commits move to history", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300 });
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
    const s1 = apply(s0, { type: "START_PENDING_MOVE", startX: 100, startY: 72, startClientX: 500, startClientY: 300 });
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
    const s1 = apply(s0, { type: "START_RESIZE", handle: "se", startX: 300, startY: 92 });
    expect(isDragResize(s1.drag)).toBe(true);
  });

  it("END_RESIZE with zero delta is no-op", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_RESIZE", handle: "se", startX: 300, startY: 92 });
    const s2 = apply(s1, { type: "END_RESIZE" });
    expect(isDragIdle(s2.drag)).toBe(true);
    expect(canUndo(s2.documentHistory)).toBe(false);
  });

  it("END_RESIZE on path element scales path operations", () => {
    // id2 is the rect path: { type: "rect", x: 50, y: 400, width: 200, height: 100 }
    // In SVG space (page height 792): x=50, y=792-400-100=292, w=200, h=100
    const id2 = createElementId(0, 2);
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id2, addToSelection: false });
    // Start resize from SE corner: (50+200, 292+100) = (250, 392) in SVG space
    const s1 = apply(s0, { type: "START_RESIZE", handle: "se", startX: 250, startY: 392 });
    expect(isDragResize(s1.drag)).toBe(true);
    // Drag SE handle 100px right, 50px down → new width=300, new height=150
    const s2 = apply(s1, { type: "UPDATE_RESIZE", currentX: 350, currentY: 442 });
    const s3 = apply(s2, { type: "END_RESIZE" });
    expect(isDragIdle(s3.drag)).toBe(true);
    expect(canUndo(s3.documentHistory)).toBe(true);
    const path = s3.documentHistory.present.pages[0].elements[2] as PdfPath;
    expect(path.type).toBe("path");
    const rectOp = path.operations[0];
    if (rectOp.type === "rect") {
      // Original: x=50, y=400, w=200, h=100
      // New SVG bounds: x=50, y=292, w=300, h=150
      // New PDF bounds: x=50, y=792-292-150=350, w=300, h=150
      // scaleX = 300/200 = 1.5, scaleY = 150/100 = 1.5
      expect(rectOp.width).toBeCloseTo(300, 1);
      expect(rectOp.height).toBeCloseTo(150, 1);
    }
  });

  it("END_RESIZE on text element updates text bounds", () => {
    // id0 is text1: { x: 100, y: 700, width: 200, height: 20 }
    // In SVG space: x=100, y=792-700-20=72, w=200, h=20
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_RESIZE", handle: "e", startX: 300, startY: 82 });
    const s2 = apply(s1, { type: "UPDATE_RESIZE", currentX: 400, currentY: 82 });
    const s3 = apply(s2, { type: "END_RESIZE" });
    const text = s3.documentHistory.present.pages[0].elements[0] as PdfText;
    expect(text.width).toBe(300); // 200 + 100
  });
});

// =============================================================================
// Rotate
// =============================================================================

describe("reducer: Rotate", () => {
  it("START_ROTATE creates rotate drag state", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_ROTATE", startX: 200, startY: 50 });
    expect(isDragRotate(s1.drag)).toBe(true);
  });

  it("UPDATE_ROTATE stores preview angle delta in degrees", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    // Start rotate from directly above the center of the text bounding box
    // Text SVG bounds: x=100, y=72, w=200, h=20 → center=(200, 82)
    // Start above center: (200, 50) → angle ≈ -90° (pointing up)
    const s1 = apply(s0, { type: "START_ROTATE", startX: 200, startY: 50 });
    // Move to the right of center: (250, 82) → angle ≈ 0° (pointing right)
    // This is a ~90° clockwise rotation
    const s2 = apply(s1, { type: "UPDATE_ROTATE", currentX: 250, currentY: 82 });
    if (isDragRotate(s2.drag)) {
      // The snapped angle should be 90° (snaps to 45° multiples)
      expect(s2.drag.previewAngleDelta).toBeCloseTo(90, 0);
    }
  });

  it("END_ROTATE commits rotation to history (angle applied correctly)", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_ROTATE", startX: 200, startY: 50 });
    const s2 = apply(s1, { type: "UPDATE_ROTATE", currentX: 250, currentY: 82 });
    const s3 = apply(s2, { type: "END_ROTATE" });
    expect(isDragIdle(s3.drag)).toBe(true);
    expect(canUndo(s3.documentHistory)).toBe(true);
    // Verify the element was actually rotated (CTM should have rotation component)
    const el = s3.documentHistory.present.pages[0].elements[0];
    const ctm = el.graphicsState.ctm;
    // After ~90° rotation: a≈0, b≈1 (for identity scale)
    // The rotation should be significant (close to 90°), not negligible (radians interpreted as degrees)
    const rotation = Math.atan2(ctm[1], ctm[0]) * 180 / Math.PI;
    expect(Math.abs(rotation)).toBeGreaterThan(45); // Should be ~90°, definitely not ~1.57°
  });

  it("END_ROTATE with near-zero delta is no-op", () => {
    const s0 = apply(createInitialState(createTestDoc()), { type: "SELECT", elementId: id0, addToSelection: false });
    const s1 = apply(s0, { type: "START_ROTATE", startX: 200, startY: 50 });
    // Barely move — angle delta will be effectively 0 after snap
    const s2 = apply(s1, { type: "UPDATE_ROTATE", currentX: 200, currentY: 50 });
    const s3 = apply(s2, { type: "END_ROTATE" });
    expect(isDragIdle(s3.drag)).toBe(true);
    expect(canUndo(s3.documentHistory)).toBe(false);
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
//
// Text editing ends in 3 ways:
//   1. Enter key   → explicit commit (COMMIT_TEXT_EDIT)
//   2. ESC key     → explicit discard (CANCEL_TEXT_EDIT)
//   3. Click outside → END_TEXT_EDIT closes UI, then component unmount
//                      cleanup dispatches COMMIT_TEXT_EDIT if text changed
//
// COMMIT_TEXT_EDIT carries its own elementId so it works regardless of
// whether textEdit state is still active (critical for path 3).
// =============================================================================

describe("reducer: TextEdit", () => {
  const textEditBounds = { x: 100, y: 72, width: 200, height: 20 };

  function startEditing(state: PdfEditorState = createInitialState(createTestDoc())) {
    return apply(state, { type: "START_TEXT_EDIT", elementId: id0, text: "Hello", bounds: textEditBounds });
  }

  // --- Activation ---

  it("START_TEXT_EDIT activates with text, elementId, and bounds", () => {
    const s1 = startEditing();
    expect(s1.textEdit.active).toBe(true);
    if (s1.textEdit.active) {
      expect(s1.textEdit.initialText).toBe("Hello");
      expect(s1.textEdit.elementId).toBe(id0);
      expect(s1.textEdit.bounds).toEqual(textEditBounds);
    }
  });

  // --- Path 1: Enter key → explicit commit ---

  it("COMMIT_TEXT_EDIT saves text to document and deactivates", () => {
    const s1 = apply(startEditing(), { type: "COMMIT_TEXT_EDIT", elementId: id0, text: "Changed" });
    expect(s1.textEdit.active).toBe(false);
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Changed");
    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  it("COMMIT_TEXT_EDIT with same text still creates history entry (component guards this)", () => {
    // The reducer always pushes history when COMMIT_TEXT_EDIT arrives.
    // PdfTextEditController is responsible for not dispatching COMMIT
    // when text is unchanged — the reducer is intentionally simple here.
    const s1 = apply(startEditing(), { type: "COMMIT_TEXT_EDIT", elementId: id0, text: "Hello" });
    expect(s1.textEdit.active).toBe(false);
    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  // --- Path 2: ESC key → explicit discard ---

  it("CANCEL_TEXT_EDIT deactivates without saving", () => {
    const s1 = apply(startEditing(), { type: "CANCEL_TEXT_EDIT" });
    expect(s1.textEdit.active).toBe(false);
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Hello");
    expect(canUndo(s1.documentHistory)).toBe(false);
  });

  // --- Path 3: Click outside → END_TEXT_EDIT + unmount COMMIT ---
  //
  // Sequence: END_TEXT_EDIT → textEdit.active becomes false → component unmounts
  //           → cleanup dispatches COMMIT_TEXT_EDIT with elementId from closure

  it("END_TEXT_EDIT deactivates without saving (UI close only)", () => {
    const s1 = apply(startEditing(), { type: "END_TEXT_EDIT" });
    expect(s1.textEdit.active).toBe(false);
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Hello");
    expect(canUndo(s1.documentHistory)).toBe(false);
  });

  it("COMMIT_TEXT_EDIT after END_TEXT_EDIT saves text (unmount cleanup path)", () => {
    const s0 = startEditing();
    const s1 = apply(s0, { type: "END_TEXT_EDIT" });
    expect(s1.textEdit.active).toBe(false);
    const s2 = apply(s1, { type: "COMMIT_TEXT_EDIT", elementId: id0, text: "Edited" });
    expect(s2.textEdit.active).toBe(false);
    expect((s2.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Edited");
    expect(canUndo(s2.documentHistory)).toBe(true);
  });

  it("COMMIT_TEXT_EDIT after CANCEL_TEXT_EDIT still saves (defensive)", () => {
    // Even though CANCEL means discard, if the controller's cleanup fires
    // COMMIT afterward, the reducer must not silently drop the edit.
    const s0 = startEditing();
    const s1 = apply(s0, { type: "CANCEL_TEXT_EDIT" });
    const s2 = apply(s1, { type: "COMMIT_TEXT_EDIT", elementId: id0, text: "Edited" });
    expect((s2.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Edited");
  });

  // --- COMMIT_TEXT_EDIT is self-contained (carries elementId) ---

  it("COMMIT_TEXT_EDIT works even without prior START_TEXT_EDIT", () => {
    const s0 = createInitialState(createTestDoc());
    expect(s0.textEdit.active).toBe(false);
    const s1 = apply(s0, { type: "COMMIT_TEXT_EDIT", elementId: id0, text: "Direct" });
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Direct");
  });

  it("COMMIT_TEXT_EDIT targets correct element via action.elementId", () => {
    const s0 = startEditing(); // editing id0
    const s1 = apply(s0, { type: "COMMIT_TEXT_EDIT", elementId: id1, text: "Changed World" });
    // id0 unchanged, id1 updated
    expect((s1.documentHistory.present.pages[0].elements[0] as PdfText).text).toBe("Hello");
    expect((s1.documentHistory.present.pages[0].elements[1] as PdfText).text).toBe("Changed World");
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

// =============================================================================
// Page Operations
// =============================================================================

function createMultiPageDoc(): PdfDocument {
  const gs = createDefaultGraphicsState();
  const textA: PdfText = { type: "text", text: "Page1", x: 10, y: 700, width: 100, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs };
  const textB: PdfText = { type: "text", text: "Page2", x: 10, y: 700, width: 100, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs };
  const textC: PdfText = { type: "text", text: "Page3", x: 10, y: 700, width: 100, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs };
  return {
    pages: [
      { pageNumber: 1, width: 612, height: 792, elements: [textA] },
      { pageNumber: 2, width: 612, height: 792, elements: [textB] },
      { pageNumber: 3, width: 612, height: 792, elements: [textC] },
    ],
  };
}

function getPageTexts(state: PdfEditorState): string[] {
  return state.documentHistory.present.pages.map(
    (p) => (p.elements[0] as PdfText | undefined)?.text ?? "(blank)",
  );
}

describe("reducer: ADD_PAGE", () => {
  it("adds blank page after specified index", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 0 });
    const pages = s1.documentHistory.present.pages;

    expect(pages).toHaveLength(4);
    expect(pages[1].elements).toHaveLength(0); // new blank page
    expect(s1.currentPageIndex).toBe(1); // navigated to new page
  });

  it("adds page at start when afterIndex is -1 (gap 0)", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: -1 });
    const pages = s1.documentHistory.present.pages;

    expect(pages).toHaveLength(4);
    expect(pages[0].elements).toHaveLength(0); // new blank page at start
    expect(s1.currentPageIndex).toBe(0);
    // Original pages shifted
    expect(getPageTexts(s1)).toEqual(["(blank)", "Page1", "Page2", "Page3"]);
  });

  it("adds page at end when afterIndex is last", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 2 });
    const pages = s1.documentHistory.present.pages;

    expect(pages).toHaveLength(4);
    expect(pages[3].elements).toHaveLength(0);
    expect(s1.currentPageIndex).toBe(3);
  });

  it("preserves page dimensions from source", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 0 });
    const newPage = s1.documentHistory.present.pages[1];

    expect(newPage.width).toBe(612);
    expect(newPage.height).toBe(792);
  });

  it("pushes history (undoable)", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 1 });

    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  it("clears selection", () => {
    const s0 = apply(createInitialState(createMultiPageDoc()), { type: "SELECT", elementId: createElementId(0, 0), addToSelection: false });
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 0 });

    expect(s1.selection.selectedIds).toHaveLength(0);
  });
});

describe("reducer: DELETE_PAGES", () => {
  it("deletes specified page", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [1] });

    expect(s1.documentHistory.present.pages).toHaveLength(2);
    expect(getPageTexts(s1)).toEqual(["Page1", "Page3"]);
  });

  it("deletes multiple pages", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [0, 2] });

    expect(s1.documentHistory.present.pages).toHaveLength(1);
    expect(getPageTexts(s1)).toEqual(["Page2"]);
  });

  it("keeps at least 1 page", () => {
    const s0 = createInitialState(createTestDoc()); // single page
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [0] });

    // Should not delete the last page
    expect(s1.documentHistory.present.pages).toHaveLength(1);
  });

  it("adjusts currentPageIndex when current page is deleted", () => {
    const s0 = apply(createInitialState(createMultiPageDoc()), { type: "SET_PAGE", pageIndex: 2 });
    expect(s0.currentPageIndex).toBe(2);

    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [2] });
    expect(s1.currentPageIndex).toBeLessThan(2);
    expect(s1.currentPageIndex).toBeLessThanOrEqual(s1.documentHistory.present.pages.length - 1);
  });

  it("pushes history (undoable)", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [0] });

    expect(canUndo(s1.documentHistory)).toBe(true);
  });
});

describe("reducer: DUPLICATE_PAGES", () => {
  it("duplicates a single page", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DUPLICATE_PAGES", pageIndices: [1] });
    const pages = s1.documentHistory.present.pages;

    expect(pages).toHaveLength(4);
    expect(getPageTexts(s1)).toEqual(["Page1", "Page2", "Page2", "Page3"]);
  });

  it("duplicates multiple pages (inserted after last selected)", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DUPLICATE_PAGES", pageIndices: [0, 2] });
    const pages = s1.documentHistory.present.pages;

    expect(pages).toHaveLength(5);
    // Sorted indices [0, 2] → duplicates inserted after index 2
    expect(getPageTexts(s1)).toEqual(["Page1", "Page2", "Page3", "Page1", "Page3"]);
  });

  it("navigates to first duplicated page", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DUPLICATE_PAGES", pageIndices: [1] });

    // Duplicate inserted after index 1 → at index 2
    expect(s1.currentPageIndex).toBe(2);
  });

  it("pushes history (undoable)", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DUPLICATE_PAGES", pageIndices: [0] });

    expect(canUndo(s1.documentHistory)).toBe(true);
  });
});

describe("reducer: REORDER_PAGES", () => {
  it("moves page forward", () => {
    const s0 = createInitialState(createMultiPageDoc());
    // Move page 0 to after page 2
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [0], toIndex: 2 });

    expect(getPageTexts(s1)).toEqual(["Page2", "Page3", "Page1"]);
  });

  it("moves page backward", () => {
    const s0 = createInitialState(createMultiPageDoc());
    // Move page 2 to position 0
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [2], toIndex: 0 });

    expect(getPageTexts(s1)).toEqual(["Page3", "Page1", "Page2"]);
  });

  it("moves multiple pages", () => {
    const s0 = createInitialState(createMultiPageDoc());
    // Move pages 0 and 1 to after page 2
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [0, 1], toIndex: 1 });

    expect(getPageTexts(s1)).toEqual(["Page3", "Page1", "Page2"]);
  });

  it("pushes history (undoable)", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [0], toIndex: 2 });

    expect(canUndo(s1.documentHistory)).toBe(true);
  });

  it("clears selection", () => {
    const s0 = apply(createInitialState(createMultiPageDoc()), { type: "SELECT", elementId: createElementId(0, 0), addToSelection: false });
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [0], toIndex: 2 });

    expect(s1.selection.selectedIds).toHaveLength(0);
  });
});

describe("reducer: Page operations undo/redo", () => {
  it("undo ADD_PAGE restores original pages", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 0 });
    expect(s1.documentHistory.present.pages).toHaveLength(4);

    const s2 = apply(s1, { type: "UNDO" });
    expect(s2.documentHistory.present.pages).toHaveLength(3);
    expect(getPageTexts(s2)).toEqual(["Page1", "Page2", "Page3"]);
  });

  it("undo DELETE_PAGES restores deleted page", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [1] });
    expect(s1.documentHistory.present.pages).toHaveLength(2);

    const s2 = apply(s1, { type: "UNDO" });
    expect(s2.documentHistory.present.pages).toHaveLength(3);
    expect(getPageTexts(s2)).toEqual(["Page1", "Page2", "Page3"]);
  });

  it("undo DUPLICATE_PAGES removes duplicated page", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DUPLICATE_PAGES", pageIndices: [1] });
    expect(s1.documentHistory.present.pages).toHaveLength(4);

    const s2 = apply(s1, { type: "UNDO" });
    expect(s2.documentHistory.present.pages).toHaveLength(3);
  });

  it("undo REORDER_PAGES restores original order", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [0], toIndex: 2 });
    expect(getPageTexts(s1)).toEqual(["Page2", "Page3", "Page1"]);

    const s2 = apply(s1, { type: "UNDO" });
    expect(getPageTexts(s2)).toEqual(["Page1", "Page2", "Page3"]);
  });

  it("redo after undo restores the operation", () => {
    const s0 = createInitialState(createMultiPageDoc());
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [1] });
    const s2 = apply(s1, { type: "UNDO" });
    expect(getPageTexts(s2)).toEqual(["Page1", "Page2", "Page3"]);

    const s3 = apply(s2, { type: "REDO" });
    expect(getPageTexts(s3)).toEqual(["Page1", "Page3"]);
  });
});
