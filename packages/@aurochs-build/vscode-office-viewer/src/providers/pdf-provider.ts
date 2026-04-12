/**
 * @file PDF Custom Editor Provider
 *
 * Registers a read-only custom editor for .pdf files.
 */

import * as vscode from "vscode";
import { renderPdfPages } from "../renderers/pdf-renderer";
import { buildWebviewShell } from "../webview/template";
import { sendWhenReady } from "./webview-messaging";
import type { ExtensionToWebviewMessage } from "../webview/types";

export const PDF_VIEW_TYPE = "aurochs.pdfViewer";

/**
 * Create a PDF custom readonly editor provider.
 */
export function createPdfEditorProvider(extensionUri: vscode.Uri): vscode.CustomReadonlyEditorProvider {
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
        const result = await renderPdfPages(new Uint8Array(data));
        const fileName = document.uri.path.split("/").pop() ?? "document.pdf";

        message = { type: "pdf", fileName, pages: result.pages };
      } catch (err) {
        message = {
          type: "error",
          title: "Failed to load PDF",
          message: err instanceof Error ? err.message : String(err),
        };
      }

      sendWhenReady(webviewPanel.webview, message);
    },
  };
}
