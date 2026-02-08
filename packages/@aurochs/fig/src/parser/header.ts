/**
 * @file Fig file header parsing
 */

import type { FigHeader } from "../types";
import { FIG_HEADER_SIZE, FIG_MAGIC } from "../types";
import { FigParseError } from "../errors";

/** Text decoder for ASCII */
const textDecoder = new TextDecoder("ascii");

/**
 * Check if data is a valid .fig file.
 *
 * @param data - Data to check
 * @returns true if data has valid .fig header
 */
export function isFigFile(data: Uint8Array): boolean {
  if (data.length < FIG_HEADER_SIZE) {
    return false;
  }

  const magic = textDecoder.decode(data.slice(0, 8));
  return magic === FIG_MAGIC;
}

/**
 * Parse a .fig file header.
 *
 * @param data - Raw .fig file data (at least 16 bytes)
 * @returns Parsed header
 * @throws FigParseError if header is invalid
 */
export function parseFigHeader(data: Uint8Array): FigHeader {
  if (data.length < FIG_HEADER_SIZE) {
    throw new FigParseError(
      `File too small: expected at least ${FIG_HEADER_SIZE} bytes, got ${data.length}`
    );
  }

  // Check magic header (8 bytes)
  const magic = textDecoder.decode(data.slice(0, 8));
  if (magic !== FIG_MAGIC) {
    throw new FigParseError(`Invalid magic header: expected "${FIG_MAGIC}", got "${magic}"`);
  }

  // Version character (1 byte at offset 8)
  const version = String.fromCharCode(data[8]);

  // Reserved bytes (3 bytes at offset 9-11)
  // Skip these

  // Payload size (4 bytes at offset 12-15, little-endian)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const payloadSize = view.getUint32(12, true);

  return {
    magic: FIG_MAGIC,
    version,
    payloadSize,
  };
}

/**
 * Get the payload data from a .fig file.
 *
 * @param data - Raw .fig file data
 * @returns Payload data (after header)
 */
export function getPayload(data: Uint8Array): Uint8Array {
  return data.slice(FIG_HEADER_SIZE);
}
