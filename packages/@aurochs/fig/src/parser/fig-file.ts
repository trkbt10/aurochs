/**
 * @file High-level fig file parsing API
 */

import type { FigNode, KiwiSchema } from "../types";
import { parseFigHeader, getPayload, isFigFile } from "./header";
import { decodeFigSchema, decodeFigMessage, splitFigChunks } from "../kiwi/decoder";
import { decompressDeflateRaw, decompressZstd } from "./decompress";
import { detectCompression } from "../compression";
import { loadZipPackage } from "@aurochs/zip";
import type { FigBlob } from "./blob-decoder";

// =============================================================================
// Parsed Fig File Result
// =============================================================================

/**
 * Image data extracted from .fig file
 */
export type FigImage = {
  /** Image filename/ref */
  readonly ref: string;
  /** Image data as Uint8Array */
  readonly data: Uint8Array;
  /** MIME type */
  readonly mimeType: string;
};

/**
 * Result of parsing a .fig file
 */
export type ParsedFigFile = {
  /** Decoded schema */
  readonly schema: KiwiSchema;
  /** Node changes from the message */
  readonly nodeChanges: readonly FigNode[];
  /** Blobs containing path data, images, etc. */
  readonly blobs: readonly FigBlob[];
  /** Images extracted from the ZIP (keyed by imageRef) */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Raw message data */
  readonly message: Record<string, unknown>;
};

// =============================================================================
// ZIP Detection
// =============================================================================

/** ZIP magic bytes (PK) */
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

/**
 * Check if data is a ZIP file
 */
function isZipFile(data: Uint8Array): boolean {
  if (data.length < 4) {
    return false;
  }
  return data[0] === ZIP_MAGIC[0] && data[1] === ZIP_MAGIC[1] && data[2] === ZIP_MAGIC[2] && data[3] === ZIP_MAGIC[3];
}

/**
 * Result of extracting from Figma ZIP
 */
type ZipExtractResult = {
  readonly canvasData: Uint8Array;
  readonly images: ReadonlyMap<string, FigImage>;
};

/**
 * Detect MIME type from file content (magic bytes)
 */
function getMimeTypeFromContent(data: Uint8Array): string {
  // Check for PNG: 89 50 4E 47 0D 0A 1A 0A
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  // Check for JPEG: FF D8 FF
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  // Check for GIF: 47 49 46 38
  if (data.length >= 4 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return "image/gif";
  }
  // Check for WebP: 52 49 46 46 ... 57 45 42 50
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return "image/webp";
  }
  return "application/octet-stream";
}

/**
 * Get MIME type from file extension (fallback)
 */
function getMimeTypeFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

/**
 * Extract canvas.fig and images from a Figma ZIP file
 */
async function extractFromZip(data: Uint8Array): Promise<ZipExtractResult> {
  const zipPackage = await loadZipPackage(data);
  const files = zipPackage.listFiles();

  // Find canvas file
  const canvasNames = ["canvas.fig", "thumbnail.fig"];
  let canvasData: Uint8Array | null = null;

  for (const name of canvasNames) {
    const content = zipPackage.readBinary(name);
    if (content) {
      canvasData = new Uint8Array(content);
      break;
    }
  }

  if (!canvasData) {
    throw new Error(`Could not find canvas.fig in ZIP. Available files: ${files.join(", ")}`);
  }

  // Extract images from images/ directory
  const images = new Map<string, FigImage>();
  for (const file of files) {
    if (file.startsWith("images/") && file.length > 7) {
      const imageData = zipPackage.readBinary(file);
      if (imageData) {
        // Extract the image ref (filename without images/ prefix)
        const ref = file.substring(7);
        const data = new Uint8Array(imageData);
        // Try content-based detection first, then fallback to extension
        let mimeType = getMimeTypeFromContent(data);
        if (mimeType === "application/octet-stream") {
          mimeType = getMimeTypeFromExt(file);
        }
        images.set(ref, {
          ref,
          data,
          mimeType,
        });
      }
    }
  }

  return { canvasData, images };
}

// =============================================================================
// Decompression
// =============================================================================

/**
 * Decompress a fig file chunk.
 * Fig files typically use raw deflate, but may use zstd.
 */
function decompressFigChunk(data: Uint8Array): Uint8Array {
  // Check for zstd first (has magic header)
  const compressionType = detectCompression(data);
  if (compressionType === "zstd") {
    return decompressZstd(data);
  }

  // Otherwise try raw deflate (no header to detect)
  // This is what fig-kiwi files typically use
  return decompressDeflateRaw(data);
}

// =============================================================================
// Fig File Parsing
// =============================================================================

/**
 * Parse raw fig-kiwi data (not ZIP wrapped)
 */
function parseRawFigData(data: Uint8Array, images: ReadonlyMap<string, FigImage> = new Map()): ParsedFigFile {
  // Validate file
  if (!isFigFile(data)) {
    throw new Error("Invalid fig-kiwi data: missing magic header");
  }

  // Parse header
  const header = parseFigHeader(data);
  const payload = getPayload(data);

  // Split into schema and data chunks
  const chunks = splitFigChunks(payload, header.payloadSize);

  // Decompress chunks
  // Fig files typically use raw deflate (no header), but may use zstd
  const schemaData = decompressFigChunk(chunks.schema);
  const messageData = decompressFigChunk(chunks.data);

  // Decode schema
  const schema = decodeFigSchema(schemaData);

  // Decode message
  const message = decodeFigMessage(schema, messageData, "Message");

  // Extract node changes
  const nodeChanges = (message.nodeChanges ?? []) as readonly FigNode[];

  // Extract blobs
  const blobs = (message.blobs ?? []) as readonly FigBlob[];

  return {
    schema,
    nodeChanges,
    blobs,
    images,
    message,
  };
}

/**
 * Parse a .fig file and extract node changes
 *
 * Supports both:
 * - Raw fig-kiwi format (starts with "fig-kiwi")
 * - ZIP-wrapped format (Figma's actual .fig export format)
 *
 * @param data - Raw .fig file bytes
 * @returns Parsed schema and nodes
 */
export async function parseFigFile(data: Uint8Array): Promise<ParsedFigFile> {
  // Check if it's a ZIP file (Figma's actual format)
  if (isZipFile(data)) {
    const { canvasData, images } = await extractFromZip(data);
    return parseRawFigData(canvasData, images);
  }

  // Otherwise try raw fig-kiwi format
  return parseRawFigData(data);
}

/**
 * Parse a .fig file synchronously (only works with raw fig-kiwi format)
 *
 * @param data - Raw fig-kiwi format bytes
 * @returns Parsed schema and nodes
 */
export function parseFigFileSync(data: Uint8Array): ParsedFigFile {
  if (isZipFile(data)) {
    throw new Error("ZIP-wrapped .fig files require async parsing. Use parseFigFile() instead.");
  }
  return parseRawFigData(data);
}

/**
 * Check if data is a Figma ZIP file
 */
export function isFigmaZipFile(data: Uint8Array): boolean {
  return isZipFile(data);
}
