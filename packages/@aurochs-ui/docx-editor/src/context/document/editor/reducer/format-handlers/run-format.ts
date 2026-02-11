/**
 * @file Run Format Handlers
 *
 * Handlers for run-level (text) formatting operations.
 * Includes bold, italic, underline, strikethrough, font size, font family, colors.
 */

import { halfPoints, type HalfPoints } from "@aurochs-office/docx/domain/types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import type { HandlerMap } from "../handler-types";
import {
  getSelectedIndices,
  getSelectedParagraphs,
  getFirstRunProperties,
  applyRunFormatToParagraph,
  clearRunFormatting,
  updateDocumentContent,
} from "./helpers";

// =============================================================================
// Toggle Helpers
// =============================================================================

/**
 * Check if all selected paragraphs have a boolean property set.
 */
function allParagraphsHaveProperty(
  paragraphs: readonly { readonly properties?: { readonly [key: string]: unknown } }[],
  getter: (props: { readonly [key: string]: unknown } | undefined) => boolean | undefined,
): boolean {
  if (paragraphs.length === 0) {
    return false;
  }
  return paragraphs.every((p) => {
    const props = getFirstRunProperties(p as Parameters<typeof getFirstRunProperties>[0]);
    return getter(props as { readonly [key: string]: unknown } | undefined) === true;
  });
}

// =============================================================================
// Run Format Handlers
// =============================================================================

export const runFormatHandlers: HandlerMap = {
  APPLY_RUN_FORMAT: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, action.format);
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  TOGGLE_BOLD: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const paragraphs = getSelectedParagraphs(document, indices);
    const allBold = allParagraphsHaveProperty(paragraphs, (props) => props?.b as boolean | undefined);
    const newValue = !allBold;

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, { b: newValue ? true : undefined });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  TOGGLE_ITALIC: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const paragraphs = getSelectedParagraphs(document, indices);
    const allItalic = allParagraphsHaveProperty(paragraphs, (props) => props?.i as boolean | undefined);
    const newValue = !allItalic;

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, { i: newValue ? true : undefined });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  TOGGLE_UNDERLINE: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const paragraphs = getSelectedParagraphs(document, indices);
    const allUnderline = allParagraphsHaveProperty(paragraphs, (props) => props?.u !== undefined);
    const newValue = !allUnderline;

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, { u: newValue ? { val: "single" } : undefined });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  TOGGLE_STRIKETHROUGH: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const paragraphs = getSelectedParagraphs(document, indices);
    const allStrike = allParagraphsHaveProperty(paragraphs, (props) => props?.strike as boolean | undefined);
    const newValue = !allStrike;

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, { strike: newValue ? true : undefined });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  SET_FONT_SIZE: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    // Font size in DOCX is in half-points (1pt = 2 half-points)
    const sizeInHalfPoints: HalfPoints = halfPoints(action.size * 2);

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, { sz: sizeInHalfPoints });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  SET_FONT_FAMILY: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, {
          rFonts: {
            ascii: action.family,
            hAnsi: action.family,
            eastAsia: action.family,
            cs: action.family,
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

  SET_TEXT_COLOR: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    // Remove # prefix if present, DOCX uses bare hex
    const colorValue = action.color.startsWith("#") ? action.color.slice(1) : action.color;

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, {
          color: { val: colorValue },
        });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  SET_HIGHLIGHT_COLOR: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    // Highlight color is a string literal type in DOCX
    const highlightValue = action.color as
      | "black" | "blue" | "cyan" | "green" | "magenta" | "red" | "yellow" | "white"
      | "darkBlue" | "darkCyan" | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow"
      | "darkGray" | "lightGray" | "none"
      | undefined;

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return applyRunFormatToParagraph(element, {
          highlight: highlightValue,
        });
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  CLEAR_FORMATTING: (state) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "paragraph") {
        return clearRunFormatting(element);
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },
};
