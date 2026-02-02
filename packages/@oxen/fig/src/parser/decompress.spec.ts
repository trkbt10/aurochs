/**
 * @file Decompress unit tests
 */

import { deflate } from "pako";
import {
  decompress,
  decompressDeflate,
  detectCompression,
} from "./decompress";

describe("detectCompression", () => {
  it("detects deflate compression", () => {
    const data = deflate(new Uint8Array([1, 2, 3, 4, 5]));
    expect(detectCompression(data)).toBe("deflate");
  });

  it("detects zstd compression by magic bytes", () => {
    // Zstd magic: 0x28 0xB5 0x2F 0xFD
    const data = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x00]);
    expect(detectCompression(data)).toBe("zstd");
  });

  it("returns none for unknown data", () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(detectCompression(data)).toBe("none");
  });

  it("returns none for short data", () => {
    const data = new Uint8Array([0x28, 0xb5]);
    expect(detectCompression(data)).toBe("none");
  });
});

describe("decompressDeflate", () => {
  it("decompresses deflate data", () => {
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

describe("decompress", () => {
  it("auto-detects and decompresses deflate", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const compressed = deflate(original);
    const decompressed = decompress(compressed);
    expect(decompressed).toEqual(original);
  });

  it("returns uncompressed data as-is", () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const result = decompress(data);
    expect(result).toEqual(data);
  });
});
