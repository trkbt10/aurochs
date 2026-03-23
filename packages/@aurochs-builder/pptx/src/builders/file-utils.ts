/**
 * @file Shared MIME type and data utilities for PPTX builders
 */

import { IMAGE_EXTENSION_TO_CONTENT_TYPE, type MediaContentType } from "@aurochs-office/opc";

/**
 * Extract file extension from a path or filename string.
 *
 * Handles `/` and `\` as path separators. Escaped characters (e.g. `\/`)
 * are not treated as separators — only a bare separator counts.
 */
function extname(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === filePath.length - 1) {
    return "";
  }

  // Find the last unescaped path separator
  const separatorRef = { value: -1 };
  for (let i = 0; i < filePath.length; i++) {
    const ch = filePath[i];
    if (ch === "\\" && i + 1 < filePath.length) {
      const next = filePath[i + 1];
      if (next === "/" || next === "\\") {
        i++; // skip escaped char
        continue;
      }
      // Bare backslash as Windows path separator
      separatorRef.value = i;
    } else if (ch === "/") {
      separatorRef.value = i;
    }
  }

  if (lastDot < separatorRef.value) {
    return "";
  }
  return filePath.slice(lastDot);
}

/**
 * Detect image MIME type from file extension.
 * Throws for unsupported extensions instead of silently defaulting.
 *
 * Extension → ContentType mapping is sourced from @aurochs-office/opc.
 */
export function detectImageMimeType(filePath: string): MediaContentType {
  const ext = extname(filePath).toLowerCase();
  const mimeType = IMAGE_EXTENSION_TO_CONTENT_TYPE[ext];
  if (!mimeType) {
    throw new Error(`Unsupported image extension: "${ext}" (supported: ${Object.keys(IMAGE_EXTENSION_TO_CONTENT_TYPE).join(", ")})`);
  }
  return mimeType;
}

/**
 * Convert a Uint8Array to an ArrayBuffer (copy).
 */
export function uint8ArrayToArrayBuffer(data: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(arrayBuffer).set(data);
  return arrayBuffer;
}
