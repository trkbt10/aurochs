/**
 * @file XLSX Custom Editor Provider
 *
 * Registers a read-only custom editor for .xlsx and .xls files.
 */

import * as vscode from "vscode";
import { parseXls } from "@aurochs-office/xls";
import { renderXlsxHtml } from "../renderers/xlsx-renderer";
import { renderWorkbookToHtml, type WorkbookHtmlResult } from "@aurochs-renderer/xlsx/html";
import { buildWebviewShell } from "../webview/template";
import { sendWhenReady } from "./webview-messaging";
import type { ExtensionToWebviewMessage } from "../webview/types";

export const XLSX_VIEW_TYPE = "aurochs.xlsxViewer";

/**
 * Create an XLSX custom readonly editor provider.
 */
export function createXlsxEditorProvider(extensionUri: vscode.Uri): vscode.CustomReadonlyEditorProvider {
  return {
    async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
      return { uri, dispose: () => {} };
    },

    async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")],
      };

      webviewPanel.webview.html = buildWebviewShell({
        webview: webviewPanel.webview,
        extensionUri,
      });

      let message: ExtensionToWebviewMessage;
      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const result = await renderToSheets(document.uri, new Uint8Array(data));
        const fileName = document.uri.path.split("/").pop() ?? "spreadsheet";

        message = { type: "xlsx", fileName, sheets: result.sheets };
      } catch (err) {
        message = {
          type: "error",
          title: "Failed to load spreadsheet",
          message: err instanceof Error ? err.message : String(err),
        };
      }

      sendWhenReady(webviewPanel.webview, message);
    },
  };
}

/** Render .xls or .xlsx bytes to sheet HTML. */
function renderToSheets(uri: vscode.Uri, data: Uint8Array): Promise<WorkbookHtmlResult> | WorkbookHtmlResult {
  if (uri.path.toLowerCase().endsWith(".xls")) {
    const workbook = parseXls(data, { mode: "lenient" });
    return renderWorkbookToHtml(workbook);
  }
  return renderXlsxHtml(data);
}
