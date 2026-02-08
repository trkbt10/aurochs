/**
 * @file Font caching utilities
 */

import type { FontLoader } from "./loader";
import type { FontLoadOptions, LoadedFont } from "./types";

/**
 * Font cache for loaded fonts
 */
export class FontCache {
  private cache = new Map<string, LoadedFont>();

  /**
   * Generate cache key from font options
   */
  private getCacheKey(options: FontLoadOptions): string {
    return `${options.family}:${options.weight ?? 400}:${options.style ?? "normal"}`;
  }

  /**
   * Get cached font
   */
  get(options: FontLoadOptions): LoadedFont | undefined {
    return this.cache.get(this.getCacheKey(options));
  }

  /**
   * Set cached font
   */
  set(options: FontLoadOptions, font: LoadedFont): void {
    this.cache.set(this.getCacheKey(options), font);
  }

  /**
   * Check if font is cached
   */
  has(options: FontLoadOptions): boolean {
    return this.cache.has(this.getCacheKey(options));
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Caching wrapper for font loaders
 */
export class CachingFontLoader implements FontLoader {
  private cache = new FontCache();
  private fallbackCache = new FontCache();

  constructor(private readonly innerLoader: FontLoader) {}

  async loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    const cached = this.cache.get(options);
    if (cached) {
      return cached;
    }

    const font = await this.innerLoader.loadFont(options);
    if (font) {
      this.cache.set(options, font);
    }

    return font;
  }

  async isFontAvailable(family: string): Promise<boolean> {
    return this.innerLoader.isFontAvailable(family);
  }

  async listFontFamilies(): Promise<readonly string[]> {
    if (this.innerLoader.listFontFamilies) {
      return this.innerLoader.listFontFamilies();
    }
    return [];
  }

  async loadFallbackFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    // Check if we have a cached fallback
    const fallbackKey = { family: "__CJK_FALLBACK__", weight: options.weight, style: options.style };
    const cached = this.fallbackCache.get(fallbackKey);
    if (cached) {
      return cached;
    }

    // Try to load a fallback font from inner loader
    if (this.innerLoader.loadFallbackFont) {
      const font = await this.innerLoader.loadFallbackFont(options);
      if (font) {
        this.fallbackCache.set(fallbackKey, font);
      }
      return font;
    }

    return undefined;
  }

  /**
   * Clear the font cache
   */
  clearCache(): void {
    this.cache.clear();
    this.fallbackCache.clear();
  }
}
