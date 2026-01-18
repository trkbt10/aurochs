/**
 * @file DOCX Run Properties Type Definitions
 *
 * This module defines run-level text formatting properties for WordprocessingML.
 * A "run" is a contiguous range of text with the same formatting.
 *
 * @see ECMA-376 Part 1, Section 17.3.2 (Run Properties)
 */

import type { UnderlineStyle, TextEmphasisMark } from "../../ooxml/domain/text";
import type { WordBorderStyle, EighthPoints } from "../../ooxml/domain/border";
import type { DocxStyleId, HalfPoints, Twips } from "./types";

// =============================================================================
// Run Font Properties
// =============================================================================

/**
 * Font specification for a run.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.26 (rFonts)
 */
export type DocxRunFonts = {
  /** Font for ASCII characters (0x00-0x7F) */
  readonly ascii?: string;
  /** Font for High ANSI characters */
  readonly hAnsi?: string;
  /** Font for East Asian characters */
  readonly eastAsia?: string;
  /** Font for Complex Script characters */
  readonly cs?: string;
  /** Theme font for ASCII characters */
  readonly asciiTheme?: DocxThemeFont;
  /** Theme font for High ANSI characters */
  readonly hAnsiTheme?: DocxThemeFont;
  /** Theme font for East Asian characters */
  readonly eastAsiaTheme?: DocxThemeFont;
  /** Theme font for Complex Script characters */
  readonly csTheme?: DocxThemeFont;
};

/**
 * Theme font references.
 *
 * @see ECMA-376 Part 1, Section 17.18.94 (ST_Theme)
 */
export type DocxThemeFont =
  | "majorAscii"
  | "majorHAnsi"
  | "majorEastAsia"
  | "majorBidi"
  | "minorAscii"
  | "minorHAnsi"
  | "minorEastAsia"
  | "minorBidi";

// =============================================================================
// Run Color Properties
// =============================================================================

/**
 * Color specification for run properties.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.6 (color)
 */
export type DocxColor = {
  /** RGB hex value (e.g., "FF0000" for red) */
  readonly val?: string;
  /** Theme color reference */
  readonly themeColor?: DocxThemeColor;
  /** Theme tint value (0-255) */
  readonly themeTint?: number;
  /** Theme shade value (0-255) */
  readonly themeShade?: number;
};

/**
 * Theme color references.
 *
 * @see ECMA-376 Part 1, Section 17.18.97 (ST_ThemeColor)
 */
export type DocxThemeColor =
  | "dark1"
  | "light1"
  | "dark2"
  | "light2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hyperlink"
  | "followedHyperlink"
  | "background1"
  | "background2"
  | "text1"
  | "text2";

// =============================================================================
// Run Shading Properties
// =============================================================================

/**
 * Shading (background) for a run.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.32 (shd)
 */
export type DocxShading = {
  /** Shading pattern */
  readonly val?: DocxShadingPattern;
  /** Pattern color (RGB hex) */
  readonly color?: string;
  /** Fill color (RGB hex) */
  readonly fill?: string;
  /** Theme color for pattern */
  readonly themeColor?: DocxThemeColor;
  /** Theme fill color */
  readonly themeFill?: DocxThemeColor;
};

/**
 * Shading pattern type.
 *
 * @see ECMA-376 Part 1, Section 17.18.78 (ST_Shd)
 */
export type DocxShadingPattern =
  | "nil"
  | "clear"
  | "solid"
  | "horzStripe"
  | "vertStripe"
  | "reverseDiagStripe"
  | "diagStripe"
  | "horzCross"
  | "diagCross"
  | "thinHorzStripe"
  | "thinVertStripe"
  | "thinReverseDiagStripe"
  | "thinDiagStripe"
  | "thinHorzCross"
  | "thinDiagCross"
  | "pct5"
  | "pct10"
  | "pct12"
  | "pct15"
  | "pct20"
  | "pct25"
  | "pct30"
  | "pct35"
  | "pct37"
  | "pct40"
  | "pct45"
  | "pct50"
  | "pct55"
  | "pct60"
  | "pct62"
  | "pct65"
  | "pct70"
  | "pct75"
  | "pct80"
  | "pct85"
  | "pct87"
  | "pct90"
  | "pct95";

// =============================================================================
// Run Border Properties
// =============================================================================

/**
 * Border around a run.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.4 (bdr)
 */
export type DocxRunBorder = {
  /** Border style */
  readonly val: WordBorderStyle;
  /** Border width in eighths of a point */
  readonly sz?: EighthPoints;
  /** Border spacing in points */
  readonly space?: number;
  /** Border color (RGB hex or "auto") */
  readonly color?: string;
  /** Theme color for border */
  readonly themeColor?: DocxThemeColor;
  /** Frame border (not between pages) */
  readonly frame?: boolean;
  /** Shadow effect */
  readonly shadow?: boolean;
};

// =============================================================================
// Run Underline Properties
// =============================================================================

/**
 * Underline specification for a run.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.40 (u)
 */
export type DocxUnderline = {
  /** Underline style */
  readonly val: UnderlineStyle;
  /** Underline color (RGB hex or "auto") */
  readonly color?: string;
  /** Theme color for underline */
  readonly themeColor?: DocxThemeColor;
};

// =============================================================================
// Run Highlight Properties
// =============================================================================

/**
 * Text highlight color.
 *
 * @see ECMA-376 Part 1, Section 17.18.40 (ST_HighlightColor)
 */
export type DocxHighlightColor =
  | "black"
  | "blue"
  | "cyan"
  | "green"
  | "magenta"
  | "red"
  | "yellow"
  | "white"
  | "darkBlue"
  | "darkCyan"
  | "darkGreen"
  | "darkMagenta"
  | "darkRed"
  | "darkYellow"
  | "darkGray"
  | "lightGray"
  | "none";

// =============================================================================
// Run Vertical Alignment
// =============================================================================

/**
 * Vertical text alignment (superscript/subscript).
 *
 * @see ECMA-376 Part 1, Section 17.18.100 (ST_VerticalAlignRun)
 */
export type DocxVerticalAlignRun = "baseline" | "superscript" | "subscript";

// =============================================================================
// Run Properties Type
// =============================================================================

/**
 * Run properties (rPr).
 *
 * Defines all formatting that can be applied to a run of text.
 *
 * @see ECMA-376 Part 1, Section 17.3.2 (Run Properties)
 */
export type DocxRunProperties = {
  // --- Style Reference ---
  /** Run style ID */
  readonly rStyle?: DocxStyleId;

  // --- Font Properties ---
  /** Font specification */
  readonly rFonts?: DocxRunFonts;
  /** Font size in half-points */
  readonly sz?: HalfPoints;
  /** Complex script font size in half-points */
  readonly szCs?: HalfPoints;

  // --- Basic Formatting ---
  /** Bold */
  readonly b?: boolean;
  /** Bold for complex scripts */
  readonly bCs?: boolean;
  /** Italic */
  readonly i?: boolean;
  /** Italic for complex scripts */
  readonly iCs?: boolean;
  /** All capitals */
  readonly caps?: boolean;
  /** Small capitals */
  readonly smallCaps?: boolean;
  /** Strikethrough */
  readonly strike?: boolean;
  /** Double strikethrough */
  readonly dstrike?: boolean;
  /** Outline effect */
  readonly outline?: boolean;
  /** Shadow effect */
  readonly shadow?: boolean;
  /** Emboss effect */
  readonly emboss?: boolean;
  /** Imprint/engrave effect */
  readonly imprint?: boolean;
  /** Hidden text */
  readonly vanish?: boolean;
  /** Web hidden text */
  readonly webHidden?: boolean;

  // --- Color and Shading ---
  /** Text color */
  readonly color?: DocxColor;
  /** Text highlight color */
  readonly highlight?: DocxHighlightColor;
  /** Run shading */
  readonly shd?: DocxShading;

  // --- Underline ---
  /** Underline specification */
  readonly u?: DocxUnderline;

  // --- Spacing and Position ---
  /** Character spacing in twips */
  readonly spacing?: Twips;
  /** Expanded/condensed character width (percentage * 100) */
  readonly w?: number;
  /** Kerning threshold in half-points */
  readonly kern?: HalfPoints;
  /** Vertical position adjustment in half-points */
  readonly position?: HalfPoints;

  // --- Vertical Alignment ---
  /** Subscript/superscript */
  readonly vertAlign?: DocxVerticalAlignRun;

  // --- Border ---
  /** Run border */
  readonly bdr?: DocxRunBorder;

  // --- East Asian Properties ---
  /** Emphasis mark */
  readonly em?: TextEmphasisMark;
  /** Use East Asian line break rules */
  readonly eastAsianLayout?: DocxEastAsianLayout;

  // --- Complex Script Properties ---
  /** Right-to-left text */
  readonly rtl?: boolean;
  /** Use complex script formatting */
  readonly cs?: boolean;

  // --- Revision Tracking ---
  /** Revision ID for insertion */
  readonly insId?: number;
  /** Revision ID for deletion */
  readonly delId?: number;
  /** Revision ID for move source */
  readonly moveFromId?: number;
  /** Revision ID for move destination */
  readonly moveToId?: number;
};

/**
 * East Asian text layout properties.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.9 (eastAsianLayout)
 */
export type DocxEastAsianLayout = {
  /** Combine characters into one glyph */
  readonly combine?: boolean;
  /** Combined character bracket style */
  readonly combineBrackets?: "none" | "round" | "square" | "angle" | "curly";
  /** Vertical text within horizontal line */
  readonly vert?: boolean;
  /** Compress punctuation */
  readonly vertCompress?: boolean;
};

// =============================================================================
// Run Content Types
// =============================================================================

/**
 * Text content within a run.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.31 (t)
 */
export type DocxText = {
  readonly type: "text";
  /** Text content */
  readonly value: string;
  /** Preserve whitespace */
  readonly space?: "default" | "preserve";
};

/**
 * Tab character.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.29 (tab)
 */
export type DocxTab = {
  readonly type: "tab";
};

/**
 * Line break.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.1 (br)
 */
export type DocxBreak = {
  readonly type: "break";
  /** Break type */
  readonly breakType?: "page" | "column" | "textWrapping";
  /** Clear setting for text wrapping break */
  readonly clear?: "none" | "left" | "right" | "all";
};

/**
 * Symbol character (from symbol font).
 *
 * @see ECMA-376 Part 1, Section 17.3.3.28 (sym)
 */
export type DocxSymbol = {
  readonly type: "symbol";
  /** Symbol font name */
  readonly font: string;
  /** Character code (hex) */
  readonly char: string;
};

/**
 * Drawing content within a run.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.9 (drawing)
 */
export type DocxDrawingContent = {
  readonly type: "drawing";
  /** Inline or anchor drawing */
  readonly drawing: import("./drawing").DocxDrawing;
};

/**
 * Union of all run content types.
 */
export type DocxRunContent = DocxText | DocxTab | DocxBreak | DocxSymbol | DocxDrawingContent;

// =============================================================================
// Run Type
// =============================================================================

/**
 * A run of text with consistent formatting.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.25 (r)
 */
export type DocxRun = {
  readonly type: "run";
  /** Run properties */
  readonly properties?: DocxRunProperties;
  /** Run content (text, tabs, breaks, etc.) */
  readonly content: readonly DocxRunContent[];
};
