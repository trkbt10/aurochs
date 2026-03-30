/**
 * @file Tests for parser-sync.ts
 *
 * Tests decoding and round-trip (pack → parseSync) for various pixel formats.
 */

import { parseSync } from "./parser-sync";
import { pack } from "./packer";
import { COLORTYPE_COLOR, COLORTYPE_COLOR_ALPHA, COLORTYPE_GRAYSCALE } from "./constants";

describe("parseSync", () => {
  describe("error handling", () => {
    it("throws on invalid PNG signature", () => {
      expect(() => parseSync(new Uint8Array(8))).toThrow("Invalid file signature");
    });

    it("throws on truncated input", () => {
      expect(() => parseSync(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        .toThrow();
    });
  });

  describe("options", () => {
    it("checkCRC: false skips CRC validation", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) });
      const result = parseSync(png, { checkCRC: false });
      expect(result.width).toBe(1);
    });

    it("skipRescale: true does not alter data", () => {
      const data = new Uint8Array([100, 200, 50, 255]);
      const png = pack({ width: 1, height: 1, data });
      const result = parseSync(png, { skipRescale: true });
      expect(result.data[0]).toBe(100);
    });
  });

  describe("round-trip RGBA (colorType 6)", () => {
    it("1x1 red pixel", () => {
      const data = new Uint8Array([255, 0, 0, 255]);
      const result = parseSync(pack({ width: 1, height: 1, data }));
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
      expect(result.depth).toBe(8);
      expect(result.colorType).toBe(6);
      expect(Array.from(result.data)).toEqual([255, 0, 0, 255]);
    });

    it("2x2 multi-color", () => {
      const data = new Uint8Array([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 255, 255, 128,
      ]);
      const result = parseSync(pack({ width: 2, height: 2, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });

    it("fully transparent pixel", () => {
      const data = new Uint8Array([128, 64, 32, 0]);
      const result = parseSync(pack({ width: 1, height: 1, data }));
      expect(Array.from(result.data)).toEqual([128, 64, 32, 0]);
    });

    it("all-zero 4x4", () => {
      const data = new Uint8Array(4 * 4 * 4);
      const result = parseSync(pack({ width: 4, height: 4, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });

    it("all-white 3x3", () => {
      const data = new Uint8Array(3 * 3 * 4);
      data.fill(255);
      const result = parseSync(pack({ width: 3, height: 3, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });

    it("10x10 gradient", () => {
      const data = new Uint8Array(10 * 10 * 4);
      for (const i of Array.from({ length: 100 }, (_, j) => j)) {
        data[i * 4] = i % 256;
        data[i * 4 + 1] = (i * 2) % 256;
        data[i * 4 + 2] = (i * 3) % 256;
        data[i * 4 + 3] = 255;
      }
      const result = parseSync(pack({ width: 10, height: 10, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });

    it("50x50", () => {
      const data = new Uint8Array(50 * 50 * 4);
      for (const i of Array.from({ length: 50 * 50 }, (_, j) => j)) {
        data[i * 4] = i % 256;
        data[i * 4 + 1] = Math.floor(i / 256) % 256;
        data[i * 4 + 2] = 128;
        data[i * 4 + 3] = 255;
      }
      const result = parseSync(pack({ width: 50, height: 50, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });

    it("wide 200x1", () => {
      const data = new Uint8Array(200 * 4);
      for (const i of Array.from({ length: 200 }, (_, j) => j)) {
        data[i * 4] = i % 256;
        data[i * 4 + 3] = 255;
      }
      const result = parseSync(pack({ width: 200, height: 1, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });

    it("tall 1x200", () => {
      const data = new Uint8Array(200 * 4);
      for (const i of Array.from({ length: 200 }, (_, j) => j)) {
        data[i * 4 + 1] = i % 256;
        data[i * 4 + 3] = 255;
      }
      const result = parseSync(pack({ width: 1, height: 200, data }));
      expect(Array.from(result.data)).toEqual(Array.from(data));
    });
  });

  describe("round-trip RGB (colorType 2)", () => {
    it("preserves pixel values", () => {
      const data = new Uint8Array([200, 100, 50, 255]);
      const png = pack({ width: 1, height: 1, data }, { colorType: COLORTYPE_COLOR, inputColorType: COLORTYPE_COLOR_ALPHA });
      const result = parseSync(png);
      expect(result.colorType).toBe(COLORTYPE_COLOR);
      expect(result.data[0]).toBe(200);
      expect(result.data[1]).toBe(100);
      expect(result.data[2]).toBe(50);
      expect(result.data[3]).toBe(255);
    });
  });

  describe("round-trip Grayscale (colorType 0)", () => {
    it("preserves grayscale value", () => {
      const data = new Uint8Array([100, 100, 100, 255]);
      const png = pack({ width: 1, height: 1, data }, { colorType: COLORTYPE_GRAYSCALE, inputColorType: COLORTYPE_COLOR_ALPHA });
      const result = parseSync(png);
      expect(result.colorType).toBe(COLORTYPE_GRAYSCALE);
      expect(result.data[0]).toBe(100);
      expect(result.data[3]).toBe(255);
    });
  });

  describe("gamma", () => {
    it("round-trips gamma metadata", () => {
      const data = new Uint8Array([50, 100, 150, 255]);
      const png = pack({ width: 1, height: 1, data, gamma: 2.2 });
      const result = parseSync(png);
      expect(result.gamma).toBeCloseTo(2.2, 1);
      expect(Array.from(result.data)).toEqual([50, 100, 150, 255]);
    });
  });
});
