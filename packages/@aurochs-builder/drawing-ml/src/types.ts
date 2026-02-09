/**
 * @file DrawingML builder type definitions
 *
 * Spec types for building DrawingML elements shared across PPTX, DOCX, and XLSX.
 * These types provide a simplified API for creating DrawingML structures.
 *
 * NOTE: These types are INTERNAL to the builder packages. External consumers
 * should import domain types directly from:
 * - @aurochs-office/ooxml: SchemeColorValue, PatternType, Color, ColorTransform
 */

import type { SchemeColorValue } from "@aurochs-office/drawing-ml/domain/color";
import type { PatternType } from "@aurochs-office/drawing-ml/domain/fill";
// Import line types from domain to ensure spec ↔ domain consistency (consumers import directly from domain)
import type { LineCap, CompoundLine, LineJoin } from "@aurochs-office/drawing-ml/domain/line";

// =============================================================================
// Color Spec Types
// =============================================================================

/**
 * Theme color specification with optional luminance modifiers
 */
export type ThemeColorSpec = {
  readonly theme: SchemeColorValue;
  readonly lumMod?: number; // luminance modulate (0-100, percentage)
  readonly lumOff?: number; // luminance offset (-100 to 100, percentage)
  readonly tint?: number; // tint (0-100, percentage)
  readonly shade?: number; // shade (0-100, percentage)
};

/**
 * Color specification - can be hex string or theme color reference
 */
export type ColorSpec = string | ThemeColorSpec;

/**
 * Check if a color spec is a theme color
 */
export function isThemeColor(color: ColorSpec): color is ThemeColorSpec {
  return typeof color === "object" && "theme" in color;
}

// =============================================================================
// Fill Spec Types
// =============================================================================

/**
 * Gradient stop specification
 */
export type GradientStopSpec = {
  readonly position: number; // 0-100 percentage
  readonly color: ColorSpec; // hex color or theme color
};

/**
 * Gradient fill specification
 */
export type GradientFillSpec = {
  readonly type: "gradient";
  readonly gradientType: "linear" | "radial" | "path";
  readonly angle?: number; // degrees for linear gradient
  readonly stops: readonly GradientStopSpec[];
};

/**
 * Pattern fill specification
 */
export type PatternFillSpec = {
  readonly type: "pattern";
  readonly preset: PatternType;
  readonly fgColor: ColorSpec; // foreground color (hex or theme)
  readonly bgColor: ColorSpec; // background color (hex or theme)
};

/**
 * Solid fill specification (explicit)
 */
export type SolidFillSpec = {
  readonly type: "solid";
  readonly color: ColorSpec; // hex color or theme color
};

/**
 * Theme fill specification (shorthand for solid theme color fill)
 */
export type ThemeFillSpec = {
  readonly type: "theme";
  readonly theme: SchemeColorValue;
  readonly lumMod?: number;
  readonly lumOff?: number;
  readonly tint?: number;
  readonly shade?: number;
};

/**
 * Fill specification union type
 */
export type FillSpec = string | SolidFillSpec | GradientFillSpec | PatternFillSpec | ThemeFillSpec;

// =============================================================================
// Line Spec Types
// =============================================================================

/**
 * Line end type values
 */
export type LineEndType = "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";

/**
 * Line end size values
 */
export type LineEndSize = "sm" | "med" | "lg";

/**
 * Line end specification
 */
export type LineEndSpec = {
  readonly type: LineEndType;
  readonly width?: LineEndSize;
  readonly length?: LineEndSize;
};

/**
 * Dash style values
 */
export type DashStyle =
  | "solid"
  | "dash"
  | "dashDot"
  | "dot"
  | "lgDash"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot"
  | "sysDot";

/**
 * Line specification
 */
export type LineSpec = {
  readonly color: ColorSpec;
  readonly width: number;
  readonly dash?: DashStyle;
  readonly cap?: LineCap;
  readonly join?: LineJoin;
  readonly compound?: CompoundLine;
  readonly headEnd?: LineEndSpec;
  readonly tailEnd?: LineEndSpec;
};

// =============================================================================
// Effect Spec Types
// =============================================================================

/**
 * Shadow effect specification
 */
export type ShadowEffectSpec = {
  readonly color: string; // hex color
  readonly blur?: number; // blur radius in pixels
  readonly distance?: number; // distance in pixels
  readonly direction?: number; // direction in degrees (0-360)
};

/**
 * Glow effect specification
 */
export type GlowEffectSpec = {
  readonly color: string; // hex color
  readonly radius: number; // radius in pixels
};

/**
 * Soft edge effect specification
 */
export type SoftEdgeEffectSpec = {
  readonly radius: number; // radius in pixels
};

/**
 * Reflection effect specification
 */
export type ReflectionEffectSpec = {
  readonly blurRadius?: number; // blur radius in pixels (default: 0)
  readonly startOpacity?: number; // start opacity 0-100 (default: 100)
  readonly endOpacity?: number; // end opacity 0-100 (default: 0)
  readonly distance?: number; // distance in pixels (default: 0)
  readonly direction?: number; // direction in degrees (default: 0)
  readonly fadeDirection?: number; // fade direction in degrees (default: 90)
  readonly scaleX?: number; // horizontal scale 0-100 (default: 100)
  readonly scaleY?: number; // vertical scale 0-100 (default: -100 for mirror)
};

/**
 * Combined effects specification
 */
export type EffectsSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
  readonly softEdge?: SoftEdgeEffectSpec;
  readonly reflection?: ReflectionEffectSpec;
};

// =============================================================================
// 3D Types
// =============================================================================

/**
 * Bevel preset type
 */
export type BevelPresetType =
  | "angle"
  | "artDeco"
  | "circle"
  | "convex"
  | "coolSlant"
  | "cross"
  | "divot"
  | "hardEdge"
  | "relaxedInset"
  | "riblet"
  | "slope"
  | "softRound";

/**
 * Preset material type
 */
export type PresetMaterialType =
  | "legacyMatte"
  | "legacyPlastic"
  | "legacyMetal"
  | "legacyWireframe"
  | "matte"
  | "plastic"
  | "metal"
  | "warmMatte"
  | "translucentPowder"
  | "powder"
  | "dkEdge"
  | "softEdge"
  | "clear"
  | "flat"
  | "softmetal";

/**
 * Bevel specification
 */
export type BevelSpec = {
  readonly preset?: BevelPresetType;
  readonly width?: number; // in pixels
  readonly height?: number; // in pixels
};

/**
 * 3D shape properties specification
 */
export type Shape3dSpec = {
  readonly bevelTop?: BevelSpec;
  readonly bevelBottom?: BevelSpec;
  readonly material?: PresetMaterialType;
  readonly extrusionHeight?: number; // depth in pixels
};

// =============================================================================
// Text Types
// =============================================================================

/**
 * Text alignment
 */
export type TextAlign = "left" | "center" | "right" | "justify" | "distributed";

/**
 * Text vertical anchor
 */
export type TextAnchor = "top" | "center" | "bottom";

/**
 * Text vertical type (orientation)
 */
export type TextVerticalType =
  | "horz"
  | "vert"
  | "vert270"
  | "wordArtVert"
  | "eaVert"
  | "mongolianVert"
  | "wordArtVertRtl";

/**
 * Underline style
 */
export type UnderlineStyle = "none" | "single" | "double" | "heavy" | "dotted" | "dashed" | "wavy";

/**
 * Strikethrough style
 */
export type StrikeStyle = "noStrike" | "single" | "double";

/**
 * Text caps style
 */
export type TextCaps = "none" | "all" | "small";

/**
 * Text vertical position (superscript/subscript)
 */
export type TextVerticalPosition = "normal" | "superscript" | "subscript";

/**
 * Bullet type
 */
export type BulletType = "none" | "char" | "autoNum";

/**
 * Bullet specification
 */
export type BulletSpec = {
  readonly type: BulletType;
  readonly char?: string; // for char bullet type
  readonly autoNumType?: string; // for autoNum type (e.g., "arabicPeriod", "romanUcPeriod")
};

/**
 * Text outline specification
 */
export type TextOutlineSpec = {
  readonly color: string; // hex color
  readonly width?: number; // in pixels
};

/**
 * Text effect specification (shadow, glow for text)
 */
export type TextEffectSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
};

/**
 * Hyperlink specification
 */
export type HyperlinkSpec = {
  readonly url: string;
  readonly tooltip?: string;
};

/**
 * Text run specification - a portion of text with specific formatting
 */
export type TextRunSpec = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly strikethrough?: StrikeStyle;
  readonly caps?: TextCaps;
  readonly verticalPosition?: TextVerticalPosition;
  readonly letterSpacing?: number; // in pixels (can be negative)
  readonly fontSize?: number; // in points
  readonly fontFamily?: string;
  readonly color?: string; // hex color
  readonly outline?: TextOutlineSpec;
  readonly effects?: TextEffectSpec;
  readonly hyperlink?: HyperlinkSpec;
};

/**
 * Line spacing specification
 */
export type LineSpacingSpec =
  | { readonly type: "percent"; readonly value: number } // e.g., 150 for 1.5x
  | { readonly type: "points"; readonly value: number }; // e.g., 18 for 18pt

/**
 * Text paragraph specification
 */
export type TextParagraphSpec = {
  readonly runs: readonly TextRunSpec[];
  readonly alignment?: TextAlign;
  readonly bullet?: BulletSpec;
  readonly level?: number; // indent level (0-8)
  readonly lineSpacing?: LineSpacingSpec;
  readonly spaceBefore?: number; // points before paragraph
  readonly spaceAfter?: number; // points after paragraph
  readonly indent?: number; // first line indent in pixels
  readonly marginLeft?: number; // left margin in pixels
};

/**
 * Rich text body specification - array of paragraphs
 */
export type RichTextSpec = readonly TextParagraphSpec[];

/**
 * Text specification - can be simple string or rich text
 */
export type TextSpec = string | RichTextSpec;

/**
 * Text wrapping mode
 */
export type TextWrapping = "none" | "square";

/**
 * Text body properties specification
 */
export type TextBodyPropertiesSpec = {
  readonly anchor?: TextAnchor;
  readonly verticalType?: TextVerticalType;
  readonly wrapping?: TextWrapping;
  readonly anchorCenter?: boolean;
  readonly insetLeft?: number;
  readonly insetTop?: number;
  readonly insetRight?: number;
  readonly insetBottom?: number;
};
