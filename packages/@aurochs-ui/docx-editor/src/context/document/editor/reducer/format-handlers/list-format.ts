/**
 * @file List Format Handlers
 *
 * Handlers for list formatting operations.
 * Includes bullet lists, numbered lists, and indentation.
 */

import { twips, docxNumId, docxIlvl, type Twips, type DocxNumId, type DocxIlvl } from "@aurochs-office/docx/domain/types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import type { HandlerMap } from "../handler-types";
import {
  getSelectedIndices,
  getSelectedParagraphs,
  applyParagraphFormat,
  updateDocumentContent,
} from "./helpers";

// =============================================================================
// Constants
// =============================================================================

/** Default indent increment in twips (0.5 inch = 720 twips) */
const INDENT_INCREMENT: Twips = twips(720);

/** Bullet list numId (requires numbering definition in document) */
const BULLET_NUM_ID: DocxNumId = docxNumId(1);

/** Numbered list numId (requires numbering definition in document) */
const NUMBERED_NUM_ID: DocxNumId = docxNumId(2);

/** Default list level */
const DEFAULT_ILVL: DocxIlvl = docxIlvl(0);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a paragraph is in a list.
 */
function isInList(paragraph: { readonly properties?: { readonly numPr?: unknown } }): boolean {
  return paragraph.properties?.numPr !== undefined;
}

/**
 * Check if all selected paragraphs have a specific numId.
 */
function allHaveNumId(
  paragraphs: readonly { readonly properties?: { readonly numPr?: { readonly numId?: number } } }[],
  numId: number,
): boolean {
  if (paragraphs.length === 0) {
    return false;
  }
  return paragraphs.every((p) => p.properties?.numPr?.numId === numId);
}

/**
 * Get current indent level (in twips) from paragraph.
 */
function getCurrentIndent(paragraph: { readonly properties?: { readonly ind?: { readonly left?: Twips } } }): Twips {
  return paragraph.properties?.ind?.left ?? twips(0);
}

// =============================================================================
// List Format Handlers
// =============================================================================

export const listFormatHandlers: HandlerMap = {
  TOGGLE_BULLET_LIST: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const paragraphs = getSelectedParagraphs(document, indices);
    const allBullet = allHaveNumId(paragraphs, BULLET_NUM_ID);

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        if (allBullet) {
          // Remove list formatting
          const { numPr: _removed, ...restProps } = element.properties ?? {};
          return {
            ...element,
            properties: Object.keys(restProps).length > 0 ? restProps : undefined,
          };
        }
        // Apply bullet list
        return applyParagraphFormat(element, {
          numPr: {
            numId: BULLET_NUM_ID,
            ilvl: DEFAULT_ILVL,
          },
        });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  TOGGLE_NUMBERED_LIST: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const paragraphs = getSelectedParagraphs(document, indices);
    const allNumbered = allHaveNumId(paragraphs, NUMBERED_NUM_ID);

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        if (allNumbered) {
          // Remove list formatting
          const { numPr: _removed, ...restProps } = element.properties ?? {};
          return {
            ...element,
            properties: Object.keys(restProps).length > 0 ? restProps : undefined,
          };
        }
        // Apply numbered list
        return applyParagraphFormat(element, {
          numPr: {
            numId: NUMBERED_NUM_ID,
            ilvl: DEFAULT_ILVL,
          },
        });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  INCREASE_INDENT: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        // For list items, increase ilvl; for regular paragraphs, increase left indent
        if (isInList(element)) {
          const currentIlvl = (element.properties?.numPr?.ilvl as number | undefined) ?? 0;
          const newIlvl = docxIlvl(Math.min(currentIlvl + 1, 8)); // Max 9 levels (0-8)
          return applyParagraphFormat(element, {
            numPr: {
              ...element.properties?.numPr,
              ilvl: newIlvl,
            },
          });
        }
        // Regular paragraph: increase left indent
        const currentIndent = getCurrentIndent(element);
        const newIndent = twips((currentIndent as number) + (INDENT_INCREMENT as number));
        return applyParagraphFormat(element, {
          ind: {
            ...(element.properties?.ind ?? {}),
            left: newIndent,
          },
        });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  DECREASE_INDENT: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        // For list items, decrease ilvl; for regular paragraphs, decrease left indent
        if (isInList(element)) {
          const currentIlvl = (element.properties?.numPr?.ilvl as number | undefined) ?? 0;
          if (currentIlvl <= 0) {
            // Remove from list if at level 0
            const { numPr: _removed, ...restProps } = element.properties ?? {};
            return {
              ...element,
              properties: Object.keys(restProps).length > 0 ? restProps : undefined,
            };
          }
          const newIlvl = docxIlvl(currentIlvl - 1);
          return applyParagraphFormat(element, {
            numPr: {
              ...element.properties?.numPr,
              ilvl: newIlvl,
            },
          });
        }
        // Regular paragraph: decrease left indent
        const currentIndent = getCurrentIndent(element);
        const newIndent = Math.max(0, (currentIndent as number) - (INDENT_INCREMENT as number));
        if (newIndent === 0) {
          // Remove indent if zero
          const currentInd = element.properties?.ind ?? {};
          const { left: _removed, ...restInd } = currentInd;
          if (Object.keys(restInd).length === 0) {
            const { ind: _removedInd, ...restProps } = element.properties ?? {};
            return {
              ...element,
              properties: Object.keys(restProps).length > 0 ? restProps : undefined,
            };
          }
          return applyParagraphFormat(element, { ind: restInd });
        }
        return applyParagraphFormat(element, {
          ind: {
            ...(element.properties?.ind ?? {}),
            left: twips(newIndent),
          },
        });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },
};
