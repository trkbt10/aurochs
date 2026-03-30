/**
 * @file PNG chunk packer (encoder)
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

import { deflate } from "pako";
import * as constants from "./constants";
import { crc32 } from "./crc";
import { bitPack } from "./bitpacker";
import { filterData } from "./filter-pack";
import { writeUInt32BE, writeInt32BE, concatUint8Arrays } from "./buffer-util";

export type PackerOptions = {
  deflateLevel?: number;
  deflateStrategy?: number;
  deflateChunkSize?: number;
  inputHasAlpha?: boolean;
  bitDepth?: number;
  colorType?: number;
  inputColorType?: number;
  filterType?: number;
  bgColor?: { red: number; green: number; blue: number };
};

type DeflateLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type ResolvedOptions = {
  deflateLevel: DeflateLevel;
  deflateStrategy: number;
  deflateChunkSize: number;
  inputHasAlpha: boolean;
  bitDepth: number;
  colorType: number;
  inputColorType: number;
  filterType: number;
  bgColor?: { red: number; green: number; blue: number };
};

function resolveOptions(options: PackerOptions): ResolvedOptions {
  const deflateLevel = (options.deflateLevel ?? 9) as DeflateLevel;
  const deflateStrategy = options.deflateStrategy ?? 3;
  const colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
  const inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;

  const supportedColorTypes = [
    constants.COLORTYPE_GRAYSCALE,
    constants.COLORTYPE_COLOR,
    constants.COLORTYPE_COLOR_ALPHA,
    constants.COLORTYPE_ALPHA,
  ];

  if (supportedColorTypes.indexOf(colorType) === -1) {
    throw new Error("option color type:" + colorType + " is not supported at present");
  }
  if (supportedColorTypes.indexOf(inputColorType) === -1) {
    throw new Error("option input color type:" + inputColorType + " is not supported at present");
  }

  const bitDepth = options.bitDepth || 8;
  if (bitDepth !== 8 && bitDepth !== 16) {
    throw new Error("option bit depth:" + bitDepth + " is not supported at present");
  }

  return {
    deflateChunkSize: options.deflateChunkSize || 32 * 1024,
    deflateLevel,
    deflateStrategy,
    inputHasAlpha: options.inputHasAlpha ?? true,
    bitDepth,
    colorType,
    inputColorType,
    filterType: options.filterType ?? -1,
    bgColor: options.bgColor,
  };
}

function packChunk(type: number, data: Uint8Array | null): Uint8Array {
  const len = data ? data.length : 0;
  const buf = new Uint8Array(len + 12);

  writeUInt32BE(buf, len, 0);
  writeUInt32BE(buf, type, 4);

  if (data) {
    buf.set(data, 8);
  }

  const crcInput = buf.slice(4, buf.length - 4);
  writeInt32BE(buf, crc32(crcInput), buf.length - 4);

  return buf;
}

function packIHDR(width: number, height: number, opts: ResolvedOptions): Uint8Array {
  const buf = new Uint8Array(13);
  writeUInt32BE(buf, width, 0);
  writeUInt32BE(buf, height, 4);
  buf[8] = opts.bitDepth;
  buf[9] = opts.colorType;
  buf[10] = 0; // compression
  buf[11] = 0; // filter
  buf[12] = 0; // interlace

  return packChunk(constants.TYPE_IHDR, buf);
}

function packGAMA(gamma: number): Uint8Array {
  const buf = new Uint8Array(4);
  writeUInt32BE(buf, Math.floor(gamma * constants.GAMMA_DIVISION), 0);
  return packChunk(constants.TYPE_gAMA, buf);
}

function packIDAT(data: Uint8Array): Uint8Array {
  return packChunk(constants.TYPE_IDAT, data);
}

function packIEND(): Uint8Array {
  return packChunk(constants.TYPE_IEND, null);
}

export type PngData = {
  width: number;
  height: number;
  data: Uint8Array;
  gamma?: number;
};

/**
 * Encode pixel data into a PNG byte stream.
 */
export function pack(metaData: PngData, opt?: PackerOptions): Uint8Array {
  const options = resolveOptions(opt || {});

  const chunks: Uint8Array[] = [
    new Uint8Array(constants.PNG_SIGNATURE),
    packIHDR(metaData.width, metaData.height, options),
  ];

  if (metaData.gamma) {
    chunks.push(packGAMA(metaData.gamma));
  }

  const packedData = bitPack({
    dataIn: metaData.data,
    width: metaData.width,
    height: metaData.height,
    options: {
      colorType: options.colorType,
      inputColorType: options.inputColorType,
      bitDepth: options.bitDepth,
      inputHasAlpha: options.inputHasAlpha,
      bgColor: options.bgColor,
    },
  });

  const bpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
  const filteredData = filterData({
    pxData: packedData,
    width: metaData.width,
    height: metaData.height,
    options: { filterType: options.filterType, bitDepth: options.bitDepth },
    bpp,
  });

  const compressedData = deflate(filteredData, { level: options.deflateLevel });

  if (!compressedData || !compressedData.length) {
    throw new Error("bad png - invalid compressed data response");
  }

  chunks.push(packIDAT(compressedData));
  chunks.push(packIEND());

  return concatUint8Arrays(chunks);
}
