/**
 * @file Fig format types
 */

// =============================================================================
// File Header Types
// =============================================================================

/** .fig file header structure */
export type FigHeader = {
  /** Magic header "fig-kiwi" */
  readonly magic: "fig-kiwi";
  /** Version character (typically '0') */
  readonly version: string;
  /** Payload size in bytes */
  readonly payloadSize: number;
};

/** Header size in bytes (8 magic + 1 version + 3 reserved + 4 size = 16) */
export const FIG_HEADER_SIZE = 16;

/** Magic header string */
export const FIG_MAGIC = "fig-kiwi";

// =============================================================================
// Compression Types
// =============================================================================

/** Compression type used in payload */
export type CompressionType = "deflate" | "zstd" | "none";

/** Zstandard magic bytes */
export const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]);

// =============================================================================
// Kiwi Schema Types
// =============================================================================

/** Kiwi primitive types */
export type KiwiPrimitiveType =
  | "bool"
  | "byte"
  | "int"
  | "uint"
  | "float"
  | "string"
  | "int64"
  | "uint64";

/** Kiwi definition kinds */
export type KiwiDefinitionKind = "ENUM" | "STRUCT" | "MESSAGE";

/** Kiwi field definition */
export type KiwiField = {
  readonly name: string;
  readonly type: KiwiPrimitiveType | string;
  readonly typeId: number;
  readonly isArray: boolean;
  readonly value: number;
};

/** Kiwi definition (enum, struct, or message) */
export type KiwiDefinition = {
  readonly name: string;
  readonly kind: KiwiDefinitionKind;
  readonly fields: readonly KiwiField[];
};

/** Kiwi schema */
export type KiwiSchema = {
  readonly definitions: readonly KiwiDefinition[];
};

// =============================================================================
// Parsed Fig File Types
// =============================================================================

/** Parsed resource (image, etc.) */
export type FigResource = {
  readonly id: string;
  readonly type: "image" | "video" | "font" | "unknown";
  readonly data: Uint8Array;
  readonly mimeType?: string;
};

/** Parsed fig file data */
export type FigFile = {
  readonly header: FigHeader;
  readonly schema: KiwiSchema;
  readonly document: FigDocument;
  readonly resources: readonly FigResource[];
};

/** Fig document tree */
export type FigDocument = {
  readonly type: string;
  readonly children?: readonly FigNode[];
  readonly [key: string]: unknown;
};

/** Fig node (generic) */
export type FigNode = {
  readonly type: string;
  readonly id?: string;
  readonly name?: string;
  readonly children?: readonly FigNode[];
  readonly [key: string]: unknown;
};

// =============================================================================
// Builder Types
// =============================================================================

/** Options for building a .fig file */
export type FigBuildOptions = {
  /** Compression type to use (default: "deflate") */
  compression?: CompressionType;
  /** Compression level (0-9, default: 6) */
  compressionLevel?: number;
};

/** Input for building a .fig file */
export type FigBuildInput = {
  readonly schema: KiwiSchema;
  readonly document: FigDocument;
  readonly resources?: readonly FigResource[];
};
