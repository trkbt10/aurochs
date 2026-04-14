/**
 * @file Tests for createReadyGate.
 *
 * Verifies that the ready gate correctly handles the race condition
 * between async rendering work and the webview's "ready" signal.
 */

import { createReadyGate, type ReadyGateWebview } from "./webview-messaging";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../webview/types";

// =============================================================================
// Webview mock
// =============================================================================

type MessageListener = (msg: WebviewToExtensionMessage) => void;

type MockWebview = ReadyGateWebview & {
  /** Simulate a message from the webview (e.g. { type: "ready" }). */
  readonly simulateMessage: (msg: WebviewToExtensionMessage) => void;
  /** Messages posted to the webview via postMessage(). */
  readonly postedMessages: ExtensionToWebviewMessage[];
  /** Number of currently registered message listeners. */
  readonly listenerCount: () => number;
};

function createMockWebview(): MockWebview {
  const listeners: Set<MessageListener> = new Set();
  const postedMessages: ExtensionToWebviewMessage[] = [];

  return {
    postedMessages,
    listenerCount: () => listeners.size,

    simulateMessage(msg: WebviewToExtensionMessage): void {
      // Copy to array to allow disposal during iteration.
      for (const listener of [...listeners]) {
        listener(msg);
      }
    },

    onDidReceiveMessage(listener: MessageListener): { dispose: () => void } {
      listeners.add(listener);
      return {
        dispose(): void {
          listeners.delete(listener);
        },
      };
    },

    postMessage(message: ExtensionToWebviewMessage): Thenable<boolean> {
      postedMessages.push(message);
      return Promise.resolve(true);
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

const testMessage: ExtensionToWebviewMessage = {
  type: "docx",
  fileName: "test.docx",
  html: "<p>hello</p>",
};

describe("createReadyGate", () => {
  it("sends message immediately when webview is already ready", () => {
    const webview = createMockWebview();
    const gate = createReadyGate(webview);

    // Webview sends ready before send() is called.
    webview.simulateMessage({ type: "ready" });

    expect(webview.postedMessages).toHaveLength(0);

    gate.send(testMessage);

    expect(webview.postedMessages).toHaveLength(1);
    expect(webview.postedMessages[0]).toEqual(testMessage);
  });

  it("defers message until webview sends ready", () => {
    const webview = createMockWebview();
    const gate = createReadyGate(webview);

    // send() is called before ready.
    gate.send(testMessage);

    // Not yet posted.
    expect(webview.postedMessages).toHaveLength(0);

    // Webview becomes ready.
    webview.simulateMessage({ type: "ready" });

    // Now posted.
    expect(webview.postedMessages).toHaveLength(1);
    expect(webview.postedMessages[0]).toEqual(testMessage);
  });

  it("disposes the ready listener after receiving ready", () => {
    const webview = createMockWebview();
    createReadyGate(webview);

    expect(webview.listenerCount()).toBe(1);

    webview.simulateMessage({ type: "ready" });

    expect(webview.listenerCount()).toBe(0);
  });

  it("ignores non-ready messages", () => {
    const webview = createMockWebview();
    const gate = createReadyGate(webview);

    gate.send(testMessage);

    // Send a non-ready message — should be ignored.
    webview.simulateMessage({ type: "requestPdfPage", pageIndex: 0 });

    expect(webview.postedMessages).toHaveLength(0);

    // Ready finally arrives.
    webview.simulateMessage({ type: "ready" });

    expect(webview.postedMessages).toHaveLength(1);
    expect(webview.postedMessages[0]).toEqual(testMessage);
  });

  it("handles the race: ready arrives during async gap (the original bug)", async () => {
    const webview = createMockWebview();
    const gate = createReadyGate(webview);

    // Simulate: gate created, then async work starts...
    // During async work, webview sends ready.
    webview.simulateMessage({ type: "ready" });

    // Async work finishes.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // send() called after async work completes.
    gate.send(testMessage);

    // Message should be posted immediately since ready already arrived.
    expect(webview.postedMessages).toHaveLength(1);
    expect(webview.postedMessages[0]).toEqual(testMessage);
  });
});
