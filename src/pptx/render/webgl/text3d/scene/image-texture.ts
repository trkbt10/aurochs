/**
 * @file Image Texture Generation for 3D Materials
 *
 * Creates Three.js textures from image data for blipFill support.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */

import * as THREE from "three";

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
 * @param mode - Fill mode (stretch, tile, cover)
 * @param sourceRect - Optional source rectangle for cropping
 */
export function createImageTextureFromUrl(
  imageUrl: string,
  mode: ImageFillMode = "stretch",
  sourceRect?: SourceRect,
): Promise<THREE.Texture> {
  // Check cache
  const cacheKey = `${imageUrl}-${mode}-${JSON.stringify(sourceRect)}`;
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
        configureTextureForMode(texture, mode);

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
 * @param mode - Fill mode
 */
export function createImageTextureFromImageData(
  imageData: ImageData,
  mode: ImageFillMode = "stretch",
): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array(imageData.data),
    imageData.width,
    imageData.height,
    THREE.RGBAFormat,
  );

  texture.needsUpdate = true;
  configureTextureForMode(texture, mode);

  return texture;
}

/**
 * Create a texture synchronously from an already loaded HTMLImageElement.
 *
 * @param image - Loaded image element
 * @param mode - Fill mode
 * @param sourceRect - Optional source rectangle for cropping
 */
export function createImageTextureFromElement(
  image: HTMLImageElement,
  mode: ImageFillMode = "stretch",
  sourceRect?: SourceRect,
): THREE.Texture {
  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;

  configureTextureForMode(texture, mode);

  if (sourceRect) {
    applySourceRect(texture, sourceRect);
  }

  return texture;
}

// =============================================================================
// Texture Configuration
// =============================================================================

/**
 * Configure texture wrap and repeat based on fill mode.
 */
function configureTextureForMode(texture: THREE.Texture, mode: ImageFillMode): void {
  switch (mode) {
    case "stretch":
      // Default behavior - stretch to fit
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      break;

    case "tile":
      // Repeat the texture
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      // Set default repeat (can be adjusted based on geometry size)
      texture.repeat.set(2, 2);
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
