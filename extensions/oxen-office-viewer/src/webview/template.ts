/**
 * @file Base Webview HTML Template
 *
 * Provides shared HTML shell, CSP policy, and CSS for all viewer webviews.
 */

import type { Webview } from "vscode";

export type WebviewTemplateParams = {
  readonly webview: Webview;
  readonly title: string;
  readonly body: string;
  readonly extraStyles?: string;
  readonly script?: string;
};

/**
 * Generate the base HTML document for a webview panel.
 */
export function buildWebviewHtml(params: WebviewTemplateParams): string {
  const { webview, title, body, extraStyles, script } = params;

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
  <title>${escapeHtml(title)}</title>
  <style>
    ${BASE_STYLES}
    ${extraStyles ?? ""}
  </style>
</head>
<body>
  ${body}
  ${script ? `<script nonce="${nonce}">${script}</script>` : ""}
</body>
</html>`;
}

const BASE_STYLES = `
  :root {
    --viewer-bg: var(--vscode-editor-background);
    --viewer-fg: var(--vscode-editor-foreground);
    --viewer-border: var(--vscode-panel-border);
    --viewer-header-bg: var(--vscode-sideBar-background);
    --viewer-hover: var(--vscode-list-hoverBackground);
    --viewer-active: var(--vscode-list-activeSelectionBackground);
    --viewer-active-fg: var(--vscode-list-activeSelectionForeground);
    --viewer-btn-bg: var(--vscode-button-background);
    --viewer-btn-fg: var(--vscode-button-foreground);
    --viewer-btn-hover: var(--vscode-button-hoverBackground);
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

  .toolbar button {
    background: var(--viewer-btn-bg);
    color: var(--viewer-btn-fg);
    border: none;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.4;
  }
  .toolbar button:hover {
    background: var(--viewer-btn-hover);
  }
  .toolbar button:disabled {
    opacity: 0.5;
    cursor: default;
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
    accent-color: var(--viewer-btn-bg);
  }

  .zoom-control span {
    font-size: 11px;
    min-width: 36px;
    text-align: center;
    opacity: 0.8;
  }
`;

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
