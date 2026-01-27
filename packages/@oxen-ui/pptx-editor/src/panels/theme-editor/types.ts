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
 * | a:fontScheme     | ThemeFontScheme | Major/minor fonts with 3 scripts |
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

import type { FontSpec } from "@oxen/pptx/domain/resolution";
import type { SchemeColorName } from "@oxen/ooxml/domain/color";

// SchemeColorName is the ECMA-376 aligned type for color scheme slot names.
// Canonical definition: ooxml/domain/color.ts (ECMA-376 Part 1, Section 20.1.6.2)
// Re-exported here for convenient access from theme editor components.
// eslint-disable-next-line custom/no-deep-reexport -- legitimate API re-export
export type { SchemeColorName } from "@oxen/ooxml/domain/color";

// =============================================================================
// Color Scheme Types
// =============================================================================

/**
 * Color scheme for UI display - maps 12 scheme colors to hex values.
 *
 * This represents the resolved colors from a:clrScheme for display in the editor.
 * Values are 6-digit hex strings without '#' prefix (e.g., "4472C4").
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (CT_ColorScheme / a:clrScheme)
 */
export type ThemeColorScheme = Readonly<Record<SchemeColorName, string>>;

// =============================================================================
// Font Scheme Types
// =============================================================================

/**
 * Font scheme for UI display - major and minor font definitions.
 *
 * Maps to a:fontScheme with a:majorFont and a:minorFont children.
 * Each font can specify typefaces for 3 script types:
 * - latin: Western scripts (a:latin)
 * - eastAsian: CJK scripts (a:ea)
 * - complexScript: RTL and complex scripts (a:cs)
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (CT_FontScheme / a:fontScheme)
 */
export type ThemeFontScheme = {
  /** Heading font (a:majorFont) */
  readonly majorFont: FontSpec;
  /** Body font (a:minorFont) */
  readonly minorFont: FontSpec;
};

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
  readonly fontScheme: ThemeFontScheme;
};

// =============================================================================
// Display Constants
// =============================================================================

/**
 * Human-readable labels for color scheme keys.
 * Used in the color editor UI.
 */
export const COLOR_LABELS: Readonly<Record<SchemeColorName, string>> = {
  dk1: "Dark 1",
  lt1: "Light 1",
  dk2: "Dark 2",
  lt2: "Light 2",
  accent1: "Accent 1",
  accent2: "Accent 2",
  accent3: "Accent 3",
  accent4: "Accent 4",
  accent5: "Accent 5",
  accent6: "Accent 6",
  hlink: "Hyperlink",
  folHlink: "Followed",
};

/**
 * Standard color scheme keys in display order.
 *
 * Order matches Office theme editor:
 * 1. Base colors (dk1, lt1, dk2, lt2)
 * 2. Accent colors (accent1-6)
 * 3. Link colors (hlink, folHlink)
 */
export const COLOR_SCHEME_KEYS: readonly SchemeColorName[] = [
  "dk1",
  "lt1",
  "dk2",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
];
