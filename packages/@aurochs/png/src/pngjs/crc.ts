/**
 * @file CRC32 calculator for PNG chunks
 *
 * Ported from pngjs (MIT License)
 * Copyright (c) 2015 Luke Page & Original Contributors
 * Copyright (c) 2012 Kuba Niegowski
 */

const crcTable: number[] = Array.from({ length: 256 }, (_, i) => {
  const crc = { current: i };
  Array.from({ length: 8 }, () => {
    if (crc.current & 1) {
      crc.current = 0xedb88320 ^ (crc.current >>> 1);
    } else {
      crc.current = crc.current >>> 1;
    }
  });
  return crc.current;
});

/**
 * Computes the CRC-32 checksum for a given byte buffer.
 * Used for PNG chunk integrity verification per the PNG specification.
 */
export function crc32(buf: Uint8Array): number {
  const crc = { current: -1 };
  Array.from({ length: buf.length }, (_, i) => {
    crc.current =
      crcTable[(crc.current ^ buf[i]) & 0xff] ^ (crc.current >>> 8);
  });
  return crc.current ^ -1;
}
