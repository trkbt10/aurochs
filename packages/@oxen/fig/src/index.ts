/**
 * @file Fig module exports
 */

// Types
export type {
  FigHeader,
  FigFile,
  FigDocument,
  FigNode,
  FigResource,
  FigBuildInput,
  FigBuildOptions,
  KiwiSchema,
  KiwiDefinition,
  KiwiField,
  KiwiPrimitiveType,
  KiwiDefinitionKind,
  CompressionType,
} from "./types";

// Constants
export { FIG_HEADER_SIZE, FIG_MAGIC, ZSTD_MAGIC } from "./types";

// Errors
export {
  FigError,
  FigParseError,
  FigBuildError,
  FigDecompressError,
} from "./errors";

// Parser
export {
  isFigFile,
  parseFigHeader,
  getPayload,
  decompress,
  decompressDeflate,
  decompressDeflateRaw,
  decompressZstd,
  detectCompression,
} from "./parser";

// Builder
export {
  buildFigHeader,
  buildFigFile,
  compress,
  compressDeflate,
  compressZstd,
} from "./builder";

// Kiwi utilities
export {
  ByteBuffer,
  KIWI_KIND,
  KIWI_TYPE,
  decodeSchema,
  decodeFigSchema,
  encodeSchema,
  decodeMessage,
  decodeFigMessage,
  encodeMessage,
  splitChunks,
  splitFigChunks,
  combineChunks,
  createField,
  createDefinition,
  createSchema,
  findDefinition,
  // Streaming
  StreamingFigDecoder,
  StreamingFigEncoder,
  streamNodeChanges,
  processNodeChanges,
  // Test helpers
  createTestSchema,
  createTestNode,
  createTestMessage,
  encodeFigSchema,
  buildTestFigFile,
  createSampleFigFile,
  IDENTITY_MATRIX,
} from "./kiwi";

export type {
  DecodedNodeChange,
  StreamingDecoderOptions,
  StreamingEncoderOptions,
  MessageHeader,
} from "./kiwi";

export type { FigChunks } from "./kiwi/decoder";
