/**
 * @file PNG format constants
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export const TYPE_IHDR = 0x49484452;
export const TYPE_IEND = 0x49454e44;
export const TYPE_IDAT = 0x49444154;
export const TYPE_PLTE = 0x504c5445;
export const TYPE_tRNS = 0x74524e53;
export const TYPE_gAMA = 0x67414d41;

export const COLORTYPE_GRAYSCALE = 0;
export const COLORTYPE_PALETTE = 1;
export const COLORTYPE_COLOR = 2;
export const COLORTYPE_ALPHA = 4;

export const COLORTYPE_PALETTE_COLOR = 3;
export const COLORTYPE_COLOR_ALPHA = 6;

export const COLORTYPE_TO_BPP_MAP: Record<number, number> = {
  0: 1,
  2: 3,
  3: 1,
  4: 2,
  6: 4,
};

export const GAMMA_DIVISION = 100000;
