/**
 * @file WebGL texture lifecycle management
 *
 * Caches textures by image reference to avoid redundant uploads.
 */

import type { TextureResource } from "./texture-resource";

export type TextureEntry = {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
  refCount: number;
};

/**
 * WebGL texture cache interface
 *
 * Manages texture lifecycle with reference counting.
 */
export type TextureCache = {
  /** Get or create a texture from image data */
  getOrCreate(resource: TextureResource, data: Uint8Array, mimeType: string): Promise<TextureEntry>;
  /** Synchronous lookup for an already-cached texture */
  getIfCached(resource: TextureResource): TextureEntry | null;
  /** Release a texture reference */
  release(resource: TextureResource): void;
  /** Dispose all cached textures */
  dispose(): void;
};

/** Create a new WebGL texture cache */
export function createTextureCache(gl: WebGLRenderingContext): TextureCache {
  const cache = new Map<string, TextureEntry>();

  /** Configure standard texture parameters */
  function configureTextureParams(): void {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  return {
    async getOrCreate(resource, data, mimeType) {
      const existing = cache.get(resource.id);
      if (existing) {
        existing.refCount++;
        return existing;
      }

      // `Uint8Array<ArrayBufferLike>` is structurally a valid `BlobPart`
      // (BufferSource), but TS lib variants disagree on the assignability
      // due to recent ArrayBuffer-vs-SharedArrayBuffer narrowing. Keep
      // the cast scoped to this single boundary.
      const blob = new Blob([data as BlobPart], { type: mimeType });
      const bitmap = await createImageBitmap(blob);

      const texture = gl.createTexture();
      if (!texture) {
        bitmap.close();
        throw new Error(`Failed to create WebGL texture for image resource: ${resource.id}`);
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      configureTextureParams();

      const entry: TextureEntry = {
        texture,
        width: bitmap.width,
        height: bitmap.height,
        refCount: 1,
      };

      bitmap.close();
      cache.set(resource.id, entry);
      return entry;
    },

    getIfCached(resource) {
      return cache.get(resource.id) ?? null;
    },

    release(resource) {
      const entry = cache.get(resource.id);
      if (!entry) {return;}

      entry.refCount--;
      if (entry.refCount <= 0) {
        gl.deleteTexture(entry.texture);
        cache.delete(resource.id);
      }
    },

    dispose() {
      for (const entry of cache.values()) {
        gl.deleteTexture(entry.texture);
      }
      cache.clear();
    },
  };
}
