/**
 * @file Error HTML generator for webview panels.
 */

import type { Webview } from "vscode";

/**
 * Build an error HTML page for display in a webview panel.
 */
export function buildErrorHtml(_webview: Webview, title: string, err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
</head>
<body style="padding:24px;font-family:sans-serif;color:var(--vscode-errorForeground,#f44);">
  <h2>${title}</h2>
  <p>${message.replace(/</g, "&lt;")}</p>
</body>
</html>`;
}
