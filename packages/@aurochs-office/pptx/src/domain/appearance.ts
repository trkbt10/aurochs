/**
 * @file Appearance and rendering mode types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.10 - Simple Types
 */

// =============================================================================
// Appearance Types
// =============================================================================

/**
 * Black and white rendering mode values
 * @see ECMA-376 Part 1, Section 20.1.10.10 (ST_BlackWhiteMode)
 */
export type BlackWhiteMode =
  | "auto"
  | "black"
  | "blackGray"
  | "blackWhite"
  | "clr"
  | "gray"
  | "grayWhite"
  | "hidden"
  | "invGray"
  | "ltGray"
  | "white";

/**
 * Blip compression type
 * @see ECMA-376 Part 1, Section 20.1.10.12 (ST_BlipCompression)
 */
export type OnOffStyleType = "on" | "off" | "def";

/**
 * Rectangle alignment
 * @see ECMA-376 Part 1, Section 20.1.10.53 (ST_RectAlignment)
 */
export type RectAlignment =
  | "b"
  | "bl"
  | "br"
  | "ctr"
  | "l"
  | "r"
  | "t"
  | "tl"
  | "tr";

/**
 * Fill types supported by fill overlay
 * @see ECMA-376 Part 1, Section 20.1.8.29 (fillOverlay)
 */
export type FillEffectType =
  | "solidFill"
  | "gradFill"
  | "blipFill"
  | "pattFill"
  | "grpFill";
