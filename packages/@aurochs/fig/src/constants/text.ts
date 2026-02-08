/**
 * @file Text-related constants for Figma fig format
 */

/** Text horizontal alignment values */
export const TEXT_ALIGN_H_VALUES = {
  LEFT: 0,
  CENTER: 1,
  RIGHT: 2,
  JUSTIFIED: 3,
} as const;

export type TextAlignHorizontal = keyof typeof TEXT_ALIGN_H_VALUES;

/** Text vertical alignment values */
export const TEXT_ALIGN_V_VALUES = {
  TOP: 0,
  CENTER: 1,
  BOTTOM: 2,
} as const;

export type TextAlignVertical = keyof typeof TEXT_ALIGN_V_VALUES;

/** Text auto resize values */
export const TEXT_AUTO_RESIZE_VALUES = {
  NONE: 0,
  WIDTH_AND_HEIGHT: 1,
  HEIGHT: 2,
} as const;

export type TextAutoResize = keyof typeof TEXT_AUTO_RESIZE_VALUES;

/** Text decoration values */
export const TEXT_DECORATION_VALUES = {
  NONE: 0,
  UNDERLINE: 1,
  STRIKETHROUGH: 2,
} as const;

export type TextDecoration = keyof typeof TEXT_DECORATION_VALUES;

/** Text case values */
export const TEXT_CASE_VALUES = {
  ORIGINAL: 0,
  UPPER: 1,
  LOWER: 2,
  TITLE: 3,
  SMALL_CAPS: 4,
  SMALL_CAPS_FORCED: 5,
} as const;

export type TextCase = keyof typeof TEXT_CASE_VALUES;

/** Number units values */
export const NUMBER_UNITS_VALUES = {
  RAW: 0,
  PIXELS: 1,
  PERCENT: 2,
} as const;

export type NumberUnits = keyof typeof NUMBER_UNITS_VALUES;
