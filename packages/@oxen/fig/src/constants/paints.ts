/**
 * @file Paint-related constants for Figma fig format
 */

/** Paint type values */
export const PAINT_TYPE_VALUES = {
  SOLID: 0,
  GRADIENT_LINEAR: 1,
  GRADIENT_RADIAL: 2,
  GRADIENT_ANGULAR: 3,
  GRADIENT_DIAMOND: 4,
  IMAGE: 5,
  EMOJI: 6,
  VIDEO: 7,
} as const;

export type PaintType = keyof typeof PAINT_TYPE_VALUES;

/** Blend mode values */
export const BLEND_MODE_VALUES = {
  PASS_THROUGH: 0,
  NORMAL: 1,
  DARKEN: 2,
  MULTIPLY: 3,
  LINEAR_BURN: 4,
  COLOR_BURN: 5,
  LIGHTEN: 6,
  SCREEN: 7,
  LINEAR_DODGE: 8,
  COLOR_DODGE: 9,
  OVERLAY: 10,
  SOFT_LIGHT: 11,
  HARD_LIGHT: 12,
  DIFFERENCE: 13,
  EXCLUSION: 14,
  HUE: 15,
  SATURATION: 16,
  COLOR: 17,
  LUMINOSITY: 18,
} as const;

export type BlendMode = keyof typeof BLEND_MODE_VALUES;

/** Scale mode values for image fills */
export const SCALE_MODE_VALUES = {
  FILL: 0,
  FIT: 1,
  CROP: 2,
  TILE: 3,
} as const;

export type ScaleMode = keyof typeof SCALE_MODE_VALUES;
