/**
 * @file Common OOXML Color Types for PPTX/XLSX processing
 *
 * These types represent DrawingML color concepts that are shared across
 * Office Open XML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 */

import type { Degrees, Percent } from "./units";

// =============================================================================
// Scheme Color Types
// =============================================================================

/**
 * Color scheme slot names - the 12 actual colors defined in a:clrScheme.
 *
 * These are the children elements of the a:clrScheme element:
 * - Base colors: dk1, lt1, dk2, lt2 (dark/light primary and secondary)
 * - Accent colors: accent1-accent6
 * - Link colors: hlink (hyperlink), folHlink (followed hyperlink)
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (CT_ColorScheme / a:clrScheme)
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
 * All possible values for a:schemeClr element's val attribute.
 *
 * This includes:
 * - All 12 SchemeColorName values (the actual theme colors)
 * - Color map references: bg1, bg2, tx1, tx2 (mapped via p:clrMap)
 * - Placeholder color: phClr (used in shape definitions)
 *
 * @see ECMA-376 Part 1, Section 20.1.10.54 (ST_SchemeColorVal)
 */
export type SchemeColorValue =
  | SchemeColorName
  | "bg1"
  | "bg2"
  | "tx1"
  | "tx2"
  | "phClr";

// =============================================================================
// Color Types
// =============================================================================

/**
 * sRGB color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.32 (srgbClr)
 */
export type SrgbColor = {
  readonly type: "srgb";
  readonly value: string; // 6-digit hex (e.g., "FF0000")
};

/**
 * Scheme color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.29 (schemeClr)
 */
export type SchemeColor = {
  readonly type: "scheme";
  readonly value: SchemeColorValue;
};

/**
 * System color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.33 (sysClr)
 */
export type SystemColor = {
  readonly type: "system";
  readonly value: string; // e.g., "windowText", "window"
  readonly lastColor?: string; // Cached color value
};

/**
 * Preset color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.22 (prstClr)
 */
export type PresetColor = {
  readonly type: "preset";
  readonly value: string; // e.g., "red", "blue", "green"
};

/**
 * HSL color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.13 (hslClr)
 */
export type HslColor = {
  readonly type: "hsl";
  readonly hue: Degrees;
  readonly saturation: Percent;
  readonly luminance: Percent;
};

/**
 * scRGB color specification
 * Uses percentage values for each channel (-1000% to +1000% per ECMA-376)
 * @see ECMA-376 Part 1, Section 20.1.2.3.30 (scrgbClr)
 */
export type ScrgbColor = {
  readonly type: "scrgb";
  readonly red: Percent;
  readonly green: Percent;
  readonly blue: Percent;
};

/**
 * Union of all color specifications
 */
export type ColorSpec =
  | SrgbColor
  | SchemeColor
  | SystemColor
  | PresetColor
  | HslColor
  | ScrgbColor;

/**
 * Color transform modifications
 * @see ECMA-376 Part 1, Section 20.1.2.3 (color transforms)
 */
export type ColorTransform = {
  readonly alpha?: Percent;
  readonly alphaMod?: Percent;
  readonly alphaOff?: Percent;
  readonly hue?: Degrees;
  readonly hueMod?: Percent;
  readonly hueOff?: Degrees;
  readonly sat?: Percent;
  readonly satMod?: Percent;
  readonly satOff?: Percent;
  readonly lum?: Percent;
  readonly lumMod?: Percent;
  readonly lumOff?: Percent;
  readonly gamma?: boolean;
  readonly invGamma?: boolean;
  readonly blueMod?: Percent;
  readonly blueOff?: Percent;
  readonly green?: Percent;
  readonly greenMod?: Percent;
  readonly greenOff?: Percent;
  readonly redMod?: Percent;
  readonly redOff?: Percent;
  readonly shade?: Percent;
  readonly tint?: Percent;
  readonly comp?: boolean; // Complement
  readonly inv?: boolean; // Inverse
  readonly gray?: boolean; // Grayscale
};

/**
 * Color with optional transforms
 */
export type Color = {
  readonly spec: ColorSpec;
  readonly transform?: ColorTransform;
};
