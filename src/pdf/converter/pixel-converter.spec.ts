import {
  convertToRgba,
  convertGrayToRgba,
  convertRgbToRgba,
  convertCmykToRgba,
  convertIccBasedToRgba,
} from "./pixel-converter";

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
  });
});
