/**
 * @file PPTX Custom Editor Provider
 *
 * Registers a read-only custom editor for .pptx and .ppt files.
 */

import * as vscode from "vscode";
import { parsePpt } from "@aurochs-office/ppt";
import { renderPptxSlides, renderPptxSlidesFromFile, type PptxRenderResult } from "../renderers/pptx-renderer";
import { buildWebviewShell } from "../webview/template";
import { sendWhenReady } from "./webview-messaging";
import type { ExtensionToWebviewMessage } from "../webview/types";

export const PPTX_VIEW_TYPE = "aurochs.pptxViewer";

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

      let message: ExtensionToWebviewMessage;
      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const result = await renderToSlides(document.uri, new Uint8Array(data));
        const fileName = document.uri.path.split("/").pop() ?? "presentation";

        message = {
          type: "pptx",
          fileName,
          slides: result.slides,
          width: result.width,
          height: result.height,
        };
      } catch (err) {
        message = {
          type: "error",
          title: "Failed to load presentation",
          message: err instanceof Error ? err.message : String(err),
        };
      }

      sendWhenReady(webviewPanel.webview, message);
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
