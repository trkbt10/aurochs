/**
 * @file Shared Canvas Utilities for WebGL Text Rendering
 *
 * Provides unified canvas creation with OffscreenCanvas support.
 * Centralizes canvas resource management to avoid memory leaks.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Canvas context result with type information.
 * Uses HTMLCanvasElement types for Three.js compatibility.
 * OffscreenCanvas is internally cast to HTMLCanvasElement since
 * Three.js CanvasTexture accepts both but is typed for HTMLCanvasElement.
 */
export type Canvas2DResult = {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly isOffscreen: boolean;
};

/**
 * Options for canvas creation
 */
export type CanvasOptions = {
  /** Canvas width in pixels */
  readonly width: number;
  /** Canvas height in pixels */
  readonly height: number;
  /** Prefer OffscreenCanvas if available (default: true) */
  readonly preferOffscreen?: boolean;
  /** Context options for getContext */
  readonly contextOptions?: CanvasRenderingContext2DSettings;
};

// =============================================================================
// Feature Detection
// =============================================================================

/**
 * Check if OffscreenCanvas is supported
 */
export function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== "undefined";
}

/**
 * Check if OffscreenCanvas 2D context is supported
 * (Some browsers support OffscreenCanvas but not 2d context)
 */
let offscreenCanvas2dSupported: boolean | null = null;






export function isOffscreenCanvas2dSupported(): boolean {
  if (offscreenCanvas2dSupported !== null) {
    return offscreenCanvas2dSupported;
  }

  if (!isOffscreenCanvasSupported()) {
    offscreenCanvas2dSupported = false;
    return false;
  }

  try {
    const test = new OffscreenCanvas(1, 1);
    const ctx = test.getContext("2d");
    offscreenCanvas2dSupported = ctx !== null;
  } catch {
    offscreenCanvas2dSupported = false;
  }

  return offscreenCanvas2dSupported;
}

// =============================================================================
// Canvas Creation
// =============================================================================

/**
 * Create a canvas with 2D context.
 *
 * Prefers OffscreenCanvas when available for better performance
 * (doesn't need DOM attachment, can run in workers).
 *
 * Note: Returns HTMLCanvasElement types for Three.js compatibility.
 * OffscreenCanvas is cast to HTMLCanvasElement since Three.js
 * CanvasTexture actually accepts both at runtime.
 *
 * @throws Error if 2D context cannot be obtained
 */
export function createCanvas2D(options: CanvasOptions): Canvas2DResult {
  const {
    width,
    height,
    preferOffscreen = true,
    contextOptions,
  } = options;

  // Try OffscreenCanvas first if preferred and supported
  if (preferOffscreen && isOffscreenCanvas2dSupported()) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", contextOptions);
    if (ctx) {
      // Cast for Three.js compatibility (CanvasTexture accepts both at runtime)
      return {
        canvas: canvas as unknown as HTMLCanvasElement,
        ctx: ctx as unknown as CanvasRenderingContext2D,
        isOffscreen: true,
      };
    }
    // Fall through to regular canvas if context creation failed
  }

  // Regular HTMLCanvasElement
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", contextOptions);
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }

  return { canvas, ctx, isOffscreen: false };
}

/**
 * Create a canvas specifically for texture generation.
 * Uses power-of-two dimensions for better GPU compatibility.
 *
 * @param size - Base size (will be rounded to nearest power of two)
 * @param maxSize - Maximum allowed size (default: 2048)
 */
export function createTextureCanvas(
  size: number,
  maxSize: number = 2048,
): Canvas2DResult {
  // Round to nearest power of two
  const potSize = Math.min(
    maxSize,
    Math.pow(2, Math.ceil(Math.log2(Math.max(1, size)))),
  );

  return createCanvas2D({
    width: potSize,
    height: potSize,
    preferOffscreen: true,
  });
}

/**
 * Create a canvas for gradient textures.
 * Standard 256x256 size for gradients.
 */
export function createGradientCanvas(): Canvas2DResult {
  return createCanvas2D({
    width: 256,
    height: 256,
    preferOffscreen: true,
  });
}

/**
 * Create a canvas for pattern textures.
 * Size varies by pattern complexity.
 *
 * @param tileSize - Pattern tile size (default: 16)
 */
export function createPatternCanvas(tileSize: number = 16): Canvas2DResult {
  return createCanvas2D({
    width: tileSize,
    height: tileSize,
    preferOffscreen: true,
  });
}

/**
 * Create a canvas for shadow/glow effects.
 * Standard 256x256 for effect textures.
 */
export function createEffectCanvas(): Canvas2DResult {
  return createCanvas2D({
    width: 256,
    height: 256,
    preferOffscreen: true,
  });
}

// =============================================================================
// Canvas Pool (Optional - for high-frequency operations)
// =============================================================================

type CanvasPoolEntry = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inUse: boolean;
  size: number;
  isOffscreen: boolean;
};

const canvasPool: CanvasPoolEntry[] = [];
const MAX_POOL_SIZE = 8;

/**
 * Acquire a canvas from the pool or create a new one.
 * Use `releasePooledCanvas` when done.
 */
export function acquirePooledCanvas(width: number, height: number): Canvas2DResult {
  const size = width * height;

  // Find available canvas of same or larger size
  for (const entry of canvasPool) {
    if (!entry.inUse && entry.size >= size) {
      entry.inUse = true;

      // Resize if needed
      if (entry.canvas.width !== width || entry.canvas.height !== height) {
        entry.canvas.width = width;
        entry.canvas.height = height;
      }

      // Clear the canvas
      entry.ctx.clearRect(0, 0, width, height);

      return {
        canvas: entry.canvas,
        ctx: entry.ctx,
        isOffscreen: entry.isOffscreen,
      };
    }
  }

  // Create new canvas
  const result = createCanvas2D({ width, height, preferOffscreen: true });

  // Add to pool if room available
  if (canvasPool.length < MAX_POOL_SIZE) {
    canvasPool.push({
      canvas: result.canvas,
      ctx: result.ctx,
      inUse: true,
      size,
      isOffscreen: result.isOffscreen,
    });
  }

  return result;
}

/**
 * Release a pooled canvas back to the pool.
 */
export function releasePooledCanvas(canvas: HTMLCanvasElement): void {
  for (const entry of canvasPool) {
    if (entry.canvas === canvas) {
      entry.inUse = false;
      return;
    }
  }
}

/**
 * Clear the canvas pool to free memory.
 */
export function clearCanvasPool(): void {
  canvasPool.length = 0;
}
