/**
 * @file Fig file header building
 */

import { FIG_HEADER_SIZE, FIG_MAGIC } from "../../types";

/** Text encoder for ASCII */
const textEncoder = new TextEncoder();

/**
 * Build a .fig file header.
 *
 * @param payloadSize - Size of the payload in bytes
 * @param version - Version character (default: "0")
 * @returns Header bytes (16 bytes)
 */
export function buildFigHeader(
  payloadSize: number,
  version: string = "0"
): Uint8Array {
  const header = new Uint8Array(FIG_HEADER_SIZE);
  const view = new DataView(header.buffer);

  // Magic header (8 bytes)
  const magicBytes = textEncoder.encode(FIG_MAGIC);
  header.set(magicBytes, 0);

  // Version character (1 byte at offset 8)
  header[8] = version.charCodeAt(0);

  // Reserved bytes (3 bytes at offset 9-11) - leave as zeros

  // Payload size (4 bytes at offset 12-15, little-endian)
  view.setUint32(12, payloadSize, true);

  return header;
}

/**
 * Build a complete .fig file from header and payload.
 *
 * @param payload - Payload data
 * @param version - Version character (default: "0")
 * @returns Complete .fig file
 */
export function buildFigFile(
  payload: Uint8Array,
  version: string = "0"
): Uint8Array {
  const header = buildFigHeader(payload.length, version);
  const result = new Uint8Array(header.length + payload.length);
  result.set(header, 0);
  result.set(payload, header.length);
  return result;
}
