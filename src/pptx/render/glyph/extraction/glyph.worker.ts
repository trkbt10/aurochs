/**
 * @file Glyph extraction Web Worker
 *
 * Extracts glyph contours in a background thread.
 * Uses OffscreenCanvas for rendering.
 */

import type { GlyphContour, GlyphStyleKey } from "../types";
import { extractGlyphCore, createWhitespaceGlyphCore, type CanvasFactory } from "./extract-core";

// =============================================================================
// Types
// =============================================================================

type WorkerRequest = {
  id: number;
  type: "extractGlyph";
  char: string;
  fontFamily: string;
  style: GlyphStyleKey;
};

type WorkerResponse =
  | {
      id: number;
      type: "glyphResult";
      glyph: GlyphContour;
    }
  | {
      id: number;
      type: "glyphError";
      message: string;
    };

// =============================================================================
// Canvas Factory (Worker)
// =============================================================================

const createWorkerCanvas: CanvasFactory = (width, height) => {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Worker canvas context unavailable.");
  }
  return { canvas, ctx };
};

// =============================================================================
// Worker Message Handler
// =============================================================================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, char, fontFamily, style } = event.data;

  if (type === "extractGlyph") {
    try {
      const glyph = extractGlyphInWorker(char, fontFamily, style);
      const response: WorkerResponse = { id, type: "glyphResult", glyph };
      self.postMessage(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Worker glyph extraction failed.";
      const response: WorkerResponse = { id, type: "glyphError", message };
      self.postMessage(response);
    }
  }
};

// =============================================================================
// Glyph Extraction
// =============================================================================

function extractGlyphInWorker(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  // Handle whitespace
  if (char === " " || char === "\t" || char === "\n") {
    return createWhitespaceGlyphCore(char, fontFamily, style, createWorkerCanvas);
  }

  return extractGlyphCore(char, fontFamily, style, createWorkerCanvas);
}
