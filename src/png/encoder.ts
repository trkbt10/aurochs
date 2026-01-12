/**
 * @file Pure JavaScript PNG Encoder
 *
 * RFC 2083 (PNG), RFC 1950 (zlib), RFC 1951 (deflate) に基づく
 * 最小限のPNGエンコーダー実装。
 *
 * 特徴:
 * - 外部ライブラリ不要
 * - ブラウザ/Node.js両対応
 * - 非圧縮（store mode）で単純さを優先
 */

import { toDataUrl } from "../buffer/data-url";

// =============================================================================
// Public API
// =============================================================================

/**
 * RGBAデータをPNG Data URLにエンコード
 *
 * ブラウザ環境ではCanvas APIを優先使用し、
 * Node.js等ではPure JS実装にフォールバック。
 */
export function encodeRgbaToPngDataUrl(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): string {
  // Validate input dimensions
  const expectedLength = width * height * 4;
  if (rgbaData.length !== expectedLength) {
    console.warn(
      `[PNG Encoder] Data length mismatch: expected ${expectedLength} bytes for ${width}x${height}, got ${rgbaData.length}`
    );
    // If data is too short, pad with transparent pixels
    // If data is too long, truncate
    if (rgbaData.length < expectedLength) {
      const paddedData = new Uint8ClampedArray(expectedLength);
      paddedData.set(rgbaData);
      rgbaData = paddedData;
    } else {
      rgbaData = rgbaData.slice(0, expectedLength);
    }
  }

  // Try Canvas API first (browser environment)
  if (typeof OffscreenCanvas !== "undefined" || typeof document !== "undefined") {
    const canvasResult = tryEncodeWithCanvas(rgbaData, width, height);
    if (canvasResult) {
      return canvasResult;
    }
  }

  // Fallback: Pure JS PNG encoder (Node.js or environments without Canvas)
  return encodeWithPureJs(rgbaData, width, height);
}

/**
 * RGBAデータをPNGバイト列にエンコード
 *
 * Pure JS実装のみを使用。Canvas非依存。
 */
export function encodeRgbaToPng(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  return encodePng(rgbaData, width, height);
}

// =============================================================================
// Canvas API Encoder (Browser)
// =============================================================================

/**
 * Canvas APIを使用してPNGエンコード
 *
 * @returns Data URL on success, null if Canvas not available
 */
function tryEncodeWithCanvas(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  // Try regular canvas (document context)
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Ensure rgbaData has a plain ArrayBuffer (not SharedArrayBuffer)
        const clampedData = new Uint8ClampedArray(rgbaData);
        const imageData = new ImageData(clampedData, width, height);
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL("image/png");
      }
    } catch {
      // Fall through to pure JS
    }
  }

  return null;
}

/**
 * Pure JS エンコーダーを使用
 */
function encodeWithPureJs(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
): string {
  const png = encodePng(rgbaData, width, height);
  // Ensure we have a plain ArrayBuffer (png.buffer can be ArrayBufferLike)
  return toDataUrl(png.buffer.slice(0) as ArrayBuffer, "image/png");
}

// =============================================================================
// Pure JavaScript PNG Encoder (RFC 2083)
// =============================================================================

/**
 * PNG Signature (8 bytes)
 * RFC 2083 Section 3.1
 */
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * CRC32 lookup table (precomputed for performance)
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

/**
 * Calculate CRC32 for PNG chunk
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Create a PNG chunk
 *
 * PNG chunk structure:
 * - 4 bytes: length (big-endian)
 * - 4 bytes: type (ASCII)
 * - n bytes: data
 * - 4 bytes: CRC32 (of type + data)
 */
function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);

  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);

  // Length (4 bytes, big-endian)
  view.setUint32(0, data.length, false);

  // Type (4 bytes)
  chunk.set(typeBytes, 4);

  // Data
  chunk.set(data, 8);

  // CRC32 (of type + data)
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(typeBytes, 0);
  crcData.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcData), false);

  return chunk;
}

/**
 * Create IHDR chunk (Image Header)
 *
 * RFC 2083 Section 4.1.1
 */
function createIhdrChunk(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);

  view.setUint32(0, width, false);   // Width
  view.setUint32(4, height, false);  // Height
  data[8] = 8;   // Bit depth (8 bits per channel)
  data[9] = 6;   // Color type (6 = RGBA)
  data[10] = 0;  // Compression method (0 = deflate)
  data[11] = 0;  // Filter method (0 = adaptive)
  data[12] = 0;  // Interlace method (0 = no interlace)

  return createPngChunk("IHDR", data);
}

/**
 * Create IDAT chunk (Image Data)
 *
 * RFC 2083 Section 4.1.3
 * Uses uncompressed zlib (store mode) for simplicity
 */
function createIdatChunk(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8Array {
  // Add filter byte (0 = None) to each row
  const rowSize = width * 4 + 1; // RGBA + filter byte
  const filteredData = new Uint8Array(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    filteredData[rowOffset] = 0; // Filter type: None

    const srcRowOffset = y * width * 4;
    for (let x = 0; x < width * 4; x++) {
      filteredData[rowOffset + 1 + x] = rgbaData[srcRowOffset + x];
    }
  }

  // Wrap in zlib format (uncompressed/store)
  const zlibData = createUncompressedZlib(filteredData);

  return createPngChunk("IDAT", zlibData);
}

/**
 * Create uncompressed zlib stream (store mode)
 *
 * RFC 1950 (zlib) + RFC 1951 (deflate)
 * Using BTYPE=00 (no compression) for simplicity
 */
function createUncompressedZlib(data: Uint8Array): Uint8Array {
  // Maximum block size for deflate store is 65535 bytes
  const maxBlockSize = 65535;
  const numBlocks = Math.ceil(data.length / maxBlockSize);

  // Calculate total size
  // Zlib header: 2 bytes
  // Per block: 1 byte header + 2 bytes LEN + 2 bytes NLEN + data
  // Adler32: 4 bytes
  let totalSize = 2; // zlib header
  for (let i = 0; i < numBlocks; i++) {
    const blockStart = i * maxBlockSize;
    const blockLen = Math.min(maxBlockSize, data.length - blockStart);
    totalSize += 5 + blockLen; // block header + data
  }
  totalSize += 4; // adler32

  const result = new Uint8Array(totalSize);
  let offset = 0;

  // Zlib header (CMF + FLG)
  // CMF: CM=8 (deflate), CINFO=7 (32K window)
  // FLG: FCHECK to make (CMF*256 + FLG) % 31 == 0
  result[offset++] = 0x78; // CMF
  result[offset++] = 0x01; // FLG (no dict, fastest compression)

  // Deflate blocks (store mode)
  for (let i = 0; i < numBlocks; i++) {
    const blockStart = i * maxBlockSize;
    const blockLen = Math.min(maxBlockSize, data.length - blockStart);
    const isLast = i === numBlocks - 1;

    // Block header
    result[offset++] = isLast ? 0x01 : 0x00; // BFINAL + BTYPE=00

    // LEN (little-endian)
    result[offset++] = blockLen & 0xff;
    result[offset++] = (blockLen >> 8) & 0xff;

    // NLEN (one's complement of LEN)
    const nlen = blockLen ^ 0xffff;
    result[offset++] = nlen & 0xff;
    result[offset++] = (nlen >> 8) & 0xff;

    // Data
    result.set(data.subarray(blockStart, blockStart + blockLen), offset);
    offset += blockLen;
  }

  // Adler32 checksum
  const adler = adler32(data);
  result[offset++] = (adler >> 24) & 0xff;
  result[offset++] = (adler >> 16) & 0xff;
  result[offset++] = (adler >> 8) & 0xff;
  result[offset++] = adler & 0xff;

  return result;
}

/**
 * Calculate Adler-32 checksum
 * RFC 1950 Section 8.2
 */
function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  const MOD_ADLER = 65521;

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }

  return (b << 16) | a;
}

/**
 * Create IEND chunk (Image End)
 * RFC 2083 Section 4.1.5
 */
function createIendChunk(): Uint8Array {
  return createPngChunk("IEND", new Uint8Array(0));
}

/**
 * Encode RGBA data to PNG format
 *
 * @param rgbaData - RGBA pixel data (4 bytes per pixel)
 * @param width - Image width
 * @param height - Image height
 * @returns PNG file as Uint8Array
 */
function encodePng(rgbaData: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const ihdr = createIhdrChunk(width, height);
  const idat = createIdatChunk(rgbaData, width, height);
  const iend = createIendChunk();

  const totalLength = PNG_SIGNATURE.length + ihdr.length + idat.length + iend.length;
  const png = new Uint8Array(totalLength);

  let offset = 0;
  png.set(PNG_SIGNATURE, offset);
  offset += PNG_SIGNATURE.length;
  png.set(ihdr, offset);
  offset += ihdr.length;
  png.set(idat, offset);
  offset += idat.length;
  png.set(iend, offset);

  return png;
}
