/**
 * @file Master text style types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.3.1.47 - Text Styles
 */

import type { ParagraphProperties, RunProperties } from "./text";

// =============================================================================
// Master Text Style Types
// =============================================================================

/**
 * Text level style properties
 */
export type TextLevelStyle = {
  readonly defaultRunProperties?: RunProperties;
  readonly paragraphProperties?: ParagraphProperties;
};

/**
 * Text style levels (1-9)
 */
export type TextStyleLevels = {
  readonly defaultStyle?: TextLevelStyle;
  readonly level1?: TextLevelStyle;
  readonly level2?: TextLevelStyle;
  readonly level3?: TextLevelStyle;
  readonly level4?: TextLevelStyle;
  readonly level5?: TextLevelStyle;
  readonly level6?: TextLevelStyle;
  readonly level7?: TextLevelStyle;
  readonly level8?: TextLevelStyle;
  readonly level9?: TextLevelStyle;
};

/**
 * Master text styles
 * @see ECMA-376 Part 1, Section 19.3.1.47 (txStyles)
 */
export type MasterTextStyles = {
  readonly titleStyle?: TextStyleLevels;
  readonly bodyStyle?: TextStyleLevels;
  readonly otherStyle?: TextStyleLevels;
};
