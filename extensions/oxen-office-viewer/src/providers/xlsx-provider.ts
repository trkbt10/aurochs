/**
 * @file XLSX Custom Editor Provider
 *
 * Registers a read-only custom editor for .xlsx and .xls files.
 */

import * as vscode from "vscode";
import { parseXls } from "@oxen-office/xls";
import { renderXlsxHtml, renderXlsxWorkbookHtml, type XlsxRenderResult } from "../renderers/xlsx-renderer";
import { buildXlsxWebviewHtml } from "../webview/xlsx-template";
import { buildErrorHtml } from "./error-html";

export const XLSX_VIEW_TYPE = "oxen.xlsxViewer";

/**
 * Create an XLSX custom readonly editor provider.
 */
export function createXlsxEditorProvider(): vscode.CustomReadonlyEditorProvider {
  return {
    async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
      return { uri, dispose: () => {} };
    },

    async resolveCustomEditor(
      document: vscode.CustomDocument,
      webviewPanel: vscode.WebviewPanel,
    ): Promise<void> {
      webviewPanel.webview.options = { enableScripts: true };

      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const result = await renderToSheets(document.uri, new Uint8Array(data));

        const fileName = document.uri.path.split("/").pop() ?? "spreadsheet";
        webviewPanel.webview.html = buildXlsxWebviewHtml({
          webview: webviewPanel.webview,
          sheets: result.sheets,
          fileName,
        });
      } catch (err) {
        webviewPanel.webview.html = buildErrorHtml(
          webviewPanel.webview,
          "Failed to load spreadsheet",
          err,
        );
      }
    },
  };
}

/** Render .xls or .xlsx bytes to sheet HTML. */
function renderToSheets(uri: vscode.Uri, data: Uint8Array): Promise<XlsxRenderResult> | XlsxRenderResult {
  if (uri.path.toLowerCase().endsWith(".xls")) {
    const workbook = parseXls(data, { mode: "lenient" });
    return renderXlsxWorkbookHtml(workbook);
  }
  return renderXlsxHtml(data);
}
