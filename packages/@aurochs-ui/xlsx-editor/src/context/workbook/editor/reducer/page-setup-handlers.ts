/**
 * @file Page setup handlers
 *
 * Handlers for page setup, margins, header/footer, and print options.
 */

import type { HandlerMap } from "./handler-types";
import type { XlsxEditorAction, XlsxEditorState } from "../types";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import {
  setPageSetup,
  setPageMargins,
  setHeaderFooter,
  setPrintOptions,
  setPageBreaks,
} from "../../../../sheet/page-setup-mutation";

type SetPageSetupAction = Extract<XlsxEditorAction, { type: "SET_PAGE_SETUP" }>;
type SetPageMarginsAction = Extract<XlsxEditorAction, { type: "SET_PAGE_MARGINS" }>;
type SetHeaderFooterAction = Extract<XlsxEditorAction, { type: "SET_HEADER_FOOTER" }>;
type SetPrintOptionsAction = Extract<XlsxEditorAction, { type: "SET_PRINT_OPTIONS" }>;
type SetPageBreaksAction = Extract<XlsxEditorAction, { type: "SET_PAGE_BREAKS" }>;

function handleSetPageSetup(state: XlsxEditorState, action: SetPageSetupAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setPageSetup(currentWorkbook, action.sheetIndex, action.pageSetup);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSetPageMargins(state: XlsxEditorState, action: SetPageMarginsAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setPageMargins(currentWorkbook, action.sheetIndex, action.pageMargins);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSetHeaderFooter(state: XlsxEditorState, action: SetHeaderFooterAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setHeaderFooter(currentWorkbook, action.sheetIndex, action.headerFooter);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSetPrintOptions(state: XlsxEditorState, action: SetPrintOptionsAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setPrintOptions(currentWorkbook, action.sheetIndex, action.printOptions);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

function handleSetPageBreaks(state: XlsxEditorState, action: SetPageBreaksAction): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const newWorkbook = setPageBreaks(currentWorkbook, action.sheetIndex, action.pageBreaks);
  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, newWorkbook),
  };
}

export const pageSetupHandlers: HandlerMap = {
  SET_PAGE_SETUP: handleSetPageSetup,
  SET_PAGE_MARGINS: handleSetPageMargins,
  SET_HEADER_FOOTER: handleSetHeaderFooter,
  SET_PRINT_OPTIONS: handleSetPrintOptions,
  SET_PAGE_BREAKS: handleSetPageBreaks,
};
