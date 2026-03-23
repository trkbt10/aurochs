/** @file document-mutation tests */
import { createDefaultGraphicsState } from "../graphics-state";
import type { PdfDocument } from "./types";
import type { PdfText } from "../text";
import { createElementId } from "./element-id";
import {
  updateElementInDocument,
  deleteElements,
  addElementsToPage,
  addPage,
  deletePages,
  duplicatePages,
  reorderPages,
  updatePageSize,
} from "./document-mutation";

function createTestDoc(): PdfDocument {
  const gs = createDefaultGraphicsState();
  const mkText = (text: string): PdfText => ({
    type: "text", text, x: 0, y: 0, width: 50, height: 12, fontSize: 12,
    fontName: "Helvetica", baseFont: "Helvetica", graphicsState: gs,
  }) as PdfText;

  return {
    pages: [
      { pageNumber: 1, width: 612, height: 792, elements: [mkText("A"), mkText("B")] },
      { pageNumber: 2, width: 612, height: 792, elements: [mkText("C")] },
      { pageNumber: 3, width: 612, height: 792, elements: [mkText("D")] },
    ],
  };
}

describe("document-mutation", () => {
  describe("updateElementInDocument", () => {
    it("applies updater to the specified element", () => {
      const doc = createTestDoc();
      const newDoc = updateElementInDocument({
        document: doc,
        elementId: createElementId(0, 0),
        updater: (el) => el.type === "text" ? { ...el, text: "Updated" } : el,
      });
      expect((newDoc.pages[0].elements[0] as PdfText).text).toBe("Updated");
      expect((newDoc.pages[0].elements[1] as PdfText).text).toBe("B");
    });

    it("returns same document for out-of-bounds page", () => {
      const doc = createTestDoc();
      const newDoc = updateElementInDocument({
        document: doc,
        elementId: createElementId(99, 0),
        updater: (el) => el,
      });
      expect(newDoc).toBe(doc);
    });
  });

  describe("deleteElements", () => {
    it("removes specified elements", () => {
      const doc = createTestDoc();
      const newDoc = deleteElements(doc, [createElementId(0, 0)]);
      expect(newDoc.pages[0].elements).toHaveLength(1);
      expect((newDoc.pages[0].elements[0] as PdfText).text).toBe("B");
    });

    it("removes elements from multiple pages", () => {
      const doc = createTestDoc();
      const newDoc = deleteElements(doc, [createElementId(0, 1), createElementId(1, 0)]);
      expect(newDoc.pages[0].elements).toHaveLength(1);
      expect(newDoc.pages[1].elements).toHaveLength(0);
    });
  });

  describe("addElementsToPage", () => {
    it("appends elements and returns new IDs", () => {
      const doc = createTestDoc();
      const gs = createDefaultGraphicsState();
      const newEl = { type: "text" as const, text: "New", x: 0, y: 0, width: 50, height: 12, fontSize: 12, fontName: "Helvetica", baseFont: "Helvetica", graphicsState: gs } as PdfText;
      const { document: newDoc, newElementIds } = addElementsToPage(doc, 0, [newEl]);
      expect(newDoc.pages[0].elements).toHaveLength(3);
      expect(newElementIds).toHaveLength(1);
      expect(newElementIds[0]).toBe(createElementId(0, 2));
    });

    it("returns unchanged doc for invalid page index", () => {
      const doc = createTestDoc();
      const { document: newDoc, newElementIds } = addElementsToPage(doc, 99, []);
      expect(newDoc).toBe(doc);
      expect(newElementIds).toHaveLength(0);
    });
  });

  describe("addPage", () => {
    it("inserts blank page after specified index", () => {
      const doc = createTestDoc();
      const { document: newDoc, newPageIndex } = addPage(doc, 0);
      expect(newDoc.pages).toHaveLength(4);
      expect(newPageIndex).toBe(1);
      expect(newDoc.pages[1].elements).toHaveLength(0);
      expect(newDoc.pages[1].width).toBe(612); // inherited from source
    });

    it("inserts at start when afterIndex is -1", () => {
      const doc = createTestDoc();
      const { document: newDoc, newPageIndex } = addPage(doc, -1);
      expect(newDoc.pages).toHaveLength(4);
      expect(newPageIndex).toBe(0);
    });
  });

  describe("deletePages", () => {
    it("removes specified pages", () => {
      const doc = createTestDoc();
      const newDoc = deletePages(doc, [1]);
      expect(newDoc.pages).toHaveLength(2);
    });

    it("preserves at least 1 page", () => {
      const doc = createTestDoc();
      const newDoc = deletePages(doc, [0, 1, 2]);
      expect(newDoc.pages.length).toBeGreaterThanOrEqual(1);
    });

    it("returns same document when only 1 page", () => {
      const doc: PdfDocument = { pages: [createTestDoc().pages[0]] };
      const newDoc = deletePages(doc, [0]);
      expect(newDoc).toBe(doc);
    });
  });

  describe("duplicatePages", () => {
    it("duplicates specified pages after the last selected", () => {
      const doc = createTestDoc();
      const { document: newDoc, insertedAtIndex } = duplicatePages(doc, [0]);
      expect(newDoc.pages).toHaveLength(4);
      expect(insertedAtIndex).toBe(1);
      expect((newDoc.pages[1].elements[0] as PdfText).text).toBe("A");
    });
  });

  describe("reorderPages", () => {
    it("moves page to new position", () => {
      const doc = createTestDoc();
      const newDoc = reorderPages({ document: doc, pageIndices: [0], toIndex: 2 });
      // Page "A" (index 0) removed → remaining [B, C] → insert at index 2
      const texts = newDoc.pages.map((p) => (p.elements[0] as PdfText)?.text ?? "empty");
      expect(texts).toEqual(["C", "D", "A"]);
    });
  });

  describe("updatePageSize", () => {
    it("updates page dimensions", () => {
      const doc = createTestDoc();
      const newDoc = updatePageSize({ document: doc, pageIndex: 0, width: 800, height: 600 });
      expect(newDoc.pages[0].width).toBe(800);
      expect(newDoc.pages[0].height).toBe(600);
      expect(newDoc.pages[1].width).toBe(612); // unchanged
    });

    it("returns same doc for invalid index", () => {
      const doc = createTestDoc();
      const newDoc = updatePageSize({ document: doc, pageIndex: 99, width: 800, height: 600 });
      expect(newDoc).toBe(doc);
    });
  });
});
