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
 * WebGL texture cache
 *
 * Manages texture lifecycle with reference counting.
 */
export class TextureCache {
  private gl: WebGLRenderingContext;
  private cache: Map<string, TextureEntry> = new Map();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /**
   * Get or create a texture from image data
   *
   * @param imageRef - Unique image reference key
   * @param data - Image data (Uint8Array of encoded image)
   * @param mimeType - MIME type of the image
   * @returns Texture entry with width/height
   */
  async getOrCreate(
    imageRef: string,
    data: Uint8Array,
    mimeType: string
  ): Promise<TextureEntry | null> {
    const existing = this.cache.get(imageRef);
    if (existing) {
      existing.refCount++;
      return existing;
    }

    // Decode image using browser's ImageBitmap API
    const blob = new Blob([data as BlobPart], { type: mimeType });

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return null;
    }

    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) {
      bitmap.close();
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const entry: TextureEntry = {
      texture,
      width: bitmap.width,
      height: bitmap.height,
      refCount: 1,
    };

    bitmap.close();
    this.cache.set(imageRef, entry);
    return entry;
  }

  /**
   * Synchronous lookup for an already-cached texture
   */
  getIfCached(imageRef: string): TextureEntry | null {
    return this.cache.get(imageRef) ?? null;
  }

  /**
   * Create a texture from an HTMLCanvasElement (synchronous)
   */
  createFromCanvas(key: string, canvas: HTMLCanvasElement): TextureEntry | null {
    const existing = this.cache.get(key);
    if (existing) {
      existing.refCount++;
      return existing;
    }

    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const entry: TextureEntry = {
      texture,
      width: canvas.width,
      height: canvas.height,
      refCount: 1,
    };

    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Release a texture reference
   */
  release(imageRef: string): void {
    const entry = this.cache.get(imageRef);
    if (!entry) return;

    entry.refCount--;
    if (entry.refCount <= 0) {
      this.gl.deleteTexture(entry.texture);
      this.cache.delete(imageRef);
    }
  }

  /**
   * Dispose all cached textures
   */
  dispose(): void {
    for (const entry of this.cache.values()) {
      this.gl.deleteTexture(entry.texture);
    }
    this.cache.clear();
  }
}
