/**
 * @file XLSX Editor - React-based workbook editor
 */

// Context (Provider + hooks)
export {
  XlsxWorkbookEditorProvider,
  useXlsxWorkbookEditor,
  useXlsxWorkbookEditorOptional,
  type XlsxWorkbookEditorContextValue,
} from "./context/workbook/XlsxWorkbookEditorContext";

// State / reducer (for integrations like pptx chart data editing)
export {
  xlsxEditorReducer,
  createInitialState,
} from "./context/workbook/editor/reducer";

export type {
  XlsxEditorState,
  XlsxEditorAction,
} from "./context/workbook/editor/types";

// UI
export {
  XlsxWorkbookEditor,
  type XlsxWorkbookEditorProps,
} from "./components/XlsxWorkbookEditor";

export {
  XlsxSheetGrid,
  type XlsxGridMetrics,
} from "./components/XlsxSheetGrid";

export {
  XlsxWorkbookToolbar,
  type XlsxWorkbookToolbarProps,
} from "./components/toolbar/XlsxWorkbookToolbar";
