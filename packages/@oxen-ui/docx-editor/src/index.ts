/**
 * @file DOCX Editor Module Index
 *
 * Main entry point for the DOCX editor module.
 * Provides state management, selection, and editing capabilities.
 */

// State utilities
export * from "./context/document/state";

// Editor types and reducer
export * from "./context/document/editor";

// Editor Components
export {
  RunPropertiesEditor,
  createDefaultRunProperties,
  type RunPropertiesEditorProps,
} from "./editors/text/RunPropertiesEditor";

export {
  ParagraphPropertiesEditor,
  createDefaultParagraphProperties,
  type ParagraphPropertiesEditorProps,
} from "./editors/paragraph/ParagraphPropertiesEditor";

export {
  StyleEditor,
  createDefaultStyle,
  type StyleEditorProps,
} from "./editors/style/StyleEditor";

export {
  NumberingLevelEditor,
  createDefaultLevel,
  type NumberingLevelEditorProps,
} from "./editors/numbering/NumberingLevelEditor";

export {
  TablePropertiesEditor,
  createDefaultTableProperties,
  type TablePropertiesEditorProps,
} from "./editors/table/TablePropertiesEditor";

export {
  TableCellPropertiesEditor,
  createDefaultTableCellProperties,
  type TableCellPropertiesEditorProps,
} from "./editors/table/TableCellPropertiesEditor";

// Document Editor (SVG-based)
export {
  ContinuousEditor,
  type ContinuousEditorProps,
} from "./text-edit/ContinuousEditor";

export { type HyperlinkClickEvent } from "./text-edit/DocumentTextOverlay";

// Layout hooks
export {
  useDocumentLayout,
  type UseDocumentLayoutOptions,
  type DocumentLayoutResult,
} from "./document/hooks/use-document-layout";

export {
  useContinuousCursor,
  type UseContinuousCursorOptions,
  type ContinuousCursorResult,
} from "./document/hooks/use-continuous-cursor";
