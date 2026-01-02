/**
 * @file Text layout type definitions
 * Types for text measurement and layout results
 */

import type { Pixels, Points, TextAlign, TextAnchor, Percent } from "../../domain/types";
import type { LineSpacing, TextWrapping, TextOverflow, TextVerticalOverflow } from "../../domain/text";
import type { RenderOptions } from "../core/types";

// =============================================================================
// Auto Fit Configuration
// =============================================================================

/**
 * Auto-fit configuration for text scaling.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.1-3 (noAutofit/normAutofit/spAutoFit)
 */
export type AutoFitConfig =
  | { readonly type: "none" }
  | { readonly type: "shape" }
  | {
      readonly type: "normal";
      /** Font scale percentage (default: 100%) */
      readonly fontScale: Percent;
      /** Line spacing reduction percentage (default: 0%) */
      readonly lineSpaceReduction: Percent;
    };

// =============================================================================
// Text Box Configuration
// =============================================================================

/**
 * Text box configuration for layout
 */
export type TextBoxConfig = {
  /** Total width of the text box in pixels */
  readonly width: Pixels;
  /** Total height of the text box in pixels */
  readonly height: Pixels;
  /** Left inset in pixels */
  readonly insetLeft: Pixels;
  /** Right inset in pixels */
  readonly insetRight: Pixels;
  /** Top inset in pixels */
  readonly insetTop: Pixels;
  /** Bottom inset in pixels */
  readonly insetBottom: Pixels;
  /** Vertical anchor: top, center, or bottom */
  readonly anchor: TextAnchor;
  /**
   * Center text horizontally within the text body.
   * @see ECMA-376 Part 1, Section 21.1.2.1.2 (anchorCtr attribute)
   */
  readonly anchorCenter: boolean;
  /** Word wrap mode */
  readonly wrapMode: TextWrapping | "wrap";
  /**
   * Auto-fit configuration for text scaling.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.1-3
   */
  readonly autoFit: AutoFitConfig;
  /**
   * Horizontal overflow behavior.
   *
   * Per ECMA-376 Part 1, Section 21.1.2.1.16:
   * - "overflow": Text is allowed to overflow the text box (default)
   * - "clip": Text is clipped at the text box boundary
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.16 (ST_TextHorzOverflowType)
   */
  readonly horzOverflow: TextOverflow;
  /**
   * Vertical overflow behavior.
   *
   * Per ECMA-376 Part 1, Section 21.1.2.1.42:
   * - "overflow": Text is allowed to overflow vertically (default)
   * - "ellipsis": Overflow is indicated with ellipsis
   * - "clip": Text is clipped at the text box boundary
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.42 (ST_TextVertOverflowType)
   */
  readonly vertOverflow: TextVerticalOverflow;
  /**
   * Use compatible line spacing.
   * When true, line spacing follows legacy PowerPoint 2003 behavior.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.2 (compatLnSpc attribute)
   */
  readonly compatLnSpc: boolean;
  /**
   * Force anti-aliasing on text rendering.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.2 (forceAA attribute)
   */
  readonly forceAA: boolean;
  /**
   * Right-to-left column order.
   * When true, columns are arranged from right to left.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.2 (rtlCol attribute)
   */
  readonly rtlCol: boolean;
  /**
   * Apply paragraph spacing to first and last paragraphs.
   * When true, spaceBefore/spaceAfter is applied even to first/last paragraphs.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.2 (spcFirstLastPara attribute)
   */
  readonly spcFirstLastPara: boolean;
  /**
   * Keep text upright in vertical text layouts.
   * When true, glyphs remain upright even in vertical text.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.2 (upright attribute)
   */
  readonly upright: boolean;
};

// =============================================================================
// Text Outline Configuration
// =============================================================================

/**
 * Text outline (stroke) configuration for SVG rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
export type TextOutlineConfig = {
  /** Stroke width in pixels */
  readonly width: Pixels;
  /** Stroke color as hex (with #) */
  readonly color: string;
  /** Line cap style */
  readonly cap: "butt" | "round" | "square";
  /** Line join style */
  readonly join: "miter" | "round" | "bevel";
};

// =============================================================================
// Text Fill Configuration
// =============================================================================

/**
 * Gradient stop for text fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.36 (a:gs)
 */
export type TextGradientStop = {
  /** Position in gradient (0-100) */
  readonly position: number;
  /** Color as hex (with #) */
  readonly color: string;
  /** Alpha value (0-1) */
  readonly alpha: number;
};

/**
 * Gradient fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type TextGradientFillConfig = {
  readonly type: "gradient";
  /** Gradient stops */
  readonly stops: readonly TextGradientStop[];
  /** Rotation angle in degrees (0-360, clockwise from horizontal) */
  readonly angle: number;
  /** Whether this is a radial gradient */
  readonly isRadial: boolean;
  /** Radial center (percentage 0-100) */
  readonly radialCenter?: { readonly cx: number; readonly cy: number };
};

/**
 * Solid fill configuration for text (for consistency).
 */
export type TextSolidFillConfig = {
  readonly type: "solid";
  /** Color as hex (with #) */
  readonly color: string;
  /** Alpha value (0-1) */
  readonly alpha: number;
};

/**
 * No fill configuration for text (transparent text).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.44 (a:noFill)
 */
export type TextNoFillConfig = {
  readonly type: "noFill";
};

/**
 * Text fill configuration (solid, gradient, or noFill).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type TextFillConfig = TextSolidFillConfig | TextGradientFillConfig | TextNoFillConfig;

// =============================================================================
// Text Span Types
// =============================================================================

/**
 * Resolved text span for layout
 * All values are resolved from RunProperties + defaults
 */
export type LayoutSpan = {
  /** Text content */
  readonly text: string;
  /** Font size in points */
  readonly fontSize: Points;
  /** Font family name (Latin font) */
  readonly fontFamily: string;
  /**
   * East Asian font family for CJK characters.
   * @see ECMA-376 Part 1, Section 21.1.2.3.2 (a:ea)
   */
  readonly fontFamilyEastAsian: string | undefined;
  /**
   * Complex Script font family for RTL/complex script characters.
   * @see ECMA-376 Part 1, Section 21.1.2.3.1 (a:cs)
   */
  readonly fontFamilyComplexScript: string | undefined;
  /**
   * Symbol font family for symbol characters.
   * @see ECMA-376 Part 1, Section 21.1.2.3.10 (a:sym)
   */
  readonly fontFamilySymbol: string | undefined;
  /** Font weight (bold: 700, normal: 400) */
  readonly fontWeight: number;
  /** Font style (normal/italic) */
  readonly fontStyle: "normal" | "italic";
  /** Text decoration (underline, line-through) */
  readonly textDecoration: string | undefined;
  /** Text color as hex (with #) */
  readonly color: string;
  /** Vertical alignment (baseline/superscript/subscript) */
  readonly verticalAlign: "baseline" | "superscript" | "subscript";
  /** Letter spacing in pixels */
  readonly letterSpacing: Pixels;
  /** Whether this is a line break */
  readonly isBreak: boolean;
  /** Text direction */
  readonly direction: "ltr" | "rtl";
  /** Highlight/background color as hex (with #) */
  readonly highlightColor: string | undefined;
  /** Text transform (uppercase, etc.) */
  readonly textTransform: "none" | "uppercase" | "lowercase" | undefined;
  /** Hyperlink resource ID */
  readonly linkId: string | undefined;
  /** Hyperlink tooltip */
  readonly linkTooltip: string | undefined;
  /**
   * Mouse-over hyperlink resource ID.
   * @see ECMA-376 Part 1, Section 21.1.2.3.6 (a:hlinkMouseOver)
   */
  readonly mouseOverLinkId: string | undefined;
  /**
   * Mouse-over hyperlink tooltip.
   * @see ECMA-376 Part 1, Section 21.1.2.3.6 (a:hlinkMouseOver)
   */
  readonly mouseOverLinkTooltip: string | undefined;
  /**
   * Bookmark name for creating named anchors.
   * @see ECMA-376 Part 1, Section 21.1.2.3.9 (bmk attribute)
   */
  readonly bookmark: string | undefined;
  /**
   * Text outline (stroke) configuration.
   * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
   */
  readonly textOutline: TextOutlineConfig | undefined;
  /**
   * Text fill configuration (solid or gradient).
   * When undefined, uses the color property as solid fill.
   * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
   */
  readonly textFill: TextFillConfig | undefined;
  /**
   * Minimum font size for kerning in points.
   * Kerning is enabled when fontSize >= kerning.
   * When undefined, browser default (typically auto) is used.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.3.9 (kern attribute)
   */
  readonly kerning: Points | undefined;
  /**
   * Custom underline color (hex with #).
   * When undefined, uses text color.
   * @see ECMA-376 Part 1, Section 21.1.2.3.33 (a:uLn)
   */
  readonly underlineColor: string | undefined;
};

/**
 * Measured span with computed width
 */
export type MeasuredSpan = LayoutSpan & {
  /** Computed width in pixels */
  readonly width: Pixels;
};

// =============================================================================
// Paragraph Input Types
// =============================================================================

/**
 * Bullet configuration for a paragraph
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet properties)
 */
export type BulletConfig = {
  /** Bullet character (for character/auto-number bullets) */
  readonly char: string;
  /** Bullet font size in points */
  readonly fontSize: Points;
  /** Bullet color as hex (with #) */
  readonly color: string;
  /** Bullet font family */
  readonly fontFamily: string;
  /**
   * Picture bullet image URL (data URL).
   * When set, an <image> element is rendered instead of text.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.4.2 (a:buBlip)
   */
  readonly imageUrl?: string;
};

/**
 * Font alignment for vertical positioning of different font sizes.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.12 (ST_TextFontAlignType)
 */
export type FontAlignment = "auto" | "top" | "center" | "base" | "bottom";

/**
 * Tab stop configuration for layout.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.14 (a:tab)
 */
export type LayoutTabStop = {
  /** Position from left edge in pixels */
  readonly position: Pixels;
  /** Tab alignment type */
  readonly alignment: "left" | "center" | "right" | "decimal";
};

/**
 * Paragraph input for layout
 */
export type LayoutParagraphInput = {
  /** Text spans in the paragraph */
  readonly spans: readonly LayoutSpan[];
  /** Horizontal alignment */
  readonly alignment: TextAlign;
  /** Left margin in pixels */
  readonly marginLeft: Pixels;
  /** First-line indent in pixels (can be negative for hanging) */
  readonly indent: Pixels;
  /** Right margin in pixels */
  readonly marginRight: Pixels;
  /** Space before paragraph in points */
  readonly spaceBefore: Points;
  /** Space after paragraph in points */
  readonly spaceAfter: Points;
  /** Line spacing configuration */
  readonly lineSpacing: LineSpacing | undefined;
  /** Bullet configuration if any */
  readonly bullet: BulletConfig | undefined;
  /**
   * Font alignment for vertical positioning of different font sizes on a line.
   *
   * Per ECMA-376 Part 1, Section 21.1.2.1.12:
   * - "auto": Let application decide (typically baseline)
   * - "top": Align to top of tallest character
   * - "center": Center vertically
   * - "base": Align to baseline (default)
   * - "bottom": Align to bottom of deepest descender
   *
   * @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
   */
  readonly fontAlignment: FontAlignment;
  /**
   * Default tab size in pixels.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.2.7 (defTabSz attribute)
   */
  readonly defaultTabSize: Pixels;
  /**
   * Custom tab stops.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.2.13 (a:tabLst)
   */
  readonly tabStops: readonly LayoutTabStop[];
  /**
   * East Asian line break rules.
   * When true, allows line breaks within East Asian words.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.2.7 (eaLnBrk attribute)
   */
  readonly eaLineBreak: boolean;
  /**
   * Latin line break rules.
   * When true, allows line breaks within Latin words.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.2.7 (latinLnBrk attribute)
   */
  readonly latinLineBreak: boolean;
  /**
   * Hanging punctuation.
   * When true, punctuation may hang outside the text box boundaries.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.2.7 (hangingPunct attribute)
   */
  readonly hangingPunctuation: boolean;
  /**
   * Font size for empty paragraphs from a:endParaRPr.
   * Used to calculate line height when paragraph has no text runs.
   *
   * Per ECMA-376 Part 1, Section 21.1.2.2.3:
   * Empty paragraphs should use endParaRPr font size for height calculation.
   *
   * @see ECMA-376 Part 1, Section 21.1.2.2.3 (a:endParaRPr)
   */
  readonly endParaFontSize?: Points;
};

// =============================================================================
// Layout Result Types
// =============================================================================

/**
 * A positioned span within a line
 */
export type PositionedSpan = MeasuredSpan & {
  /** X offset within the line (for kerning adjustments) */
  readonly dx: Pixels;
};

/**
 * A single laid out line
 */
export type LayoutLine = {
  /** Positioned spans in this line */
  readonly spans: readonly PositionedSpan[];
  /** X position of the line start in pixels */
  readonly x: Pixels;
  /** Y position (baseline) of the line in pixels */
  readonly y: Pixels;
  /** Total width of the line in pixels */
  readonly width: Pixels;
  /** Height of the line in pixels */
  readonly height: Pixels;
};

/**
 * A laid out paragraph
 */
export type LayoutParagraphResult = {
  /** Lines in this paragraph */
  readonly lines: readonly LayoutLine[];
  /** Horizontal alignment */
  readonly alignment: TextAlign;
  /** Bullet character if any */
  readonly bullet: BulletConfig | undefined;
  /** Bullet width in pixels (for positioning) */
  readonly bulletWidth: Pixels;
  /**
   * Font alignment for vertical positioning of different font sizes.
   * @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
   */
  readonly fontAlignment: FontAlignment;
};

/**
 * Complete layout result
 */
export type LayoutResult = {
  /** Laid out paragraphs */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Total height of all content in pixels */
  readonly totalHeight: Pixels;
  /** Y offset applied for vertical anchoring in pixels */
  readonly yOffset: Pixels;
};

// =============================================================================
// Layout Input
// =============================================================================

/**
 * Complete layout engine input
 */
export type LayoutInput = {
  /** Text box configuration */
  readonly textBox: TextBoxConfig;
  /** Paragraphs to lay out */
  readonly paragraphs: readonly LayoutParagraphInput[];
  /** Render options for dialect-specific behavior */
  readonly renderOptions?: RenderOptions;
};
