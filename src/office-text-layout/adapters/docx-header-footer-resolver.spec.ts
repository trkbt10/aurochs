/**
 * @file Tests for DOCX Header/Footer Resolver
 */

import { describe, it, expect } from "bun:test";
import type { DocxSectionProperties } from "../../docx/domain/section";
import type { DocxHeader, DocxFooter } from "../../docx/domain/document";
import type { DocxRelId } from "../../docx/domain/types";
import { docxRelId } from "../../docx/domain/types";
import {
  resolveHeaderFooter,
  hasHeaders,
  hasFooters,
  type HeaderFooterContext,
} from "./docx-header-footer-resolver";

// =============================================================================
// Test Data
// =============================================================================

function createTestHeader(content: string): DocxHeader {
  return {
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "run",
            content: [{ type: "text", value: content }],
          },
        ],
      },
    ],
  };
}

function createTestFooter(content: string): DocxFooter {
  return {
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "run",
            content: [{ type: "text", value: content }],
          },
        ],
      },
    ],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("resolveHeaderFooter", () => {
  describe("default header/footer", () => {
    it("should return default header/footer for regular pages", () => {
      const headers = new Map<DocxRelId, DocxHeader>([
        [docxRelId("rId1"), createTestHeader("Default Header")],
      ]);
      const footers = new Map<DocxRelId, DocxFooter>([
        [docxRelId("rId2"), createTestFooter("Default Footer")],
      ]);

      const sectPr: DocxSectionProperties = {
        headerReference: [{ type: "default", rId: docxRelId("rId1") }],
        footerReference: [{ type: "default", rId: docxRelId("rId2") }],
      };

      const context: HeaderFooterContext = {
        sectPr,
        headers,
        footers,
      };

      const result = resolveHeaderFooter(context, 0, false);
      expect(result.header).toBeDefined();
      expect(result.footer).toBeDefined();
    });

    it("should return undefined when no headers/footers defined", () => {
      const context: HeaderFooterContext = {
        sectPr: undefined,
        headers: undefined,
        footers: undefined,
      };

      const result = resolveHeaderFooter(context, 0, false);
      expect(result.header).toBeUndefined();
      expect(result.footer).toBeUndefined();
    });
  });

  describe("first page header/footer with titlePg", () => {
    it("should return first page header/footer when titlePg is true", () => {
      const headers = new Map<DocxRelId, DocxHeader>([
        [docxRelId("rId1"), createTestHeader("Default Header")],
        [docxRelId("rId2"), createTestHeader("First Page Header")],
      ]);

      const sectPr: DocxSectionProperties = {
        titlePg: true,
        headerReference: [
          { type: "default", rId: docxRelId("rId1") },
          { type: "first", rId: docxRelId("rId2") },
        ],
      };

      const context: HeaderFooterContext = {
        sectPr,
        headers,
        footers: undefined,
      };

      // First page of section
      const firstResult = resolveHeaderFooter(context, 0, true);
      expect(firstResult.header).toBe(headers.get(docxRelId("rId2")));

      // Second page of section
      const secondResult = resolveHeaderFooter(context, 1, false);
      expect(secondResult.header).toBe(headers.get(docxRelId("rId1")));
    });

    it("should return undefined for first page when no first header defined", () => {
      const headers = new Map<DocxRelId, DocxHeader>([
        [docxRelId("rId1"), createTestHeader("Default Header")],
      ]);

      const sectPr: DocxSectionProperties = {
        titlePg: true,
        headerReference: [{ type: "default", rId: docxRelId("rId1") }],
      };

      const context: HeaderFooterContext = {
        sectPr,
        headers,
        footers: undefined,
      };

      // First page with titlePg but no first header - should return undefined
      const firstResult = resolveHeaderFooter(context, 0, true);
      expect(firstResult.header).toBeUndefined();
    });
  });

  describe("even/odd header/footer", () => {
    it("should alternate headers when evenAndOddHeaders is true", () => {
      const headers = new Map<DocxRelId, DocxHeader>([
        [docxRelId("rId1"), createTestHeader("Odd Header")],
        [docxRelId("rId2"), createTestHeader("Even Header")],
      ]);

      const sectPr: DocxSectionProperties = {
        headerReference: [
          { type: "default", rId: docxRelId("rId1") },
          { type: "even", rId: docxRelId("rId2") },
        ],
      };

      const context: HeaderFooterContext = {
        sectPr,
        headers,
        footers: undefined,
        evenAndOddHeaders: true,
      };

      // Page 0 = page number 1 (odd)
      const oddResult = resolveHeaderFooter(context, 0, false);
      expect(oddResult.header).toBe(headers.get(docxRelId("rId1")));

      // Page 1 = page number 2 (even)
      const evenResult = resolveHeaderFooter(context, 1, false);
      expect(evenResult.header).toBe(headers.get(docxRelId("rId2")));
    });

    it("should fallback to default when even header not defined", () => {
      const headers = new Map<DocxRelId, DocxHeader>([
        [docxRelId("rId1"), createTestHeader("Default Header")],
      ]);

      const sectPr: DocxSectionProperties = {
        headerReference: [{ type: "default", rId: docxRelId("rId1") }],
      };

      const context: HeaderFooterContext = {
        sectPr,
        headers,
        footers: undefined,
        evenAndOddHeaders: true,
      };

      // Even page should fallback to default
      const evenResult = resolveHeaderFooter(context, 1, false);
      expect(evenResult.header).toBe(headers.get(docxRelId("rId1")));
    });
  });
});

describe("hasHeaders", () => {
  it("should return true when headers are defined", () => {
    const headers = new Map<DocxRelId, DocxHeader>([
      [docxRelId("rId1"), createTestHeader("Header")],
    ]);
    const sectPr: DocxSectionProperties = {
      headerReference: [{ type: "default", rId: docxRelId("rId1") }],
    };

    expect(hasHeaders(sectPr, headers)).toBe(true);
  });

  it("should return false when no sectPr", () => {
    const headers = new Map<DocxRelId, DocxHeader>([
      [docxRelId("rId1"), createTestHeader("Header")],
    ]);

    expect(hasHeaders(undefined, headers)).toBe(false);
  });

  it("should return false when no header references", () => {
    const headers = new Map<DocxRelId, DocxHeader>([
      [docxRelId("rId1"), createTestHeader("Header")],
    ]);
    const sectPr: DocxSectionProperties = {};

    expect(hasHeaders(sectPr, headers)).toBe(false);
  });

  it("should return false when headers map is empty", () => {
    const sectPr: DocxSectionProperties = {
      headerReference: [{ type: "default", rId: docxRelId("rId1") }],
    };

    expect(hasHeaders(sectPr, new Map())).toBe(false);
  });
});

describe("hasFooters", () => {
  it("should return true when footers are defined", () => {
    const footers = new Map<DocxRelId, DocxFooter>([
      [docxRelId("rId1"), createTestFooter("Footer")],
    ]);
    const sectPr: DocxSectionProperties = {
      footerReference: [{ type: "default", rId: docxRelId("rId1") }],
    };

    expect(hasFooters(sectPr, footers)).toBe(true);
  });

  it("should return false when no sectPr", () => {
    const footers = new Map<DocxRelId, DocxFooter>([
      [docxRelId("rId1"), createTestFooter("Footer")],
    ]);

    expect(hasFooters(undefined, footers)).toBe(false);
  });

  it("should return false when no footer references", () => {
    const footers = new Map<DocxRelId, DocxFooter>([
      [docxRelId("rId1"), createTestFooter("Footer")],
    ]);
    const sectPr: DocxSectionProperties = {};

    expect(hasFooters(sectPr, footers)).toBe(false);
  });
});
