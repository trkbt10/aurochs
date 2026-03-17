/**
 * @file PDF editor page operations E2E tests
 *
 * Tests page add/delete/duplicate/reorder operations through the reducer,
 * simulating actual user operation sequences:
 * - Add page via gap click → verify page count, content, navigation
 * - Delete page via context menu → verify remaining pages, index adjustment
 * - Duplicate page → verify content duplication
 * - Reorder via drag-and-drop → verify page order
 * - Multi-step scenarios: add → delete → undo → redo
 */

import { createDefaultGraphicsState, type PdfDocument, type PdfText } from "@aurochs/pdf";
import { canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import { pdfEditorReducer, createInitialState } from "./reducer";
import type { PdfEditorAction } from "./reducer";
import type { PdfEditorState } from "./types";

// =============================================================================
// Fixtures
// =============================================================================

function createMultiPageDoc(): PdfDocument {
  const gs = createDefaultGraphicsState();
  return {
    pages: [
      { pageNumber: 1, width: 612, height: 792, elements: [
        { type: "text", text: "Page1-Title", x: 100, y: 700, width: 200, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs } satisfies PdfText,
      ] },
      { pageNumber: 2, width: 612, height: 792, elements: [
        { type: "text", text: "Page2-Title", x: 100, y: 700, width: 200, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs } satisfies PdfText,
      ] },
      { pageNumber: 3, width: 612, height: 792, elements: [
        { type: "text", text: "Page3-Title", x: 100, y: 700, width: 200, height: 20, fontName: "Helvetica", fontSize: 14, graphicsState: gs } satisfies PdfText,
      ] },
    ],
  };
}

function apply(state: PdfEditorState, ...actions: PdfEditorAction[]): PdfEditorState {
  return actions.reduce(pdfEditorReducer, state);
}

function pageCount(state: PdfEditorState): number {
  return state.documentHistory.present.pages.length;
}

function pageTitles(state: PdfEditorState): string[] {
  return state.documentHistory.present.pages.map(
    (p) => (p.elements[0] as PdfText | undefined)?.text ?? "(blank)",
  );
}

// =============================================================================
// E2E: Add Page
// =============================================================================

describe("E2E: Add page", () => {
  it("click + button at gap 0 → inserts blank page at start", () => {
    // User clicks the "+" button in the gap before the first page (gap index 0)
    // PdfEditor converts gap index 0 → afterIndex -1
    const s = apply(createInitialState(createMultiPageDoc()), { type: "ADD_PAGE", afterIndex: -1 });

    expect(pageCount(s)).toBe(4);
    expect(pageTitles(s)).toEqual(["(blank)", "Page1-Title", "Page2-Title", "Page3-Title"]);
    expect(s.currentPageIndex).toBe(0); // navigated to new page
    expect(s.selection.selectedIds).toHaveLength(0); // selection cleared
  });

  it("click + button between page 1 and page 2 → inserts blank page at index 1", () => {
    // Gap index 1 → afterIndex 0
    const s = apply(createInitialState(createMultiPageDoc()), { type: "ADD_PAGE", afterIndex: 0 });

    expect(pageCount(s)).toBe(4);
    expect(pageTitles(s)).toEqual(["Page1-Title", "(blank)", "Page2-Title", "Page3-Title"]);
    expect(s.currentPageIndex).toBe(1);
  });

  it("click + button after last page → inserts blank page at end", () => {
    // Gap index 3 → afterIndex 2
    const s = apply(createInitialState(createMultiPageDoc()), { type: "ADD_PAGE", afterIndex: 2 });

    expect(pageCount(s)).toBe(4);
    expect(pageTitles(s)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title", "(blank)"]);
    expect(s.currentPageIndex).toBe(3);
  });

  it("new page inherits dimensions from source page", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "ADD_PAGE", afterIndex: 0 });
    const newPage = s.documentHistory.present.pages[1];

    expect(newPage.width).toBe(612);
    expect(newPage.height).toBe(792);
    expect(newPage.elements).toHaveLength(0);
  });
});

// =============================================================================
// E2E: Delete Pages
// =============================================================================

describe("E2E: Delete page via context menu", () => {
  it("right-click page 2 → Delete → removes page 2", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "DELETE_PAGES", pageIndices: [1] });

    expect(pageCount(s)).toBe(2);
    expect(pageTitles(s)).toEqual(["Page1-Title", "Page3-Title"]);
  });

  it("right-click page 1 while viewing page 1 → Delete → adjusts currentPageIndex", () => {
    // Navigate to page 1 first
    const s0 = apply(createInitialState(createMultiPageDoc()), { type: "SET_PAGE", pageIndex: 0 });
    expect(s0.currentPageIndex).toBe(0);

    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [0] });
    expect(pageCount(s1)).toBe(2);
    expect(s1.currentPageIndex).toBe(0); // adjusted to first remaining page
    expect(pageTitles(s1)).toEqual(["Page2-Title", "Page3-Title"]);
  });

  it("right-click last page while viewing it → Delete → adjusts to previous page", () => {
    const s0 = apply(createInitialState(createMultiPageDoc()), { type: "SET_PAGE", pageIndex: 2 });
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [2] });

    expect(s1.currentPageIndex).toBe(1); // moved to last valid index
    expect(pageTitles(s1)).toEqual(["Page1-Title", "Page2-Title"]);
  });

  it("select multiple pages → Delete → removes all selected", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "DELETE_PAGES", pageIndices: [0, 2] });

    expect(pageCount(s)).toBe(1);
    expect(pageTitles(s)).toEqual(["Page2-Title"]);
  });

  it("cannot delete the last remaining page", () => {
    const s0 = apply(createInitialState(createMultiPageDoc()), { type: "DELETE_PAGES", pageIndices: [0, 1] });
    expect(pageCount(s0)).toBe(1);

    // Try deleting the last page
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [0] });
    expect(pageCount(s1)).toBe(1); // unchanged
  });
});

// =============================================================================
// E2E: Duplicate Pages
// =============================================================================

describe("E2E: Duplicate page via context menu", () => {
  it("right-click page 2 → Duplicate → creates copy after page 2", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "DUPLICATE_PAGES", pageIndices: [1] });

    expect(pageCount(s)).toBe(4);
    expect(pageTitles(s)).toEqual(["Page1-Title", "Page2-Title", "Page2-Title", "Page3-Title"]);
    expect(s.currentPageIndex).toBe(2); // navigated to duplicate
  });

  it("duplicated page has same content as original", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "DUPLICATE_PAGES", pageIndices: [0] });
    const original = s.documentHistory.present.pages[0];
    const duplicate = s.documentHistory.present.pages[1];

    expect(duplicate.width).toBe(original.width);
    expect(duplicate.height).toBe(original.height);
    expect(duplicate.elements).toHaveLength(original.elements.length);
    expect((duplicate.elements[0] as PdfText).text).toBe((original.elements[0] as PdfText).text);
  });

  it("multi-select duplicate → Duplicate Pages → copies all in order", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "DUPLICATE_PAGES", pageIndices: [0, 2] });

    expect(pageCount(s)).toBe(5);
    // Sorted [0, 2] → inserted after index 2
    expect(pageTitles(s)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title", "Page1-Title", "Page3-Title"]);
  });
});

// =============================================================================
// E2E: Reorder Pages (Drag and Drop)
// =============================================================================

describe("E2E: Reorder pages via drag and drop", () => {
  it("drag page 1 to end → pages reordered", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "REORDER_PAGES", pageIndices: [0], toIndex: 2 });

    expect(pageTitles(s)).toEqual(["Page2-Title", "Page3-Title", "Page1-Title"]);
  });

  it("drag page 3 to start → pages reordered", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "REORDER_PAGES", pageIndices: [2], toIndex: 0 });

    expect(pageTitles(s)).toEqual(["Page3-Title", "Page1-Title", "Page2-Title"]);
  });

  it("drag page 2 up one position → swap with page 1", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "REORDER_PAGES", pageIndices: [1], toIndex: 0 });

    expect(pageTitles(s)).toEqual(["Page2-Title", "Page1-Title", "Page3-Title"]);
  });

  it("drag multiple pages → move together", () => {
    // Move pages 1 and 2 (indices 0, 1) to after page 3
    const s = apply(createInitialState(createMultiPageDoc()), { type: "REORDER_PAGES", pageIndices: [0, 1], toIndex: 1 });

    expect(pageTitles(s)).toEqual(["Page3-Title", "Page1-Title", "Page2-Title"]);
  });

  it("selection cleared after reorder", () => {
    const s = apply(createInitialState(createMultiPageDoc()), { type: "REORDER_PAGES", pageIndices: [0], toIndex: 2 });

    expect(s.selection.selectedIds).toHaveLength(0);
  });
});

// =============================================================================
// E2E: Multi-step user workflows
// =============================================================================

describe("E2E: Multi-step workflows", () => {
  it("add page → navigate to it → add content → undo reverts all", () => {
    const s0 = createInitialState(createMultiPageDoc());

    // Step 1: Add page after page 1
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: 0 });
    expect(pageCount(s1)).toBe(4);
    expect(s1.currentPageIndex).toBe(1); // on new blank page

    // Step 2: Undo → removes the added page
    const s2 = apply(s1, { type: "UNDO" });
    expect(pageCount(s2)).toBe(3);
    expect(pageTitles(s2)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title"]);
  });

  it("delete page → undo → page restored at original position", () => {
    const s0 = createInitialState(createMultiPageDoc());

    // Delete page 2
    const s1 = apply(s0, { type: "DELETE_PAGES", pageIndices: [1] });
    expect(pageTitles(s1)).toEqual(["Page1-Title", "Page3-Title"]);

    // Undo → page 2 restored
    const s2 = apply(s1, { type: "UNDO" });
    expect(pageTitles(s2)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title"]);
  });

  it("duplicate → delete original → undo delete → both exist", () => {
    const s0 = createInitialState(createMultiPageDoc());

    // Duplicate page 1
    const s1 = apply(s0, { type: "DUPLICATE_PAGES", pageIndices: [0] });
    expect(pageCount(s1)).toBe(4);
    expect(pageTitles(s1)).toEqual(["Page1-Title", "Page1-Title", "Page2-Title", "Page3-Title"]);

    // Delete original page 1 (index 0)
    const s2 = apply(s1, { type: "DELETE_PAGES", pageIndices: [0] });
    expect(pageCount(s2)).toBe(3);
    expect(pageTitles(s2)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title"]);

    // Undo delete → original restored
    const s3 = apply(s2, { type: "UNDO" });
    expect(pageCount(s3)).toBe(4);
    expect(pageTitles(s3)).toEqual(["Page1-Title", "Page1-Title", "Page2-Title", "Page3-Title"]);
  });

  it("reorder → undo → redo → same result", () => {
    const s0 = createInitialState(createMultiPageDoc());

    // Move page 3 to start
    const s1 = apply(s0, { type: "REORDER_PAGES", pageIndices: [2], toIndex: 0 });
    expect(pageTitles(s1)).toEqual(["Page3-Title", "Page1-Title", "Page2-Title"]);

    // Undo
    const s2 = apply(s1, { type: "UNDO" });
    expect(pageTitles(s2)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title"]);

    // Redo
    const s3 = apply(s2, { type: "REDO" });
    expect(pageTitles(s3)).toEqual(["Page3-Title", "Page1-Title", "Page2-Title"]);
  });

  it("add → reorder → delete → 3 undos → back to original", () => {
    const s0 = createInitialState(createMultiPageDoc());

    // Add blank page at start
    const s1 = apply(s0, { type: "ADD_PAGE", afterIndex: -1 });
    expect(pageCount(s1)).toBe(4);

    // Reorder: move new blank page (index 0) to end
    const s2 = apply(s1, { type: "REORDER_PAGES", pageIndices: [0], toIndex: 3 });
    expect(pageTitles(s2)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title", "(blank)"]);

    // Delete the blank page at end
    const s3 = apply(s2, { type: "DELETE_PAGES", pageIndices: [3] });
    expect(pageTitles(s3)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title"]);

    // Undo 3 times → back to original
    const s4 = apply(s3, { type: "UNDO" }); // undo delete
    expect(pageCount(s4)).toBe(4);

    const s5 = apply(s4, { type: "UNDO" }); // undo reorder
    expect(pageTitles(s5)[0]).toBe("(blank)"); // blank is back at start

    const s6 = apply(s5, { type: "UNDO" }); // undo add
    expect(pageCount(s6)).toBe(3);
    expect(pageTitles(s6)).toEqual(["Page1-Title", "Page2-Title", "Page3-Title"]);
  });

  it("page operations clear element selection for safety", () => {
    const s0 = createInitialState(createMultiPageDoc());

    // Select an element on page 1
    const s1 = apply(s0, { type: "SELECT", elementId: "0:0", addToSelection: false });
    expect(s1.selection.selectedIds).toHaveLength(1);

    // Add page → selection cleared (element IDs shift)
    const s2 = apply(s1, { type: "ADD_PAGE", afterIndex: -1 });
    expect(s2.selection.selectedIds).toHaveLength(0);

    // Select again, then delete a page → selection cleared
    const s3 = apply(s2, { type: "SELECT", elementId: "1:0", addToSelection: false });
    const s4 = apply(s3, { type: "DELETE_PAGES", pageIndices: [0] });
    expect(s4.selection.selectedIds).toHaveLength(0);
  });
});
