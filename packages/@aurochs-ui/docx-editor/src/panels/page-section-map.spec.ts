/**
 * @file Page-Section Mapping Tests
 */

import type { DocxDocument, DocxSectionBreak } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxSectionProperties } from "@aurochs-office/docx/domain/section";
import { twips } from "@aurochs-office/docx/domain/types";
import type { PageLayout } from "@aurochs-office/text-layout";
import { px, type Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { buildPageSectionMap, findSectionBoundaries, lookupSectionByIndex } from "./page-section-map";

// =============================================================================
// Helpers
// =============================================================================

function makeParagraph(value = ""): DocxParagraph {
  return { type: "paragraph", content: [{ type: "run", content: [{ type: "text", value }] }] };
}

function makeParagraphWithSectPr(sectPr: DocxSectionProperties): DocxParagraph {
  return { type: "paragraph", properties: { sectPr }, content: [{ type: "run", content: [{ type: "text", value: "" }] }] };
}

function makeSectionBreak(sectPr: DocxSectionProperties): DocxSectionBreak {
  return { type: "sectionBreak", sectPr };
}

function makePage(paragraphCount: number, pageIndex: number): PageLayout {
  return {
    pageIndex,
    y: px(0),
    height: px(792) as Pixels,
    width: px(612) as Pixels,
    paragraphs: Array.from({ length: paragraphCount }, () => ({
      lines: [], alignment: "left" as const, bullet: undefined, bulletWidth: px(0), fontAlignment: "auto" as const,
    })),
  };
}

const letterSectPr: DocxSectionProperties = { pgSz: { w: twips(12240), h: twips(15840) } };
const a4SectPr: DocxSectionProperties = { pgSz: { w: twips(11906), h: twips(16838) } };
const _landscapeSectPr: DocxSectionProperties = { pgSz: { w: twips(15840), h: twips(12240), orient: "landscape" } };

// =============================================================================
// findSectionBoundaries
// =============================================================================

describe("findSectionBoundaries", () => {
  it("returns empty for no section breaks", () => {
    expect(findSectionBoundaries([makeParagraph()])).toEqual([]);
  });

  it("detects standalone section breaks", () => {
    const content = [makeParagraph(), makeSectionBreak(letterSectPr), makeParagraph()];
    const boundaries = findSectionBoundaries(content);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]).toEqual({ sectionIndex: 0, sectionProperties: letterSectPr, contentIndex: 1 });
  });

  it("detects paragraph-level sectPr", () => {
    const content = [makeParagraph(), makeParagraphWithSectPr(a4SectPr), makeParagraph()];
    const boundaries = findSectionBoundaries(content);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].contentIndex).toBe(1);
  });

  it("detects multiple boundaries", () => {
    const content = [makeParagraph(), makeSectionBreak(letterSectPr), makeParagraph(), makeSectionBreak(a4SectPr), makeParagraph()];
    const boundaries = findSectionBoundaries(content);
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0].sectionIndex).toBe(0);
    expect(boundaries[1].sectionIndex).toBe(1);
  });
});

// =============================================================================
// lookupSectionByIndex
// =============================================================================

describe("lookupSectionByIndex", () => {
  it("finds non-last section", () => {
    const boundaries = [{ sectionIndex: 0, sectionProperties: letterSectPr, contentIndex: 1 }];
    const result = lookupSectionByIndex(boundaries, a4SectPr, 0);
    expect(result).toEqual({ sectPr: letterSectPr, contentIndex: 1, isLastSection: false });
  });

  it("finds last section", () => {
    const boundaries = [{ sectionIndex: 0, sectionProperties: letterSectPr, contentIndex: 1 }];
    const result = lookupSectionByIndex(boundaries, a4SectPr, 1);
    expect(result).toEqual({ sectPr: a4SectPr, contentIndex: undefined, isLastSection: true });
  });

  it("returns undefined for out-of-range", () => {
    const boundaries = [{ sectionIndex: 0, sectionProperties: letterSectPr, contentIndex: 1 }];
    const result = lookupSectionByIndex(boundaries, a4SectPr, 5);
    expect(result.sectPr).toBeUndefined();
  });
});

// =============================================================================
// buildPageSectionMap
// =============================================================================

describe("buildPageSectionMap", () => {
  it("maps single-section document", () => {
    const doc: DocxDocument = { body: { content: [makeParagraph(), makeParagraph(), makeParagraph()], sectPr: letterSectPr } };
    const pages = [makePage(2, 0), makePage(1, 1)];
    const result = buildPageSectionMap(doc, pages);

    expect(result).toHaveLength(2);
    expect(result[0].sectionIndex).toBe(0);
    expect(result[0].isFirstPageOfSection).toBe(true);
    expect(result[0].isSectionBoundary).toBe(false);
    expect(result[1].sectionIndex).toBe(0);
    expect(result[1].isFirstPageOfSection).toBe(false);
  });

  it("maps document with section break", () => {
    const doc: DocxDocument = {
      body: { content: [makeParagraph(), makeParagraph(), makeSectionBreak(letterSectPr), makeParagraph()], sectPr: a4SectPr },
    };
    const pages = [makePage(2, 0), makePage(1, 1)];
    const result = buildPageSectionMap(doc, pages);

    expect(result[0].sectionIndex).toBe(0);
    expect(result[0].sectionProperties).toBe(letterSectPr);
    expect(result[1].sectionIndex).toBe(1);
    expect(result[1].sectionProperties).toBe(a4SectPr);
    expect(result[1].isSectionBoundary).toBe(true);
  });

  it("maps multi-page section", () => {
    const doc: DocxDocument = {
      body: { content: [makeParagraph(), makeParagraph(), makeParagraph(), makeParagraph(), makeSectionBreak(letterSectPr), makeParagraph()], sectPr: a4SectPr },
    };
    const pages = [makePage(2, 0), makePage(2, 1), makePage(1, 2)];
    const result = buildPageSectionMap(doc, pages);

    expect(result[0].sectionIndex).toBe(0);
    expect(result[1].sectionIndex).toBe(0);
    expect(result[2].sectionIndex).toBe(1);
    expect(result[2].isSectionBoundary).toBe(true);
  });

  it("handles empty pages", () => {
    const doc: DocxDocument = { body: { content: [makeParagraph()], sectPr: letterSectPr } };
    expect(buildPageSectionMap(doc, [])).toEqual([]);
  });

  it("provides contentIndexOfSectionBreak for boundary pages", () => {
    const doc: DocxDocument = {
      body: { content: [makeParagraph(), makeSectionBreak(letterSectPr), makeParagraph()], sectPr: a4SectPr },
    };
    const pages = [makePage(1, 0), makePage(1, 1)];
    const result = buildPageSectionMap(doc, pages);

    expect(result[0].contentIndexOfSectionBreak).toBeUndefined();
    expect(result[1].contentIndexOfSectionBreak).toBe(1);
  });
});
