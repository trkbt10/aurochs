/**
 * @file DOCX Custom Editor Provider
 *
 * Registers a read-only custom editor for .docx and .doc files.
 */

import * as vscode from "vscode";
import { parseDoc, convertDocToDocx } from "@aurochs-office/doc";
import { renderDocxHtml, renderDocxDocumentHtml } from "../renderers/docx-renderer";
import { buildWebviewShell } from "../webview/template";
import { createReadyGate } from "./webview-messaging";
import type { ExtensionToWebviewMessage } from "../webview/types";

export const DOCX_VIEW_TYPE = "aurochs.docxViewer";

/**
 * Create a DOCX custom readonly editor provider.
 */
export function createDocxEditorProvider(extensionUri: vscode.Uri): vscode.CustomReadonlyEditorProvider {
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

      const gate = createReadyGate(webviewPanel.webview);
      const message = await buildDocxMessage(document.uri);
      gate.send(message);
    },
  };
}

/** Build the message to send to the webview for a DOCX document. */
async function buildDocxMessage(uri: vscode.Uri): Promise<ExtensionToWebviewMessage> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    const html = await renderToHtml(uri, new Uint8Array(data));
    const fileName = uri.path.split("/").pop() ?? "document";
    return { type: "docx", fileName, html };
  } catch (err) {
    return {
      type: "error",
      title: "Failed to load document",
      message: err instanceof Error ? err.message : String(err),
    };
  }
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
