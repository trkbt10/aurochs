/**
 * @file Word VBA Host Adapter exports
 *
 * Provides VBA runtime integration for Word (DOCX) documents.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

export { createWordHostAdapter, createWordAdapterState } from "./adapter";
export type { WordAdapterState } from "./adapter";
export type {
  WordHostObject,
  WordApplicationObject,
  WordDocumentObject,
  WordParagraphsObject,
  WordParagraphObject,
  WordRangeObject,
  WordSelectionObject,
} from "./types";
export {
  isApplicationObject,
  isDocumentObject,
  isParagraphsObject,
  isParagraphObject,
  isRangeObject,
  isSelectionObject,
} from "./types";
