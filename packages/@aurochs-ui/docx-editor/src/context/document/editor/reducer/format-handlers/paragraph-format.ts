/**
 * @file Paragraph Format Handlers
 *
 * Handlers for paragraph-level formatting operations.
 * Includes alignment, line spacing, and indentation.
 */

import { twips } from "@aurochs-office/docx/domain/types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import type { HandlerMap } from "../handler-types";
import {
  getSelectedIndices,
  applyParagraphFormat,
  updateDocumentContent,
} from "./helpers";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate line spacing value based on rule.
 * For "auto": value is in 240ths of a line (240 = single, 480 = double)
 * For "exact" or "atLeast": value is in twips (1/20th of a point)
 */
function calculateLineValue(spacing: number, rule: "auto" | "exact" | "atLeast"): number {
  if (rule === "auto") {
    return Math.round(spacing * 240);
  }
  return Math.round(spacing * 20);
}

// =============================================================================
// Paragraph Format Handlers
// =============================================================================

export const paragraphFormatHandlers: HandlerMap = {
  APPLY_PARAGRAPH_FORMAT: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyParagraphFormat(element, action.format);
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  SET_PARAGRAPH_ALIGNMENT: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyParagraphFormat(element, { jc: action.alignment });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  SET_LINE_SPACING: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const lineRule = action.rule ?? "auto";
    const lineValue = calculateLineValue(action.spacing, lineRule);

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyParagraphFormat(element, {
          spacing: {
            ...(element.properties?.spacing ?? {}),
            line: lineValue,
            lineRule,
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

  SET_PARAGRAPH_INDENT: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    // Indentation values are in twips (1/20th of a point)
    // Input is in points, convert to twips
    const indUpdate: Record<string, unknown> = {};

    if (action.left !== undefined) {
      indUpdate.left = twips(Math.round(action.left * 20));
    }
    if (action.right !== undefined) {
      indUpdate.right = twips(Math.round(action.right * 20));
    }
    if (action.firstLine !== undefined) {
      if (action.firstLine >= 0) {
        indUpdate.firstLine = twips(Math.round(action.firstLine * 20));
        indUpdate.hanging = undefined;
      } else {
        // Negative first line indent = hanging indent
        indUpdate.hanging = twips(Math.round(Math.abs(action.firstLine) * 20));
        indUpdate.firstLine = undefined;
      }
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyParagraphFormat(element, {
          ind: {
            ...(element.properties?.ind ?? {}),
            ...indUpdate,
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
