/**
 * @file SVG render context for Figma nodes
 */

import type { DefsCollector, FigSvgRenderContext, FigSvgRenderContextConfig } from "../types";
import { EMPTY_FIG_STYLE_REGISTRY } from "../../../../@aurochs/fig/src/symbols/style-registry";

// =============================================================================
// Defs Collector
// =============================================================================

/**
 * Create a defs collector for SVG definitions
 */
export function createDefsCollector(): DefsCollector {
  const defs: string[] = [];
  const idCounter = { value: 0 };

  return {
    add: (def) => defs.push(def),
    generateId: (prefix) => `${prefix}-${idCounter.value++}`,
    getAll: () => defs,
    hasAny: () => defs.length > 0,
  };
}

// =============================================================================
// SVG Render Context
// =============================================================================

/** Default canvas size */
const DEFAULT_CANVAS_SIZE = { width: 800, height: 600 };

/**
 * Create an SVG render context
 */
export function createFigSvgRenderContext(
  config?: FigSvgRenderContextConfig
): FigSvgRenderContext {
  return {
    defs: createDefsCollector(),
    canvasSize: config?.canvasSize ?? DEFAULT_CANVAS_SIZE,
    blobs: config?.blobs ?? [],
    images: config?.images ?? new Map(),
    showHiddenNodes: config?.showHiddenNodes ?? false,
    resolver: config?.resolver,
    fontLoader: config?.fontLoader,
    styleRegistry: config?.styleRegistry ?? EMPTY_FIG_STYLE_REGISTRY,
  };
}

/**
 * Create an empty SVG render context (for testing)
 */
export function createEmptyFigSvgRenderContext(): FigSvgRenderContext {
  return createFigSvgRenderContext();
}
