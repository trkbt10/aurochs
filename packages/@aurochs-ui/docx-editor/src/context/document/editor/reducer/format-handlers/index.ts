/**
 * @file Format Handlers Index
 *
 * Exports all format handlers combined into a single HandlerMap.
 */

import type { HandlerMap } from "../handler-types";
import { runFormatHandlers } from "./run-format";
import { paragraphFormatHandlers } from "./paragraph-format";
import { listFormatHandlers } from "./list-format";
import { tableFormatHandlers } from "./table-format";
import { tableStructureHandlers } from "./table-structure";
import { pageSectionHandlers } from "./page-section";

/**
 * Combined format handlers for all formatting operations.
 */
export const formatHandlers: HandlerMap = {
  ...runFormatHandlers,
  ...paragraphFormatHandlers,
  ...listFormatHandlers,
  ...tableFormatHandlers,
  ...tableStructureHandlers,
  ...pageSectionHandlers,
};

// Re-export individual handler groups for testing
export { runFormatHandlers } from "./run-format";
export { paragraphFormatHandlers } from "./paragraph-format";
export { listFormatHandlers } from "./list-format";
export { tableFormatHandlers } from "./table-format";
export { tableStructureHandlers } from "./table-structure";
export { pageSectionHandlers } from "./page-section";

// Re-export helpers for testing
export {
  getSelectedIndices,
  applyRunPropsToRun,
  applyRunFormatToParagraph,
  getFirstRunProperties,
  clearRunFormatting,
  applyParagraphFormat,
  clearParagraphFormatting,
  applyTableFormat,
  applyTableCellFormat,
  updateDocumentContent,
  getSelectedParagraphs,
  getSelectedTables,
} from "./helpers";
