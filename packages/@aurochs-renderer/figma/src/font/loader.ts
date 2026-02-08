/**
 * @file Font loader interface for DI pattern
 *
 * Provides an abstraction for loading font files in different environments.
 * Node.js can load from filesystem, browsers can use Local Font Access API.
 */

import type { FontLoadOptions, LoadedFont } from "./types";

/**
 * Font loader interface
 *
 * Implement this interface to provide font loading in your environment.
 * - Node.js: Load from filesystem (system fonts or bundled fonts)
 * - Browser: Load from Local Font Access API or bundled fonts
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
