/**
 * @file PPTX Custom Editor Provider
 *
 * Registers a read-only custom editor for .pptx and .ppt files.
 */

import * as vscode from "vscode";
import { parsePpt } from "@aurochs-office/ppt";
import { renderPptxSlides, renderPptxSlidesFromFile, type PptxRenderResult } from "../renderers/pptx-renderer";
import { buildWebviewShell } from "../webview/template";
import { createReadyGate } from "./webview-messaging";
import type { ExtensionToWebviewMessage } from "../webview/types";

export const PPTX_VIEW_TYPE = "aurochs.pptxViewer";

/** Build the message to send to the webview for a PPTX document. */
async function buildPptxMessage(uri: vscode.Uri): Promise<ExtensionToWebviewMessage> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    const result = await renderToSlides(uri, new Uint8Array(data));
    const fileName = uri.path.split("/").pop() ?? "presentation";
    return {
      type: "pptx",
      fileName,
      slides: result.slides,
      width: result.width,
      height: result.height,
    };
  } catch (err) {
    return {
      type: "error",
      title: "Failed to load presentation",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Create a PPTX custom readonly editor provider.
 */
export function createPptxEditorProvider(extensionUri: vscode.Uri): vscode.CustomReadonlyEditorProvider {
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

      // Register the ready listener BEFORE async work to avoid missing
      // the webview's "ready" signal during file I/O and rendering.
      const gate = createReadyGate(webviewPanel.webview);
      const message = await buildPptxMessage(document.uri);
      gate.send(message);
    },
  };
}

/** Render .ppt or .pptx bytes to slide SVGs. */
function renderToSlides(uri: vscode.Uri, data: Uint8Array): Promise<PptxRenderResult> | PptxRenderResult {
  if (uri.path.toLowerCase().endsWith(".ppt")) {
    const pkg = parsePpt(data, { mode: "lenient" });
    return renderPptxSlidesFromFile(pkg.asPresentationFile());
  }
  return renderPptxSlides(data);
}
