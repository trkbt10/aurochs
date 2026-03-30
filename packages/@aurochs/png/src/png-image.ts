/**
 * @file PNG image container and sync read/write API
 *
 * Provides a pngjs-compatible API surface:
 * - createPngImage({ width, height }) — create an empty RGBA image
 * - readPng(buffer) — decode a PNG buffer (equivalent to PNG.sync.read)
 * - writePng(image) — encode to PNG buffer (equivalent to PNG.sync.write)
 */

import { pack } from "./pngjs/packer";
import { parseSync } from "./pngjs/parser-sync";

/**
 * Mutable RGBA image container.
 * Compatible with the pngjs `PNG` object shape (width, height, data).
 */
export type PngImage = {
  readonly width: number;
  readonly height: number;
  /** RGBA pixel data, 4 bytes per pixel, row-major order. */
  data: Uint8Array;
};

/**
 * Create an empty RGBA image filled with zeros.
 *
 * Equivalent to `new PNG({ width, height })` in pngjs.
 */
export function createPngImage(args: { width: number; height: number }): PngImage {
  return {
    width: args.width,
    height: args.height,
    data: new Uint8Array(args.width * args.height * 4),
  };
}

/**
 * Decode a PNG buffer into a PngImage.
 *
 * Equivalent to `PNG.sync.read(buffer)` in pngjs.
 */
export function readPng(buffer: Uint8Array): PngImage {
  const result = parseSync(buffer);
  return {
    width: result.width,
    height: result.height,
    data: result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data.buffer),
  };
}

/**
 * Encode a PngImage into a PNG buffer.
 *
 * Equivalent to `PNG.sync.write(png)` in pngjs.
 */
export function writePng(image: PngImage): Uint8Array {
  return pack({ width: image.width, height: image.height, data: image.data });
}
