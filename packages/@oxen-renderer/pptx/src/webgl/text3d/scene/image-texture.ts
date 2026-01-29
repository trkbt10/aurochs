/**
 * @file Image Texture Generation for 3D Materials
 *
 * Creates Three.js textures from image data for blipFill support.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */

import * as THREE from "three";
import type { TileFill } from "@oxen-office/pptx/domain/color/types";
import { applyTileFlipMode, applyTileFillConfig } from "./tile-config";

// =============================================================================
// Image Fill Types
// =============================================================================

/**
 * Image fill mode matching ECMA-376 specification
 */
export type ImageFillMode = "stretch" | "tile" | "cover";

/**
 * Source rectangle for cropping
 */
export type SourceRect = {
  readonly left: number;   // 0-100 as percentage
  readonly top: number;    // 0-100 as percentage
  readonly right: number;  // 0-100 as percentage
  readonly bottom: number; // 0-100 as percentage
};

/**
 * Extended tile configuration for image fills.
 * Extends domain TileFill with geometry dimensions for repeat calculation.
 */
export type ImageTileConfig = TileFill & {
  /** Geometry width for calculating repeat */
  readonly geometryWidth?: number;
  /** Geometry height for calculating repeat */
  readonly geometryHeight?: number;
  /** Original image width */
  readonly imageWidth?: number;
  /** Original image height */
  readonly imageHeight?: number;
};

// =============================================================================
// Texture Cache
// =============================================================================

const imageTextureCache = new Map<string, THREE.Texture>();

// =============================================================================
// Image Texture Creation
// =============================================================================

/**
 * Create a texture from image data URL or blob URL.
 *
 * @param imageUrl - Data URL or blob URL of the image
 * @param options - Optional configuration
 * @param options.mode - Fill mode (stretch, tile, cover)
 * @param options.sourceRect - Source rectangle for cropping
 * @param options.tileConfig - ECMA-376 tile configuration (for tile mode)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */
export function createImageTextureFromUrl(
  imageUrl: string,
  options?: {
    readonly mode?: ImageFillMode;
    readonly sourceRect?: SourceRect;
    readonly tileConfig?: ImageTileConfig;
  },
): Promise<THREE.Texture> {
  const mode = options?.mode ?? "stretch";
  const sourceRect = options?.sourceRect;
  const tileConfig = options?.tileConfig;

  // Check cache
  const cacheKey = `${imageUrl}-${mode}-${JSON.stringify(sourceRect)}-${JSON.stringify(tileConfig)}`;
  const cached = imageTextureCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (texture) => {
        // Configure texture based on fill mode
        configureTextureForMode(texture, mode, tileConfig);

        // Apply source rect cropping if specified
        if (sourceRect) {
          applySourceRect(texture, sourceRect);
        }

        // Cache and return
        imageTextureCache.set(cacheKey, texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn("[3D Image Fill] Failed to load image:", error);
        reject(error);
      },
    );
  });
}

/**
 * Create a texture from canvas ImageData.
 *
 * @param imageData - Canvas ImageData object
 * @param options - Optional configuration
 * @param options.mode - Fill mode
 * @param options.tileConfig - ECMA-376 tile configuration (for tile mode)
 */
export function createImageTextureFromImageData(
  imageData: ImageData,
  options?: {
    readonly mode?: ImageFillMode;
    readonly tileConfig?: ImageTileConfig;
  },
): THREE.DataTexture {
  const mode = options?.mode ?? "stretch";

  const texture = new THREE.DataTexture(
    new Uint8Array(imageData.data),
    imageData.width,
    imageData.height,
    THREE.RGBAFormat,
  );

  texture.needsUpdate = true;
  configureTextureForMode(texture, mode, options?.tileConfig);

  return texture;
}

/**
 * Create a texture synchronously from an already loaded HTMLImageElement.
 *
 * @param image - Loaded image element
 * @param options - Optional configuration
 * @param options.mode - Fill mode
 * @param options.sourceRect - Source rectangle for cropping
 * @param options.tileConfig - ECMA-376 tile configuration (for tile mode)
 */
export function createImageTextureFromElement(
  image: HTMLImageElement,
  options?: {
    readonly mode?: ImageFillMode;
    readonly sourceRect?: SourceRect;
    readonly tileConfig?: ImageTileConfig;
  },
): THREE.Texture {
  const mode = options?.mode ?? "stretch";

  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;

  configureTextureForMode(texture, mode, options?.tileConfig);

  if (options?.sourceRect) {
    applySourceRect(texture, options.sourceRect);
  }

  return texture;
}


// =============================================================================
// Texture Configuration
// =============================================================================

/**
 * Configure texture wrap and repeat based on fill mode.
 *
 * @param texture - Three.js texture to configure
 * @param mode - Fill mode (stretch, tile, cover)
 * @param tileConfig - Optional ECMA-376 tile configuration
 */
function configureTextureForMode(
  texture: THREE.Texture,
  mode: ImageFillMode,
  tileConfig?: ImageTileConfig,
): void {
  switch (mode) {
    case "stretch":
      // Default behavior - stretch to fit
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      break;

    case "tile":
      // Apply ECMA-376 tile configuration if provided
      if (tileConfig) {
        applyImageTileConfig(texture, tileConfig);
      } else {
        // Fallback: simple repeat with default flip mode
        applyTileFlipMode(texture, "none");
        texture.repeat.set(2, 2);
      }
      break;

    case "cover":
      // Similar to CSS background-size: cover
      // This needs to be handled at the geometry UV level for true cover
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      break;
  }

  // Enable anisotropic filtering for better quality at angles
  texture.anisotropy = 4;

  // Use linear filtering for smooth scaling
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
}

/**
 * Apply ECMA-376 tile configuration to an image texture.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */
function applyImageTileConfig(texture: THREE.Texture, config: ImageTileConfig): void {
  // If geometry dimensions are provided, use full tile calculation
  if (
    config.geometryWidth !== undefined &&
    config.geometryHeight !== undefined &&
    config.imageWidth !== undefined &&
    config.imageHeight !== undefined
  ) {
    applyTileFillConfig(
      texture,
      config,
      config.geometryWidth,
      config.geometryHeight,
      config.imageWidth,
      config.imageHeight,
    );
  } else {
    // Simple flip mode with scale-based repeat
    applyTileFlipMode(texture, config.flip);

    // Calculate repeat from scale (100% = 1x, 50% = 2x, etc.)
    const repeatX = config.sx > 0 ? 100 / config.sx : 1;
    const repeatY = config.sy > 0 ? 100 / config.sy : 1;
    texture.repeat.set(repeatX, repeatY);

    // Apply offset from tx/ty (normalized to 0-1 range)
    // Assuming tx/ty are in percentage of tile size
    const offsetX = config.tx / 100;
    const offsetY = config.ty / 100;
    texture.offset.set(offsetX, offsetY);
  }
}

/**
 * Apply source rectangle cropping using texture offset and repeat.
 */
function applySourceRect(texture: THREE.Texture, sourceRect: SourceRect): void {
  // Convert percentages to 0-1 range
  const left = sourceRect.left / 100;
  const top = sourceRect.top / 100;
  const right = sourceRect.right / 100;
  const bottom = sourceRect.bottom / 100;

  // Calculate the visible portion
  const width = 1 - left - right;
  const height = 1 - top - bottom;

  // Set texture offset (from bottom-left in Three.js)
  texture.offset.set(left, bottom);

  // Set texture repeat (scale)
  texture.repeat.set(width, height);
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear the image texture cache.
 */
export function clearImageTextureCache(): void {
  for (const texture of imageTextureCache.values()) {
    texture.dispose();
  }
  imageTextureCache.clear();
}

/**
 * Get cached texture by URL.
 */
export function getCachedImageTexture(imageUrl: string): THREE.Texture | undefined {
  return imageTextureCache.get(imageUrl);
}
