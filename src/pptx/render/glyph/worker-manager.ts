/**
 * @file Glyph Worker Manager
 *
 * Manages communication with the glyph extraction Web Worker.
 * Uses synchronous extraction when Worker is unavailable.
 */

import type { GlyphContour, GlyphStyleKey } from "./types";
import { getCachedGlyph, setCachedGlyph } from "./cache";
import { extractGlyphContour } from "./extractor";
import { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-family";
import { getContourExtractionWorkerCode } from "./contour-extraction";
import { createWhitespaceGlyph } from "./whitespace-glyph";

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

type PendingRequest = {
  resolve: (glyph: GlyphContour) => void;
  reject: (error: Error) => void;
};

// =============================================================================
// Worker Manager
// =============================================================================

// eslint-disable-next-line no-restricted-syntax -- Module-level singleton state
let worker: Worker | null = null;
// eslint-disable-next-line no-restricted-syntax -- Module-level counter for request IDs
let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();
// eslint-disable-next-line no-restricted-syntax -- Module-level state for worker initialization failure
let workerFailed = false;

/**
 * Initialize the glyph worker
 */
function initWorker(): Worker | null {
  if (workerFailed) {
    return null;
  }

  try {
    // Create worker from blob to avoid bundler issues
    const workerCode = getWorkerCode();
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const w = new Worker(workerUrl);

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

    w.onerror = (error) => {
      console.warn("Glyph worker error:", error);
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error("Worker error"));
        pendingRequests.delete(id);
      }
    };

    return w;
  } catch (error) {
    console.warn("Failed to initialize glyph worker:", error);
    workerFailed = true;
    return null;
  }
}

/**
 * Get or create the worker
 */
function getWorker(): Worker | null {
  if (worker) {
    return worker;
  }
  if (typeof Worker === "undefined") {
    return null;
  }
  worker = initWorker();
  return worker;
}

/**
 * Extract glyph using worker (async)
 */
export async function extractGlyphAsync(char: string, fontFamily: string, style: GlyphStyleKey): Promise<GlyphContour> {
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

  const w = getWorker();
  if (!w) {
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

/**
 * Extract multiple glyphs in batch (async)
 */
export async function extractGlyphsAsync(
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

// createWhitespaceGlyph imported from ./whitespace-glyph

const formatFontFamilySource = formatFontFamily.toString();
const contourExtractionWorkerCode = getContourExtractionWorkerCode();

// =============================================================================
// Inline Worker Code
// =============================================================================

function getWorkerCode(): string {
  return `
const RENDER_SCALE = 2;
const GENERIC_FONT_FAMILIES = new Set(${JSON.stringify(GENERIC_FONT_FAMILIES)});
const formatFontFamily = ${formatFontFamilySource};

self.onmessage = function(event) {
  const { id, type, char, fontFamily, style } = event.data;
  if (type === "extractGlyph") {
    try {
      const glyph = extractGlyphInWorker(char, fontFamily, style);
      self.postMessage({ id, type: "glyphResult", glyph });
    } catch (error) {
      const message = error && error.message ? error.message : "Worker glyph extraction failed.";
      self.postMessage({ id, type: "glyphError", message });
    }
  }
};

function extractGlyphInWorker(char, fontFamily, style) {
  if (char === " " || char === "\\t" || char === "\\n") {
    return createWhitespaceGlyph(char, fontFamily, style);
  }

  const scaledSize = style.fontSize * RENDER_SCALE;
  const canvas = new OffscreenCanvas(256, 256);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Worker canvas context unavailable.");
  }

  const fontString = style.fontStyle + " " + style.fontWeight + " " + scaledSize + "px " + formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES);
  ctx.font = fontString;
  const textMetrics = ctx.measureText(char);
  const ascent = textMetrics.actualBoundingBoxAscent;
  const descent = textMetrics.actualBoundingBoxDescent;
  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
    throw new Error("Worker text metrics missing ascent/descent.");
  }

  const padding = scaledSize * 0.3;
  const width = Math.ceil(Math.max(textMetrics.width, scaledSize * 0.5) + padding * 2);
  const height = Math.ceil(ascent + descent + padding * 2);

  canvas.width = Math.min(width, 256);
  canvas.height = Math.min(height, 256);

  ctx.font = fontString;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  const baselinePx = padding + ascent;
  ctx.fillText(char, padding, baselinePx);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rawContours = extractContours(imageData);
  const baselineOffset = (baselinePx - padding) / RENDER_SCALE;
  const paths = processContours(rawContours, RENDER_SCALE, padding).map(function(path) {
    return {
      points: path.points.map(function(point) {
        return { x: point.x, y: point.y - baselineOffset };
      }),
      isHole: path.isHole
    };
  });
  const bounds = calculateBounds(paths);

  return {
    char,
    paths,
    bounds,
    metrics: {
      advanceWidth: textMetrics.width / RENDER_SCALE,
      leftBearing: (textMetrics.actualBoundingBoxLeft || 0) / RENDER_SCALE,
      ascent: ascent / RENDER_SCALE,
      descent: descent / RENDER_SCALE,
    }
  };
}

function createWhitespaceGlyph(char, fontFamily, style) {
  const canvas = new OffscreenCanvas(64, 64);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Worker canvas context unavailable for whitespace metrics.");
  }
  ctx.font = style.fontStyle + " " + style.fontWeight + " " + style.fontSize + "px " + formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES);
  const metrics = ctx.measureText(char);
  const advanceWidth = char === "\\t" ? metrics.width * 4 : metrics.width;
  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: { advanceWidth, leftBearing: 0, ascent: 0, descent: 0 }
  };
}

${contourExtractionWorkerCode}

function calculateBounds(paths) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const path of paths) {
    for (const p of path.points) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

`;
}
