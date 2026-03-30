/**
 * @file PNG filter encoding (applying filters before compression)
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

import { paethPredictor } from "./paeth-predictor";

type FilterArgs = {
  pxData: Uint8Array;
  pxPos: number;
  byteWidth: number;
  rawData: Uint8Array;
  rawPos: number;
  bpp: number;
};

type FilterSumArgs = {
  pxData: Uint8Array;
  pxPos: number;
  byteWidth: number;
  bpp: number;
};

function filterNone(args: FilterArgs): void {
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    args.rawData[args.rawPos + x] = args.pxData[args.pxPos + x];
  }
}

function filterSumNone(args: FilterSumArgs): number {
  const sum = { current: 0 };
  const length = args.pxPos + args.byteWidth;
  for (const i of Array.from({ length: args.byteWidth }, (_, j) => args.pxPos + j)) {
    if (i < length) {
      sum.current += Math.abs(args.pxData[i]);
    }
  }
  return sum.current;
}

function filterSub(args: FilterArgs): void {
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const left = x >= args.bpp ? args.pxData[args.pxPos + x - args.bpp] : 0;
    args.rawData[args.rawPos + x] = args.pxData[args.pxPos + x] - left;
  }
}

function filterSumSub(args: FilterSumArgs): number {
  const sum = { current: 0 };
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const left = x >= args.bpp ? args.pxData[args.pxPos + x - args.bpp] : 0;
    sum.current += Math.abs(args.pxData[args.pxPos + x] - left);
  }
  return sum.current;
}

function filterUp(args: FilterArgs): void {
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const up = args.pxPos > 0 ? args.pxData[args.pxPos + x - args.byteWidth] : 0;
    args.rawData[args.rawPos + x] = args.pxData[args.pxPos + x] - up;
  }
}

function filterSumUp(args: FilterSumArgs): number {
  const sum = { current: 0 };
  for (const x of Array.from({ length: args.byteWidth }, (_, j) => args.pxPos + j)) {
    const up = args.pxPos > 0 ? args.pxData[x - args.byteWidth] : 0;
    sum.current += Math.abs(args.pxData[x] - up);
  }
  return sum.current;
}

function filterAvg(args: FilterArgs): void {
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const left = x >= args.bpp ? args.pxData[args.pxPos + x - args.bpp] : 0;
    const up = args.pxPos > 0 ? args.pxData[args.pxPos + x - args.byteWidth] : 0;
    args.rawData[args.rawPos + x] = args.pxData[args.pxPos + x] - ((left + up) >> 1);
  }
}

function filterSumAvg(args: FilterSumArgs): number {
  const sum = { current: 0 };
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const left = x >= args.bpp ? args.pxData[args.pxPos + x - args.bpp] : 0;
    const up = args.pxPos > 0 ? args.pxData[args.pxPos + x - args.byteWidth] : 0;
    sum.current += Math.abs(args.pxData[args.pxPos + x] - ((left + up) >> 1));
  }
  return sum.current;
}

function filterPaeth(args: FilterArgs): void {
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const left = x >= args.bpp ? args.pxData[args.pxPos + x - args.bpp] : 0;
    const up = args.pxPos > 0 ? args.pxData[args.pxPos + x - args.byteWidth] : 0;
    const upleft = args.pxPos > 0 && x >= args.bpp ? args.pxData[args.pxPos + x - (args.byteWidth + args.bpp)] : 0;
    args.rawData[args.rawPos + x] = args.pxData[args.pxPos + x] - paethPredictor(left, up, upleft);
  }
}

function filterSumPaeth(args: FilterSumArgs): number {
  const sum = { current: 0 };
  for (const x of Array.from({ length: args.byteWidth }, (_, i) => i)) {
    const left = x >= args.bpp ? args.pxData[args.pxPos + x - args.bpp] : 0;
    const up = args.pxPos > 0 ? args.pxData[args.pxPos + x - args.byteWidth] : 0;
    const upleft = args.pxPos > 0 && x >= args.bpp ? args.pxData[args.pxPos + x - (args.byteWidth + args.bpp)] : 0;
    sum.current += Math.abs(args.pxData[args.pxPos + x] - paethPredictor(left, up, upleft));
  }
  return sum.current;
}

type FilterFn = (args: FilterArgs) => void;
type FilterSumFn = (args: FilterSumArgs) => number;

const filters: Record<number, FilterFn> = {
  0: filterNone,
  1: filterSub,
  2: filterUp,
  3: filterAvg,
  4: filterPaeth,
};

const filterSums: Record<number, FilterSumFn> = {
  0: filterSumNone,
  1: filterSumSub,
  2: filterSumUp,
  3: filterSumAvg,
  4: filterSumPaeth,
};

type FilterDataArgs = {
  pxData: Uint8Array;
  width: number;
  height: number;
  options: FilterOptions;
  bpp: number;
};

type FilterOptions = {
  filterType?: number;
  bitDepth?: number;
};

/**
 * Apply PNG row filters to pixel data before compression.
 * Selects the optimal filter per scanline when filterType is -1 (auto).
 */
export function filterData(args: FilterDataArgs): Uint8Array {
  const filterTypes = resolveFilterTypes(args.options);

  const effectiveBpp = args.options.bitDepth === 16 ? args.bpp * 2 : args.bpp;
  const byteWidth = args.width * effectiveBpp;
  const pos = { rawPos: 0, pxPos: 0 };
  const rawData = new Uint8Array((byteWidth + 1) * args.height);
  const sel = { current: filterTypes[0] };

  for (const _ of Array.from({ length: args.height })) {
    void _;
    if (filterTypes.length > 1) {
      const min = { current: Infinity };
      for (const ft of filterTypes) {
        const sum = filterSums[ft]({ pxData: args.pxData, pxPos: pos.pxPos, byteWidth, bpp: effectiveBpp });
        if (sum < min.current) {
          sel.current = ft;
          min.current = sum;
        }
      }
    }

    rawData[pos.rawPos] = sel.current;
    pos.rawPos++;
    filters[sel.current]({
      pxData: args.pxData,
      pxPos: pos.pxPos,
      byteWidth,
      rawData,
      rawPos: pos.rawPos,
      bpp: effectiveBpp,
    });
    pos.rawPos += byteWidth;
    pos.pxPos += byteWidth;
  }
  return rawData;
}

function resolveFilterTypes(options: FilterOptions): number[] {
  if (!("filterType" in options) || options.filterType === -1) {
    return [0, 1, 2, 3, 4];
  }
  if (typeof options.filterType === "number") {
    return [options.filterType];
  }
  throw new Error("unrecognised filter types");
}
