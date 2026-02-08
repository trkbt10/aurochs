/**
 * @file PPTX Custom Editor Provider
 *
 * Registers a read-only custom editor for .pptx and .ppt files.
 */

import * as vscode from "vscode";
import { parsePpt } from "@oxen-office/ppt";
import { renderPptxSlides, renderPptxSlidesFromFile, type PptxRenderResult } from "../renderers/pptx-renderer";
import { buildPptxWebviewHtml } from "../webview/pptx-template";
import { buildErrorHtml } from "./error-html";

export const PPTX_VIEW_TYPE = "oxen.pptxViewer";

/**
 * Create a PPTX custom readonly editor provider.
 */
export function createPptxEditorProvider(): vscode.CustomReadonlyEditorProvider {
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
        const result = await renderToSlides(document.uri, new Uint8Array(data));

        const fileName = document.uri.path.split("/").pop() ?? "presentation";
        webviewPanel.webview.html = buildPptxWebviewHtml({
          webview: webviewPanel.webview,
          slides: result.slides,
          width: result.width,
          height: result.height,
          fileName,
        });
      } catch (err) {
        webviewPanel.webview.html = buildErrorHtml(
          webviewPanel.webview,
          "Failed to load presentation",
          err,
        );
      }
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
