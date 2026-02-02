/**
 * @file Kiwi module exports
 */

export { ByteBuffer } from "./byte-buffer";

export {
  KIWI_KIND,
  KIWI_TYPE,
  resolveTypeName,
  resolveKindName,
  createField,
  createDefinition,
  createSchema,
  findDefinition,
} from "./schema";

export {
  decodeSchema,
  decodeFigSchema,
  decodeMessage,
  decodeFigMessage,
  splitChunks,
  splitFigChunks,
} from "./decoder";
export { encodeSchema, encodeMessage, combineChunks } from "./encoder";

// Streaming
export {
  StreamingFigDecoder,
  StreamingFigEncoder,
  streamNodeChanges,
  processNodeChanges,
} from "./stream";
export type {
  DecodedNodeChange,
  StreamingDecoderOptions,
  StreamingEncoderOptions,
  MessageHeader,
} from "./stream";

// Test helpers (for spec files)
export {
  createTestSchema,
  createTestNode,
  createTestMessage,
  encodeFigSchema,
  buildTestFigFile,
  createSampleFigFile,
  IDENTITY_MATRIX,
} from "./test-helpers";
