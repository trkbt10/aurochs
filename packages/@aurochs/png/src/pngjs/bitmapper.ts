/**
 * @file Bitmap data extraction from filtered PNG data
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

import { getImagePasses, getInterlaceIterator } from "./interlace";

type PixelMapper = (args: { pxData: Uint8Array | Uint16Array; data: Uint8Array; pxPos: number; rawPos: number }) => void;
type PixelCustomMapper = (args: { pxData: Uint8Array | Uint16Array; pixelData: number[]; pxPos: number; maxBit: number }) => void;

const pixelBppMapper: PixelMapper[] = [
  // 0 - dummy
  function () {},
  // 1 - L
  function ({ pxData, data, pxPos, rawPos }) {
    if (rawPos === data.length) { throw new Error("Ran out of data"); }
    const pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = 0xff;
  },
  // 2 - LA
  function ({ pxData, data, pxPos, rawPos }) {
    if (rawPos + 1 >= data.length) { throw new Error("Ran out of data"); }
    const pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = data[rawPos + 1];
  },
  // 3 - RGB
  function ({ pxData, data, pxPos, rawPos }) {
    if (rawPos + 2 >= data.length) { throw new Error("Ran out of data"); }
    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = 0xff;
  },
  // 4 - RGBA
  function ({ pxData, data, pxPos, rawPos }) {
    if (rawPos + 3 >= data.length) { throw new Error("Ran out of data"); }
    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = data[rawPos + 3];
  },
];

const pixelBppCustomMapper: PixelCustomMapper[] = [
  // 0 - dummy
  function () {},
  // 1 - L
  function ({ pxData, pixelData, pxPos, maxBit }) {
    const pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = maxBit;
  },
  // 2 - LA
  function ({ pxData, pixelData, pxPos }) {
    const pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = pixelData[1];
  },
  // 3 - RGB
  function ({ pxData, pixelData, pxPos, maxBit }) {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = maxBit;
  },
  // 4 - RGBA
  function ({ pxData, pixelData, pxPos }) {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = pixelData[3];
  },
];

type BitRetriever = {
  get(count: number): number[];
  resetAfterLine(): void;
  end(): void;
};

function createBitRetriever(data: Uint8Array, depth: number): BitRetriever {
  const state = { leftOver: [] as number[], i: 0 };

  function split(): void {
    if (state.i === data.length) { throw new Error("Ran out of data"); }
    const byte = data[state.i];
    state.i++;
    switch (depth) {
      case 16: {
        const byte2 = data[state.i];
        state.i++;
        state.leftOver.push((byte << 8) + byte2);
        break;
      }
      case 4:
        state.leftOver.push(byte >> 4, byte & 0x0f);
        break;
      case 2:
        state.leftOver.push((byte >> 6) & 3, (byte >> 4) & 3, (byte >> 2) & 3, byte & 3);
        break;
      case 1:
        state.leftOver.push(
          (byte >> 7) & 1, (byte >> 6) & 1, (byte >> 5) & 1, (byte >> 4) & 1,
          (byte >> 3) & 1, (byte >> 2) & 1, (byte >> 1) & 1, byte & 1,
        );
        break;
      default:
        throw new Error("unrecognised depth");
    }
  }

  return {
    get(count: number): number[] {
      while (state.leftOver.length < count) { split(); }
      const returner = state.leftOver.slice(0, count);
      state.leftOver = state.leftOver.slice(count);
      return returner;
    },
    resetAfterLine(): void {
      state.leftOver.length = 0;
    },
    end(): void {
      if (state.i !== data.length) { throw new Error("extra data found"); }
    },
  };
}

type ImageInfo = {
  width: number;
  height: number;
  index?: number;
};

function mapImage8Bit(args: {
  image: ImageInfo;
  pxData: Uint8Array | Uint16Array;
  getPxPos: (x: number, y: number, pass: number) => number;
  bpp: number;
  data: Uint8Array;
  rawPos: number;
}): number {
  const { image, pxData, getPxPos, bpp, data } = args;
  const pos = { current: args.rawPos };
  for (const y of Array.from({ length: image.height }, (_, i) => i)) {
    for (const x of Array.from({ length: image.width }, (_, i) => i)) {
      const pxPos = getPxPos(x, y, image.index ?? 0);
      pixelBppMapper[bpp]({ pxData, data, pxPos, rawPos: pos.current });
      pos.current += bpp;
    }
  }
  return pos.current;
}

function mapImageCustomBit(args: {
  image: ImageInfo;
  pxData: Uint8Array | Uint16Array;
  getPxPos: (x: number, y: number, pass: number) => number;
  bpp: number;
  bits: BitRetriever;
  maxBit: number;
}): void {
  const { image, pxData, getPxPos, bpp, bits, maxBit } = args;
  for (const y of Array.from({ length: image.height }, (_, i) => i)) {
    for (const x of Array.from({ length: image.width }, (_, i) => i)) {
      const pixelData = bits.get(bpp);
      const pxPos = getPxPos(x, y, image.index ?? 0);
      pixelBppCustomMapper[bpp]({ pxData, pixelData, pxPos, maxBit });
    }
    bits.resetAfterLine();
  }
}

export type BitmapInfo = {
  width: number;
  height: number;
  depth: number;
  bpp: number;
  interlace: boolean;
};

function allocatePixelBuffer(width: number, height: number, depth: number): Uint8Array | Uint16Array {
  if (depth <= 8) {
    return new Uint8Array(width * height * 4);
  }
  return new Uint16Array(width * height * 4);
}

function createSequentialIterator(): (x: number, y: number, pass: number) => number {
  const pos = { current: 0 };
  return () => {
    const r = pos.current;
    pos.current += 4;
    return r;
  };
}

/**
 * Convert unfiltered PNG scanline data into a pixel bitmap (RGBA, 4 bytes per pixel).
 */
export function dataToBitMap(data: Uint8Array, bitmapInfo: BitmapInfo): Uint8Array | Uint16Array {
  const { width, height, depth, bpp, interlace } = bitmapInfo;
  const bits = depth !== 8 ? createBitRetriever(data, depth) : undefined;

  const pxData = allocatePixelBuffer(width, height, depth);
  const maxBit = Math.pow(2, depth) - 1;
  const rawPos = { current: 0 };

  const images: ImageInfo[] = interlace ? getImagePasses(width, height) : [{ width, height }];
  const getPxPos = interlace ? getInterlaceIterator(width) : createSequentialIterator();

  for (const image of images) {
    if (depth === 8) {
      rawPos.current = mapImage8Bit({ image, pxData, getPxPos, bpp, data, rawPos: rawPos.current });
    } else {
      mapImageCustomBit({ image, pxData, getPxPos, bpp, bits: bits!, maxBit });
    }
  }

  if (depth === 8) {
    if (rawPos.current !== data.length) { throw new Error("extra data found"); }
  } else {
    bits!.end();
  }

  return pxData;
}
