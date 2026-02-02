/**
 * @file Parser module exports
 */

export {
  decompress,
  decompressDeflate,
  decompressDeflateRaw,
  decompressZstd,
  detectCompression,
} from "./decompress";

export { isFigFile, parseFigHeader, getPayload } from "./header";
