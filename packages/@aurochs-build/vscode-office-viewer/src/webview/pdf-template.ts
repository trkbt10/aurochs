/**
 * @file PDF Webview Template
 *
 * Generates HTML for the PDF viewer with page thumbnails and navigation.
 */

import type { Webview } from "vscode";
import { buildWebviewHtml } from "./template";

/** Parameters for building the PDF webview HTML. */
export type PdfWebviewParams = {
  readonly webview: Webview;
  readonly pages: readonly string[];
  readonly fileName: string;
};

/** Build the HTML for the PDF viewer webview. */
export function buildPdfWebviewHtml(params: PdfWebviewParams): string {
  const { webview, pages, fileName } = params;

  const thumbnails = pages
    .map((svg, i) => {
      return `<div class="thumbnail${i === 0 ? " active" : ""}" data-index="${i}" title="Page ${i + 1}">
        <div class="thumbnail-number">${i + 1}</div>
        <div class="thumbnail-svg">${svg}</div>
      </div>`;
    })
    .join("\n");

  const pageDivs = pages
    .map((svg, i) => {
      return `<div class="pdf-page" data-index="${i}" style="display:${i === 0 ? "block" : "none"}">${svg}</div>`;
    })
    .join("\n");

  const body = `
    <div class="pdf-viewer">
      <div class="toolbar">
        <button id="btn-prev" disabled>&larr; Prev</button>
        <span class="info" id="page-info">Page 1 / ${pages.length}</span>
        <button id="btn-next" ${pages.length <= 1 ? "disabled" : ""}>Next &rarr;</button>
        <div class="spacer"></div>
        <div class="zoom-control">
          <button id="btn-zoom-out">-</button>
          <input type="range" id="zoom-slider" min="25" max="300" value="100" step="5">
          <button id="btn-zoom-in">+</button>
          <span id="zoom-label">100%</span>
        </div>
      </div>
      <div class="pdf-content">
        <div class="sidebar" id="sidebar">
          ${thumbnails}
        </div>
        <div class="main-area">
          <div class="pdf-page-container" id="pdf-page-container">
            ${pageDivs}
          </div>
        </div>
      </div>
    </div>
  `;

  const extraStyles = `
    .pdf-viewer {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .pdf-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 160px;
      min-width: 160px;
      overflow-y: auto;
      padding: 8px;
      background: var(--viewer-header-bg);
      border-right: 1px solid var(--viewer-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .thumbnail {
      cursor: pointer;
      border: 2px solid transparent;
      border-radius: 4px;
      padding: 2px;
      position: relative;
      transition: border-color 0.15s;
    }
    .thumbnail:hover {
      border-color: var(--viewer-hover);
    }
    .thumbnail.active {
      border-color: var(--viewer-btn-bg);
    }
    .thumbnail-number {
      position: absolute;
      top: 4px;
      left: 6px;
      font-size: 10px;
      opacity: 0.7;
      font-weight: 600;
      pointer-events: none;
    }
    .thumbnail-svg {
      width: 100%;
      border-radius: 2px;
      overflow: hidden;
      background: white;
    }
    .thumbnail-svg svg {
      width: 100%;
      height: auto;
      display: block;
    }

    .main-area {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .pdf-page-container {
      transform-origin: center center;
      max-width: 100%;
    }

    .pdf-page {
      background: white;
      box-shadow: 0 2px 16px rgba(0,0,0,0.18);
      border-radius: 2px;
      overflow: hidden;
      width: fit-content;
      max-width: min(100%, 1200px);
      margin: 0 auto;
    }
    .pdf-page svg {
      display: block;
      max-width: 100%;
      height: auto;
    }
  `;

  const script = `
    (function() {
      let currentPage = 0;
      const totalPages = ${pages.length};
      let zoom = 100;

      const pageItems = document.querySelectorAll('.pdf-page');
      const thumbs = document.querySelectorAll('.thumbnail');
      const btnPrev = document.getElementById('btn-prev');
      const btnNext = document.getElementById('btn-next');
      const pageInfo = document.getElementById('page-info');
      const zoomSlider = document.getElementById('zoom-slider');
      const zoomLabel = document.getElementById('zoom-label');
      const pageContainer = document.getElementById('pdf-page-container');

      function goToPage(index) {
        if (index < 0 || index >= totalPages) return;
        pageItems[currentPage].style.display = 'none';
        thumbs[currentPage].classList.remove('active');
        currentPage = index;
        pageItems[currentPage].style.display = 'block';
        thumbs[currentPage].classList.add('active');
        thumbs[currentPage].scrollIntoView({ block: 'nearest' });
        pageInfo.textContent = 'Page ' + (currentPage + 1) + ' / ' + totalPages;
        btnPrev.disabled = currentPage === 0;
        btnNext.disabled = currentPage === totalPages - 1;
      }

      function updateZoom(value) {
        zoom = Math.max(25, Math.min(300, value));
        zoomSlider.value = zoom;
        zoomLabel.textContent = zoom + '%';
        pageContainer.style.transform = 'scale(' + (zoom / 100) + ')';
      }

      btnPrev.addEventListener('click', () => goToPage(currentPage - 1));
      btnNext.addEventListener('click', () => goToPage(currentPage + 1));

      thumbs.forEach((thumb, i) => {
        thumb.addEventListener('click', () => goToPage(i));
      });

      zoomSlider.addEventListener('input', (e) => updateZoom(parseInt(e.target.value)));
      document.getElementById('btn-zoom-in').addEventListener('click', () => updateZoom(zoom + 10));
      document.getElementById('btn-zoom-out').addEventListener('click', () => updateZoom(zoom - 10));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          goToPage(currentPage - 1);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          goToPage(currentPage + 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          goToPage(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          goToPage(totalPages - 1);
        }
      });
    })();
  `;

  return buildWebviewHtml({
    webview,
    title: `PDF: ${fileName}`,
    body,
    extraStyles,
    script,
  });
}
