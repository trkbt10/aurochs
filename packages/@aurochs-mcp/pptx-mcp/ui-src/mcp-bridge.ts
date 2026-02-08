/**
 * @file MCP Bridge for UI communication
 *
 * Uses the official @modelcontextprotocol/ext-apps SDK App class
 * for communication with the MCP host via PostMessage transport.
 */

import { App } from "@modelcontextprotocol/ext-apps";

export type ToolResultMeta = {
  readonly ui?: { resourceUri: string };
  readonly currentSlide?: number;
  readonly presentation?: {
    readonly slideCount: number;
    readonly width: number;
    readonly height: number;
  };
  readonly slideData?: {
    readonly number: number;
    readonly svg?: string;
  };
  [key: string]: unknown;
};

export const app = new App(
  { name: "PPTX Preview", version: "0.1.0" },
  {},
  { autoResize: false },
);

let connected = false;

/** Connect to host (idempotent). Call after setting handlers. */
export function connectApp(): void {
  if (connected) return;
  connected = true;
  app.connect().catch((err) => {
    console.error("MCP connect failed:", err);
  });
}
