/**
 * @file SpreadsheetML color resolver (XLSX → CSS)
 *
 * Thin wrapper around the canonical XLSX color resolver
 * (`@aurochs-office/xlsx/domain/style/color-resolver`).
 *
 * The domain resolver returns hex strings (`#RRGGBB`). This module
 * re-exports its logic and adds a CSS-friendly API for the editor UI.
 */

import type { XlsxColor } from "@aurochs-office/xlsx/domain/style/color";
import { resolveXlsxColor } from "@aurochs-office/xlsx/domain/style/color-resolver";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";

export type XlsxColorToCssOptions = {
  /**
   * Indexed palette override from `styles.xml` (`colors/indexedColors`).
   */
  readonly indexedColors?: readonly string[];

  /**
   * Theme color scheme from `xl/theme/theme1.xml`.
   *
   * When provided, theme colors are resolved against the actual document theme
   * instead of the built-in fallback palette.
   */
  readonly colorScheme?: ColorScheme;
};

/**
 * Convert an XLSX color value into a CSS hex string (e.g. `#RRGGBB`).
 *
 * Delegates to the canonical `resolveXlsxColor` from the domain layer.
 * This is the only place in the editor that should resolve XLSX colors.
 */
export function xlsxColorToCss(color: XlsxColor | undefined, options?: XlsxColorToCssOptions): string | undefined {
  if (!color) {
    return undefined;
  }
  return resolveXlsxColor(color, options?.colorScheme, options?.indexedColors);
}
