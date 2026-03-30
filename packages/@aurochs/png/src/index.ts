/**
 * @file PNG Module
 *
 * Pure TypeScript PNG encoder/decoder. Environment-independent.
 */

export { encodeRgbaToPngDataUrl, encodeRgbaToPng } from "./encoder";
export { isPng, PNG_SIGNATURE } from "./detector";
export { pack as packPng } from "./pngjs/packer";
export { parseSync as parsePng } from "./pngjs/parser-sync";
export type { PngData, PackerOptions } from "./pngjs/packer";
export type { ParseResult, ParseOptions } from "./pngjs/parser-sync";
