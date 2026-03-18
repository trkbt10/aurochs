/**
 * @file Page/Section Action Handlers
 *
 * Handlers for page navigation and section break operations.
 * Section boundary detection logic is delegated to page-section-map (SoT).
 */

import type { DocxBlockContent, DocxSectionBreak } from "@aurochs-office/docx/domain/document";
import type { DocxSectionProperties } from "@aurochs-office/docx/domain/section";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import type { HandlerMap } from "../handler-types";
import {
  findSectionBoundaries,
  findSectionPropertiesAt,
  lookupSectionByIndex,
} from "../../../../../panels/page-section-map";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Update sectPr at a content index (sectionBreak or paragraph-level sectPr).
 */
function updateSectPrAtIndex(
  content: readonly DocxBlockContent[],
  idx: number,
  updates: Partial<DocxSectionProperties>,
): readonly DocxBlockContent[] | undefined {
  const el = content[idx];
  if (el.type === "sectionBreak") {
    return content.map((e, i) => (i === idx && e.type === "sectionBreak" ? { ...e, sectPr: { ...e.sectPr, ...updates } } : e));
  }
  if (el.type === "paragraph" && el.properties?.sectPr !== undefined) {
    return content.map((e, i) => {
      if (i !== idx || e.type !== "paragraph" || e.properties?.sectPr === undefined) {
        return e;
      }
      return { ...e, properties: { ...e.properties, sectPr: { ...e.properties.sectPr, ...updates } } };
    });
  }
  return undefined;
}

// =============================================================================
// Handlers
// =============================================================================

export const pageSectionHandlers: HandlerMap = {
  SET_ACTIVE_PAGE: (state, action) => ({
    ...state,
    activePageIndex: action.pageIndex,
  }),

  INSERT_PAGE_BREAK: (state, action) => {
    const document = state.documentHistory.present;
    const { contentIndex } = action;
    const el = document.body.content[contentIndex];
    if (el === undefined || el.type !== "paragraph") {
      return state;
    }
    const newContent = document.body.content.map((e, i) => {
      if (i !== contentIndex || e.type !== "paragraph") {
        return e;
      }
      return { ...e, properties: { ...(e.properties ?? {}), pageBreakBefore: true } };
    });
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, { ...document, body: { ...document.body, content: newContent } }),
    };
  },

  INSERT_SECTION_BREAK: (state, action) => {
    const document = state.documentHistory.present;
    const { contentIndex, sectPr: explicit } = action;
    const content = document.body.content;
    if (contentIndex < 0 || contentIndex > content.length) {
      return state;
    }
    const boundaries = findSectionBoundaries(content);
    const inherited = explicit ?? findSectionPropertiesAt(boundaries, contentIndex, document.body.sectPr) ?? {};
    const sb: DocxSectionBreak = { type: "sectionBreak", sectPr: inherited };
    const newContent = [...content.slice(0, contentIndex), sb, ...content.slice(contentIndex)];
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, { ...document, body: { ...document.body, content: newContent } }),
    };
  },

  DELETE_SECTION_BREAK: (state, action) => {
    const document = state.documentHistory.present;
    const { contentIndex } = action;
    const el = document.body.content[contentIndex];
    if (el === undefined || el.type !== "sectionBreak") {
      return state;
    }
    const newContent = [...document.body.content.slice(0, contentIndex), ...document.body.content.slice(contentIndex + 1)];
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, { ...document, body: { ...document.body, content: newContent } }),
    };
  },

  UPDATE_SECTION_PROPERTIES: (state, action) => {
    const document = state.documentHistory.present;
    const { sectionIndex, sectPr: updates } = action;
    const content = document.body.content;
    const boundaries = findSectionBoundaries(content);
    const section = lookupSectionByIndex(boundaries, document.body.sectPr, sectionIndex);

    if (section.isLastSection) {
      return {
        ...state,
        documentHistory: pushHistory(state.documentHistory, {
          ...document,
          body: { ...document.body, sectPr: { ...(document.body.sectPr ?? {}), ...updates } },
        }),
      };
    }
    if (section.contentIndex === undefined) {
      return state;
    }
    const newContent = updateSectPrAtIndex(content, section.contentIndex, updates);
    if (newContent === undefined) {
      return state;
    }
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, { ...document, body: { ...document.body, content: newContent } }),
    };
  },
};
