/**
 * @file Webview HTML Shell
 *
 * Generates the minimal HTML document that loads the React webview app.
 * Used by extension providers to set webview HTML content.
 */

import { Uri, type Webview } from "vscode";

export type WebviewShellParams = {
  readonly webview: Webview;
  readonly extensionUri: Uri;
};

/**
 * Generate the HTML shell that loads the React webview app.
 *
 * This is the only place where HTML is constructed as a string.
 * All interpolated values are either from trusted VS Code APIs
 * (cspSource, asWebviewUri) or self-generated (nonce).
 * No user-supplied content is interpolated.
 */
export function buildWebviewShell(params: WebviewShellParams): string {
  const { webview, extensionUri } = params;

  const nonce = getNonce();
  const appUri = getWebviewUri(webview, extensionUri, "dist", "webview", "main.js");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${appUri}"></script>
</body>
</html>`;
}

/** Resolve a path relative to the extension root as a webview URI. */
function getWebviewUri(webview: Webview, extensionUri: Uri, ...pathSegments: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathSegments));
}

/**
 * Base styles for the webview shell.
 *
 * Includes global resets, VS Code theme variable mappings, scrollbar styling,
 * and shared layout primitives used across all viewer types.
 * Viewer-specific styles are co-located with their React components.
 */
const BASE_STYLES = `
  :root {
    --viewer-bg: var(--vscode-editor-background);
    --viewer-fg: var(--vscode-editor-foreground);
    --viewer-border: var(--vscode-panel-border);
    --viewer-header-bg: var(--vscode-sideBar-background);
    --viewer-hover: var(--vscode-list-hoverBackground);
    --viewer-active: var(--vscode-list-activeSelectionBackground);
    --viewer-active-fg: var(--vscode-list-activeSelectionForeground);
    --viewer-link: var(--vscode-textLink-foreground);
    --viewer-scrollbar: var(--vscode-scrollbarSlider-background);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: var(--viewer-bg);
    color: var(--viewer-fg);
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    line-height: 1.5;
    overflow: hidden;
    height: 100vh;
  }

  #root {
    height: 100vh;
    overflow: hidden;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--viewer-scrollbar);
    border-radius: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    opacity: 0.6;
  }

  .error-viewer {
    padding: 24px;
    color: var(--vscode-errorForeground, #f44);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--viewer-header-bg);
    border-bottom: 1px solid var(--viewer-border);
    min-height: 36px;
    flex-shrink: 0;
  }

  .toolbar .info {
    font-size: 12px;
    opacity: 0.8;
  }

  .toolbar .spacer {
    flex: 1;
  }

  .zoom-control {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .zoom-control input[type="range"] {
    width: 80px;
    accent-color: var(--vscode-button-background);
  }

  .zoom-control span {
    font-size: 11px;
    min-width: 36px;
    text-align: center;
    opacity: 0.8;
  }

  /* Paginated viewer shared styles (PPTX, PDF) */

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
    border-color: var(--vscode-focusBorder);
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

  /* PPTX viewer */

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

  /* PDF viewer */

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

  .pdf-page-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 400px;
    min-height: 500px;
    background: white;
    color: #666;
    font-size: 14px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.18);
    border-radius: 2px;
  }

  .thumbnail-placeholder {
    width: 100%;
    aspect-ratio: 210/297;
    background: #f0f0f0;
    border-radius: 2px;
  }

  /* DOCX viewer */

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

  /* XLSX viewer */

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
    border-bottom: 2px solid var(--vscode-panelTitle-activeBorder);
  }
`;

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}
