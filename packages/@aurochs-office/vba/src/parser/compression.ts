/**
 * @file MS-OVBA compression/decompression
 *
 * Implements the VBA compression algorithm as specified in MS-OVBA 2.4.1.
 * VBA uses a custom LZ-based compression with copy tokens.
 *
 * @see MS-OVBA 2.4.1 (Compression and Decompression)
 */

import { VbaParseError } from "../errors";

/**
 * Decompress VBA compressed data.
 *
 * @param compressedBytes - Compressed data (including signature byte)
 * @returns Decompressed data
 * @throws VbaParseError if decompression fails
 *
 * @see MS-OVBA 2.4.1.3 (Decompression Algorithm)
 */
export function decompressVba(compressedBytes: Uint8Array): Uint8Array {
  if (compressedBytes.length === 0) {
    return new Uint8Array(0);
  }

  // First byte is signature (0x01)
  const signatureByte = compressedBytes[0];
  if (signatureByte !== 0x01) {
    throw new VbaParseError(`Invalid VBA compression signature: 0x${signatureByte.toString(16)}`, "compression");
  }

  const result: number[] = [];
  let srcIndex = 1; // Skip signature byte

  while (srcIndex < compressedBytes.length) {
    // Read chunk header (2 bytes, little-endian)
    if (srcIndex + 2 > compressedBytes.length) {
      break; // Incomplete chunk header
    }

    const chunkHeader = compressedBytes[srcIndex] | (compressedBytes[srcIndex + 1] << 8);
    srcIndex += 2;

    // Chunk header format:
    // Bits 0-11: Chunk size - 3 (actual size = value + 3)
    // Bit 12-14: Chunk signature (must be 0b011)
    // Bit 15: Compression flag (1 = compressed, 0 = raw)
    const chunkSize = (chunkHeader & 0x0fff) + 3;
    const chunkSignature = (chunkHeader >> 12) & 0x07;
    const isCompressed = (chunkHeader >> 15) & 0x01;

    if (chunkSignature !== 0x03) {
      throw new VbaParseError(`Invalid chunk signature: ${chunkSignature}`, "compression");
    }

    const chunkEnd = srcIndex + chunkSize - 2; // -2 for header already read
    if (chunkEnd > compressedBytes.length) {
      // Handle truncated chunk gracefully
      break;
    }

    if (isCompressed === 0) {
      // Raw chunk: copy bytes directly
      while (srcIndex < chunkEnd) {
        result.push(compressedBytes[srcIndex++]);
      }
    } else {
      // Compressed chunk: process tokens
      const chunkStart = result.length;

      while (srcIndex < chunkEnd) {
        // Read flag byte
        if (srcIndex >= chunkEnd) break;
        const flagByte = compressedBytes[srcIndex++];

        // Process 8 tokens (one per bit)
        for (let bitIndex = 0; bitIndex < 8 && srcIndex < chunkEnd; bitIndex++) {
          const isToken = (flagByte >> bitIndex) & 0x01;

          if (isToken === 0) {
            // Literal byte
            result.push(compressedBytes[srcIndex++]);
          } else {
            // Copy token (2 bytes, little-endian)
            if (srcIndex + 2 > chunkEnd) break;
            const copyToken = compressedBytes[srcIndex] | (compressedBytes[srcIndex + 1] << 8);
            srcIndex += 2;

            // Decode copy token
            // The number of bits for offset depends on current decompressed position within chunk
            const decompressedChunkPosition = result.length - chunkStart;
            const bitCount = computeCopyTokenBitCount(decompressedChunkPosition);
            const lengthMask = (1 << bitCount) - 1;
            const offsetMask = ~lengthMask & 0xffff;

            const length = (copyToken & lengthMask) + 3;
            const offset = ((copyToken & offsetMask) >> bitCount) + 1;

            // Copy from earlier in result
            const copyStart = result.length - offset;
            if (copyStart < 0) {
              throw new VbaParseError(`Invalid copy offset: ${offset}`, "compression");
            }

            for (let i = 0; i < length; i++) {
              // Use current length for source index (handles overlapping copies)
              result.push(result[copyStart + i]);
            }
          }
        }
      }
    }
  }

  return new Uint8Array(result);
}

/**
 * Compute the number of bits used for length in copy token.
 *
 * @param position - Current decompressed position within chunk
 * @returns Number of bits for length (4-12)
 *
 * @see MS-OVBA 2.4.1.3.19 (CopyToken Help)
 */
function computeCopyTokenBitCount(position: number): number {
  // The bit count depends on the decompressed position within the current chunk
  // position 1-16: 12 bits for length
  // position 17-32: 11 bits for length
  // position 33-64: 10 bits for length
  // ... and so on

  if (position <= 16) return 12;
  if (position <= 32) return 11;
  if (position <= 64) return 10;
  if (position <= 128) return 9;
  if (position <= 256) return 8;
  if (position <= 512) return 7;
  if (position <= 1024) return 6;
  if (position <= 2048) return 5;
  return 4;
}
