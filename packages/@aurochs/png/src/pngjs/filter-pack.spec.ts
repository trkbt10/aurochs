/**
 * @file Tests for filter-pack.ts
 *
 * Tests each PNG filter type individually and the auto-selection logic.
 */

import { filterData } from "./filter-pack";

describe("filterData", () => {
  describe("filterType=0 (None)", () => {
    it("1x1 bpp=4: prepends filter byte 0 and copies data", () => {
      const px = new Uint8Array([10, 20, 30, 40]);
      const result = filterData({ pxData: px, width: 1, height: 1, options: { filterType: 0 }, bpp: 4 });
      expect(Array.from(result)).toEqual([0, 10, 20, 30, 40]);
    });

    it("2x1 bpp=1: copies all bytes", () => {
      const px = new Uint8Array([100, 200]);
      const result = filterData({ pxData: px, width: 2, height: 1, options: { filterType: 0 }, bpp: 1 });
      expect(Array.from(result)).toEqual([0, 100, 200]);
    });
  });

  describe("filterType=1 (Sub)", () => {
    it("first byte is raw (no left neighbor)", () => {
      const px = new Uint8Array([50, 80]);
      const result = filterData({ pxData: px, width: 2, height: 1, options: { filterType: 1 }, bpp: 1 });
      expect(result[0]).toBe(1); // filter type
      expect(result[1]).toBe(50); // first: no left
      expect(result[2]).toBe(30); // 80 - 50
    });

    it("bpp=4: subtracts 4 bytes back", () => {
      const px = new Uint8Array([10, 20, 30, 40, 15, 25, 35, 45]);
      const result = filterData({ pxData: px, width: 2, height: 1, options: { filterType: 1 }, bpp: 4 });
      expect(result[0]).toBe(1);
      // first pixel raw
      expect(result[1]).toBe(10);
      expect(result[2]).toBe(20);
      expect(result[3]).toBe(30);
      expect(result[4]).toBe(40);
      // second pixel: sub from first
      expect(result[5]).toBe(5);  // 15-10
      expect(result[6]).toBe(5);  // 25-20
      expect(result[7]).toBe(5);  // 35-30
      expect(result[8]).toBe(5);  // 45-40
    });
  });

  describe("filterType=2 (Up)", () => {
    it("first line is raw (no above), second line subtracts above", () => {
      const px = new Uint8Array([50, 80]);
      const result = filterData({ pxData: px, width: 1, height: 2, options: { filterType: 2 }, bpp: 1 });
      expect(result[0]).toBe(2);
      expect(result[1]).toBe(50); // first line: no above
      expect(result[2]).toBe(2);
      expect(result[3]).toBe(30); // 80 - 50
    });
  });

  describe("filterType=3 (Average)", () => {
    it("first line single pixel: avg of (0+0)/2 = 0, so raw", () => {
      const px = new Uint8Array([100]);
      const result = filterData({ pxData: px, width: 1, height: 1, options: { filterType: 3 }, bpp: 1 });
      expect(result[0]).toBe(3);
      expect(result[1]).toBe(100);
    });
  });

  describe("filterType=4 (Paeth)", () => {
    it("first line single pixel: paeth(0,0,0)=0, so raw", () => {
      const px = new Uint8Array([42]);
      const result = filterData({ pxData: px, width: 1, height: 1, options: { filterType: 4 }, bpp: 1 });
      expect(result[0]).toBe(4);
      expect(result[1]).toBe(42);
    });
  });

  describe("filterType=-1 (auto)", () => {
    it("output length matches (byteWidth+1)*height", () => {
      const px = new Uint8Array(4 * 3); // 1x3, bpp=4
      const result = filterData({ pxData: px, width: 1, height: 3, options: { filterType: -1 }, bpp: 4 });
      expect(result.length).toBe((4 + 1) * 3);
    });

    it("each line starts with a valid filter type byte (0-4)", () => {
      const px = new Uint8Array(8 * 5); // 2x5, bpp=4
      const result = filterData({ pxData: px, width: 2, height: 5, options: { filterType: -1 }, bpp: 4 });
      const byteWidth = 2 * 4;
      for (const y of Array.from({ length: 5 }, (_, i) => i)) {
        const filterByte = result[y * (byteWidth + 1)];
        expect(filterByte).toBeGreaterThanOrEqual(0);
        expect(filterByte).toBeLessThanOrEqual(4);
      }
    });
  });

  describe("filterType omitted (defaults to auto)", () => {
    it("produces valid output", () => {
      const px = new Uint8Array(4);
      const result = filterData({ pxData: px, width: 1, height: 1, options: {}, bpp: 4 });
      expect(result.length).toBe(5);
    });
  });
});
