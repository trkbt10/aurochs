/**
 * @file src/pdf/converter/pixel-converter.spec.ts
 */

import {
  convertToRgba,
  convertGrayToRgba,
  convertRgbToRgba,
  convertCmykToRgba,
  convertIccBasedToRgba,
} from "./pixel-converter";

function createConsoleSpy(method: "warn" | "info"): Readonly<{
  readonly calls: readonly ReadonlyArray<unknown>[];
  readonly restore: () => void;
}> {
  const calls: ReadonlyArray<unknown>[] = [];
  const original = console[method];

  console[method] = (...args: unknown[]) => {
    calls.push(args);
  };

  const restore = (): void => {
    console[method] = original;
  };

  return { calls, restore };
}

describe("pixel-converter", () => {
  describe("convertGrayToRgba", () => {
    test("converts single pixel grayscale", () => {
      const data = new Uint8Array([128]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertGrayToRgba(data, 1, rgba);

      expect(result[0]).toBe(128);
      expect(result[1]).toBe(128);
      expect(result[2]).toBe(128);
      expect(result[3]).toBe(255);
    });

    test("converts black pixel", () => {
      const data = new Uint8Array([0]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertGrayToRgba(data, 1, rgba);

      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(255);
    });

    test("converts white pixel", () => {
      const data = new Uint8Array([255]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertGrayToRgba(data, 1, rgba);

      expect(result[0]).toBe(255);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(255);
      expect(result[3]).toBe(255);
    });
  });

  describe("convertRgbToRgba", () => {
    test("converts single pixel RGB", () => {
      const data = new Uint8Array([255, 128, 64]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertRgbToRgba(data, 1, rgba);

      expect(result[0]).toBe(255);
      expect(result[1]).toBe(128);
      expect(result[2]).toBe(64);
      expect(result[3]).toBe(255);
    });
  });

  describe("convertCmykToRgba", () => {
    test("converts pure cyan to RGB", () => {
      // C=255, M=0, Y=0, K=0 → R=0, G=255, B=255
      const data = new Uint8Array([255, 0, 0, 0]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertCmykToRgba(data, 1, rgba);

      expect(result[0]).toBe(0);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(255);
      expect(result[3]).toBe(255);
    });

    test("converts pure black to RGB", () => {
      // C=0, M=0, Y=0, K=255 → R=0, G=0, B=0
      const data = new Uint8Array([0, 0, 0, 255]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertCmykToRgba(data, 1, rgba);

      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(255);
    });
  });

  describe("convertIccBasedToRgba", () => {
    test("auto-detects grayscale from data length", () => {
      const data = new Uint8Array([200]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertIccBasedToRgba(data, 1, rgba);

      expect(result[0]).toBe(200);
      expect(result[1]).toBe(200);
      expect(result[2]).toBe(200);
      expect(result[3]).toBe(255);
    });

    test("auto-detects RGB from data length", () => {
      const data = new Uint8Array([100, 150, 200]);
      const rgba = new Uint8ClampedArray(4);
      const result = convertIccBasedToRgba(data, 1, rgba);

      expect(result[0]).toBe(100);
      expect(result[1]).toBe(150);
      expect(result[2]).toBe(200);
      expect(result[3]).toBe(255);
    });
  });

  describe("convertToRgba", () => {
    test("converts DeviceGray", () => {
      const data = new Uint8Array([128]);
      const result = convertToRgba(data, 1, 1, "DeviceGray", 8);

      expect(result[0]).toBe(128);
      expect(result[1]).toBe(128);
      expect(result[2]).toBe(128);
      expect(result[3]).toBe(255);
    });

    test("converts DeviceRGB", () => {
      const data = new Uint8Array([255, 0, 128]);
      const result = convertToRgba(data, 1, 1, "DeviceRGB", 8);

      expect(result[0]).toBe(255);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(128);
      expect(result[3]).toBe(255);
    });

    test("converts DeviceCMYK", () => {
      const data = new Uint8Array([0, 0, 0, 0]); // White in CMYK
      const result = convertToRgba(data, 1, 1, "DeviceCMYK", 8);

      expect(result[0]).toBe(255);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(255);
      expect(result[3]).toBe(255);
    });

    test("handles 2x2 image", () => {
      const data = new Uint8Array([0, 128, 192, 255]); // 4 grayscale pixels
      const result = convertToRgba(data, 2, 2, "DeviceGray", 8);

      expect(result.length).toBe(16); // 4 pixels * 4 channels
      expect(result[0]).toBe(0);
      expect(result[4]).toBe(128);
      expect(result[8]).toBe(192);
      expect(result[12]).toBe(255);
    });

    test("expands 1-bit packed grayscale", () => {
      // 2 pixels: [0, 1] packed into the high bits: 0b0100_0000
      const data = new Uint8Array([0b0100_0000]);
      const result = convertToRgba(data, 2, 1, "DeviceGray", 1);

      expect(Array.from(result)).toEqual([
        0,
        0,
        0,
        255,
        255,
        255,
        255,
        255,
      ]);
    });

    test("expands 2-bit packed grayscale", () => {
      // 4 pixels: [0, 1, 2, 3] packed as: 00 01 10 11 => 0x1B
      const data = new Uint8Array([0x1b]);
      const result = convertToRgba(data, 4, 1, "DeviceGray", 2);

      expect(result[0]).toBe(0);
      expect(result[4]).toBe(85);
      expect(result[8]).toBe(170);
      expect(result[12]).toBe(255);
    });

    test("expands 4-bit packed grayscale", () => {
      // 3 pixels: [0, 15, 8] packed as: 0x0F, 0x80
      const data = new Uint8Array([0x0f, 0x80]);
      const result = convertToRgba(data, 3, 1, "DeviceGray", 4);

      expect(result[0]).toBe(0);
      expect(result[4]).toBe(255);
      expect(result[8]).toBe(136);
    });

    test("downsamples 16-bit RGB to 8-bit", () => {
      // 1 pixel, RGB, big-endian per component:
      // R=0x1234 => 0x12, G=0xABCD => 0xAB, B=0x00FF => 0x00
      const data = new Uint8Array([0x12, 0x34, 0xab, 0xcd, 0x00, 0xff]);
      const infoSpy = createConsoleSpy("info");
      const result = convertToRgba(data, 1, 1, "DeviceRGB", 16);

      expect(Array.from(result)).toEqual([0x12, 0xab, 0x00, 255]);
      expect(infoSpy.calls.length).toBeGreaterThan(0);
      infoSpy.restore();
    });

    test("throws for unsupported bitsPerComponent", () => {
      const data = new Uint8Array([0]);
      expect(() => convertToRgba(data, 1, 1, "DeviceGray", 3)).toThrow(
        /Unsupported bitsPerComponent/
      );
    });

    test("warns and proceeds on small data length mismatch", () => {
      const warnSpy = createConsoleSpy("warn");
      const data = new Uint8Array(19).fill(255);
      const result = convertToRgba(data, 20, 1, "DeviceGray", 8);

      expect(result.length).toBe(20 * 4);
      expect(result[19 * 4]).toBe(0);
      expect(warnSpy.calls.some((call) => String(call[0]).includes("Attempting to proceed."))).toBe(
        true
      );
      warnSpy.restore();
    });

    test("throws on large data length mismatch", () => {
      const data = new Uint8Array(10).fill(255);
      expect(() => convertToRgba(data, 20, 1, "DeviceGray", 8)).toThrow(/Cannot process image/);
    });
  });
});
