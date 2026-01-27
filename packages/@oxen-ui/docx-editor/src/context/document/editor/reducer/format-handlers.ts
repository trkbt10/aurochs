/**
 * @file DOCX Editor Format Handlers
 *
 * Handlers for text and paragraph formatting operations.
 */

import type { HandlerMap } from "./handler-types";

// =============================================================================
// Format Handlers
// =============================================================================

/**
 * Format handlers for run-level (text) formatting.
 *
 * All formatting operations will be fully implemented in Phase 4.
 * These handlers establish the action interface.
 */
export const formatHandlers: HandlerMap = {
  // -------------------------------------------------------------------------
  // Run-level Formatting (implemented in Phase 4)
  // -------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  APPLY_RUN_FORMAT: (state, _action) => state,

  TOGGLE_BOLD: (state) => state,

  TOGGLE_ITALIC: (state) => state,

  TOGGLE_UNDERLINE: (state) => state,

  TOGGLE_STRIKETHROUGH: (state) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_FONT_SIZE: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_FONT_FAMILY: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_TEXT_COLOR: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_HIGHLIGHT_COLOR: (state, _action) => state,

  CLEAR_FORMATTING: (state) => state,

  // -------------------------------------------------------------------------
  // Paragraph-level Formatting (implemented in Phase 4)
  // -------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  APPLY_PARAGRAPH_FORMAT: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_PARAGRAPH_ALIGNMENT: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_LINE_SPACING: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  SET_PARAGRAPH_INDENT: (state, _action) => state,

  // -------------------------------------------------------------------------
  // List Formatting (implemented in Phase 4)
  // -------------------------------------------------------------------------

  TOGGLE_BULLET_LIST: (state) => state,

  TOGGLE_NUMBERED_LIST: (state) => state,

  INCREASE_INDENT: (state) => state,

  DECREASE_INDENT: (state) => state,

  // -------------------------------------------------------------------------
  // Table Formatting (implemented in Phase 4)
  // -------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  APPLY_TABLE_FORMAT: (state, _action) => state,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  APPLY_TABLE_CELL_FORMAT: (state, _action) => state,
};
