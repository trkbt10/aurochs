/**
 * @file DOCX Webview Template
 *
 * Generates HTML for the DOCX document viewer.
 */

import type { Webview } from "vscode";
import { buildWebviewHtml } from "./template";

/** Parameters for building the DOCX webview HTML. */
export type DocxWebviewParams = {
  readonly webview: Webview;
  readonly html: string;
  readonly fileName: string;
};

/** Build the HTML for the DOCX document viewer webview. */
export function buildDocxWebviewHtml(params: DocxWebviewParams): string {
  const { webview, html, fileName } = params;

  const body = `
    <div class="docx-viewer">
      <div class="toolbar">
        <span class="info">${escapeHtml(fileName)}</span>
        <div class="spacer"></div>
        <div class="zoom-control">
          <button id="btn-zoom-out">-</button>
          <input type="range" id="zoom-slider" min="50" max="200" value="100" step="5">
          <button id="btn-zoom-in">+</button>
          <span id="zoom-label">100%</span>
        </div>
      </div>
      <div class="docx-content" id="docx-content">
        <div class="docx-page" id="docx-page">
          ${html}
        </div>
      </div>
    </div>
  `;

  const extraStyles = `
    .docx-viewer {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .docx-content {
      flex: 1;
      overflow: auto;
      padding: 24px;
      display: flex;
      justify-content: center;
    }

    .docx-page {
      background: var(--vscode-editor-background);
      max-width: 800px;
      width: 100%;
      padding: 48px 56px;
      box-shadow: 0 1px 8px rgba(0,0,0,0.12);
      border: 1px solid var(--viewer-border);
      border-radius: 2px;
      transform-origin: top center;
    }

    .docx-page h1, .docx-page h2, .docx-page h3,
    .docx-page h4, .docx-page h5, .docx-page h6 {
      margin: 0.6em 0 0.3em;
      line-height: 1.3;
    }
    .docx-page h1 { font-size: 2em; }
    .docx-page h2 { font-size: 1.6em; }
    .docx-page h3 { font-size: 1.3em; }
    .docx-page h4 { font-size: 1.1em; }
    .docx-page h5 { font-size: 1em; }
    .docx-page h6 { font-size: 0.9em; }

    .docx-page p {
      margin: 0.3em 0;
      line-height: 1.6;
    }

    .docx-page .docx-link {
      color: var(--viewer-link);
      text-decoration: underline;
      cursor: pointer;
    }

    .docx-page .docx-table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    .docx-page .docx-table td {
      border: 1px solid var(--viewer-border);
      padding: 6px 10px;
      vertical-align: top;
    }
    .docx-page .docx-table td p {
      margin: 0;
    }
  `;

  const script = `
    (function() {
      let zoom = 100;
      const zoomSlider = document.getElementById('zoom-slider');
      const zoomLabel = document.getElementById('zoom-label');
      const page = document.getElementById('docx-page');

      function updateZoom(value) {
        zoom = Math.max(50, Math.min(200, value));
        zoomSlider.value = zoom;
        zoomLabel.textContent = zoom + '%';
        page.style.transform = 'scale(' + (zoom / 100) + ')';
      }

      zoomSlider.addEventListener('input', (e) => updateZoom(parseInt(e.target.value)));
      document.getElementById('btn-zoom-in').addEventListener('click', () => updateZoom(zoom + 10));
      document.getElementById('btn-zoom-out').addEventListener('click', () => updateZoom(zoom - 10));
    })();
  `;

  return buildWebviewHtml({
    webview,
    title: `DOCX: ${fileName}`,
    body,
    extraStyles,
    script,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
