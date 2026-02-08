/**
 * @file Parser module exports
 */

export {
  decompress,
  decompressDeflate,
  decompressDeflateRaw,
  decompressZstd,
} from "./decompress";

export { isFigFile, parseFigHeader, getPayload } from "./header";

export {
  parseFigFile,
  parseFigFileSync,
  isFigmaZipFile,
} from "./fig-file";

export type { ParsedFigFile, FigImage } from "./fig-file";

export {
  buildNodeTree,
  guidToString,
  getNodeType,
  findNodesByType,
  findNodeByGuid,
} from "./tree-builder";

export type { FigGuid, NodeTreeResult } from "./tree-builder";

export {
  decodePathCommands,
  pathCommandsToSvgPath,
  decodeBlobToSvgPath,
} from "./blob-decoder";

export type { FigBlob, PathCommand } from "./blob-decoder";
