/**
 * @file Color resolution re-export
 *
 * Re-exports the canonical XLSX color resolver from the domain layer.
 * All color resolution logic lives in @aurochs-office/xlsx/domain/style/color-resolver
 * as the single source of truth.
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 */

export {
  resolveXlsxColor,
  getDefaultFontColor,
  getDefaultBackgroundColor,
  getDefaultBorderColor,
} from "@aurochs-office/xlsx/domain/style/color-resolver";
