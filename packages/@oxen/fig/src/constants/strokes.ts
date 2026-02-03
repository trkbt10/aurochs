/**
 * @file Stroke-related constants for Figma fig format
 */

/** Stroke cap values */
export const STROKE_CAP_VALUES = {
  NONE: 0,
  ROUND: 1,
  SQUARE: 2,
  ARROW_LINES: 3,
  ARROW_EQUILATERAL: 4,
} as const;

export type StrokeCap = keyof typeof STROKE_CAP_VALUES;

/** Stroke join values */
export const STROKE_JOIN_VALUES = {
  MITER: 0,
  BEVEL: 1,
  ROUND: 2,
} as const;

export type StrokeJoin = keyof typeof STROKE_JOIN_VALUES;

/** Stroke align values */
export const STROKE_ALIGN_VALUES = {
  CENTER: 0,
  INSIDE: 1,
  OUTSIDE: 2,
} as const;

export type StrokeAlign = keyof typeof STROKE_ALIGN_VALUES;
