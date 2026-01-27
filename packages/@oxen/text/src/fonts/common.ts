/**
 * @file Common character width and kerning data shared across fonts
 */

import type { CharWidthMap, KerningPairMap } from "./types";

/**
 * Common narrow Latin characters (width ~0.2-0.35 em)
 */
export const NARROW_CHARS: CharWidthMap = {
  i: 0.25,
  l: 0.25,
  I: 0.3,
  j: 0.28,
  f: 0.32,
  t: 0.32,
  r: 0.35,
  "!": 0.3,
  ".": 0.25,
  ",": 0.25,
  ":": 0.28,
  ";": 0.28,
  "'": 0.2,
  '"': 0.35,
  "`": 0.28,
  "|": 0.25,
};

/**
 * Common wide Latin characters (width ~0.65-0.95 em)
 */
export const WIDE_CHARS: CharWidthMap = {
  w: 0.78,
  W: 0.95,
  m: 0.78,
  M: 0.85,
  O: 0.75,
  Q: 0.78,
  D: 0.72,
  G: 0.75,
  H: 0.72,
  N: 0.72,
  U: 0.72,
  "@": 0.9,
  "%": 0.8,
  "&": 0.72,
};

/**
 * Common medium Latin characters (width ~0.45-0.6 em)
 */
export const MEDIUM_CHARS: CharWidthMap = {
  a: 0.52,
  b: 0.55,
  c: 0.5,
  d: 0.55,
  e: 0.52,
  g: 0.55,
  h: 0.55,
  k: 0.52,
  n: 0.55,
  o: 0.55,
  p: 0.55,
  q: 0.55,
  s: 0.48,
  u: 0.55,
  v: 0.52,
  x: 0.52,
  y: 0.52,
  z: 0.48,
  A: 0.65,
  B: 0.65,
  C: 0.68,
  E: 0.62,
  F: 0.58,
  J: 0.52,
  K: 0.65,
  L: 0.55,
  P: 0.6,
  R: 0.65,
  S: 0.6,
  T: 0.58,
  V: 0.65,
  X: 0.65,
  Y: 0.62,
  Z: 0.6,
};

/**
 * Number character widths
 */
export const NUMBER_CHARS: CharWidthMap = {
  "0": 0.55,
  "1": 0.35,
  "2": 0.55,
  "3": 0.55,
  "4": 0.55,
  "5": 0.55,
  "6": 0.55,
  "7": 0.5,
  "8": 0.55,
  "9": 0.55,
};

/**
 * Default character widths combining all common categories
 */
export const DEFAULT_CHAR_WIDTHS: CharWidthMap = {
  ...NARROW_CHARS,
  ...MEDIUM_CHARS,
  ...WIDE_CHARS,
  ...NUMBER_CHARS,
  " ": 0.25,
  "-": 0.35,
  _: 0.5,
  "=": 0.55,
  "+": 0.55,
  "*": 0.4,
  "/": 0.35,
  "\\": 0.35,
  "(": 0.35,
  ")": 0.35,
  "[": 0.32,
  "]": 0.32,
  "{": 0.38,
  "}": 0.38,
  "<": 0.55,
  ">": 0.55,
  "?": 0.5,
  "#": 0.55,
  $: 0.55,
  "^": 0.45,
  "~": 0.55,
};

/**
 * Common kerning pairs for Latin text
 */
export const COMMON_KERNING_PAIRS: KerningPairMap = {
  AV: -0.08,
  AW: -0.06,
  AT: -0.08,
  AY: -0.08,
  Av: -0.06,
  Aw: -0.04,
  Ay: -0.06,
  FA: -0.06,
  LT: -0.08,
  LV: -0.08,
  LW: -0.06,
  LY: -0.08,
  PA: -0.06,
  TA: -0.08,
  Ta: -0.06,
  Te: -0.04,
  To: -0.06,
  Tr: -0.04,
  Ty: -0.06,
  VA: -0.08,
  Va: -0.06,
  Ve: -0.04,
  Vo: -0.06,
  Vy: -0.04,
  WA: -0.06,
  Wa: -0.04,
  We: -0.02,
  Wo: -0.04,
  YA: -0.08,
  Ya: -0.06,
  Ye: -0.04,
  Yo: -0.06,
  ff: -0.02,
  fi: -0.02,
  fl: -0.02,
  ry: -0.02,
};

/**
 * Sans-serif specific kerning adjustments
 */
export const SANS_SERIF_KERNING: KerningPairMap = {
  ...COMMON_KERNING_PAIRS,
  // Slightly tighter for sans-serif
  AV: -0.1,
  AT: -0.1,
  AY: -0.1,
  LT: -0.1,
  TA: -0.1,
  VA: -0.1,
};

/**
 * Serif specific kerning adjustments
 */
export const SERIF_KERNING: KerningPairMap = {
  ...COMMON_KERNING_PAIRS,
  // Additional pairs for serif fonts
  AC: -0.02,
  AG: -0.02,
  AO: -0.02,
  AQ: -0.02,
  AU: -0.02,
};
