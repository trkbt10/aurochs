/**
 * @file Theme editor types
 *
 * Type definitions for theme editing functionality.
 * Uses ECMA-376 aligned types from the OOXML layer.
 *
 * ## ECMA-376 Theme Structure Mapping
 *
 * | ECMA-376 Element | Editor Type | Description |
 * |------------------|-------------|-------------|
 * | a:clrScheme      | ThemeColorScheme | 12 scheme colors (dk1, lt1, etc.) |
 * | a:fontScheme     | FontScheme | Major/minor fonts with 3 scripts |
 * | a:fmtScheme      | (not editable) | Fill/line/effect styles |
 *
 * ## Color Scheme Slots (a:clrScheme children)
 *
 * | Slot | ECMA-376 Section | Usage |
 * |------|------------------|-------|
 * | dk1  | 20.1.4.1.9  | Primary dark color (usually text) |
 * | lt1  | 20.1.4.1.20 | Primary light color (usually background) |
 * | dk2  | 20.1.4.1.10 | Secondary dark color |
 * | lt2  | 20.1.4.1.21 | Secondary light color |
 * | accent1-6 | 20.1.4.1.1-6 | Accent colors for charts, shapes |
 * | hlink | 20.1.4.1.17 | Hyperlink color |
 * | folHlink | 20.1.4.1.15 | Followed hyperlink color |
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 * @see ECMA-376 Part 1, Section 20.1.6.2 - CT_ColorScheme
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 - CT_FontScheme
 */

import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";

// =============================================================================
// Color Scheme Types
// =============================================================================

/**
 * Color scheme for UI display — key-constrained specialization of domain ColorScheme.
 *
 * SoT: domain ColorScheme is `Record<string, string>` (from drawing-ml/domain/color-context).
 * This type narrows the key to `SchemeColorName` (the 12 standard ECMA-376 slots)
 * for type safety in theme editor UI and exporter.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (CT_ColorScheme / a:clrScheme)
 */
export type ThemeColorScheme = Readonly<Record<SchemeColorName, string>>;

// =============================================================================
// Theme Preset Types
// =============================================================================

/**
 * Theme preset definition for the preset selector.
 *
 * Presets are pre-defined theme configurations that users can apply
 * to quickly change colors and fonts. They correspond to Office theme files.
 */
export type ThemePreset = {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Color scheme values */
  readonly colorScheme: ThemeColorScheme;
  /** Font scheme values */
  readonly fontScheme: FontScheme;
};

