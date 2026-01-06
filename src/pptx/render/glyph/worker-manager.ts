/**
 * @file Glyph Worker Manager
 *
 * Manages communication with the glyph extraction Web Worker.
 * Falls back to synchronous extraction when Worker is unavailable.
 */

import type { GlyphContour, GlyphStyleKey } from "./types";
import { getCachedGlyph, setCachedGlyph } from "./cache";
import { createFallbackGlyph } from "./extractor";

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

type WorkerResponse = {
  id: number;
  type: "glyphResult";
  glyph: GlyphContour;
};

type PendingRequest = {
  resolve: (glyph: GlyphContour) => void;
  reject: (error: Error) => void;
};

// =============================================================================
// Worker Manager
// =============================================================================

let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();
let workerFailed = false;

/**
 * Initialize the glyph worker
 */
function initWorker(): Worker | null {
  if (workerFailed) return null;

  try {
    // Create worker from blob to avoid bundler issues
    const workerCode = getWorkerCode();
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const w = new Worker(workerUrl);

    w.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, glyph } = event.data;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        pending.resolve(glyph);
      }
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
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  worker = initWorker();
  return worker;
}

/**
 * Extract glyph using worker (async)
 */
export async function extractGlyphAsync(
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
    const glyph = createWhitespaceGlyph(char, style);
    setCachedGlyph(fontFamily, char, style, glyph);
    return glyph;
  }

  const w = getWorker();
  if (!w) {
    // Fallback to sync (uses fallback glyph in non-browser)
    const glyph = createFallbackGlyph(char, style);
    setCachedGlyph(fontFamily, char, style, glyph);
    return glyph;
  }

  return new Promise((resolve, reject) => {
    const id = ++requestId;

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      const fallback = createFallbackGlyph(char, style);
      setCachedGlyph(fontFamily, char, style, fallback);
      resolve(fallback);
    }, 5000);

    pendingRequests.set(id, {
      resolve: (glyph) => {
        clearTimeout(timeout);
        setCachedGlyph(fontFamily, char, style, glyph);
        resolve(glyph);
      },
      reject: (error) => {
        clearTimeout(timeout);
        const fallback = createFallbackGlyph(char, style);
        setCachedGlyph(fontFamily, char, style, fallback);
        resolve(fallback);
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

// =============================================================================
// Fallback Glyphs
// =============================================================================

function createWhitespaceGlyph(char: string, style: GlyphStyleKey): GlyphContour {
  const advanceWidth = char === "\t" ? style.fontSize * 1.2 : style.fontSize * 0.3;
  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: {
      advanceWidth,
      leftBearing: 0,
      ascent: 0,
      descent: 0,
    },
  };
}

// =============================================================================
// Inline Worker Code
// =============================================================================

function getWorkerCode(): string {
  return `
const RENDER_SCALE = 2;
const THRESHOLD = 128;
const SIMPLIFY_TOLERANCE = 0.8;
const MIN_CONTOUR_POINTS = 4;
const MAX_TRACE_ITERATIONS = 5000;
const MAX_CONTOURS_PER_CHAR = 20;

self.onmessage = function(event) {
  const { id, type, char, fontFamily, style } = event.data;
  if (type === "extractGlyph") {
    try {
      const glyph = extractGlyphInWorker(char, fontFamily, style);
      self.postMessage({ id, type: "glyphResult", glyph });
    } catch (error) {
      const fallback = createFallbackGlyph(char, style);
      self.postMessage({ id, type: "glyphResult", glyph: fallback });
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
  if (!ctx) return createFallbackGlyph(char, style);

  const fontString = style.fontStyle + " " + style.fontWeight + " " + scaledSize + "px \\"" + fontFamily + "\\"";
  ctx.font = fontString;
  const textMetrics = ctx.measureText(char);

  const padding = scaledSize * 0.3;
  const width = Math.ceil(Math.max(textMetrics.width, scaledSize * 0.5) + padding * 2);
  const height = Math.ceil(scaledSize * 1.4 + padding * 2);

  canvas.width = Math.min(width, 256);
  canvas.height = Math.min(height, 256);

  ctx.font = fontString;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillText(char, padding, canvas.height - padding - scaledSize * 0.15);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rawContours = extractContours(imageData);
  const paths = processContours(rawContours, RENDER_SCALE, padding);
  const bounds = calculateBounds(paths);

  return {
    char,
    paths,
    bounds,
    metrics: {
      advanceWidth: textMetrics.width / RENDER_SCALE,
      leftBearing: (textMetrics.actualBoundingBoxLeft || 0) / RENDER_SCALE,
      ascent: (textMetrics.actualBoundingBoxAscent || scaledSize * 0.8) / RENDER_SCALE,
      descent: (textMetrics.actualBoundingBoxDescent || scaledSize * 0.2) / RENDER_SCALE,
    }
  };
}

function createWhitespaceGlyph(char, fontFamily, style) {
  let advanceWidth = style.fontSize * 0.3;
  try {
    const canvas = new OffscreenCanvas(64, 64);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = style.fontStyle + " " + style.fontWeight + " " + style.fontSize + "px \\"" + fontFamily + "\\"";
      const metrics = ctx.measureText(char);
      advanceWidth = char === "\\t" ? metrics.width * 4 : metrics.width;
    }
  } catch (e) {}
  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: { advanceWidth, leftBearing: 0, ascent: 0, descent: 0 }
  };
}

function createFallbackGlyph(char, style) {
  const width = style.fontSize * 0.6;
  const height = style.fontSize * 0.8;
  return {
    char,
    paths: [{ points: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }], isHole: false }],
    bounds: { minX: 0, minY: 0, maxX: width, maxY: height },
    metrics: { advanceWidth: width, leftBearing: 0, ascent: height * 0.8, descent: height * 0.2 }
  };
}

function extractContours(imageData) {
  const { width, height, data } = imageData;
  const contours = [];
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    binary[i] = data[i * 4] >= THRESHOLD ? 1 : 0;
  }
  const visited = new Uint8Array(width * height);
  for (let y = 1; y < height - 1 && contours.length < MAX_CONTOURS_PER_CHAR; y++) {
    for (let x = 1; x < width - 1 && contours.length < MAX_CONTOURS_PER_CHAR; x++) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0 && isBoundary(binary, x, y, width)) {
        const contour = traceBoundary(binary, visited, x, y, width, height);
        if (contour.length >= MIN_CONTOUR_POINTS) contours.push(contour);
      }
    }
  }
  return contours;
}

function isBoundary(binary, x, y, width) {
  const idx = y * width + x;
  if (binary[idx] === 0) return false;
  return binary[idx - 1] === 0 || binary[idx + 1] === 0 || binary[idx - width] === 0 || binary[idx + width] === 0;
}

function traceBoundary(binary, visited, startX, startY, width, height) {
  const contour = [];
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];
  let x = startX, y = startY, dir = 0, iterations = 0;
  do {
    if (++iterations > MAX_TRACE_ITERATIONS) break;
    const idx = y * width + x;
    visited[idx] = 1;
    contour.push({ x, y });
    let found = false;
    const startDir = (dir + 5) % 8;
    for (let i = 0; i < 8; i++) {
      const checkDir = (startDir + i) % 8;
      const nx = x + dx[checkDir];
      const ny = y + dy[checkDir];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && binary[ny * width + nx] === 1) {
        x = nx; y = ny; dir = checkDir; found = true; break;
      }
    }
    if (!found) break;
  } while (!(x === startX && y === startY) || contour.length < 3);
  return contour;
}

function processContours(rawContours, scale, padding) {
  return rawContours.map(function(raw) {
    let points = raw;
    if (raw.length > 300) {
      const step = Math.ceil(raw.length / 300);
      points = raw.filter(function(_, i) { return i % step === 0; });
    }
    const simplified = douglasPeucker(points, SIMPLIFY_TOLERANCE);
    const scaledPoints = simplified.map(function(p) {
      return { x: (p.x - padding) / scale, y: (p.y - padding) / scale };
    });
    const isHole = !isClockwise(scaledPoints);
    return { points: scaledPoints, isHole: isHole };
  });
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDist = 0, maxIdx = 0;
  const first = points[0], last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpDistance(points[i], first, last);
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) * (p.x - a.x) + (p.y - a.y) * (p.y - a.y));
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function isClockwise(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area > 0;
}

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
