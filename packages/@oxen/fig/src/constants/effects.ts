/**
 * @file Effect-related constants for Figma fig format
 */

/** Effect type values */
export const EFFECT_TYPE_VALUES = {
  DROP_SHADOW: 0,
  INNER_SHADOW: 1,
  LAYER_BLUR: 2,
  BACKGROUND_BLUR: 3,
} as const;

export type EffectType = keyof typeof EFFECT_TYPE_VALUES;
