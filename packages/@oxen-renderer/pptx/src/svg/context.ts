/**
 * @file SVG render context
 *
 * SVG-specific render context extending core context.
 */

import { px } from "@oxen-office/ooxml/domain/units";
import type { CoreRenderContext, CoreRenderContextConfig } from "../render-context";
import { createCoreRenderContext } from "../render-context";

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
 * Configuration for creating SVG render context.
 * Uses the unified CoreRenderContextConfig.
 */
export type SvgRenderContextConfig = CoreRenderContextConfig;

/**
 * Create an SVG render context.
 *
 * Extends CoreRenderContext with SVG-specific DefsCollector.
 */
export function createSvgRenderContext(config: SvgRenderContextConfig): SvgRenderContext {
  const coreCtx = createCoreRenderContext(config);
  return {
    ...coreCtx,
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
