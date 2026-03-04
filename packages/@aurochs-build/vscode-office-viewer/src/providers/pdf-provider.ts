/**
 * @file PDF Custom Editor Provider
 *
 * Registers a read-only custom editor for .pdf files.
 */

import * as vscode from "vscode";
import { renderPdfPages } from "../renderers/pdf-renderer";
import { buildPdfWebviewHtml } from "../webview/pdf-template";
import { buildErrorHtml } from "./error-html";

export const PDF_VIEW_TYPE = "aurochs.pdfViewer";

/**
 * Create a PDF custom readonly editor provider.
 */
export function createPdfEditorProvider(): vscode.CustomReadonlyEditorProvider {
  return {
    async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
      return { uri, dispose: () => {} };
    },

    async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
      webviewPanel.webview.options = { enableScripts: true };

      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const result = await renderPdfPages(new Uint8Array(data));

        const fileName = document.uri.path.split("/").pop() ?? "document.pdf";
        webviewPanel.webview.html = buildPdfWebviewHtml({
          webview: webviewPanel.webview,
          pages: result.pages,
          fileName,
        });
      } catch (err) {
        webviewPanel.webview.html = buildErrorHtml(webviewPanel.webview, "Failed to load PDF", err);
      }
    },
  };
}
