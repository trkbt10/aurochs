/**
 * @file Data URL utilities
 */

import { base64ArrayBuffer, base64ToArrayBuffer } from "./base64";

/**
 * Convert ArrayBuffer to data URL
 *
 * @param arrayBuffer - Binary data
 * @param mimeType - MIME type (e.g., "video/mp4", "audio/mpeg")
 * @returns Data URL string
 *
 * @example
 * toDataUrl(buffer, "video/mp4")
 * // Returns: "data:video/mp4;base64,..."
 */
export function toDataUrl(arrayBuffer: ArrayBuffer, mimeType: string): string {
  const base64Data = base64ArrayBuffer(arrayBuffer);
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Result of parsing a data URL
 */
export type ParsedDataUrl = {
  /** MIME type (e.g., "image/png", "video/mp4") */
  readonly mimeType: string;
  /** Binary data */
  readonly data: ArrayBuffer;
};

/**
 * Parse data URL to extract MIME type and binary data
 *
 * @param dataUrl - Data URL string (e.g., "data:image/png;base64,...")
 * @returns Parsed MIME type and binary data
 * @throws Error if data URL format is invalid
 *
 * @example
 * const { mimeType, data } = parseDataUrl("data:image/png;base64,iVBOR...");
 * // mimeType: "image/png"
 * // data: ArrayBuffer
 */
export function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error(`Invalid data URL format: ${dataUrl.substring(0, 50)}...`);
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const data = base64ToArrayBuffer(base64Data);

  return { mimeType, data };
}

