/**
 * @file PDF Custom Editor Provider
 *
 * Registers a read-only custom editor for .pdf files.
 *
 * For large PDFs, uses incremental rendering: only metadata and the first page
 * are sent initially, with subsequent pages rendered on demand via messages
 * from the webview.
 */

import * as vscode from "vscode";
import { createPdfViewerSession, type PdfViewerSession } from "../renderers/pdf-renderer";
import { buildWebviewShell } from "../webview/template";
import { createReadyGate, type ReadyGate } from "./webview-messaging";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../webview/types";

export const PDF_VIEW_TYPE = "aurochs.pdfViewer";

/**
 * Page count threshold for switching to incremental rendering.
 *
 * PDFs with fewer pages than this are rendered all at once (fast path).
 * PDFs at or above this threshold use the session-based incremental path
 * to avoid blocking the extension host and overwhelming the webview.
 */
const INCREMENTAL_THRESHOLD = 50;

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

      // Register the ready gate BEFORE any async work to capture the
      // webview's "ready" signal regardless of how long rendering takes.
      const gate = createReadyGate(webviewPanel.webview);

      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const uint8Data = new Uint8Array(data);

        const session = await createPdfViewerSession(uint8Data);

        if (session.pageCount < INCREMENTAL_THRESHOLD) {
          // Small PDF: render all pages at once using the already-created session.
          const fileName = document.uri.path.split("/").pop() ?? "document.pdf";
          const pages: string[] = [];
          for (let i = 1; i <= session.pageCount; i++) {
            pages.push(await session.renderPage(i));
          }
          session.dispose();
          gate.send({ type: "pdf", fileName, pages });
        } else {
          // Large PDF: incremental rendering.
          setupIncrementalRendering({ webviewPanel, session, uri: document.uri, gate });
        }
      } catch (err) {
        gate.send({
          type: "error",
          title: "Failed to load PDF",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}

type SetupIncrementalRenderingArgs = {
  readonly webviewPanel: vscode.WebviewPanel;
  readonly session: PdfViewerSession;
  readonly uri: vscode.Uri;
  readonly gate: ReadyGate;
};

/**
 * Set up incremental rendering for a large PDF.
 *
 * Sends metadata + first page via the ready gate, then listens for page
 * requests from the webview and responds with rendered SVG strings.
 */
function setupIncrementalRendering({
  webviewPanel,
  session,
  uri,
  gate,
}: SetupIncrementalRenderingArgs): void {
  const fileName = uri.path.split("/").pop() ?? "document.pdf";

  // Dispose session when the panel is closed.
  webviewPanel.onDidDispose(() => {
    session.dispose();
  });

  // Render first page and send metadata via the gate.
  // The gate handles the ready timing — no need for a separate ready listener.
  session.renderPage(1).then(
    (firstPageSvg) => {
      gate.send({
        type: "pdfMeta",
        fileName,
        pageCount: session.pageCount,
        firstPageSvg,
      });
    },
    (err) => {
      gate.send({
        type: "error",
        title: "Failed to load PDF",
        message: err instanceof Error ? err.message : String(err),
      });
    },
  );

  // Listen for page requests from the webview.
  webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
    if (msg.type === "requestPdfPage") {
      const pageNumber = msg.pageIndex + 1; // Convert 0-based to 1-based
      try {
        const svg = await session.renderPage(pageNumber);
        const response: ExtensionToWebviewMessage = {
          type: "pdfPage",
          pageIndex: msg.pageIndex,
          svg,
        };
        webviewPanel.webview.postMessage(response);
      } catch (renderError) {
        const detail = renderError instanceof Error ? renderError.message : String(renderError);
        const response: ExtensionToWebviewMessage = {
          type: "pdfPage",
          pageIndex: msg.pageIndex,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="10" y="50" fill="red">Failed to render page ${pageNumber}: ${detail}</text></svg>`,
        };
        webviewPanel.webview.postMessage(response);
      }
    }
  });
}
