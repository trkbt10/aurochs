/**
 * @file Roundtrip-capable .fig file editor
 *
 * Loads an existing .fig file, allows modification, and saves back
 * using the original schema for compatibility.
 *
 * This is primarily for validation and testing, not for building new files.
 */

import { compressZstd } from "../compression";
import { decompressDeflateRaw, decompressZstd, detectCompression } from "../compression";
import type { KiwiSchema, FigNode } from "../types";
import { StreamingFigEncoder } from "../kiwi/stream";
import { parseFigHeader, getPayload } from "../parser/header";
import { splitFigChunks, decodeFigSchema, decodeFigMessage } from "../kiwi/decoder";
import { loadZipPackage, createEmptyZipPackage } from "@oxen/zip";
import { buildFigHeader } from "../builder/header";

// =============================================================================
// Types
// =============================================================================

/** ZIP magic bytes (PK) */
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

/** Metadata from the .fig file */
export type FigMetadata = {
  readonly clientMeta?: {
    readonly backgroundColor?: { r: number; g: number; b: number; a: number };
    readonly thumbnailSize?: { width: number; height: number };
    readonly renderCoordinates?: { x: number; y: number; width: number; height: number };
  };
  readonly fileName?: string;
  readonly developerRelatedLinks?: readonly string[];
  readonly exportedAt?: string;
};

/** Image data */
export type FigImage = {
  readonly ref: string;
  readonly data: Uint8Array;
  readonly mimeType: string;
};

/** Blob data */
export type FigBlob = Record<string, unknown>;

/** Loaded .fig file data */
export type LoadedFigFile = {
  /** Original schema (for roundtrip) */
  readonly schema: KiwiSchema;
  /** Compressed schema bytes (for exact roundtrip) */
  readonly compressedSchema: Uint8Array;
  /** Header version character */
  readonly version: string;
  /** Node changes (raw Kiwi format) */
  readonly nodeChanges: FigNode[];
  /** Blobs */
  readonly blobs: readonly FigBlob[];
  /** Images from ZIP */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Metadata from meta.json */
  readonly metadata: FigMetadata | null;
  /** Thumbnail data */
  readonly thumbnail: Uint8Array | null;
  /** Message header fields (type, sessionID, etc.) */
  readonly messageHeader: Record<string, unknown>;
};

// =============================================================================
// Helper Functions
// =============================================================================

function isZipFile(data: Uint8Array): boolean {
  if (data.length < 4) {
    return false;
  }
  return (
    data[0] === ZIP_MAGIC[0] &&
    data[1] === ZIP_MAGIC[1] &&
    data[2] === ZIP_MAGIC[2] &&
    data[3] === ZIP_MAGIC[3]
  );
}

function decompressFigChunk(data: Uint8Array): Uint8Array {
  const compressionType = detectCompression(data);
  return compressionType === "zstd" ? decompressZstd(data) : decompressDeflateRaw(data);
}

function getMimeTypeFromContent(data: Uint8Array): string {
  const isPng =
    data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
  if (isPng) {
    return "image/png";
  }
  const isJpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (isJpeg) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

type ExtractedZipData = {
  readonly data: Uint8Array;
  readonly metadata: FigMetadata | null;
  readonly thumbnail: Uint8Array | null;
  readonly images: Map<string, FigImage>;
};

async function extractZipContents(data: Uint8Array): Promise<ExtractedZipData> {
  const images = new Map<string, FigImage>();
  const zipPackage = await loadZipPackage(data);
  const files = zipPackage.listFiles();

  // Find canvas.fig
  const canvasContent = zipPackage.readBinary("canvas.fig");
  if (!canvasContent) {
    throw new Error(`Could not find canvas.fig in ZIP. Available: ${files.join(", ")}`);
  }

  // Extract metadata
  const metaContent = zipPackage.readText("meta.json");
  const metadata = metaContent ? parseMetadata(metaContent) : null;

  // Extract thumbnail
  const thumbnailContent = zipPackage.readBinary("thumbnail.png");
  const thumbnail = thumbnailContent ? new Uint8Array(thumbnailContent) : null;

  // Extract images
  for (const file of files) {
    if (file.startsWith("images/") && file.length > 7) {
      const imageData = zipPackage.readBinary(file);
      if (imageData) {
        const ref = file.substring(7);
        const imgBytes = new Uint8Array(imageData);
        images.set(ref, {
          ref,
          data: imgBytes,
          mimeType: getMimeTypeFromContent(imgBytes),
        });
      }
    }
  }

  return { data: new Uint8Array(canvasContent), metadata, thumbnail, images };
}

function parseClientMeta(
  raw: Record<string, unknown>
): FigMetadata["clientMeta"] | undefined {
  const clientMeta = raw.client_meta as Record<string, unknown> | undefined;
  if (!clientMeta) {
    return undefined;
  }
  return {
    backgroundColor: clientMeta.background_color as FigMetadata["clientMeta"] extends { backgroundColor?: infer T } ? T : never,
    thumbnailSize: clientMeta.thumbnail_size as FigMetadata["clientMeta"] extends { thumbnailSize?: infer T } ? T : never,
    renderCoordinates: clientMeta.render_coordinates as FigMetadata["clientMeta"] extends { renderCoordinates?: infer T } ? T : never,
  };
}

function parseMetadata(content: string): FigMetadata | null {
  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    return {
      clientMeta: parseClientMeta(raw),
      fileName: raw.file_name as string | undefined,
      developerRelatedLinks: raw.developer_related_links as readonly string[] | undefined,
      exportedAt: raw.exported_at as string | undefined,
    };
  } catch (error: unknown) {
    // JSON parse failed - metadata is invalid or corrupt
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.warn("Failed to parse fig metadata:", error.message);
    }
    return null;
  }
}

// =============================================================================
// Load Function
// =============================================================================

async function extractFigData(data: Uint8Array): Promise<ExtractedZipData> {
  if (isZipFile(data)) {
    return extractZipContents(data);
  }
  return {
    data,
    metadata: null,
    thumbnail: null,
    images: new Map<string, FigImage>(),
  };
}

/**
 * Load a .fig file for roundtrip editing.
 * Preserves the original schema and metadata for compatibility.
 */
export async function loadFigFile(data: Uint8Array): Promise<LoadedFigFile> {
  const extracted = await extractFigData(data);

  // Parse header
  const header = parseFigHeader(extracted.data);
  const payload = getPayload(extracted.data);

  // Split chunks and keep compressed schema for exact roundtrip
  const chunks = splitFigChunks(payload, header.payloadSize);
  const compressedSchema = chunks.schema;

  // Decompress and decode
  const schemaData = decompressFigChunk(compressedSchema);
  const messageData = decompressFigChunk(chunks.data);
  const schema = decodeFigSchema(schemaData);
  const message = decodeFigMessage(schema, messageData, "Message");

  // Extract node changes (mutable copy)
  const nodeChanges = [...((message.nodeChanges ?? []) as FigNode[])];

  // Extract blobs
  const blobs = (message.blobs ?? []) as readonly FigBlob[];

  // Extract message header (non-node fields, non-blob fields)
  const messageHeader: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(message)) {
    if (key !== "nodeChanges") {
      messageHeader[key] = value;
    }
  }

  return {
    schema,
    compressedSchema,
    version: header.version,
    nodeChanges,
    blobs,
    images: extracted.images,
    metadata: extracted.metadata,
    thumbnail: extracted.thumbnail,
    messageHeader,
  };
}

// =============================================================================
// Save Function
// =============================================================================

/** Options for saving */
export type SaveFigOptions = {
  /** Update metadata (merged with existing) */
  readonly metadata?: Partial<FigMetadata>;
  /** New thumbnail data */
  readonly thumbnail?: Uint8Array;
  /** Additional images to include */
  readonly images?: ReadonlyMap<string, FigImage>;
};

function buildClientMeta(
  clientMeta: FigMetadata["clientMeta"]
): Record<string, unknown> | undefined {
  if (!clientMeta) {
    return undefined;
  }
  return {
    background_color: clientMeta.backgroundColor,
    thumbnail_size: clientMeta.thumbnailSize,
    render_coordinates: clientMeta.renderCoordinates,
  };
}

function buildMetaJson(metadata: Partial<FigMetadata>): Record<string, unknown> {
  return {
    client_meta: buildClientMeta(metadata.clientMeta),
    file_name: metadata.fileName,
    developer_related_links: metadata.developerRelatedLinks ?? [],
    exported_at: metadata.exportedAt ?? new Date().toISOString(),
  };
}

/**
 * Save a loaded .fig file back to bytes.
 * Uses the original schema for compatibility.
 */
export async function saveFigFile(
  loaded: LoadedFigFile,
  options?: SaveFigOptions
): Promise<Uint8Array> {
  // Re-encode message using streaming encoder with original schema
  const encoder = new StreamingFigEncoder({ schema: loaded.schema });

  // Write header fields including blobs
  const headerFields: Record<string, unknown> = {
    type: loaded.messageHeader.type as { value: number } | undefined,
    sessionID: (loaded.messageHeader.sessionID as number) ?? 1,
    ackID: (loaded.messageHeader.ackID as number) ?? 0,
  };

  // Include blobs if present (required for geometry rendering)
  if (loaded.blobs.length > 0) {
    headerFields.blobs = loaded.blobs;
  }

  encoder.writeHeader(headerFields);

  // Write node changes
  for (const node of loaded.nodeChanges) {
    encoder.writeNodeChange(node as Record<string, unknown>);
  }

  const messageData = encoder.finalize();
  // Use zstd compression for message data (Figma's expected format)
  const compressedMessage = await compressZstd(messageData, 3);

  // Build data chunk with 4-byte LE size prefix
  const dataChunk = new Uint8Array(4 + compressedMessage.length);
  const dataView = new DataView(dataChunk.buffer);
  dataView.setUint32(0, compressedMessage.length, true);
  dataChunk.set(compressedMessage, 4);

  // Build canvas.fig using ORIGINAL compressed schema for exact compatibility
  const header = buildFigHeader(loaded.compressedSchema.length, loaded.version);
  const totalSize = header.length + loaded.compressedSchema.length + dataChunk.length;
  const canvasData = new Uint8Array(totalSize);
  canvasData.set(header, 0);
  canvasData.set(loaded.compressedSchema, header.length);
  canvasData.set(dataChunk, header.length + loaded.compressedSchema.length);

  // Create ZIP package
  const zip = createEmptyZipPackage();
  zip.writeBinary("canvas.fig", canvasData);

  // Add metadata
  const mergedMetadata = { ...loaded.metadata, ...options?.metadata };
  if (mergedMetadata.fileName || mergedMetadata.exportedAt) {
    zip.writeText("meta.json", JSON.stringify(buildMetaJson(mergedMetadata)));
  }

  // Add thumbnail
  const thumbnailData = options?.thumbnail ?? loaded.thumbnail;
  if (thumbnailData) {
    zip.writeBinary("thumbnail.png", thumbnailData);
  }

  // Add images
  const allImages = new Map(loaded.images);
  if (options?.images) {
    for (const [ref, img] of options.images) {
      allImages.set(ref, img);
    }
  }
  for (const [ref, img] of allImages) {
    zip.writeBinary(`images/${ref}`, img.data);
  }

  // Generate ZIP
  const buffer = await zip.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Clone a loaded .fig file (deep copy of mutable parts).
 */
export function cloneFigFile(loaded: LoadedFigFile): LoadedFigFile {
  return {
    ...loaded,
    nodeChanges: loaded.nodeChanges.map((n) => ({ ...n })),
  };
}

/**
 * Add a node change to a loaded file.
 */
export function addNodeChange(loaded: LoadedFigFile, node: FigNode): void {
  loaded.nodeChanges.push(node);
}

/**
 * Find a node by name.
 */
export function findNodeByName(loaded: LoadedFigFile, name: string): FigNode | undefined {
  return loaded.nodeChanges.find((n) => n.name === name);
}

/**
 * Find nodes by type.
 */
export function findNodesByType(loaded: LoadedFigFile, typeName: string): FigNode[] {
  return loaded.nodeChanges.filter((n) => n.type?.name === typeName);
}
