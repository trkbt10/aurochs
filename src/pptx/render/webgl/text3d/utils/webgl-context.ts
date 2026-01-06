/**
 * @file WebGL Context Manager
 *
 * Manages WebGL contexts to prevent "Too many active WebGL contexts" warnings.
 * Browsers typically limit to ~8-16 active WebGL contexts.
 *
 * Strategies:
 * 1. Pool renderers and reuse them
 * 2. Dispose unused renderers proactively
 * 3. Track active contexts and warn before limit
 */

import * as THREE from "three";

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum recommended WebGL contexts
 * Chrome/Firefox typically allow 8-16, we stay conservative
 */
const MAX_RECOMMENDED_CONTEXTS = 8;

/**
 * Warning threshold for context count
 */
const CONTEXT_WARNING_THRESHOLD = 6;

// =============================================================================
// Context Tracking
// =============================================================================

type RendererEntry = {
  renderer: THREE.WebGLRenderer;
  inUse: boolean;
  lastUsed: number;
  id: string;
};

const activeRenderers: RendererEntry[] = [];
let rendererIdCounter = 0;

/**
 * Get count of active WebGL contexts
 */
export function getActiveContextCount(): number {
  return activeRenderers.filter((e) => e.inUse).length;
}

/**
 * Get total renderer count (including pooled)
 */
export function getTotalRendererCount(): number {
  return activeRenderers.length;
}

/**
 * Check if we're approaching context limit
 */
export function isApproachingContextLimit(): boolean {
  return getActiveContextCount() >= CONTEXT_WARNING_THRESHOLD;
}

// =============================================================================
// Renderer Pool
// =============================================================================

export type RendererOptions = {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly antialias?: boolean;
  readonly alpha?: boolean;
  readonly preserveDrawingBuffer?: boolean;
};

/**
 * Acquire a WebGL renderer from the pool or create a new one.
 *
 * @returns Renderer and its pool ID (needed for release)
 */
export function acquireRenderer(
  options: RendererOptions,
): { renderer: THREE.WebGLRenderer; poolId: string } {
  const {
    width,
    height,
    pixelRatio,
    antialias = true,
    alpha = true,
    preserveDrawingBuffer = true,
  } = options;

  // Try to find an available renderer in pool
  for (const entry of activeRenderers) {
    if (!entry.inUse) {
      entry.inUse = true;
      entry.lastUsed = Date.now();

      // Resize if needed
      entry.renderer.setSize(width, height);
      entry.renderer.setPixelRatio(pixelRatio);

      return { renderer: entry.renderer, poolId: entry.id };
    }
  }

  // Check if we're at the limit
  if (activeRenderers.length >= MAX_RECOMMENDED_CONTEXTS) {
    // Try to dispose oldest unused renderer
    const oldest = activeRenderers
      .filter((e) => !e.inUse)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0];

    if (oldest) {
      oldest.renderer.dispose();
      activeRenderers.splice(activeRenderers.indexOf(oldest), 1);
    } else {
      console.warn(
        `[WebGL Context] At limit (${MAX_RECOMMENDED_CONTEXTS}). ` +
        "Performance may be affected. Consider disposing unused renderers.",
      );
    }
  }

  // Create new renderer
  const renderer = new THREE.WebGLRenderer({
    antialias,
    alpha,
    preserveDrawingBuffer,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  const id = `renderer-${++rendererIdCounter}`;
  activeRenderers.push({
    renderer,
    inUse: true,
    lastUsed: Date.now(),
    id,
  });

  return { renderer, poolId: id };
}

/**
 * Release a renderer back to the pool.
 *
 * @param poolId - The pool ID returned from acquireRenderer
 * @param dispose - If true, dispose the renderer entirely (default: false)
 */
export function releaseRenderer(poolId: string, dispose: boolean = false): void {
  const index = activeRenderers.findIndex((e) => e.id === poolId);
  if (index === -1) {
    return;
  }

  const entry = activeRenderers[index];

  if (dispose) {
    entry.renderer.dispose();
    activeRenderers.splice(index, 1);
  } else {
    entry.inUse = false;
    entry.lastUsed = Date.now();
  }
}

/**
 * Dispose a renderer by its pool ID.
 */
export function disposeRenderer(poolId: string): void {
  releaseRenderer(poolId, true);
}

/**
 * Dispose all renderers in the pool.
 */
export function disposeAllRenderers(): void {
  for (const entry of activeRenderers) {
    entry.renderer.dispose();
  }
  activeRenderers.length = 0;
}

/**
 * Dispose unused renderers (cleanup).
 */
export function disposeUnusedRenderers(): void {
  const unused = activeRenderers.filter((e) => !e.inUse);
  for (const entry of unused) {
    entry.renderer.dispose();
    activeRenderers.splice(activeRenderers.indexOf(entry), 1);
  }
}

/**
 * Dispose oldest unused renderer if approaching limit.
 * Call this periodically for proactive cleanup.
 */
export function cleanupIfNeeded(): void {
  if (isApproachingContextLimit()) {
    const oldest = activeRenderers
      .filter((e) => !e.inUse)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0];

    if (oldest) {
      oldest.renderer.dispose();
      activeRenderers.splice(activeRenderers.indexOf(oldest), 1);
    }
  }
}

// =============================================================================
// Context Lost Recovery
// =============================================================================

/**
 * Handle WebGL context lost event.
 * Registers handlers on the renderer's canvas.
 */
export function setupContextLostHandler(
  renderer: THREE.WebGLRenderer,
  onLost?: () => void,
  onRestored?: () => void,
): void {
  const canvas = renderer.domElement;

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    console.warn("[WebGL Context] Context lost");
    onLost?.();
  });

  canvas.addEventListener("webglcontextrestored", () => {
    console.info("[WebGL Context] Context restored");
    onRestored?.();
  });
}
