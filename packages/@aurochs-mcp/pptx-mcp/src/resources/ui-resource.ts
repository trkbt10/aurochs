/**
 * @file UI resource for MCP Apps
 *
 * Serves the interactive preview UI as an MCP App resource using
 * the official @modelcontextprotocol/ext-apps SDK.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to the built UI bundle
const UI_BUNDLE_PATH = resolve(__dirname, "../../ui-dist/index.html");

// Fallback inline UI for development/testing
const FALLBACK_UI = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PPTX Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1a1a;
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 12px 16px;
      background: #2a2a2a;
      border-bottom: 1px solid #333;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header h1 {
      font-size: 14px;
      font-weight: 500;
    }
    .status {
      font-size: 12px;
      color: #888;
      margin-left: auto;
    }
    .main {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    .sidebar {
      width: 160px;
      background: #222;
      border-right: 1px solid #333;
      overflow-y: auto;
      padding: 8px;
    }
    .thumbnail {
      aspect-ratio: 16/9;
      background: #fff;
      border-radius: 4px;
      margin-bottom: 8px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s;
    }
    .thumbnail:hover {
      border-color: #555;
    }
    .thumbnail.active {
      border-color: #0066cc;
    }
    .preview {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .slide {
      background: #fff;
      aspect-ratio: 16/9;
      width: 100%;
      max-width: 800px;
      border-radius: 4px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
      font-size: 18px;
    }
    .empty {
      color: #666;
      text-align: center;
      padding: 40px;
    }
    .empty p {
      margin-bottom: 8px;
    }
    .empty code {
      background: #333;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PPTX Preview</h1>
    <span class="status" id="status">Waiting for presentation...</span>
  </div>
  <div class="main">
    <div class="sidebar" id="thumbnails"></div>
    <div class="preview">
      <div class="slide" id="slide">
        <div class="empty">
          <p>No presentation loaded</p>
          <p>Use <code>pptx_create_presentation</code> to start</p>
        </div>
      </div>
    </div>
  </div>
  <script>
    // MCP Bridge for receiving tool results
    const state = {
      slides: [],
      currentSlide: 0,
      presentation: null,
    };

    function updateUI() {
      const thumbnails = document.getElementById('thumbnails');
      const slide = document.getElementById('slide');
      const status = document.getElementById('status');

      // Update status
      if (state.presentation) {
        status.textContent = \`\${state.presentation.slideCount} slide(s) | \${state.presentation.width}x\${state.presentation.height}\`;
      }

      // Update thumbnails
      thumbnails.innerHTML = '';
      for (let i = 0; i < (state.presentation?.slideCount || 0); i++) {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail' + (i === state.currentSlide ? ' active' : '');
        thumb.textContent = i + 1;
        thumb.style.display = 'flex';
        thumb.style.alignItems = 'center';
        thumb.style.justifyContent = 'center';
        thumb.style.color = '#333';
        thumb.style.fontSize = '12px';
        thumb.onclick = () => {
          state.currentSlide = i;
          updateUI();
        };
        thumbnails.appendChild(thumb);
      }

      // Update slide preview
      if (state.presentation?.slideCount > 0) {
        slide.innerHTML = '<div style="color: #333">Slide ' + (state.currentSlide + 1) + '</div>';
      }
    }

    // Listen for MCP tool results
    window.addEventListener('message', (event) => {
      try {
        const data = event.data;
        if (data?.method === 'toolResult' && data?.params?._meta) {
          const meta = data.params._meta;
          if (meta.presentation) {
            state.presentation = meta.presentation;
          }
          if (meta.currentSlide !== undefined) {
            state.currentSlide = meta.currentSlide - 1;
          }
          updateUI();
        }
      } catch (e) {
        console.error('MCP message error:', e);
      }
    });
  </script>
</body>
</html>`;

function loadUiHtml(): string {
  if (existsSync(UI_BUNDLE_PATH)) {
    return readFileSync(UI_BUNDLE_PATH, "utf-8");
  }
  return FALLBACK_UI;
}

/**
 * Register UI resource for MCP Apps.
 */
export function registerUiResource(server: McpServer): void {
  registerAppResource(
    server,
    "PPTX Live Preview",
    "ui://pptx/preview",
    { description: "Interactive PPTX slide preview" },
    async (uri) => {
      const html = loadUiHtml();

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );
}
