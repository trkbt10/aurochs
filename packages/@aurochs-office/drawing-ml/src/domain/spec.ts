/**
 * @file DrawingML Input Specification Types
 *
 * Simplified input representations for DrawingML elements.
 * Used by builders, CLIs, and APIs as the external interface for creating
 * DrawingML structures.
 *
 * These types are the authoritative definitions, co-located with
 * domain types in @aurochs-office/drawing-ml (SoT for DrawingML).
 *
 * Relationship to domain types:
 * - Domain types (Color, BaseFill, etc.) are ECMA-376 faithful internal representations
 * - Input specs are simplified external representations for construction
 * - Conversion: InputSpec → domain (builder functions) / domain → InputSpec (toSpec functions)
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

import type { SchemeColorValue } from "./color";
import type { PatternType, TileFlipMode, RectAlignment } from "./fill";
import type { LineCap, CompoundLine, LineJoin } from "./line";

// =============================================================================
// Color Input Types
// =============================================================================

/**
 * Theme color input with optional luminance modifiers.
 * @see ECMA-376 Part 1, Section 20.1.2.3.29 (schemeClr)
 */
export type ThemeColorInput = {
  readonly theme: SchemeColorValue;
  readonly lumMod?: number;
  readonly lumOff?: number;
  readonly tint?: number;
  readonly shade?: number;
  readonly satMod?: number;
  readonly alpha?: number;
};

/**
 * Simplified color input — hex string or theme color reference.
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */
export type ColorInput = string | ThemeColorInput;

/**
 * Check if a color input is a theme color.
 */
export function isThemeColorInput(color: ColorInput): color is ThemeColorInput {
  return typeof color === "object" && "theme" in color;
}

// =============================================================================
// Fill Input Types
// =============================================================================

/**
 * Gradient stop input.
 * @see ECMA-376 Part 1, Section 20.1.8.36 (gs)
 */
export type GradientStopInput = {
  readonly position: number;
  readonly color: ColorInput;
};

/**
 * Gradient fill input.
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */
export type GradientFillInput = {
  readonly type: "gradient";
  readonly gradientType: "linear" | "radial" | "path";
  readonly angle?: number;
  readonly stops: readonly GradientStopInput[];
};

/**
 * Pattern fill input.
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */
export type PatternFillInput = {
  readonly type: "pattern";
  readonly preset: PatternType;
  readonly fgColor: ColorInput;
  readonly bgColor: ColorInput;
};

/**
 * Solid fill input (explicit).
 * @see ECMA-376 Part 1, Section 20.1.8.54 (solidFill)
 */
export type SolidFillInput = {
  readonly type: "solid";
  readonly color: ColorInput;
};

/**
 * Theme fill input (shorthand for solid theme color fill).
 */
export type ThemeFillInput = {
  readonly type: "theme";
  readonly theme: SchemeColorValue;
  readonly lumMod?: number;
  readonly lumOff?: number;
  readonly tint?: number;
  readonly shade?: number;
};

// TileFlipMode and RectAlignment are imported from ./fill (SoT)

/**
 * Blip compression state.
 * @see ECMA-376 Part 1, Section 20.1.10.12 (ST_BlipCompression)
 */
export type BlipCompressionState = "none" | "print" | "screen" | "email" | "hqprint";

/**
 * Blip fill (image fill) input.
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type BlipFillInput = {
  readonly resourceId: string;
  readonly sourceRect?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly dpi?: number;
  readonly rotWithShape?: boolean;
  readonly compressionState?: BlipCompressionState;
  readonly tile?: {
    readonly flip?: TileFlipMode;
    readonly scaleX?: number;
    readonly scaleY?: number;
    readonly offsetX?: number;
    readonly offsetY?: number;
    readonly alignment?: RectAlignment;
  };
};

/**
 * Fill input union type.
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type FillInput = string | SolidFillInput | GradientFillInput | PatternFillInput | ThemeFillInput | BlipFillInput;

// =============================================================================
// Line Input Types
// =============================================================================

/**
 * Line end type values.
 * @see ECMA-376 Part 1, Section 20.1.10.29 (ST_LineEndType)
 */
export type LineEndType = "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";

/**
 * Line end size values.
 * @see ECMA-376 Part 1, Section 20.1.10.28 (ST_LineEndWidth/Length)
 */
export type LineEndSize = "sm" | "med" | "lg";

/**
 * Line end input.
 * @see ECMA-376 Part 1, Section 20.1.8.22 (headEnd/tailEnd)
 */
export type LineEndInput = {
  readonly type: LineEndType;
  readonly width?: LineEndSize;
  readonly length?: LineEndSize;
};

/**
 * Preset dash style values.
 * @see ECMA-376 Part 1, Section 20.1.10.48 (ST_PresetLineDashVal)
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
 * Line input.
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */
export type LineInput = {
  readonly color: ColorInput;
  readonly width: number;
  readonly dash?: DashStyle;
  readonly cap?: LineCap;
  readonly join?: LineJoin;
  readonly compound?: CompoundLine;
  readonly headEnd?: LineEndInput;
  readonly tailEnd?: LineEndInput;
};

// =============================================================================
// Effect Input Types
// =============================================================================

/**
 * Shadow effect input.
 * @see ECMA-376 Part 1, Section 20.1.8.42 (outerShdw)
 */
export type ShadowEffectInput = {
  readonly color: string;
  readonly blur?: number;
  readonly distance?: number;
  readonly direction?: number;
};

/**
 * Glow effect input.
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
export type GlowEffectInput = {
  readonly color: string;
  readonly radius: number;
};

/**
 * Soft edge effect input.
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
export type SoftEdgeEffectInput = {
  readonly radius: number;
};

/**
 * Reflection effect input.
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
export type ReflectionEffectInput = {
  readonly blurRadius?: number;
  readonly startOpacity?: number;
  readonly endOpacity?: number;
  readonly distance?: number;
  readonly direction?: number;
  readonly fadeDirection?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
};

/**
 * Combined effects input.
 * @see ECMA-376 Part 1, Section 20.1.8.25 (effectLst)
 */
export type EffectsInput = {
  readonly shadow?: ShadowEffectInput;
  readonly glow?: GlowEffectInput;
  readonly softEdge?: SoftEdgeEffectInput;
  readonly reflection?: ReflectionEffectInput;
};

// =============================================================================
// 3D Types
// =============================================================================

/**
 * Bevel preset type.
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
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
 * Preset material type.
 * @see ECMA-376 Part 1, Section 20.1.10.49 (ST_PresetMaterialType)
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
 * Bevel input.
 * @see ECMA-376 Part 1, Section 20.1.10.9 (bevel)
 */
export type BevelInput = {
  readonly preset?: BevelPresetType;
  readonly width?: number;
  readonly height?: number;
};

/**
 * 3D shape properties input.
 * @see ECMA-376 Part 1, Section 20.1.5.6 (sp3d)
 */
export type Shape3dInput = {
  readonly bevelTop?: BevelInput;
  readonly bevelBottom?: BevelInput;
  readonly material?: PresetMaterialType;
  readonly extrusionHeight?: number;
};

// =============================================================================
// Text Input Types
// =============================================================================

/**
 * Text alignment.
 * @see ECMA-376 Part 1, Section 20.1.10.59 (ST_TextAlignType)
 */
export type TextAlign = "left" | "center" | "right" | "justify" | "distributed";

/**
 * Text vertical anchor.
 * @see ECMA-376 Part 1, Section 20.1.10.60 (ST_TextAnchoringType)
 */
export type TextAnchor = "top" | "center" | "bottom";

/**
 * Text vertical type (orientation).
 * @see ECMA-376 Part 1, Section 20.1.10.69 (ST_TextVerticalType)
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
 * Underline style.
 * @see ECMA-376 Part 1, Section 20.1.10.82 (ST_TextUnderlineType)
 */
export type UnderlineStyle = "none" | "single" | "double" | "heavy" | "dotted" | "dashed" | "wavy";

/**
 * Strikethrough style.
 * @see ECMA-376 Part 1, Section 20.1.10.78 (ST_TextStrikeType)
 */
export type StrikeStyle = "noStrike" | "single" | "double";

/**
 * Text caps style.
 * @see ECMA-376 Part 1, Section 20.1.10.64 (ST_TextCapsType)
 */
export type TextCaps = "none" | "all" | "small";

/**
 * Text vertical position (superscript/subscript).
 */
export type TextVerticalPosition = "normal" | "superscript" | "subscript";

/**
 * Bullet type.
 * @see ECMA-376 Part 1, Section 21.1.2.4.6 (buChar / buAutoNum / buNone)
 */
export type BulletType = "none" | "char" | "autoNum";

/**
 * Bullet input.
 */
export type BulletInput = {
  readonly type: BulletType;
  readonly char?: string;
  readonly autoNumType?: string;
};

/**
 * Text outline input.
 */
export type TextOutlineInput = {
  readonly color: string;
  readonly width?: number;
};

/**
 * Text effect input (shadow, glow for text).
 */
export type TextEffectInput = {
  readonly shadow?: ShadowEffectInput;
  readonly glow?: GlowEffectInput;
};

/**
 * Hyperlink input.
 * @see ECMA-376 Part 1, Section 21.1.2.3.5 (hlinkClick)
 */
export type HyperlinkInput = {
  readonly url: string;
  readonly tooltip?: string;
};

/**
 * Text run input — a portion of text with specific formatting.
 * @see ECMA-376 Part 1, Section 21.1.2.3.8 (r)
 */
export type TextRunInput = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly strikethrough?: StrikeStyle;
  readonly caps?: TextCaps;
  readonly verticalPosition?: TextVerticalPosition;
  readonly letterSpacing?: number;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly color?: string;
  readonly outline?: TextOutlineInput;
  readonly effects?: TextEffectInput;
  readonly hyperlink?: HyperlinkInput;
};

/**
 * Line spacing input.
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (lnSpc)
 */
export type LineSpacingInput =
  | { readonly type: "percent"; readonly value: number }
  | { readonly type: "points"; readonly value: number };

/**
 * Text paragraph input.
 * @see ECMA-376 Part 1, Section 21.1.2.2.6 (pPr)
 */
export type TextParagraphInput = {
  readonly runs: readonly TextRunInput[];
  readonly alignment?: TextAlign;
  readonly bullet?: BulletInput;
  readonly level?: number;
  readonly lineSpacing?: LineSpacingInput;
  readonly spaceBefore?: number;
  readonly spaceAfter?: number;
  readonly indent?: number;
  readonly marginLeft?: number;
};

/**
 * Rich text body input — array of paragraphs.
 */
export type RichTextInput = readonly TextParagraphInput[];

/**
 * Text input — can be simple string or rich text.
 */
export type TextInput = string | RichTextInput;

/**
 * Text wrapping mode.
 * @see ECMA-376 Part 1, Section 20.1.10.85 (ST_TextWrappingType)
 */
export type TextWrapping = "none" | "square";

/**
 * Text body properties input.
 * @see ECMA-376 Part 1, Section 21.1.2.1.1 (bodyPr)
 */
export type TextBodyPropertiesInput = {
  readonly anchor?: TextAnchor;
  readonly verticalType?: TextVerticalType;
  readonly wrapping?: TextWrapping;
  readonly anchorCenter?: boolean;
  readonly insetLeft?: number;
  readonly insetTop?: number;
  readonly insetRight?: number;
  readonly insetBottom?: number;
};
