/**
 * @file XLSX Webview Template
 *
 * Generates HTML for the XLSX spreadsheet viewer with sheet tabs.
 */

import type { Webview } from "vscode";
import { buildWebviewHtml } from "./template";
import type { XlsxSheetHtml } from "../renderers/xlsx-renderer";

/** Parameters for building the XLSX webview HTML. */
export type XlsxWebviewParams = {
  readonly webview: Webview;
  readonly sheets: readonly XlsxSheetHtml[];
  readonly fileName: string;
};

/** Build the HTML for the XLSX spreadsheet viewer webview. */
export function buildXlsxWebviewHtml(params: XlsxWebviewParams): string {
  const { webview, sheets, fileName } = params;

  const tabs = sheets
    .map((sheet, i) => {
      return `<button class="sheet-tab${i === 0 ? " active" : ""}" data-index="${i}">${escapeHtml(sheet.name)}</button>`;
    })
    .join("\n");

  const sheetPanels = sheets
    .map((sheet, i) => {
      return `<div class="sheet-panel" data-index="${i}" style="display:${i === 0 ? "block" : "none"}">${sheet.html}</div>`;
    })
    .join("\n");

  const body = `
    <div class="xlsx-viewer">
      <div class="toolbar">
        <span class="info">${escapeHtml(fileName)} &mdash; ${sheets.length} sheet${sheets.length !== 1 ? "s" : ""}</span>
        <div class="spacer"></div>
        <div class="zoom-control">
          <button id="btn-zoom-out">-</button>
          <input type="range" id="zoom-slider" min="50" max="200" value="100" step="5">
          <button id="btn-zoom-in">+</button>
          <span id="zoom-label">100%</span>
        </div>
      </div>
      <div class="xlsx-content" id="xlsx-content">
        ${sheetPanels}
      </div>
      <div class="sheet-tabs" id="sheet-tabs">
        ${tabs}
      </div>
    </div>
  `;

  const extraStyles = `
    .xlsx-viewer {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .xlsx-content {
      flex: 1;
      overflow: auto;
      transform-origin: top left;
    }

    .xlsx-empty {
      padding: 24px;
      text-align: center;
      opacity: 0.6;
      font-style: italic;
    }

    .xlsx-table {
      border-collapse: collapse;
      font-size: 12px;
      white-space: nowrap;
    }

    .xlsx-header {
      position: sticky;
      background: var(--viewer-header-bg);
      font-weight: 600;
      font-size: 11px;
      padding: 3px 8px;
      border: 1px solid var(--viewer-border);
      z-index: 1;
    }

    .xlsx-col-header {
      top: 0;
      text-align: center;
      min-width: 64px;
    }

    .xlsx-row-header {
      position: sticky;
      left: 0;
      text-align: center;
      min-width: 40px;
      background: var(--viewer-header-bg);
      font-weight: 600;
      font-size: 11px;
      border: 1px solid var(--viewer-border);
      padding: 2px 6px;
      z-index: 1;
    }

    thead .xlsx-row-header {
      z-index: 2;
    }

    .xlsx-cell {
      border: 1px solid var(--viewer-border);
      padding: 2px 8px;
      min-width: 64px;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .xlsx-number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .sheet-tabs {
      display: flex;
      gap: 0;
      background: var(--viewer-header-bg);
      border-top: 1px solid var(--viewer-border);
      overflow-x: auto;
      flex-shrink: 0;
    }

    .sheet-tab {
      background: transparent;
      color: var(--viewer-fg);
      border: none;
      border-right: 1px solid var(--viewer-border);
      padding: 6px 16px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      opacity: 0.7;
      transition: opacity 0.15s, background 0.15s;
    }
    .sheet-tab:hover {
      opacity: 1;
      background: var(--viewer-hover);
    }
    .sheet-tab.active {
      opacity: 1;
      background: var(--viewer-bg);
      font-weight: 600;
      border-bottom: 2px solid var(--viewer-btn-bg);
    }
  `;

  const script = `
    (function() {
      let currentSheet = 0;
      let zoom = 100;
      const tabs = document.querySelectorAll('.sheet-tab');
      const panels = document.querySelectorAll('.sheet-panel');
      const zoomSlider = document.getElementById('zoom-slider');
      const zoomLabel = document.getElementById('zoom-label');
      const content = document.getElementById('xlsx-content');

      function switchSheet(index) {
        panels[currentSheet].style.display = 'none';
        tabs[currentSheet].classList.remove('active');
        currentSheet = index;
        panels[currentSheet].style.display = 'block';
        tabs[currentSheet].classList.add('active');
      }

      function updateZoom(value) {
        zoom = Math.max(50, Math.min(200, value));
        zoomSlider.value = zoom;
        zoomLabel.textContent = zoom + '%';
        content.style.transform = 'scale(' + (zoom / 100) + ')';
      }

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => switchSheet(i));
      });

      zoomSlider.addEventListener('input', (e) => updateZoom(parseInt(e.target.value)));
      document.getElementById('btn-zoom-in').addEventListener('click', () => updateZoom(zoom + 10));
      document.getElementById('btn-zoom-out').addEventListener('click', () => updateZoom(zoom - 10));
    })();
  `;

  return buildWebviewHtml({
    webview,
    title: `XLSX: ${fileName}`,
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
