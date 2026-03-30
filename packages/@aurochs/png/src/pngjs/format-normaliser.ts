/**
 * @file Format normalization (palette expansion, transparency, depth scaling)
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

type PixelBufferArgs = {
  indata: Uint8Array | Uint16Array;
  outdata: Uint8Array | Uint16Array;
  width: number;
  height: number;
};

function dePalette(args: PixelBufferArgs & { palette: number[][] }): void {
  const { indata, outdata, width, height, palette } = args;
  const pos = { current: 0 };
  for (const _y of Array.from({ length: height })) {
    void _y;
    for (const _x of Array.from({ length: width })) {
      void _x;
      const color = palette[indata[pos.current]];
      if (!color) { throw new Error("index " + indata[pos.current] + " not in palette"); }
      outdata[pos.current] = color[0];
      outdata[pos.current + 1] = color[1];
      outdata[pos.current + 2] = color[2];
      outdata[pos.current + 3] = color[3];
      pos.current += 4;
    }
  }
}

function checkTransparent(indata: Uint8Array | Uint16Array, pxPos: number, transColor: number[]): boolean {
  if (transColor.length === 1) {
    return transColor[0] === indata[pxPos];
  }
  return transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2];
}

function replaceTransparentColor(args: PixelBufferArgs & { transColor: number[] }): void {
  const { indata, outdata, width, height, transColor } = args;
  const pos = { current: 0 };
  for (const _y of Array.from({ length: height })) {
    void _y;
    for (const _x of Array.from({ length: width })) {
      void _x;
      const isTransparent = checkTransparent(indata, pos.current, transColor);

      if (isTransparent) {
        outdata[pos.current] = 0;
        outdata[pos.current + 1] = 0;
        outdata[pos.current + 2] = 0;
        outdata[pos.current + 3] = 0;
      }
      pos.current += 4;
    }
  }
}

function scaleDepth(args: PixelBufferArgs & { depth: number }): void {
  const { indata, outdata, width, height, depth } = args;
  const maxOutSample = 255;
  const maxInSample = Math.pow(2, depth) - 1;
  const pos = { current: 0 };

  for (const _y of Array.from({ length: height })) {
    void _y;
    for (const _x of Array.from({ length: width })) {
      void _x;
      outdata[pos.current] = Math.floor((indata[pos.current] * maxOutSample) / maxInSample + 0.5);
      outdata[pos.current + 1] = Math.floor((indata[pos.current + 1] * maxOutSample) / maxInSample + 0.5);
      outdata[pos.current + 2] = Math.floor((indata[pos.current + 2] * maxOutSample) / maxInSample + 0.5);
      outdata[pos.current + 3] = Math.floor((indata[pos.current + 3] * maxOutSample) / maxInSample + 0.5);
      pos.current += 4;
    }
  }
}

export type NormaliseImageData = {
  depth: number;
  width: number;
  height: number;
  colorType: number;
  transColor?: number[];
  palette?: number[][];
};

/**
 * Normalize decoded pixel data: expand palettes, apply transparency, and scale bit depth.
 */
export function normaliseFormat(
  indata: Uint8Array | Uint16Array, imageData: NormaliseImageData, skipRescale = false,
): Uint8Array | Uint16Array {
  const { depth, width, height, colorType, transColor, palette } = imageData;

  if (colorType === 3) {
    dePalette({ indata, outdata: indata, width, height, palette: palette! });
    return indata;
  }

  if (transColor) {
    replaceTransparentColor({ indata, outdata: indata, width, height, transColor });
  }

  if (depth !== 8 && !skipRescale) {
    const outdata = depth === 16 ? new Uint8Array(width * height * 4) : indata;
    scaleDepth({ indata, outdata, width, height, depth });
    return outdata;
  }

  return indata;
}
