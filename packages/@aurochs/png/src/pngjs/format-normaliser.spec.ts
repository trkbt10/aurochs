/**
 * @file Tests for format-normaliser.ts
 */

import { normaliseFormat } from "./format-normaliser";

describe("normaliseFormat", () => {
  describe("8-bit non-paletted, no transColor", () => {
    it("returns data unchanged", () => {
      const data = new Uint8Array([10, 20, 30, 255]);
      const result = normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 6 });
      expect(result).toBe(data);
    });
  });

  describe("transColor replacement (grayscale)", () => {
    it("zeroes matching pixel", () => {
      const data = new Uint8Array([100, 100, 100, 255]);
      normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 0, transColor: [100] });
      expect(Array.from(data)).toEqual([0, 0, 0, 0]);
    });

    it("leaves non-matching pixel unchanged", () => {
      const data = new Uint8Array([50, 50, 50, 255]);
      normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 0, transColor: [100] });
      expect(Array.from(data)).toEqual([50, 50, 50, 255]);
    });
  });

  describe("transColor replacement (RGB)", () => {
    it("zeroes matching RGB pixel", () => {
      const data = new Uint8Array([10, 20, 30, 255]);
      normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 2, transColor: [10, 20, 30] });
      expect(Array.from(data)).toEqual([0, 0, 0, 0]);
    });

    it("leaves non-matching RGB pixel unchanged", () => {
      const data = new Uint8Array([10, 20, 31, 255]);
      normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 2, transColor: [10, 20, 30] });
      expect(Array.from(data)).toEqual([10, 20, 31, 255]);
    });
  });

  describe("transColor with multiple pixels", () => {
    it("only zeroes matching pixels in 2-pixel image", () => {
      const data = new Uint8Array([10, 20, 30, 255, 50, 60, 70, 255]);
      normaliseFormat(data, { depth: 8, width: 2, height: 1, colorType: 2, transColor: [10, 20, 30] });
      expect(Array.from(data)).toEqual([0, 0, 0, 0, 50, 60, 70, 255]);
    });
  });

  describe("depth scaling", () => {
    it("scales 4-bit to 8-bit", () => {
      // maxIn=15, pixel value 15 → 255, pixel value 0 → 0
      const data = new Uint8Array([15, 15, 15, 15]);
      const result = normaliseFormat(data, { depth: 4, width: 1, height: 1, colorType: 6 });
      expect(result[0]).toBe(255);
      expect(result[3]).toBe(255);
    });

    it("scales 2-bit to 8-bit", () => {
      // maxIn=3, pixel value 3 → 255
      const data = new Uint8Array([3, 3, 3, 3]);
      const result = normaliseFormat(data, { depth: 2, width: 1, height: 1, colorType: 6 });
      expect(result[0]).toBe(255);
    });

    it("scales 1-bit to 8-bit", () => {
      // maxIn=1, pixel value 1 → 255
      const data = new Uint8Array([1, 1, 1, 1]);
      const result = normaliseFormat(data, { depth: 1, width: 1, height: 1, colorType: 6 });
      expect(result[0]).toBe(255);
    });

    it("scales 1-bit zero to 0", () => {
      const data = new Uint8Array([0, 0, 0, 0]);
      const result = normaliseFormat(data, { depth: 1, width: 1, height: 1, colorType: 6 });
      expect(result[0]).toBe(0);
    });
  });

  describe("skipRescale", () => {
    it("returns data unchanged when skipRescale=true, depth≠8", () => {
      const data = new Uint8Array([1, 1, 1, 1]);
      const result = normaliseFormat(data, { depth: 4, width: 1, height: 1, colorType: 6 }, true);
      expect(result).toBe(data);
      expect(result[0]).toBe(1); // not scaled
    });
  });

  describe("palette (colorType 3)", () => {
    it("expands palette indices to RGBA", () => {
      // pixel index 0 → palette[0] = [255, 0, 0, 255]
      const data = new Uint8Array([0, 0, 0, 0]); // pxPos reads data[0]=0
      const palette = [[255, 0, 0, 255], [0, 255, 0, 128]];
      const result = normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 3, palette });
      expect(Array.from(result)).toEqual([255, 0, 0, 255]);
    });

    it("expands second palette entry", () => {
      const data = new Uint8Array([1, 0, 0, 0]);
      const palette = [[255, 0, 0, 255], [0, 255, 0, 128]];
      const result = normaliseFormat(data, { depth: 8, width: 1, height: 1, colorType: 3, palette });
      expect(Array.from(result)).toEqual([0, 255, 0, 128]);
    });
  });

  describe("16-bit depth scaling", () => {
    it("allocates new Uint8Array and scales down", () => {
      // 16-bit depth: Uint16Array input
      const input = new Uint16Array([65535, 0, 32768, 65535]);
      const result = normaliseFormat(input, { depth: 16, width: 1, height: 1, colorType: 6 });
      expect(result instanceof Uint8Array).toBe(true);
      expect(result[0]).toBe(255);  // 65535 → 255
      expect(result[1]).toBe(0);    // 0 → 0
      expect(result[2]).toBe(128);  // 32768 → ~128
    });
  });
});
