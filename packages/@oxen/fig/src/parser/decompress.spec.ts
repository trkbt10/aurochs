/**
 * @file Decompress unit tests
 */

import { deflate, deflateRaw } from "pako";
import { decompress, decompressDeflate, decompressDeflateRaw } from "./decompress";
import { detectCompression } from "../compression";

describe("detectCompression", () => {
  it("detects zstd compression by magic bytes", () => {
    // Zstd magic: 0x28 0xB5 0x2F 0xFD
    const data = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x00]);
    expect(detectCompression(data)).toBe("zstd");
  });

  it("returns deflate for non-zstd data (raw deflate has no header)", () => {
    // detectCompression cannot distinguish raw deflate from arbitrary data
    // because raw deflate has no magic header
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(detectCompression(data)).toBe("deflate");
  });

  it("returns none for short data (< 4 bytes)", () => {
    const data = new Uint8Array([0x28, 0xb5]);
    expect(detectCompression(data)).toBe("none");
  });
});

describe("decompressDeflate (zlib-wrapped)", () => {
  it("decompresses zlib-wrapped deflate data", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const compressed = deflate(original);
    const decompressed = decompressDeflate(compressed);
    expect(decompressed).toEqual(original);
  });

  it("handles larger data", () => {
    const original = new Uint8Array(1000);
    for (const [i] of original.entries()) {
      original[i] = i % 256;
    }
    const compressed = deflate(original);
    const decompressed = decompressDeflate(compressed);
    expect(decompressed).toEqual(original);
  });

  it("throws on invalid data", () => {
    const invalidData = new Uint8Array([0x78, 0x9c, 0xff, 0xff]);
    expect(() => decompressDeflate(invalidData)).toThrow();
  });
});

describe("decompressDeflateRaw", () => {
  it("decompresses raw deflate data (no zlib header)", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const compressed = deflateRaw(original);
    const decompressed = decompressDeflateRaw(compressed);
    expect(decompressed).toEqual(original);
  });
});

describe("decompress (auto-detect)", () => {
  it("decompresses raw deflate data", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const compressed = deflateRaw(original);
    const decompressed = decompress(compressed);
    expect(decompressed).toEqual(original);
  });
});
