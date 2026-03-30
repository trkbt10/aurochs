/**
 * @file Synchronous PNG parser (decoder)
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

import { inflate } from "pako";
import { createSyncReader } from "./sync-reader";
import { createFilter, type BitmapInfo } from "./filter-parse";
import { createParser, type PngMetadata } from "./parser";
import { dataToBitMap } from "./bitmapper";
import { normaliseFormat } from "./format-normaliser";
import { concatUint8Arrays } from "./buffer-util";

export type ParseOptions = {
  checkCRC?: boolean;
  skipRescale?: boolean;
};

export type ParseResult = {
  width: number;
  height: number;
  depth: number;
  interlace: boolean;
  palette: boolean;
  color: boolean;
  alpha: boolean;
  bpp: number;
  colorType: number;
  data: Uint8Array | Uint16Array;
  gamma: number;
  transColor?: number[];
};

/**
 * Synchronously parse a PNG buffer into pixel data and metadata.
 */
export function parseSync(buffer: Uint8Array, options?: ParseOptions): ParseResult {
  const opts = options || {};
  const state = {
    err: undefined as Error | undefined,
    metaData: undefined as PngMetadata | undefined,
    paletteData: undefined as number[][] | undefined,
    gamma: undefined as number | undefined,
  };
  const inflateDataList: Uint8Array[] = [];

  const reader = createSyncReader(buffer);

  const parser = createParser(opts, {
    read: reader.read,
    error: (e: Error) => { state.err = e; },
    metadata: (m: PngMetadata) => { state.metaData = m; },
    gamma: (g: number) => { state.gamma = g; },
    palette: (p: number[][]) => { state.paletteData = p; },
    transColor: (c: number[]) => { state.metaData!.transColor = c; },
    inflateData: (d: Uint8Array) => { inflateDataList.push(d); },
    simpleTransparency: () => { state.metaData!.alpha = true; },
  });

  parser.start();
  reader.process();

  if (state.err) {
    throw state.err;
  }

  const inflateData = concatUint8Arrays(inflateDataList);
  const inflatedData = inflate(inflateData);

  if (!inflatedData || !inflatedData.length) {
    throw new Error("bad png - invalid inflate data response");
  }

  const md = state.metaData!;
  const bitmapInfo: BitmapInfo = {
    width: md.width,
    height: md.height,
    interlace: md.interlace,
    bpp: md.bpp,
    depth: md.depth,
  };

  const outBuffers: Uint8Array[] = [];
  const filterReader = createSyncReader(inflatedData);
  const filter = createFilter(bitmapInfo, {
    read: filterReader.read,
    write: (bufferPart: Uint8Array) => { outBuffers.push(bufferPart); },
    complete: () => {},
  });

  filter.start();
  filterReader.process();

  const unfilteredData = concatUint8Arrays(outBuffers);
  const bitmapData = dataToBitMap(unfilteredData, bitmapInfo);
  const normalisedBitmapData = normaliseFormat(bitmapData, {
    depth: md.depth,
    width: md.width,
    height: md.height,
    colorType: md.colorType,
    transColor: md.transColor,
    palette: state.paletteData,
  }, opts.skipRescale);

  return {
    width: md.width,
    height: md.height,
    depth: md.depth,
    interlace: md.interlace,
    palette: md.palette,
    color: md.color,
    alpha: md.alpha,
    bpp: md.bpp,
    colorType: md.colorType,
    data: normalisedBitmapData,
    gamma: state.gamma || 0,
    transColor: md.transColor,
  };
}
