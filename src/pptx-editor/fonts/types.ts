/**
 * @file Font catalog types (injectable)
 */

/**
 * Injectable font catalog for dynamic font listing/loading.
 *
 * Intended use-case:
 * - The host app provides a catalog backed by Google Fonts (fetched at runtime),
 *   without bundling the full font list into the editor package.
 * - When a font is selected from the catalog, the editor calls `ensureFamilyLoaded`
 *   to load it (e.g. by injecting a `<link>` tag) and waits for it to be available.
 *
 * Notes:
 * - This module does not fetch from the network by itself; hosts must inject an implementation.
 */
export type FontCatalog = {
  /**
   * Returns available font families for selection.
   * Hosts can fetch/cache this dynamically (e.g. Google Fonts families list).
   */
  readonly listFamilies: () => Promise<readonly string[]> | readonly string[];

  /**
   * Ensures the given family is loaded into `document.fonts` (e.g. via Google Fonts CSS).
   * Return `true` if the family is expected to be available after the promise resolves.
   */
  readonly ensureFamilyLoaded: (family: string) => Promise<boolean>;

  /**
   * Optional label shown in the UI.
   * Example: "Google Fonts"
   */
  readonly label?: string;
};

