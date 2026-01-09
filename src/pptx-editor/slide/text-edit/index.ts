/**
 * @file Text editing module
 *
 * Provides utilities for inline text editing in the slide editor.
 * Implements hybrid text editing with hidden textarea and visual cursor overlay.
 */

// State types and constructors
export {
  type TextEditBounds,
  type InactiveTextEditState,
  type ActiveTextEditState,
  type TextEditState,
  type StickyFormattingState,
  type TextCursorState,
  createInactiveTextEditState,
  createActiveTextEditState,
  createInitialStickyFormatting,
  createActiveStickyFormatting,
  isTextEditInactive,
  isTextEditActive,
} from "./input-support/state";

// Cursor position mapping
export {
  type CursorPosition,
  type TextSelection,
  type CursorCoordinates,
  type SelectionRect,
  getPlainText,
  offsetToCursorPosition,
  cursorPositionToOffset,
  coordinatesToCursorPosition,
  cursorPositionToCoordinates,
  selectionToRects,
  isSamePosition,
  isBefore,
  normalizeSelection,
} from "./input-support/cursor";

// Text body merge utilities
export {
  mergeTextIntoBody,
  extractDefaultRunProperties,
} from "./input-support/text-body-merge";

// Text edit controller component
export { TextEditController } from "./coordinator/TextEditController";

// Text edit types
export type {
  TextEditControllerProps,
  CursorState,
  CompositionState,
  SelectionChangeEvent,
} from "./coordinator/types";

// Text geometry utilities (shared between cursor and rendering)
export {
  type TextVisualBounds,
  DEFAULT_FONT_SIZE_PT,
  fontSizeToPixels,
  getLineFontSize,
  getFontSizeAtOffset,
  getFontSizeForRange,
  getTextVisualBounds,
  getLineVisualBounds,
  getVisualBoundsAtOffset,
  getVisualBoundsForRange,
  getTextWidthForChars,
  getXPositionInLine,
  getLineEndX,
  getLineTextLength,
} from "./text-render/text-geometry";
