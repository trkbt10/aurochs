/**
 * @file Theme editor types
 *
 * Type definitions for theme editing functionality.
 */

import type { FontSpec } from "../../../pptx/domain/resolution";

/**
 * Standard color scheme keys (12 theme colors).
 */
export type SchemeColorName =
  | "dk1"
  | "lt1"
  | "dk2"
  | "lt2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hlink"
  | "folHlink";

/**
 * Color scheme mapping (color name to hex value).
 */
export type ThemeColorScheme = Readonly<Record<SchemeColorName, string>>;

/**
 * Font scheme for a theme.
 */
export type ThemeFontScheme = {
  readonly majorFont: FontSpec;
  readonly minorFont: FontSpec;
};

/**
 * Theme preset definition.
 */
export type ThemePreset = {
  readonly id: string;
  readonly name: string;
  readonly colorScheme: ThemeColorScheme;
  readonly fontScheme: ThemeFontScheme;
};

/**
 * Human-readable labels for color scheme keys.
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
