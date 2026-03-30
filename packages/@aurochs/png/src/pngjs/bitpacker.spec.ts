/**
 * @file Tests for bitpacker.ts
 *
 * Tests color type conversions and error handling.
 */

import { bitPack } from "./bitpacker";
import { COLORTYPE_COLOR_ALPHA, COLORTYPE_COLOR, COLORTYPE_GRAYSCALE, COLORTYPE_ALPHA } from "./constants";

describe("bitPack", () => {
  describe("fast path (same colorType, 8-bit)", () => {
    it("returns the same reference when input === output color type", () => {
      const data = new Uint8Array([255, 0, 0, 255]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR_ALPHA, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result).toBe(data);
    });
  });

  describe("RGBA → RGB (strip alpha, blend onto white)", () => {
    it("produces 3-byte output per pixel", () => {
      const data = new Uint8Array([100, 150, 200, 255]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result.length).toBe(3);
    });

    it("fully opaque pixel preserves RGB values", () => {
      const data = new Uint8Array([100, 150, 200, 255]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result[0]).toBe(100);
      expect(result[1]).toBe(150);
      expect(result[2]).toBe(200);
    });

    it("fully transparent pixel blends to white", () => {
      const data = new Uint8Array([0, 0, 0, 0]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(255);
    });

    it("custom bgColor is used for blending", () => {
      const data = new Uint8Array([0, 0, 0, 0]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: {
          colorType: COLORTYPE_COLOR, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true,
          bgColor: { red: 0, green: 0, blue: 0 },
        },
      });
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
    });
  });

  describe("RGBA → Grayscale+Alpha", () => {
    it("outputs 2 bytes (gray + alpha)", () => {
      const data = new Uint8Array([90, 90, 90, 200]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_ALPHA, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result.length).toBe(2);
      expect(result[0]).toBe(90);
      expect(result[1]).toBe(200);
    });
  });

  describe("RGBA → Grayscale (no alpha)", () => {
    it("outputs 1 byte", () => {
      const data = new Uint8Array([120, 120, 120, 255]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_GRAYSCALE, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result.length).toBe(1);
      expect(result[0]).toBe(120);
    });
  });

  describe("Grayscale input → RGBA output", () => {
    it("expands to 4 bytes with alpha=255", () => {
      const data = new Uint8Array([128]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR_ALPHA, inputColorType: COLORTYPE_GRAYSCALE, bitDepth: 8, inputHasAlpha: false },
      });
      expect(result.length).toBe(4);
      expect(Array.from(result)).toEqual([128, 128, 128, 255]);
    });
  });

  describe("RGB input (no alpha) → RGBA output", () => {
    it("adds alpha=255", () => {
      const data = new Uint8Array([10, 20, 30]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR_ALPHA, inputColorType: COLORTYPE_COLOR, bitDepth: 8, inputHasAlpha: false },
      });
      expect(result.length).toBe(4);
      expect(Array.from(result)).toEqual([10, 20, 30, 255]);
    });
  });

  describe("Grayscale+Alpha input → RGBA output", () => {
    it("expands gray to all channels", () => {
      const data = new Uint8Array([80, 120]);
      const result = bitPack({
        dataIn: data, width: 1, height: 1,
        options: { colorType: COLORTYPE_COLOR_ALPHA, inputColorType: COLORTYPE_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result.length).toBe(4);
      expect(Array.from(result)).toEqual([80, 80, 80, 120]);
    });
  });

  describe("multi-pixel", () => {
    it("converts 2 pixels correctly", () => {
      const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
      const result = bitPack({
        dataIn: data, width: 2, height: 1,
        options: { colorType: COLORTYPE_COLOR, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
      });
      expect(result.length).toBe(6);
      expect(Array.from(result)).toEqual([255, 0, 0, 0, 255, 0]);
    });
  });

  describe("error handling", () => {
    it("throws on unsupported input color type", () => {
      expect(() => {
        bitPack({
          dataIn: new Uint8Array(4), width: 1, height: 1,
          options: { colorType: COLORTYPE_COLOR_ALPHA, inputColorType: 99, bitDepth: 8, inputHasAlpha: true },
        });
      }).toThrow("not supported");
    });

    it("throws on unsupported output color type", () => {
      expect(() => {
        bitPack({
          dataIn: new Uint8Array(4), width: 1, height: 1,
          options: { colorType: 99, inputColorType: COLORTYPE_COLOR_ALPHA, bitDepth: 8, inputHasAlpha: true },
        });
      }).toThrow("unrecognised color Type");
    });
  });
});
