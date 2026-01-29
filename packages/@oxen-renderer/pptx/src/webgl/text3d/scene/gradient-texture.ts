/**
 * @file Gradient Texture Generation for 3D Materials
 *
 * Creates canvas-based gradient textures for Three.js materials.
 * These are internal render types with pre-resolved colors (hex strings).
 *
 * For ECMA-376 compliant gradient types, see domain/color.ts:
 * - GradientFill (ECMA-376 20.1.8.33)
 * - GradientStop (ECMA-376 20.1.8.36)
 * - LinearGradient (ECMA-376 20.1.8.41)
 * - PathGradient (ECMA-376 20.1.8.46)
 */

import * as THREE from "three";
import { createGradientCanvas } from "../utils/canvas";
import type { TileRect } from "./tile-config";
import { applyTileRect, isTileRectDefault } from "./tile-config";

// =============================================================================
// Internal Types (Resolved Colors for Rendering)
// =============================================================================

/**
 * Resolved gradient stop for texture generation.
 * This is an INTERNAL type with pre-resolved hex colors.
 * For domain type, use GradientStop from domain/color.ts
 */
type ResolvedGradientStop = {
  /** Position 0-100 as percentage */
  readonly position: number;
  /** Resolved hex color string */
  readonly color: string;
};

/**
 * Resolved linear gradient for texture generation.
 * This is an INTERNAL type with pre-resolved colors.
 */
type ResolvedLinearGradient = {
  readonly type: "linear";
  /** Angle in degrees */
  readonly angle: number;
  readonly stops: readonly ResolvedGradientStop[];
};

/**
 * Resolved radial gradient for texture generation.
 * This is an INTERNAL type with pre-resolved colors.
 */
type ResolvedRadialGradient = {
  readonly type: "radial";
  readonly path: "circle" | "rect" | "shape";
  readonly stops: readonly ResolvedGradientStop[];
  readonly centerX?: number;
  readonly centerY?: number;
};

/**
 * Resolved gradient configuration for texture generation.
 * This is an INTERNAL type - not exported.
 */
type ResolvedGradientConfig = ResolvedLinearGradient | ResolvedRadialGradient;

// =============================================================================
// Texture Cache
// =============================================================================

const textureCache = new Map<string, THREE.CanvasTexture>();

function getGradientCacheKey(
  ...args: [
    config: ResolvedGradientConfig,
    width: number,
    height: number,
    tileRect?: TileRect,
  ]
): string {
  const [config, width, height, tileRect] = args;
  return JSON.stringify({ config, width, height, tileRect });
}

// =============================================================================
// Gradient Texture Creation
// =============================================================================

const DEFAULT_TEXTURE_SIZE = 256;

function parseHexColor(hex: string): string {
  const cleaned = hex.replace("#", "");
  return `#${cleaned}`;
}

/**
 * Create a linear gradient texture.
 *
 * ECMA-376 gradient angle specification (Section 20.1.8.41):
 * - 0 degrees = points right (vector 1, 0)
 * - Measured counter-clockwise from that origin
 * - Units in actual OOXML: 1/60,000ths of a degree
 *
 * Canvas coordinate system has Y-axis inverted (Y increases downward),
 * so we negate the Y component to match ECMA-376's math coordinate system.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.41 (a:lin)
 */
function createLinearGradientTexture(
  config: ResolvedLinearGradient,
  width: number = DEFAULT_TEXTURE_SIZE,
  height: number = DEFAULT_TEXTURE_SIZE,
): THREE.CanvasTexture {
  const { canvas, ctx } = createGradientCanvas();

  // Resize if needed (createGradientCanvas returns 256x256 by default)
  if (width !== 256 || height !== 256) {
    canvas.width = width;
    canvas.height = height;
  }

  // Convert angle to radians
  // ECMA-376: counter-clockwise from right (0° = right, 90° = up in math coords)
  const angleRad = (config.angle * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  // Calculate gradient direction
  // X: cos(angle) - positive = right
  // Y: -sin(angle) - negated because canvas Y is inverted (down is positive)
  const dirX = Math.cos(angleRad);
  const dirY = -Math.sin(angleRad); // Negate for canvas Y-axis inversion

  const startX = centerX - dirX * maxDist;
  const startY = centerY - dirY * maxDist;
  const endX = centerX + dirX * maxDist;
  const endY = centerY + dirY * maxDist;

  const gradient = ctx.createLinearGradient(startX, startY, endX, endY);

  for (const stop of config.stops) {
    gradient.addColorStop(stop.position / 100, parseHexColor(stop.color));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Create a radial gradient texture
 */
function createRadialGradientTexture(
  config: ResolvedRadialGradient,
  width: number = DEFAULT_TEXTURE_SIZE,
  height: number = DEFAULT_TEXTURE_SIZE,
): THREE.CanvasTexture {
  const { canvas, ctx } = createGradientCanvas();

  // Resize if needed (createGradientCanvas returns 256x256 by default)
  if (width !== 256 || height !== 256) {
    canvas.width = width;
    canvas.height = height;
  }

  const centerX = config.centerX !== undefined ? (config.centerX / 100) * width : width / 2;
  const centerY = config.centerY !== undefined ? (config.centerY / 100) * height : height / 2;

  const radius = Math.max(
    Math.sqrt(centerX * centerX + centerY * centerY),
    Math.sqrt((width - centerX) ** 2 + centerY * centerY),
    Math.sqrt(centerX * centerX + (height - centerY) ** 2),
    Math.sqrt((width - centerX) ** 2 + (height - centerY) ** 2),
  );

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

  for (const stop of config.stops) {
    gradient.addColorStop(stop.position / 100, parseHexColor(stop.color));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Create gradient texture based on type.
 */
function createGradientTexture(
  config: ResolvedGradientConfig,
  width: number,
  height: number,
): THREE.CanvasTexture {
  if (config.type === "linear") {
    return createLinearGradientTexture(config, width, height);
  }
  return createRadialGradientTexture(config, width, height);
}

/**
 * Create a gradient texture from resolved gradient configuration.
 * Textures are cached for performance.
 *
 * @internal This function uses internal resolved types.
 */
function createGradientTextureInternal(
  ...args: [
    config: ResolvedGradientConfig,
    width?: number,
    height?: number,
    tileRect?: TileRect,
  ]
): THREE.CanvasTexture {
  const [config, width = DEFAULT_TEXTURE_SIZE, height = DEFAULT_TEXTURE_SIZE, tileRect] = args;
  const cacheKey = getGradientCacheKey(config, width, height, tileRect);
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const texture = createGradientTexture(config, width, height);

  // Apply tileRect if specified (ECMA-376 20.1.8.33)
  if (tileRect && !isTileRectDefault(tileRect)) {
    applyTileRect(texture, tileRect);
  }

  textureCache.set(cacheKey, texture);
  return texture;
}

// =============================================================================
// Public API (accepts resolved colors)
// =============================================================================

/**
 * Create gradient texture from resolved linear gradient.
 *
 * @param angle - Gradient angle in degrees
 * @param stops - Array of {position: 0-100, color: hex string}
 * @param options - Optional configuration
 * @param options.width - Texture width (default 256)
 * @param options.height - Texture height (default 256)
 * @param options.tileRect - ECMA-376 tileRect for gradient tiling
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill with tileRect)
 */
export function createLinearGradientTextureFromResolved(
  angle: number,
  stops: readonly { readonly position: number; readonly color: string }[],
  options?: {
    readonly width?: number;
    readonly height?: number;
    readonly tileRect?: TileRect;
  },
): THREE.CanvasTexture {
  const width = options?.width ?? DEFAULT_TEXTURE_SIZE;
  const height = options?.height ?? DEFAULT_TEXTURE_SIZE;
  return createGradientTextureInternal(
    { type: "linear", angle, stops },
    width,
    height,
    options?.tileRect,
  );
}

/**
 * Create gradient texture from resolved radial gradient.
 *
 * @param path - Gradient path type
 * @param stops - Array of {position: 0-100, color: hex string}
 * @param options - Optional configuration
 * @param options.centerX - Center X position 0-100
 * @param options.centerY - Center Y position 0-100
 * @param options.width - Texture width (default 256)
 * @param options.height - Texture height (default 256)
 * @param options.tileRect - ECMA-376 tileRect for gradient tiling
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill with tileRect)
 */
export function createRadialGradientTextureFromResolved(
  path: "circle" | "rect" | "shape",
  stops: readonly { readonly position: number; readonly color: string }[],
  options?: {
    readonly centerX?: number;
    readonly centerY?: number;
    readonly width?: number;
    readonly height?: number;
    readonly tileRect?: TileRect;
  },
): THREE.CanvasTexture {
  const width = options?.width ?? DEFAULT_TEXTURE_SIZE;
  const height = options?.height ?? DEFAULT_TEXTURE_SIZE;
  return createGradientTextureInternal(
    { type: "radial", path, stops, centerX: options?.centerX, centerY: options?.centerY },
    width,
    height,
    options?.tileRect,
  );
}


/**
 * Clear the texture cache.
 * Call this when disposing renderer to free memory.
 */
export function clearGradientTextureCache(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}
