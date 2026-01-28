/**
 * @file Async Text Layout Engine using glyph contours
 *
 * Uses Web Worker for glyph extraction to avoid blocking main thread.
 */

import type {
  GlyphContour,
  GlyphStyleKey,
  ContourPath,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "../types";
import { getKerningAdjustment } from "./kerning-table";
import { calculateOpticalKerningAdjustment } from "./kerning";
import { getCachedGlyph, setCachedGlyph } from "../extraction/glyph-cache";
import { extractGlyphContour } from "../extraction/glyph";
import { createWhitespaceGlyph } from "../extraction/whitespace";

// =============================================================================
// Worker Management
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

type PendingRequest = {
  resolve: (glyph: GlyphContour) => void;
  reject: (error: Error) => void;
};

// eslint-disable-next-line no-restricted-syntax -- Module-level singleton state
let worker: Worker | null = null;
// eslint-disable-next-line no-restricted-syntax -- Module-level counter for request IDs
let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();
// eslint-disable-next-line no-restricted-syntax -- Module-level state for worker initialization failure
let workerFailed = false;
// eslint-disable-next-line no-restricted-syntax -- Module-level state for lazy-loaded worker constructor
let WorkerConstructor: (new () => Worker) | null = null;

/**
 * Lazy-load the worker constructor using Vite's worker import.
 * This avoids module load failures in non-Vite environments (tests).
 */
async function loadWorkerConstructor(): Promise<(new () => Worker) | null> {
  if (WorkerConstructor !== null) {
    return WorkerConstructor;
  }
  if (workerFailed) {
    return null;
  }
  try {
    // Dynamic import with Vite's ?worker suffix
    const module = await import("../extraction/glyph.worker?worker");
    WorkerConstructor = module.default;
    return WorkerConstructor;
  } catch {
    // Non-Vite environment (tests, Node.js)
    workerFailed = true;
    return null;
  }
}

function getWorker(): Worker | null {
  if (worker) {
    return worker;
  }
  if (workerFailed || WorkerConstructor === null) {
    return null;
  }
  if (typeof Worker === "undefined") {
    return null;
  }

  try {
    const w = new WorkerConstructor();

    w.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const pending = pendingRequests.get(event.data.id);
      if (!pending) {
        return;
      }
      pendingRequests.delete(event.data.id);
      if (event.data.type === "glyphResult") {
        pending.resolve(event.data.glyph);
        return;
      }
      pending.reject(new Error(event.data.message));
    };

    w.onerror = (error: ErrorEvent) => {
      console.warn("Glyph worker error:", error);
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error("Worker error"));
        pendingRequests.delete(id);
      }
    };

    worker = w;
    return worker;
  } catch (error) {
    console.warn("Failed to initialize glyph worker:", error);
    workerFailed = true;
    return null;
  }
}

async function extractGlyphAsync(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): Promise<GlyphContour> {
  // Check cache first
  const cached = getCachedGlyph(fontFamily, char, style);
  if (cached) {
    return cached;
  }

  // Handle whitespace synchronously (no heavy processing)
  if (char === " " || char === "\t" || char === "\n") {
    const glyph = createWhitespaceGlyph(char, fontFamily, style);
    setCachedGlyph(fontFamily, char, style, glyph);
    return glyph;
  }

  // Try to load worker constructor on first call
  await loadWorkerConstructor();
  const w = getWorker();
  if (!w) {
    // Fallback to sync extraction
    const glyph = extractGlyphContour(char, fontFamily, style);
    setCachedGlyph(fontFamily, char, style, glyph);
    return glyph;
  }

  return new Promise((resolve, reject) => {
    const id = ++requestId;

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Glyph worker timeout."));
    }, 5000);

    pendingRequests.set(id, {
      resolve: (glyph) => {
        clearTimeout(timeout);
        setCachedGlyph(fontFamily, char, style, glyph);
        resolve(glyph);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    const request: WorkerRequest = {
      id,
      type: "extractGlyph",
      char,
      fontFamily,
      style,
    };

    w.postMessage(request);
  });
}

async function extractGlyphsAsync(
  chars: string[],
  fontFamily: string,
  style: GlyphStyleKey,
): Promise<GlyphContour[]> {
  return Promise.all(chars.map((char) => extractGlyphAsync(char, fontFamily, style)));
}

/**
 * Terminate the worker
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingRequests.clear();
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Layout text into positioned glyphs (async - uses Web Worker)
 */
export async function layoutTextAsync(
  text: string,
  config: TextLayoutConfig,
): Promise<TextLayoutResult> {
  if (text.length === 0) {
    return {
      glyphs: [],
      totalWidth: 0,
      ascent: 0,
      descent: 0,
      combinedPaths: [],
    };
  }

  const style: GlyphStyleKey = {
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
  };

  const letterSpacing = config.letterSpacing ?? 0;
  const useOpticalKerning = config.opticalKerning === true;
  const enableKerning = config.enableKerning ?? true;
  const useFontKerning = enableKerning && !useOpticalKerning;

  // Extract all glyphs using worker
  const chars = [...text]; // Properly handle Unicode
  const glyphContours = await extractGlyphsAsync(chars, config.fontFamily, style);

  // Layout glyphs
  const glyphs: PositionedGlyph[] = [];
  const combinedPaths: ContourPath[] = [];

  // eslint-disable-next-line no-restricted-syntax -- Performance: accumulator pattern
  let cursorX = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: accumulator pattern
  let maxAscent = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: accumulator pattern
  let maxDescent = 0;

  for (const [i, glyph] of glyphContours.entries()) {
    // Apply kerning adjustment
    const kerning = calculateKerningForIndex(
      i,
      glyph,
      glyphContours,
      chars,
      config.fontFamily,
      letterSpacing,
      useOpticalKerning,
      useFontKerning,
    );

    const x = cursorX + kerning;
    const y = 0;

    glyphs.push({ glyph, x, y });

    // Add offset paths to combined
    for (const path of glyph.paths) {
      combinedPaths.push({
        points: path.points.map((p) => ({ x: p.x + x, y: p.y + y })),
        isHole: path.isHole,
      });
    }

    // Track metrics
    maxAscent = Math.max(maxAscent, glyph.metrics.ascent);
    maxDescent = Math.max(maxDescent, glyph.metrics.descent);

    // Advance cursor
    cursorX += glyph.metrics.advanceWidth + letterSpacing + kerning;
  }

  return {
    glyphs,
    totalWidth: cursorX - letterSpacing,
    ascent: maxAscent,
    descent: maxDescent,
    combinedPaths,
  };
}

function calculateKerningForIndex(
  index: number,
  glyph: GlyphContour,
  glyphContours: readonly GlyphContour[],
  chars: readonly string[],
  fontFamily: string,
  letterSpacing: number,
  useOpticalKerning: boolean,
  useFontKerning: boolean,
): number {
  if (index === 0) {
    return 0;
  }

  if (useOpticalKerning) {
    const prevGlyph = glyphContours[index - 1];
    return calculateOpticalKerningAdjustment(prevGlyph, glyph, letterSpacing);
  }

  if (useFontKerning) {
    return getKerningAdjustment(fontFamily, chars[index - 1], chars[index]);
  }

  return 0;
}
