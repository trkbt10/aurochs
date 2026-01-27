/**
 * @file DOCX Editors Barrel Export
 *
 * Re-exports all editor components for the DOCX editor.
 */

// Text editors
export {
  RunPropertiesEditor,
  createDefaultRunProperties,
  type RunPropertiesEditorProps,
} from "./text";

// Paragraph editors
export {
  ParagraphPropertiesEditor,
  createDefaultParagraphProperties,
  type ParagraphPropertiesEditorProps,
} from "./paragraph";

// Table editors
export {
  TablePropertiesEditor,
  createDefaultTableProperties,
  type TablePropertiesEditorProps,
  TableCellPropertiesEditor,
  createDefaultTableCellProperties,
  type TableCellPropertiesEditorProps,
} from "./table";

// Style editors
export {
  StyleEditor,
  createDefaultStyle,
  type StyleEditorProps,
} from "./style";

// Numbering editors
export {
  NumberingLevelEditor,
  createDefaultLevel,
  type NumberingLevelEditorProps,
} from "./numbering";
