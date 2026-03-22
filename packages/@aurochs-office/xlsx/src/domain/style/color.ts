/**
 * @file SpreadsheetML Color Type Definition (SoT)
 *
 * Single source of truth for XLSX color specification.
 * Used across fonts, fills, borders, and conditional formatting.
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 * @see ECMA-376 Part 4, Section 18.8.3 (CT_Color)
 */

/**
 * SpreadsheetML color specification.
 *
 * Colors in SpreadsheetML can be specified in multiple ways:
 * - rgb: Direct AARRGGBB hex value (8 characters with alpha)
 * - theme: Reference to theme color with optional tint
 * - indexed: Reference to legacy indexed color palette (0-63)
 * - auto: Automatic color (system-dependent)
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 */
export type XlsxColor =
  | { readonly type: "rgb"; readonly value: string }
  | { readonly type: "theme"; readonly theme: number; readonly tint?: number }
  | { readonly type: "indexed"; readonly index: number }
  | { readonly type: "auto" };
