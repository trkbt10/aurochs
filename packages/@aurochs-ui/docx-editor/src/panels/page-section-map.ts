/**
 * @file Page-Section Mapping Utility
 *
 * Maps page indices (from layout engine) to section indices (from document model).
 * DOCX pages are virtual (computed by the layout engine), while sections are the
 * structural unit that defines page size, margins, headers/footers, etc.
 *
 * This module is the single source of truth for section boundary detection logic.
 * Both page-list UI and reducer handlers should use these functions.
 *
 * @see ECMA-376 Part 1, Section 17.6.17 (sectPr)
 */

import type { DocxBlockContent, DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxSectionProperties } from "@aurochs-office/docx/domain/section";
import type { PageLayout } from "@aurochs-office/text-layout";

// =============================================================================
// Section Boundary Detection (SoT)
// =============================================================================

/**
 * A section boundary found by scanning body.content.
 * Does NOT include the final section (defined by body.sectPr).
 */
export type SectionBoundary = {
  /** Section index (0-based) */
  readonly sectionIndex: number;
  /** Section properties from this break */
  readonly sectionProperties: DocxSectionProperties;
  /** Index in body.content where this boundary element is located */
  readonly contentIndex: number;
};

/**
 * Scan body.content and return all section boundaries.
 *
 * A boundary is either a standalone DocxSectionBreak element or a paragraph
 * with properties.sectPr (last paragraph of a section per ECMA-376).
 * The final section (body.sectPr) is NOT included; its index = boundaries.length.
 */
export function findSectionBoundaries(content: readonly DocxBlockContent[]): readonly SectionBoundary[] {
  return content.reduce<{ readonly boundaries: readonly SectionBoundary[]; readonly next: number }>(
    (acc, element, contentIndex) => {
      if (element.type === "sectionBreak") {
        return {
          boundaries: [...acc.boundaries, { sectionIndex: acc.next, sectionProperties: element.sectPr, contentIndex }],
          next: acc.next + 1,
        };
      }
      if (element.type === "paragraph" && element.properties?.sectPr !== undefined) {
        return {
          boundaries: [...acc.boundaries, { sectionIndex: acc.next, sectionProperties: element.properties.sectPr, contentIndex }],
          next: acc.next + 1,
        };
      }
      return acc;
    },
    { boundaries: [], next: 0 },
  ).boundaries;
}

/**
 * Look up section properties covering a given content index.
 * Finds the next boundary at or after contentIndex; falls back to bodySectPr.
 */
export function findSectionPropertiesAt(
  boundaries: readonly SectionBoundary[],
  contentIndex: number,
  bodySectPr: DocxSectionProperties | undefined,
): DocxSectionProperties | undefined {
  return boundaries.find((b) => b.contentIndex >= contentIndex)?.sectionProperties ?? bodySectPr;
}

/**
 * Look up a section by its index.
 */
export function lookupSectionByIndex(
  boundaries: readonly SectionBoundary[],
  bodySectPr: DocxSectionProperties | undefined,
  targetIndex: number,
): { readonly sectPr: DocxSectionProperties | undefined; readonly contentIndex: number | undefined; readonly isLastSection: boolean } {
  const b = boundaries.find((x) => x.sectionIndex === targetIndex);
  if (b !== undefined) {
    return { sectPr: b.sectionProperties, contentIndex: b.contentIndex, isLastSection: false };
  }
  if (targetIndex === boundaries.length) {
    return { sectPr: bodySectPr, contentIndex: undefined, isLastSection: true };
  }
  return { sectPr: undefined, contentIndex: undefined, isLastSection: false };
}

// =============================================================================
// Page-Section Mapping
// =============================================================================

/**
 * Mapping from a page to its section.
 */
export type PageSectionInfo = {
  readonly pageIndex: number;
  readonly sectionIndex: number;
  readonly sectionProperties: DocxSectionProperties | undefined;
  readonly isFirstPageOfSection: boolean;
  readonly isSectionBoundary: boolean;
  readonly contentIndexOfSectionBreak: number | undefined;
};

/**
 * Build mapping from page indices to section information.
 */
export function buildPageSectionMap(
  document: DocxDocument,
  pages: readonly PageLayout[],
): readonly PageSectionInfo[] {
  if (pages.length === 0) {
    return [];
  }

  // Build paragraph-index → section-index lookup from body.content
  const { content, sectPr: finalSectPr } = document.body;

  type Range = { readonly sectionIndex: number; readonly sectPr: DocxSectionProperties | undefined; readonly start: number; readonly end: number; readonly breakContentIndex: number | undefined };

  const { ranges, si, pi, prevBreak } = content.reduce<{ readonly ranges: readonly Range[]; readonly si: number; readonly pi: number; readonly prevBreak: number | undefined }>(
    (acc, el, ci) => {
      if (el.type === "sectionBreak") {
        const range: Range = { sectionIndex: acc.si, sectPr: el.sectPr, start: acc.ranges.length === 0 ? 0 : acc.ranges[acc.ranges.length - 1].end, end: acc.pi, breakContentIndex: acc.prevBreak };
        return { ranges: [...acc.ranges, range], si: acc.si + 1, pi: acc.pi, prevBreak: ci };
      }
      if (el.type === "paragraph") {
        const nextPi = acc.pi + 1;
        if (el.properties?.sectPr !== undefined) {
          const range: Range = { sectionIndex: acc.si, sectPr: el.properties.sectPr, start: acc.ranges.length === 0 ? 0 : acc.ranges[acc.ranges.length - 1].end, end: nextPi, breakContentIndex: acc.prevBreak };
          return { ranges: [...acc.ranges, range], si: acc.si + 1, pi: nextPi, prevBreak: ci };
        }
        return { ...acc, pi: nextPi };
      }
      return acc;
    },
    { ranges: [], si: 0, pi: 0, prevBreak: undefined },
  );

  const allRanges: readonly Range[] = [...ranges, { sectionIndex: si, sectPr: finalSectPr, start: ranges.length === 0 ? 0 : ranges[ranges.length - 1].end, end: pi, breakContentIndex: prevBreak }];

  const findSection = (paraIdx: number): Range => allRanges.find((r) => paraIdx >= r.start && paraIdx < r.end) ?? allRanges[allRanges.length - 1];

  return pages.reduce<{ readonly result: readonly PageSectionInfo[]; readonly cumPara: number; readonly prevSi: number }>(
    (acc, page, pageIndex) => {
      const section = findSection(acc.cumPara);
      const isFirst = section.sectionIndex !== acc.prevSi;
      const info: PageSectionInfo = {
        pageIndex,
        sectionIndex: section.sectionIndex,
        sectionProperties: section.sectPr,
        isFirstPageOfSection: isFirst,
        isSectionBoundary: isFirst && pageIndex > 0,
        contentIndexOfSectionBreak: isFirst ? section.breakContentIndex : undefined,
      };
      return { result: [...acc.result, info], cumPara: acc.cumPara + page.paragraphs.length, prevSi: section.sectionIndex };
    },
    { result: [], cumPara: 0, prevSi: -1 },
  ).result;
}
