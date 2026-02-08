/**
 * @file CSS Font Loading API based font loader
 *
 * A fallback font loader that only checks font availability
 * using the CSS Font Loading API. Does not support path-based
 * text rendering since it cannot load font files.
 */

import type { FontLoader } from "../../font/loader";
import type { FontLoadOptions, LoadedFont } from "../../font/types";

/**
 * CSS Font Loading API based font loader
 *
 * This loader can only check font availability, not load font files.
 * Use this as a fallback when Local Font Access API is not available.
 *
 * Path-based text rendering (`renderTextNodeAsPath`) will not work
 * with this loader since it cannot provide font files.
 */
export class CssFontLoader implements FontLoader {
  /**
   * Check if CSS Font Loading API is available
   */
  static isSupported(): boolean {
    return typeof document !== "undefined" && "fonts" in document;
  }

  /**
   * Load a font - not supported
   *
   * CSS Font Loading API cannot load font files for parsing,
   * so this always returns undefined.
   */
  async loadFont(_options: FontLoadOptions): Promise<LoadedFont | undefined> {
    // Cannot load font files with CSS Font Loading API
    return undefined;
  }

  /**
   * Check if a font is available using CSS Font Loading API
   */
  async isFontAvailable(family: string): Promise<boolean> {
    if (!CssFontLoader.isSupported()) {
      return false;
    }

    // Use document.fonts.check() to test availability
    const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return document.fonts.check(`16px "${family}"`, testString);
  }

  /**
   * List available font families - not supported
   *
   * CSS Font Loading API cannot enumerate system fonts.
   */
  async listFontFamilies(): Promise<readonly string[]> {
    return [];
  }

  /**
   * Load a fallback font - not supported
   */
  async loadFallbackFont(_options: FontLoadOptions): Promise<LoadedFont | undefined> {
    return undefined;
  }
}

/**
 * Create a CSS font loader
 */
export function createCssFontLoader(): FontLoader {
  return new CssFontLoader();
}
