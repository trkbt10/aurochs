/**
 * @file DOCX Custom Editor Provider
 *
 * Registers a read-only custom editor for .docx and .doc files.
 */

import * as vscode from "vscode";
import { parseDoc, convertDocToDocx } from "@aurochs-office/doc";
import { renderDocxHtml, renderDocxDocumentHtml } from "../renderers/docx-renderer";
import { buildDocxWebviewHtml } from "../webview/docx-template";
import { buildErrorHtml } from "./error-html";

export const DOCX_VIEW_TYPE = "aurochs.docxViewer";

/**
 * Create a DOCX custom readonly editor provider.
 */
export function createDocxEditorProvider(): vscode.CustomReadonlyEditorProvider {
  return {
    async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
      return { uri, dispose: () => {} };
    },

    async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
      webviewPanel.webview.options = { enableScripts: true };

      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const html = renderToHtml(document.uri, new Uint8Array(data));

        const fileName = document.uri.path.split("/").pop() ?? "document";
        webviewPanel.webview.html = buildDocxWebviewHtml({
          webview: webviewPanel.webview,
          html: await html,
          fileName,
        });
      } catch (err) {
        webviewPanel.webview.html = buildErrorHtml(webviewPanel.webview, "Failed to load document", err);
      }
    },
  };
}

/** Render .doc or .docx bytes to HTML. */
function renderToHtml(uri: vscode.Uri, data: Uint8Array): Promise<string> | string {
  if (uri.path.toLowerCase().endsWith(".doc")) {
    const docDocument = parseDoc(data, { mode: "lenient" });
    const docxDocument = convertDocToDocx(docDocument);
    return renderDocxDocumentHtml(docxDocument);
  }
  return renderDocxHtml(data);
}
