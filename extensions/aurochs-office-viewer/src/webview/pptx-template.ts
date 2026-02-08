/**
 * @file PPTX Webview Template
 *
 * Generates HTML for the PPTX slide viewer with thumbnails and navigation.
 */

import type { Webview } from "vscode";
import { buildWebviewHtml } from "./template";

/** Parameters for building the PPTX webview HTML. */
export type PptxWebviewParams = {
  readonly webview: Webview;
  readonly slides: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly fileName: string;
};

/**
 * Build the HTML for the PPTX slide viewer webview.
 */
export function buildPptxWebviewHtml(params: PptxWebviewParams): string {
  const { webview, slides, width, height, fileName } = params;

  const thumbnails = slides
    .map((svg, i) => {
      return `<div class="thumbnail${i === 0 ? " active" : ""}" data-index="${i}" title="Slide ${i + 1}">
        <div class="thumbnail-number">${i + 1}</div>
        <div class="thumbnail-svg">${svg}</div>
      </div>`;
    })
    .join("\n");

  const slideDivs = slides
    .map((svg, i) => {
      return `<div class="slide" data-index="${i}" style="display:${i === 0 ? "block" : "none"};aspect-ratio:${width}/${height}">${svg}</div>`;
    })
    .join("\n");

  const body = `
    <div class="pptx-viewer">
      <div class="toolbar">
        <button id="btn-prev" disabled>&larr; Prev</button>
        <span class="info" id="slide-info">Slide 1 / ${slides.length}</span>
        <button id="btn-next" ${slides.length <= 1 ? "disabled" : ""}>Next &rarr;</button>
        <div class="spacer"></div>
        <div class="zoom-control">
          <button id="btn-zoom-out">-</button>
          <input type="range" id="zoom-slider" min="25" max="200" value="100" step="5">
          <button id="btn-zoom-in">+</button>
          <span id="zoom-label">100%</span>
        </div>
      </div>
      <div class="pptx-content">
        <div class="sidebar" id="sidebar">
          ${thumbnails}
        </div>
        <div class="main-area" id="main-area">
          <div class="slide-container" id="slide-container">
            ${slideDivs}
          </div>
        </div>
      </div>
    </div>
  `;

  const extraStyles = `
    .pptx-viewer {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .pptx-content {
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

    .slide-container {
      max-width: 100%;
      transform-origin: center center;
    }

    .slide {
      background: white;
      box-shadow: 0 2px 16px rgba(0,0,0,0.18);
      border-radius: 2px;
      overflow: hidden;
      width: 100%;
      max-width: 900px;
    }

    .slide svg {
      width: 100%;
      height: auto;
      display: block;
    }
  `;

  const script = `
    (function() {
      const vscode = acquireVsCodeApi();
      let currentSlide = 0;
      const totalSlides = ${slides.length};
      let zoom = 100;

      const slides = document.querySelectorAll('.slide');
      const thumbs = document.querySelectorAll('.thumbnail');
      const btnPrev = document.getElementById('btn-prev');
      const btnNext = document.getElementById('btn-next');
      const slideInfo = document.getElementById('slide-info');
      const zoomSlider = document.getElementById('zoom-slider');
      const zoomLabel = document.getElementById('zoom-label');
      const slideContainer = document.getElementById('slide-container');

      function goToSlide(index) {
        if (index < 0 || index >= totalSlides) return;
        slides[currentSlide].style.display = 'none';
        thumbs[currentSlide].classList.remove('active');
        currentSlide = index;
        slides[currentSlide].style.display = 'block';
        thumbs[currentSlide].classList.add('active');
        thumbs[currentSlide].scrollIntoView({ block: 'nearest' });
        slideInfo.textContent = 'Slide ' + (currentSlide + 1) + ' / ' + totalSlides;
        btnPrev.disabled = currentSlide === 0;
        btnNext.disabled = currentSlide === totalSlides - 1;
      }

      function updateZoom(value) {
        zoom = Math.max(25, Math.min(200, value));
        zoomSlider.value = zoom;
        zoomLabel.textContent = zoom + '%';
        slideContainer.style.transform = 'scale(' + (zoom / 100) + ')';
      }

      btnPrev.addEventListener('click', () => goToSlide(currentSlide - 1));
      btnNext.addEventListener('click', () => goToSlide(currentSlide + 1));

      thumbs.forEach((thumb, i) => {
        thumb.addEventListener('click', () => goToSlide(i));
      });

      zoomSlider.addEventListener('input', (e) => updateZoom(parseInt(e.target.value)));
      document.getElementById('btn-zoom-in').addEventListener('click', () => updateZoom(zoom + 10));
      document.getElementById('btn-zoom-out').addEventListener('click', () => updateZoom(zoom - 10));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          goToSlide(currentSlide - 1);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          goToSlide(currentSlide + 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          goToSlide(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          goToSlide(totalSlides - 1);
        }
      });
    })();
  `;

  return buildWebviewHtml({
    webview,
    title: `PPTX: ${fileName}`,
    body,
    extraStyles,
    script,
  });
}
