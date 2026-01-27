/**
 * @file Shared ZIP types
 */

/**
 * Options for ZIP generation.
 */
export type ZipGenerateOptions = {
  /** Compression level (0-9, default: 6) */
  readonly compressionLevel?: number;
  /** MIME type for the blob (default: PPTX MIME type) */
  readonly mimeType?: string;
};

/**
 * Minimal, PresentationFile-compatible interface (structural typing).
 */
export type PresentationFileLike = {
  readText(path: string): string | null;
  readBinary(path: string): ArrayBuffer | null;
  exists(path: string): boolean;
  listFiles?(): readonly string[];
};

/**
 * Unified ZIP package for both reading and writing.
 *
 * Read operations are compatible with PresentationFile-like interfaces.
 * Write operations allow modifying and exporting the package.
 */
export type ZipPackage = {
  // =========================================================================
  // Read Operations
  // =========================================================================

  readText(path: string): string | null;
  readBinary(path: string): ArrayBuffer | null;
  exists(path: string): boolean;
  listFiles(): readonly string[];

  // =========================================================================
  // Write Operations
  // =========================================================================

  writeText(path: string, content: string): void;
  writeBinary(path: string, content: ArrayBuffer | Uint8Array): void;
  remove(path: string): void;

  // =========================================================================
  // Export Operations
  // =========================================================================

  toBlob(options?: ZipGenerateOptions): Promise<Blob>;
  toArrayBuffer(options?: ZipGenerateOptions): Promise<ArrayBuffer>;

  // =========================================================================
  // Conversion
  // =========================================================================

  asPresentationFile(): PresentationFileLike;
};

