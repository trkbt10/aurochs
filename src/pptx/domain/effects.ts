/**
 * @file Effect types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Effects
 */

import type { Degrees, Percent, Pixels } from "./types";
import type { Color } from "./color";
import type { FillEffectType } from "./appearance";

// =============================================================================
// Effect Container Types
// =============================================================================

/**
 * Effect container relationship type
 * @see ECMA-376 Part 1, Section 20.1.10.22 (ST_EffectContainerType)
 */
export type EffectContainerType = "sib" | "tree";

/**
 * Effect container
 * @see ECMA-376 Part 1, Section 20.1.8.20 (cont)
 */
export type EffectContainer = {
  readonly name?: string;
  readonly type?: EffectContainerType;
};

/**
 * Blend mode values
 * @see ECMA-376 Part 1, Section 20.1.10.11 (ST_BlendMode)
 */
export type BlendMode = "over" | "mult" | "screen" | "darken" | "lighten";

// =============================================================================
// Shadow Effects
// =============================================================================

/**
 * Shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
export type ShadowEffect = {
  readonly type: "outer" | "inner";
  readonly color: Color;
  readonly blurRadius: Pixels;
  readonly distance: Pixels;
  readonly direction: Degrees;
  readonly alignment?: string;
};

/**
 * Preset shadow values
 * @see ECMA-376 Part 1, Section 20.1.10.52 (ST_PresetShadowVal)
 */
export type PresetShadowValue =
  | "shdw1"
  | "shdw2"
  | "shdw3"
  | "shdw4"
  | "shdw5"
  | "shdw6"
  | "shdw7"
  | "shdw8"
  | "shdw9"
  | "shdw10"
  | "shdw11"
  | "shdw12"
  | "shdw13"
  | "shdw14"
  | "shdw15"
  | "shdw16"
  | "shdw17"
  | "shdw18"
  | "shdw19"
  | "shdw20";

/**
 * Preset shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.49 (prstShdw)
 */
export type PresetShadowEffect = {
  readonly type: "preset";
  readonly preset: PresetShadowValue;
  readonly color: Color;
  readonly direction: Degrees;
  readonly distance: Pixels;
};

// =============================================================================
// Glow and Reflection Effects
// =============================================================================

/**
 * Glow effect
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
export type GlowEffect = {
  readonly color: Color;
  readonly radius: Pixels;
};

/**
 * Reflection effect
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
export type ReflectionEffect = {
  readonly blurRadius: Pixels;
  readonly startOpacity: Percent;
  readonly endOpacity: Percent;
  readonly distance: Pixels;
  readonly direction: Degrees;
  readonly fadeDirection: Degrees;
  readonly scaleX: Percent;
  readonly scaleY: Percent;
};

/**
 * Soft edge effect
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
export type SoftEdgeEffect = {
  readonly radius: Pixels;
};

// =============================================================================
// Alpha Effects
// =============================================================================

/**
 * Alpha bi-level effect
 * @see ECMA-376 Part 1, Section 20.1.8.1 (alphaBiLevel)
 */
export type AlphaBiLevelEffect = {
  readonly threshold: Percent;
};

/**
 * Alpha ceiling effect
 * @see ECMA-376 Part 1, Section 20.1.8.2 (alphaCeiling)
 */
export type AlphaCeilingEffect = {
  readonly type: "alphaCeiling";
};

/**
 * Alpha floor effect
 * @see ECMA-376 Part 1, Section 20.1.8.3 (alphaFloor)
 */
export type AlphaFloorEffect = {
  readonly type: "alphaFloor";
};

/**
 * Alpha inverse effect
 * @see ECMA-376 Part 1, Section 20.1.8.4 (alphaInv)
 */
export type AlphaInverseEffect = {
  readonly type: "alphaInv";
};

/**
 * Alpha modulate effect
 * @see ECMA-376 Part 1, Section 20.1.8.5 (alphaMod)
 */
export type AlphaModulateEffect = {
  readonly type: "alphaMod";
  readonly containerType?: "sib" | "tree";
  readonly name?: string;
  readonly container?: EffectContainer;
};

/**
 * Alpha modulate fixed effect
 * @see ECMA-376 Part 1, Section 20.1.8.6 (alphaModFix)
 */
export type AlphaModulateFixedEffect = {
  readonly amount: Percent;
};

/**
 * Alpha outset/inset effect
 * @see ECMA-376 Part 1, Section 20.1.8.7 (alphaOutset)
 */
export type AlphaOutsetEffect = {
  readonly radius: Pixels;
};

/**
 * Alpha replace effect
 * @see ECMA-376 Part 1, Section 20.1.8.8 (alphaRepl)
 */
export type AlphaReplaceEffect = {
  readonly alpha: Percent;
};

// =============================================================================
// Color Effects
// =============================================================================

/**
 * Bi-level (black/white) effect
 * @see ECMA-376 Part 1, Section 20.1.8.11 (biLevel)
 */
export type BiLevelEffect = {
  readonly threshold: Percent;
};

/**
 * Blend effect
 * @see ECMA-376 Part 1, Section 20.1.8.12 (blend)
 */
export type BlendEffect = {
  readonly type: "blend";
  readonly blend: BlendMode;
  readonly containerType?: EffectContainerType;
  readonly name?: string;
  readonly container?: EffectContainer;
};

/**
 * Color change effect
 * @see ECMA-376 Part 1, Section 20.1.8.16 (clrChange)
 */
export type ColorChangeEffect = {
  readonly from: Color;
  readonly to: Color;
  readonly useAlpha: boolean;
};

/**
 * Color replace effect
 * @see ECMA-376 Part 1, Section 20.1.8.18 (clrRepl)
 */
export type ColorReplaceEffect = {
  readonly color: Color;
};

/**
 * Duotone effect
 * @see ECMA-376 Part 1, Section 20.1.8.23 (duotone)
 */
export type DuotoneEffect = {
  readonly colors: readonly [Color, Color];
};

/**
 * Fill overlay effect
 * @see ECMA-376 Part 1, Section 20.1.8.29 (fillOverlay)
 */
export type FillOverlayEffect = {
  readonly blend: BlendMode;
  readonly fillType: FillEffectType;
};

/**
 * Gray scale effect
 * @see ECMA-376 Part 1, Section 20.1.8.34 (grayscl)
 */
export type GrayscaleEffect = {
  readonly type: "grayscl";
};

/**
 * Relative offset effect
 * @see ECMA-376 Part 1, Section 20.1.8.51 (relOff)
 */
export type RelativeOffsetEffect = {
  readonly offsetX: Percent;
  readonly offsetY: Percent;
};

// =============================================================================
// Combined Effects Container
// =============================================================================

/**
 * Combined effects container
 */
export type Effects = {
  readonly shadow?: ShadowEffect;
  readonly glow?: GlowEffect;
  readonly reflection?: ReflectionEffect;
  readonly softEdge?: SoftEdgeEffect;
  readonly alphaBiLevel?: AlphaBiLevelEffect;
  readonly alphaCeiling?: AlphaCeilingEffect;
  readonly alphaFloor?: AlphaFloorEffect;
  readonly alphaInv?: AlphaInverseEffect;
  readonly alphaMod?: AlphaModulateEffect;
  readonly alphaModFix?: AlphaModulateFixedEffect;
  readonly alphaOutset?: AlphaOutsetEffect;
  readonly alphaRepl?: AlphaReplaceEffect;
  readonly biLevel?: BiLevelEffect;
  readonly blend?: BlendEffect;
  readonly colorChange?: ColorChangeEffect;
  readonly colorReplace?: ColorReplaceEffect;
  readonly duotone?: DuotoneEffect;
  readonly fillOverlay?: FillOverlayEffect;
  readonly grayscale?: GrayscaleEffect;
  readonly presetShadow?: PresetShadowEffect;
  readonly relativeOffset?: RelativeOffsetEffect;
};
