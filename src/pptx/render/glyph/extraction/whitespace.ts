/**
 * @file Whitespace glyph creation (main thread wrapper)
 *
 * Creates GlyphContour for whitespace characters (space, tab, newline).
 * Uses shared core function with main thread canvas factory.
 */

import type { GlyphContour, GlyphStyleKey } from "../types";
import { createWhitespaceGlyphCore, type CanvasFactory } from "./extract-core";

// =============================================================================
// Canvas Factory (Main Thread)
// =============================================================================

const createMainThreadCanvas: CanvasFactory = (width, height) => {
  if (typeof document === "undefined") {
    throw new Error("Whitespace glyph extraction requires a browser canvas.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable for whitespace metrics.");
  }
  return { canvas, ctx };
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Create a glyph contour for whitespace characters.
 *
 * Whitespace characters have no visible paths but still need metrics
 * for proper text layout.
 *
 * @throws Error if called in non-browser environment
 */
export function createWhitespaceGlyph(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  return createWhitespaceGlyphCore(char, fontFamily, style, createMainThreadCanvas);
}
