/**
 * @file Generic color type definitions
 */

/** Color in HSL format */
export type HslColor = {
  h: number;
  s: number;
  l: number;
  a?: number;
};

/** Color in RGB format */
export type RgbColor = {
  r: number;
  g: number;
  b: number;
};
