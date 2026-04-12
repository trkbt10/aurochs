/**
 * @file Webview entry point.
 *
 * Mounts the React application, loads @vscode-elements/elements,
 * and notifies the extension host that the webview is ready to receive data.
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { WebviewReadyMessage } from "./types";

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-badge/index.js";
import "@vscode-elements/elements/dist/vscode-icon/index.js";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);

  const readyMessage: WebviewReadyMessage = { type: "ready" };
  vscode.postMessage(readyMessage);
}
