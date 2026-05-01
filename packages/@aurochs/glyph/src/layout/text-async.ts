/**
 * @file Async Text Layout Engine using glyph contours
 *
 * Uses a Web Worker for glyph extraction to avoid blocking the main thread
 * when one is configured. The worker constructor is supplied via dependency
 * injection (`configureGlyphWorker`); this package does not bundle a worker
 * loader because doing so would couple it to one bundler's worker import
 * convention (Vite's `?worker` query, webpack's `new Worker(new URL(...))`,
 * Bun's `Bun.file(...)`, etc.).
 *
 * Callers in browser environments wire up the worker constructor like:
 *
 * ```ts
 * import { configureGlyphWorker } from "@aurochs/glyph";
 * import GlyphWorker from "@aurochs/glyph/glyph.worker?worker";
 * configureGlyphWorker(GlyphWorker);
 * ```
 *
 * Without that call (Node.js, tests, environments without Worker support)
 * the layout falls back to synchronous extraction on the main thread.
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

/** Worker constructor type — `new GlyphWorkerCtor()` yields a Worker. */
export type GlyphWorkerCtor = new () => Worker;

/** Module-level worker state managed via mutable ref objects to avoid let. */
const workerRef = { value: null as Worker | null };
const requestIdRef = { value: 0 };
const pendingRequests = new Map<number, PendingRequest>();
const workerConstructorRef = { value: null as GlyphWorkerCtor | null };

/**
 * Register the Worker constructor used for off-main-thread glyph extraction.
 *
 * Must be called once at application startup, before `layoutTextAsync` is
 * invoked. Without this call the layout falls back to synchronous extraction.
 *
 * The constructor is bundler-specific:
 *   - Vite:    `import GlyphWorker from "@aurochs/glyph/glyph.worker?worker"`
 *   - webpack: `new Worker(new URL("...", import.meta.url))` wrapped in a class
 *   - Bun:     similar URL-based worker construction
 *
 * Keeping this as a DI seam means `@aurochs/glyph` itself stays
 * bundler-agnostic and has no compile-time dependency on Vite's `?worker`
 * query string.
 */
export function configureGlyphWorker(ctor: GlyphWorkerCtor): void {
  workerConstructorRef.value = ctor;
}

function getWorker(): Worker | null {
  if (workerRef.value) {
    return workerRef.value;
  }
  if (workerConstructorRef.value === null) {
    return null;
  }
  if (typeof Worker === "undefined") {
    return null;
  }

  const Ctor = workerConstructorRef.value;
  const w = new Ctor();

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

  workerRef.value = w;
  return workerRef.value;
}

async function extractGlyphAsync(char: string, fontFamily: string, style: GlyphStyleKey): Promise<GlyphContour> {
  // Check cache first
  const cached = getCachedGlyph(fontFamily, char, style);
  if (cached) {
    return cached;
  }

  // Handle whitespace synchronously (no heavy processing)
  if (char === " " || char === "\t" || char === "\n") {
    const glyph = createWhitespaceGlyph(char, fontFamily, style);
    setCachedGlyph({ fontFamily, char, style, glyph });
    return glyph;
  }

  const w = getWorker();
  if (!w) {
    // Fallback to sync extraction
    const glyph = extractGlyphContour(char, fontFamily, style);
    setCachedGlyph({ fontFamily, char, style, glyph });
    return glyph;
  }

  return new Promise((resolve, reject) => {
    const id = ++requestIdRef.value;

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Glyph worker timeout."));
    }, 5000);

    pendingRequests.set(id, {
      resolve: (glyph) => {
        clearTimeout(timeout);
        setCachedGlyph({ fontFamily, char, style, glyph });
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

async function extractGlyphsAsync(chars: string[], fontFamily: string, style: GlyphStyleKey): Promise<GlyphContour[]> {
  return Promise.all(chars.map((char) => extractGlyphAsync(char, fontFamily, style)));
}

/** Terminates the glyph extraction worker and clears pending requests. */
export function terminateWorker(): void {
  if (workerRef.value) {
    workerRef.value.terminate();
    workerRef.value = null;
  }
  pendingRequests.clear();
}

// =============================================================================
// Main API
// =============================================================================

/** Lays out text into positioned glyphs asynchronously using a Web Worker. */
export async function layoutTextAsync(text: string, config: TextLayoutConfig): Promise<TextLayoutResult> {
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
    const kerning = calculateKerningForIndex({
      index: i,
      glyph,
      glyphContours,
      chars,
      fontFamily: config.fontFamily,
      letterSpacing,
      useOpticalKerning,
      useFontKerning,
    });

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

function calculateKerningForIndex({
  index,
  glyph,
  glyphContours,
  chars,
  fontFamily,
  letterSpacing,
  useOpticalKerning,
  useFontKerning,
}: {
  readonly index: number;
  readonly glyph: GlyphContour;
  readonly glyphContours: readonly GlyphContour[];
  readonly chars: readonly string[];
  readonly fontFamily: string;
  readonly letterSpacing: number;
  readonly useOpticalKerning: boolean;
  readonly useFontKerning: boolean;
}): number {
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
