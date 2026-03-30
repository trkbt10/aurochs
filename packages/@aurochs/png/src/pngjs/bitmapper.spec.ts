/**
 * @file Tests for bitmapper.ts
 *
 * Tests pixel data extraction for each bpp and error cases.
 */

import { dataToBitMap } from "./bitmapper";

describe("dataToBitMap", () => {
  describe("8-bit depth", () => {
    it("bpp=4 (RGBA) maps directly", () => {
      const data = new Uint8Array([10, 20, 30, 40]);
      const result = dataToBitMap(data, { width: 1, height: 1, depth: 8, bpp: 4, interlace: false });
      expect(Array.from(result)).toEqual([10, 20, 30, 40]);
    });

    it("bpp=3 (RGB) adds alpha=0xff", () => {
      const data = new Uint8Array([10, 20, 30]);
      const result = dataToBitMap(data, { width: 1, height: 1, depth: 8, bpp: 3, interlace: false });
      expect(Array.from(result)).toEqual([10, 20, 30, 0xff]);
    });

    it("bpp=2 (Grayscale+Alpha) expands to RGBA", () => {
      const data = new Uint8Array([100, 50]);
      const result = dataToBitMap(data, { width: 1, height: 1, depth: 8, bpp: 2, interlace: false });
      expect(Array.from(result)).toEqual([100, 100, 100, 50]);
    });

    it("bpp=1 (Grayscale) expands to RGBA with alpha=0xff", () => {
      const data = new Uint8Array([128]);
      const result = dataToBitMap(data, { width: 1, height: 1, depth: 8, bpp: 1, interlace: false });
      expect(Array.from(result)).toEqual([128, 128, 128, 0xff]);
    });

    it("2x2 RGBA maps correctly", () => {
      const data = new Uint8Array([
        1, 2, 3, 4,
        5, 6, 7, 8,
        9, 10, 11, 12,
        13, 14, 15, 16,
      ]);
      const result = dataToBitMap(data, { width: 2, height: 2, depth: 8, bpp: 4, interlace: false });
      expect(Array.from(result)).toEqual(Array.from(data));
    });

    it("throws on extra data", () => {
      expect(() => {
        dataToBitMap(new Uint8Array([1, 2, 3, 4, 99]), { width: 1, height: 1, depth: 8, bpp: 4, interlace: false });
      }).toThrow("extra data found");
    });

    it("throws on insufficient data", () => {
      expect(() => {
        dataToBitMap(new Uint8Array([1, 2]), { width: 1, height: 1, depth: 8, bpp: 4, interlace: false });
      }).toThrow("Ran out of data");
    });
  });

  describe("4-bit depth", () => {
    it("1x1 bpp=1 grayscale: extracts high nibble", () => {
      // 4-bit: byte 0xA0 → high nibble=10, low nibble=0
      const data = new Uint8Array([0xa0]);
      const result = dataToBitMap(data, { width: 1, height: 1, depth: 4, bpp: 1, interlace: false });
      // maxBit = 15, pixel=10 → R=G=B=10, A=15
      expect(result[0]).toBe(10);
      expect(result[3]).toBe(15); // maxBit
    });

    it("2x1 bpp=1: both nibbles of a byte used in one row", () => {
      // 0xAB → high nibble=10, low nibble=11
      const data = new Uint8Array([0xab]);
      const result = dataToBitMap(data, { width: 2, height: 1, depth: 4, bpp: 1, interlace: false });
      expect(result[0]).toBe(10); // pixel 0
      expect(result[4]).toBe(11); // pixel 1
    });
  });

  describe("2-bit depth", () => {
    it("extracts 4 pixels from one byte", () => {
      // 0b_11_10_01_00 = 0xE4
      const data = new Uint8Array([0xe4]);
      const result = dataToBitMap(data, { width: 4, height: 1, depth: 2, bpp: 1, interlace: false });
      expect(result[0]).toBe(3);  // first pixel, maxBit=3
      expect(result[4]).toBe(2);
      expect(result[8]).toBe(1);
      expect(result[12]).toBe(0);
    });
  });

  describe("1-bit depth", () => {
    it("extracts 8 pixels from one byte", () => {
      // 0b10101010 = 0xAA
      const data = new Uint8Array([0xaa]);
      const result = dataToBitMap(data, { width: 8, height: 1, depth: 1, bpp: 1, interlace: false });
      // maxBit = 1
      expect(result[0]).toBe(1);   // bit 7
      expect(result[4]).toBe(0);   // bit 6
      expect(result[8]).toBe(1);   // bit 5
      expect(result[12]).toBe(0);  // bit 4
    });
  });
});
