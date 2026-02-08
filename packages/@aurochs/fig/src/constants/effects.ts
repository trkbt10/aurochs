/**
 * @file Effect-related constants for Figma fig format
 */

/** Effect type values - matches Figma EffectType enum in schema */
export const EFFECT_TYPE_VALUES = {
  INNER_SHADOW: 0,
  DROP_SHADOW: 1,
  FOREGROUND_BLUR: 2,  // Figma calls it FOREGROUND_BLUR, not LAYER_BLUR
  BACKGROUND_BLUR: 3,
} as const;

export type EffectType = keyof typeof EFFECT_TYPE_VALUES;
