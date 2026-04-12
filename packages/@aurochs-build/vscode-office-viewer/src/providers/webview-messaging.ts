/**
 * @file Webview messaging helper.
 *
 * Waits for the webview React app to signal readiness before sending data.
 */

import type { Webview } from "vscode";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../webview/types";

/**
 * Send data to the webview after it signals readiness.
 *
 * The webview React app posts a `{ type: "ready" }` message once mounted.
 * This function listens for that signal, then sends the data message.
 * If the ready message has already been sent (race condition), the data
 * is sent immediately on the next message listener registration.
 */
export function sendWhenReady(webview: Webview, message: ExtensionToWebviewMessage): void {
  const listener = webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
    if (msg.type === "ready") {
      listener.dispose();
      webview.postMessage(message);
    }
  });
}
