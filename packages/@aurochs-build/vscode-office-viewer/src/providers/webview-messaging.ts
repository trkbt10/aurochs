/**
 * @file Webview messaging helper.
 *
 * Waits for the webview React app to signal readiness before sending data.
 */

import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../webview/types";

/**
 * Minimal subset of VS Code's `Webview` interface used by the ready gate.
 * Extracted to allow unit testing without a full VS Code mock.
 */
export type ReadyGateWebview = {
  readonly onDidReceiveMessage: (
    listener: (msg: WebviewToExtensionMessage) => void,
  ) => { dispose: () => void };
  readonly postMessage: (message: ExtensionToWebviewMessage) => Thenable<boolean>;
};

export type ReadyGate = {
  readonly send: (message: ExtensionToWebviewMessage) => void;
};

/**
 * Create a ready gate that captures the webview's "ready" signal.
 *
 * The gate must be created **before** any async work (e.g. rendering)
 * to avoid a race condition where the webview sends "ready" while the
 * extension host is awaiting file I/O or rendering.
 *
 * After the async work completes, call `send(message)` to deliver the
 * data. If the webview is already ready, the message is sent immediately.
 * If not, it is sent as soon as "ready" arrives.
 *
 * Usage:
 * ```ts
 * const gate = createReadyGate(webviewPanel.webview);
 * const message = await buildExpensiveMessage();
 * gate.send(message);
 * ```
 */
export function createReadyGate(webview: ReadyGateWebview): ReadyGate {
  // Shared mutable state between the ready listener and the send() call.
  // Uses a single-element array to avoid `let` while still allowing mutation.
  const state: { ready: boolean; pending: ExtensionToWebviewMessage | null } = {
    ready: false,
    pending: null,
  };

  const listener = webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
    if (msg.type === "ready") {
      listener.dispose();
      state.ready = true;

      if (state.pending !== null) {
        webview.postMessage(state.pending);
        state.pending = null;
      }
    }
  });

  return {
    send(message: ExtensionToWebviewMessage): void {
      if (state.ready) {
        webview.postMessage(message);
      } else {
        state.pending = message;
      }
    },
  };
}
