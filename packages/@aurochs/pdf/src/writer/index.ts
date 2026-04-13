/**
 * @file PDF Writer - Barrel Export
 */

// Core serialization
export {
  serializePdfNull,
  serializePdfBool,
  serializePdfNumber,
  serializePdfName,
  serializePdfString,
  serializePdfHexString,
  serializePdfRef,
  serializePdfArray,
  serializePdfDict,
  serializePdfObject,
  serializeIndirectObject,
} from "./object-serializer";

// Encoding
export {
  encodeFlate,
  encodeAscii85,
  encodeAsciiHex,
} from "./encode-filters";

// Stream encoding
export {
  serializePdfStream,
  serializeContentStream,
  type StreamEncoding,
  type SerializeStreamOptions,
} from "./stream-encoder";

// XRef building
export {
  buildXrefTable,
  buildTrailer,
  buildFooter,
  buildXrefSection,
  type XRefEntry,
} from "./xref-builder";

// Content stream operators
export {
  serializePathOp,
  serializePaintOp,
  serializePath,
  serializePathOperations,
  serializeText,
  serializeTextBatch,
  type TextSerializationContext,
  serializeColor,
  serializeLineWidth,
  serializeLineCap,
  serializeLineJoin,
  serializeMiterLimit,
  serializeDashPattern,
  serializeTransform,
  serializeGraphicsState,
  wrapInGraphicsState,
} from "./content-stream";

// Document builders
export {
  createPdfObjectTracker,
  type PdfObjectTracker,
  type PdfObjectEntry,
  buildResourceDict,
  buildEmptyResourceDict,
  type ResourceRefs,
  buildType1Font,
  buildEmbeddedFont,
  buildFonts,
  buildImageXObject,
  buildImages,
  buildPage,
  type PageBuildResult,
  type BuildPageOptions,
} from "./document";

// Main entry point
export {
  writePdfDocument,
  type PdfWriteOptions,
} from "./document-writer";
