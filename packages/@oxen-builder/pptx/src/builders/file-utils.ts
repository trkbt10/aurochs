/**
 * @file Shared file I/O and MIME type utilities for PPTX builders
 *
 * NOTE: readFileToArrayBuffer uses Node.js fs. For browser usage,
 * pass in-memory data directly using uint8ArrayToArrayBuffer.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MediaType } from "@oxen-builder/pptx/patcher/resources/media-manager";

const IMAGE_EXT_MAP: Record<string, MediaType> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Detect image MIME type from file extension.
 * Throws for unsupported extensions instead of silently defaulting.
 */
export function detectImageMimeType(filePath: string): MediaType {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = IMAGE_EXT_MAP[ext];
  if (!mimeType) {
    throw new Error(`Unsupported image extension: "${ext}" (supported: ${Object.keys(IMAGE_EXT_MAP).join(", ")})`);
  }
  return mimeType;
}

/**
 * Read a file into an ArrayBuffer.
 */
export async function readFileToArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  const buffer = await fs.readFile(filePath);
  const arrayBuffer = new ArrayBuffer(buffer.length);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

/**
 * Convert a Uint8Array to an ArrayBuffer (copy).
 */
export function uint8ArrayToArrayBuffer(data: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(arrayBuffer).set(data);
  return arrayBuffer;
}
