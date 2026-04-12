/**
 * @file Browser font drivers
 *
 * Provides font loading for browser environments using:
 * - Local Font Access API (preferred, requires permission)
 * - CSS Font Loading API (fallback, availability check only)
 */

export { createBrowserFontLoader, isBrowserFontLoaderSupported } from "./browser-loader";
export { createCssFontLoader, isCssFontLoaderSupported } from "./css-font-loader";
