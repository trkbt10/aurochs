/**
 * @file PNG filter reversal (decoding)
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

import { getImagePasses } from "./interlace";
import { paethPredictor } from "./paeth-predictor";

function getByteWidth(width: number, bpp: number, depth: number): number {
  const base = width * bpp;
  return depth !== 8 ? Math.ceil(base / (8 / depth)) : base;
}

type ImageInfo = {
  byteWidth: number;
  height: number;
  lineIndex: number;
};

type FilterDependencies = {
  read: (length: number, callback: (data: Uint8Array) => void) => void;
  write: (data: Uint8Array) => void;
  complete: () => void;
};

export type BitmapInfo = {
  width: number;
  height: number;
  interlace: boolean;
  bpp: number;
  depth: number;
};

export type FilterHandle = {
  /** Begin reading and unfiltering scanlines. */
  start: () => void;
};

function buildImages(info: BitmapInfo): ImageInfo[] {
  if (info.interlace) {
    return getImagePasses(info.width, info.height).map((pass) => ({
      byteWidth: getByteWidth(pass.width, info.bpp, info.depth),
      height: pass.height,
      lineIndex: 0,
    }));
  }
  return [{ byteWidth: getByteWidth(info.width, info.bpp, info.depth), height: info.height, lineIndex: 0 }];
}

function computeXComparison(depth: number, bpp: number): number {
  if (depth === 16) { return bpp * 2; }
  if (depth === 8) { return bpp; }
  return 1;
}

/**
 * Create a filter that reverses PNG scanline filters during decoding.
 */
export function createFilter(bitmapInfo: BitmapInfo, deps: FilterDependencies): FilterHandle {
  const images = buildImages(bitmapInfo);
  const xComparison = computeXComparison(bitmapInfo.depth, bitmapInfo.bpp);
  const state = {
    imageIndex: 0,
    lastLine: null as Uint8Array | null,
  };

  function unFilterType1(rawData: Uint8Array, line: Uint8Array, byteWidth: number): void {
    const xBiggerThan = xComparison - 1;
    for (const x of Array.from({ length: byteWidth }, (_, i) => i)) {
      const f1Left = x > xBiggerThan ? line[x - xComparison] : 0;
      line[x] = rawData[1 + x] + f1Left;
    }
  }

  function unFilterType2(rawData: Uint8Array, line: Uint8Array, byteWidth: number): void {
    for (const x of Array.from({ length: byteWidth }, (_, i) => i)) {
      const f2Up = state.lastLine ? state.lastLine[x] : 0;
      line[x] = rawData[1 + x] + f2Up;
    }
  }

  function unFilterType3(rawData: Uint8Array, line: Uint8Array, byteWidth: number): void {
    const xBiggerThan = xComparison - 1;
    for (const x of Array.from({ length: byteWidth }, (_, i) => i)) {
      const f3Up = state.lastLine ? state.lastLine[x] : 0;
      const f3Left = x > xBiggerThan ? line[x - xComparison] : 0;
      line[x] = rawData[1 + x] + Math.floor((f3Left + f3Up) / 2);
    }
  }

  function unFilterType4(rawData: Uint8Array, line: Uint8Array, byteWidth: number): void {
    const xBiggerThan = xComparison - 1;
    for (const x of Array.from({ length: byteWidth }, (_, i) => i)) {
      const f4Up = state.lastLine ? state.lastLine[x] : 0;
      const f4Left = x > xBiggerThan ? line[x - xComparison] : 0;
      const f4UpLeft = x > xBiggerThan && state.lastLine ? state.lastLine[x - xComparison] : 0;
      line[x] = rawData[1 + x] + paethPredictor(f4Left, f4Up, f4UpLeft);
    }
  }

  function applyUnfilter(filter: number, rawData: Uint8Array, byteWidth: number): Uint8Array {
    const line = new Uint8Array(byteWidth);
    switch (filter) {
      case 1: unFilterType1(rawData, line, byteWidth); break;
      case 2: unFilterType2(rawData, line, byteWidth); break;
      case 3: unFilterType3(rawData, line, byteWidth); break;
      case 4: unFilterType4(rawData, line, byteWidth); break;
      default: throw new Error("Unrecognised filter type - " + filter);
    }
    return line;
  }

  function buildUnfilteredLine(filter: number, rawData: Uint8Array, byteWidth: number): Uint8Array {
    if (filter === 0) { return rawData.slice(1, byteWidth + 1); }
    return applyUnfilter(filter, rawData, byteWidth);
  }

  function reverseFilterLine(rawData: Uint8Array): void {
    const currentImage = images[state.imageIndex];
    const byteWidth = currentImage.byteWidth;
    const filter = rawData[0];

    const unfilteredLine = buildUnfilteredLine(filter, rawData, byteWidth);

    deps.write(unfilteredLine);

    currentImage.lineIndex++;
    if (currentImage.lineIndex >= currentImage.height) {
      state.lastLine = null;
      state.imageIndex++;
    } else {
      state.lastLine = unfilteredLine;
    }

    const nextImage = images[state.imageIndex];
    if (nextImage) {
      deps.read(nextImage.byteWidth + 1, reverseFilterLine);
    } else {
      state.lastLine = null;
      deps.complete();
    }
  }

  return {
    start(): void {
      deps.read(images[state.imageIndex].byteWidth + 1, reverseFilterLine);
    },
  };
}
