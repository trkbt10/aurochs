/**
 * @file Theme types for PPTX processing
 *
 * Types representing theme elements from slide masters and templates.
 * These types retain references to XmlElement for deferred parsing.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import type {
  ColorScheme as ColorSchemeType,
  ColorMap as ColorMapType,
} from "../color/context";
import type { FontScheme as FontSchemeType } from "../resolution";

// =============================================================================
// Custom Color Types (ECMA-376 Part 1, Section 20.1.4.1.8)
// =============================================================================

/**
 * Custom color definition from theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.8 (a:custClr)
 */
export type CustomColor = {
  readonly name?: string;
  readonly color?: string;
  readonly type: "srgb" | "system";
  readonly systemColor?: string;
};

// =============================================================================
// Extra Color Scheme Types (ECMA-376 Part 1, Section 20.1.6.4)
// =============================================================================

/**
 * Extra color scheme from theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.4 (a:extraClrScheme)
 */
export type ExtraColorScheme = {
  readonly name?: string;
  readonly colorScheme: ColorSchemeType;
  readonly colorMap: ColorMapType;
};

// =============================================================================
// Object Defaults Types (ECMA-376 Part 1, Section 20.1.6.7)
// =============================================================================

/**
 * Object defaults from theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.7 (a:objectDefaults)
 */
export type ObjectDefaults = {
  readonly lineDefault?: XmlElement;
  readonly shapeDefault?: XmlElement;
  readonly textDefault?: XmlElement;
};

// =============================================================================
// Format Scheme Types (ECMA-376 Part 1, Section 20.1.4.1.14)
// =============================================================================

/**
 * Format scheme containing style lists.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
 */
export type FormatScheme = {
  readonly lineStyles: readonly XmlElement[];
  readonly fillStyles: readonly XmlElement[];
  readonly effectStyles: readonly XmlElement[];
  /**
   * Background fill styles (a:bgFillStyleLst).
   * Used by p:bgRef with idx >= 1001.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  readonly bgFillStyles: readonly XmlElement[];
};

// =============================================================================
// Theme Types (ECMA-376 Part 1, Section 20.1.6.9)
// =============================================================================

/**
 * Complete theme definition.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
export type Theme = {
  readonly fontScheme: FontSchemeType;
  readonly colorScheme: ColorSchemeType;
  readonly formatScheme: FormatScheme;
  readonly customColors: readonly CustomColor[];
  readonly extraColorSchemes: readonly ExtraColorScheme[];
  readonly themeElements?: XmlElement;
  readonly themeManager?: XmlElement;
  readonly themeOverrides: readonly XmlDocument[];
  readonly objectDefaults: ObjectDefaults;
};

// =============================================================================
// Raw Master Text Styles (ECMA-376 Part 1, Section 19.3.1.51)
// =============================================================================

/**
 * Raw master text styles from slide master (XmlElement references).
 * This is the raw form before conversion to domain MasterTextStyles.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 */
export type RawMasterTextStyles = {
  readonly titleStyle: XmlElement | undefined;
  readonly bodyStyle: XmlElement | undefined;
  readonly otherStyle: XmlElement | undefined;
};

// Re-export resolution types for convenience
export type { ColorSchemeType as ColorScheme, ColorMapType as ColorMap, FontSchemeType as FontScheme };
