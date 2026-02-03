/**
 * @file Font loader interface for DI pattern
 *
 * Provides an abstraction for loading font files in different environments.
 * Node.js can load from filesystem, browsers can use fetch or IndexedDB.
 */

import type { Font } from "opentype.js";

/**
 * Font loading result
 */
export type LoadedFont = {
  /** The loaded opentype.js Font object */
  readonly font: Font;
  /** Font family name */
  readonly family: string;
  /** Font weight (100-900) */
  readonly weight: number;
  /** Font style */
  readonly style: "normal" | "italic" | "oblique";
  /** PostScript name */
  readonly postscriptName?: string;
};

/**
 * Font loading options
 */
export type FontLoadOptions = {
  /** Font family to load */
  readonly family: string;
  /** Desired weight (will find closest match) */
  readonly weight?: number;
  /** Desired style */
  readonly style?: "normal" | "italic" | "oblique";
};

/**
 * Common CJK fallback font families by platform
 *
 * These fonts provide coverage for Chinese, Japanese, and Korean characters.
 */
export const CJK_FALLBACK_FONTS = {
  darwin: ["Hiragino Sans", "PingFang SC", "PingFang TC", "Apple SD Gothic Neo"],
  linux: ["Noto Sans CJK JP", "Noto Sans CJK SC", "Noto Sans CJK TC", "Noto Sans CJK KR"],
  win32: ["Yu Gothic", "Microsoft YaHei", "Microsoft JhengHei", "Malgun Gothic"],
};

/**
 * Font loader interface
 *
 * Implement this interface to provide font loading in your environment.
 * - Node.js: Load from filesystem (system fonts or bundled fonts)
 * - Browser: Load from fetch, IndexedDB, or bundled fonts
 */
export interface FontLoader {
  /**
   * Load a font matching the given options
   *
   * @param options - Font loading options
   * @returns Loaded font or undefined if not found
   */
  loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined>;

  /**
   * Check if a font is available
   *
   * @param family - Font family name
   * @returns True if the font family is available
   */
  isFontAvailable(family: string): Promise<boolean>;

  /**
   * List available font families
   *
   * @returns Array of available font family names
   */
  listFontFamilies?(): Promise<readonly string[]>;

  /**
   * Load a fallback font for CJK characters
   *
   * @param options - Font loading options (weight/style from original request)
   * @returns Loaded fallback font or undefined if none available
   */
  loadFallbackFont?(options: FontLoadOptions): Promise<LoadedFont | undefined>;
}

/**
 * Check if a font has a glyph for a character
 *
 * @param font - opentype.js Font object
 * @param char - Character to check
 * @returns True if the font has a glyph for the character (not .notdef)
 */
export function fontHasGlyph(font: Font, char: string): boolean {
  const glyph = font.charToGlyph(char);
  // Glyph index 0 is always .notdef
  return glyph.index !== 0;
}

/**
 * Check if a character is a CJK character
 *
 * @param char - Character to check
 * @returns True if the character is in CJK ranges
 */
export function isCJKCharacter(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  return (
    // CJK Unified Ideographs
    (code >= 0x4e00 && code <= 0x9fff) ||
    // CJK Unified Ideographs Extension A
    (code >= 0x3400 && code <= 0x4dbf) ||
    // CJK Unified Ideographs Extension B
    (code >= 0x20000 && code <= 0x2a6df) ||
    // CJK Compatibility Ideographs
    (code >= 0xf900 && code <= 0xfaff) ||
    // Hiragana
    (code >= 0x3040 && code <= 0x309f) ||
    // Katakana
    (code >= 0x30a0 && code <= 0x30ff) ||
    // Hangul Syllables
    (code >= 0xac00 && code <= 0xd7af) ||
    // Hangul Jamo
    (code >= 0x1100 && code <= 0x11ff) ||
    // Bopomofo
    (code >= 0x3100 && code <= 0x312f) ||
    // CJK Symbols and Punctuation
    (code >= 0x3000 && code <= 0x303f)
  );
}

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
