/**
 * @file WebGL texture lifecycle management
 *
 * Caches textures by image reference to avoid redundant uploads.
 */

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
  getOrCreate(imageRef: string, data: Uint8Array, mimeType: string): Promise<TextureEntry | null>;
  /** Synchronous lookup for an already-cached texture */
  getIfCached(imageRef: string): TextureEntry | null;
  /** Create a texture from an HTMLCanvasElement (synchronous) */
  createFromCanvas(key: string, canvas: HTMLCanvasElement): TextureEntry | null;
  /** Release a texture reference */
  release(imageRef: string): void;
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
    async getOrCreate(imageRef, data, mimeType) {
      const existing = cache.get(imageRef);
      if (existing) {
        existing.refCount++;
        return existing;
      }

      const blob = new Blob([data as BlobPart], { type: mimeType });
      const bitmapRef = { value: undefined as ImageBitmap | undefined };
      try {
        bitmapRef.value = await createImageBitmap(blob);
      } catch (error) {
        console.debug("Caught error:", error);
        return null;
      }

      const texture = gl.createTexture();
      if (!texture) {
        bitmapRef.value.close();
        return null;
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmapRef.value);
      configureTextureParams();

      const entry: TextureEntry = {
        texture,
        width: bitmapRef.value.width,
        height: bitmapRef.value.height,
        refCount: 1,
      };

      bitmapRef.value.close();
      cache.set(imageRef, entry);
      return entry;
    },

    getIfCached(imageRef) {
      return cache.get(imageRef) ?? null;
    },

    createFromCanvas(key, canvas) {
      const existing = cache.get(key);
      if (existing) {
        existing.refCount++;
        return existing;
      }

      const texture = gl.createTexture();
      if (!texture) {return null;}

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      configureTextureParams();

      const entry: TextureEntry = {
        texture,
        width: canvas.width,
        height: canvas.height,
        refCount: 1,
      };

      cache.set(key, entry);
      return entry;
    },

    release(imageRef) {
      const entry = cache.get(imageRef);
      if (!entry) {return;}

      entry.refCount--;
      if (entry.refCount <= 0) {
        gl.deleteTexture(entry.texture);
        cache.delete(imageRef);
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
