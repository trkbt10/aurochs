/**
 * @file Bit packing for PNG encoding (color type conversion)
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

import {
  COLORTYPE_COLOR_ALPHA,
  COLORTYPE_ALPHA,
  COLORTYPE_COLOR,
  COLORTYPE_GRAYSCALE,
  COLORTYPE_TO_BPP_MAP,
} from "./constants";

type BitPackerOptions = {
  colorType: number;
  inputColorType: number;
  bitDepth: number;
  inputHasAlpha: boolean;
  bgColor?: { red: number; green: number; blue: number };
};

type RGBA = { red: number; green: number; blue: number; alpha: number };

function checkBigEndian(): boolean {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true);
  return new Int16Array(buffer)[0] !== 256;
}

/**
 * Convert pixel data between PNG color types and bit depths.
 */
export function bitPack(args: { dataIn: Uint8Array; width: number; height: number; options: BitPackerOptions }): Uint8Array {
  const { dataIn, width, height, options } = args;
  const outHasAlpha = options.colorType === COLORTYPE_COLOR_ALPHA || options.colorType === COLORTYPE_ALPHA;

  if (options.colorType === options.inputColorType) {
    const bigEndian = checkBigEndian();
    if (options.bitDepth === 8 || (options.bitDepth === 16 && bigEndian)) {
      return dataIn;
    }
  }

  const data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
  const maxValue = options.bitDepth === 16 ? 65535 : 255;
  const inBpp = computeInBpp(options);
  const outBpp = computeOutBpp(options);
  const outData = new Uint8Array(width * height * outBpp);
  const outView = new DataView(outData.buffer);
  const bgRed = options.bgColor?.red ?? maxValue;
  const bgGreen = options.bgColor?.green ?? maxValue;
  const bgBlue = options.bgColor?.blue ?? maxValue;

  const idx = { inIndex: 0, outIndex: 0 };

  for (const _y of Array.from({ length: height })) {
    void _y;
    for (const _x of Array.from({ length: width })) {
      void _x;
      const rgba = readRGBA({
        data, inIndex: idx.inIndex, options, outHasAlpha, maxValue,
        bgRed, bgGreen, bgBlue,
      });
      writeRGBA({ outData, outView, outIndex: idx.outIndex, rgba, options, outHasAlpha });
      idx.inIndex += inBpp;
      idx.outIndex += outBpp;
    }
  }

  return outData;
}

function computeInBpp(options: BitPackerOptions): number {
  const base = COLORTYPE_TO_BPP_MAP[options.inputColorType];
  return base === 4 && !options.inputHasAlpha ? 3 : base;
}

function computeOutBpp(options: BitPackerOptions): number {
  const base = COLORTYPE_TO_BPP_MAP[options.colorType];
  return options.bitDepth === 16 ? base * 2 : base;
}

function readRGBA(args: {
  data: Uint8Array | Uint16Array;
  inIndex: number;
  options: BitPackerOptions;
  outHasAlpha: boolean;
  maxValue: number;
  bgRed: number;
  bgGreen: number;
  bgBlue: number;
}): RGBA {
  const { data, inIndex, options, outHasAlpha, maxValue, bgRed, bgGreen, bgBlue } = args;
  const raw = extractRawRGBA({ data, inIndex, inputColorType: options.inputColorType, maxValue });

  if (options.inputHasAlpha && !outHasAlpha) {
    const a = raw.alpha / maxValue;
    return {
      red: Math.min(Math.max(Math.round((1 - a) * bgRed + a * raw.red), 0), maxValue),
      green: Math.min(Math.max(Math.round((1 - a) * bgGreen + a * raw.green), 0), maxValue),
      blue: Math.min(Math.max(Math.round((1 - a) * bgBlue + a * raw.blue), 0), maxValue),
      alpha: raw.alpha,
    };
  }
  return raw;
}

function extractRawRGBA(args: { data: Uint8Array | Uint16Array; inIndex: number; inputColorType: number; maxValue: number }): RGBA {
  const { data, inIndex, inputColorType, maxValue } = args;
  switch (inputColorType) {
    case COLORTYPE_COLOR_ALPHA:
      return { red: data[inIndex], green: data[inIndex + 1], blue: data[inIndex + 2], alpha: data[inIndex + 3] };
    case COLORTYPE_COLOR:
      return { red: data[inIndex], green: data[inIndex + 1], blue: data[inIndex + 2], alpha: maxValue };
    case COLORTYPE_ALPHA:
      return { red: data[inIndex], green: data[inIndex], blue: data[inIndex], alpha: data[inIndex + 1] };
    case COLORTYPE_GRAYSCALE:
      return { red: data[inIndex], green: data[inIndex], blue: data[inIndex], alpha: maxValue };
    default:
      throw new Error("input color type:" + inputColorType + " is not supported at present");
  }
}

function writeRGBA(args: {
  outData: Uint8Array;
  outView: DataView;
  outIndex: number;
  rgba: RGBA;
  options: BitPackerOptions;
  outHasAlpha: boolean;
}): void {
  const { outData, outView, outIndex, rgba, options, outHasAlpha } = args;

  switch (options.colorType) {
    case COLORTYPE_COLOR_ALPHA:
    case COLORTYPE_COLOR:
      if (options.bitDepth === 8) {
        outData[outIndex] = rgba.red;
        outData[outIndex + 1] = rgba.green;
        outData[outIndex + 2] = rgba.blue;
        if (outHasAlpha) { outData[outIndex + 3] = rgba.alpha; }
      } else {
        outView.setUint16(outIndex, rgba.red);
        outView.setUint16(outIndex + 2, rgba.green);
        outView.setUint16(outIndex + 4, rgba.blue);
        if (outHasAlpha) { outView.setUint16(outIndex + 6, rgba.alpha); }
      }
      break;
    case COLORTYPE_ALPHA:
    case COLORTYPE_GRAYSCALE: {
      const grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
      if (options.bitDepth === 8) {
        outData[outIndex] = grayscale;
        if (outHasAlpha) { outData[outIndex + 1] = rgba.alpha; }
      } else {
        outView.setUint16(outIndex, grayscale);
        if (outHasAlpha) { outView.setUint16(outIndex + 2, rgba.alpha); }
      }
      break;
    }
    default:
      throw new Error("unrecognised color Type " + options.colorType);
  }
}
