/**
 * @file SVG render context
 *
 * SVG-specific render context extending core context.
 */

import type { SlideSize } from "../../domain";
import type { ColorContext } from "../../domain/resolution";
import { px } from "../../domain/types";
import type {
  CoreRenderContext,
  RenderOptions,
  ResourceResolver,
} from "../core";
import {
  createEmptyResourceResolver,
  createWarningCollector,
  DEFAULT_RENDER_OPTIONS,
} from "../core";

// =============================================================================
// SVG Defs Collection
// =============================================================================

/**
 * SVG defs collector for gradients, patterns, etc.
 */
export type DefsCollector = {
  /**
   * Add a def element (raw SVG string)
   */
  readonly add: (def: string) => void;

  /**
   * Generate unique ID for a def
   */
  readonly generateId: (prefix: string) => string;

  /**
   * Get all collected defs
   */
  readonly getAll: () => readonly string[];

  /**
   * Check if any defs were collected
   */
  readonly hasAny: () => boolean;
};

/**
 * Create a defs collector
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

/**
 * SVG-specific render context
 * Extends CoreRenderContext with SVG-specific features
 */
export type SvgRenderContext = CoreRenderContext & {
  /** Defs collector for gradients, patterns, etc. */
  readonly defs: DefsCollector;
};

/**
 * Configuration for creating SVG render context
 */
export type SvgRenderContextConfig = {
  slideSize: SlideSize;
  options?: Partial<RenderOptions>;
  colorContext?: ColorContext;
  resources?: ResourceResolver;
};

/**
 * Create an SVG render context
 */
export function createSvgRenderContext(config: SvgRenderContextConfig): SvgRenderContext {
  const shapeId = { value: 0 };

  return {
    slideSize: config.slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...config.options },
    colorContext: config.colorContext ?? { colorScheme: {}, colorMap: {} },
    resources: config.resources ?? createEmptyResourceResolver(),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId.value++}`,
    defs: createDefsCollector(),
  };
}

/**
 * Create an empty SVG render context (for testing)
 */
export function createEmptySvgRenderContext(): SvgRenderContext {
  return createSvgRenderContext({
    slideSize: { width: px(960), height: px(540) },
  });
}
