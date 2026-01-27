/**
 * @file PNG Encoder tests
 */

import { encodeRgbaToPng, encodeRgbaToPngDataUrl } from "./encoder";

describe("PNG Encoder", () => {
  describe("encodeRgbaToPng", () => {
    it("creates valid PNG signature", () => {
      const rgbaData = new Uint8ClampedArray([255, 0, 0, 255]); // 1x1 red pixel
      const png = encodeRgbaToPng(rgbaData, 1, 1);

      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
      expect(png[2]).toBe(0x4e);
      expect(png[3]).toBe(0x47);
      expect(png[4]).toBe(0x0d);
      expect(png[5]).toBe(0x0a);
      expect(png[6]).toBe(0x1a);
      expect(png[7]).toBe(0x0a);
    });

    it("creates valid IHDR chunk", () => {
      const rgbaData = new Uint8ClampedArray([0, 255, 0, 255]); // 1x1 green pixel
      const png = encodeRgbaToPng(rgbaData, 1, 1);

      // IHDR chunk starts at offset 8 (after signature)
      // Length: 4 bytes (should be 13 for IHDR)
      const ihdrLength = (png[8] << 24) | (png[9] << 16) | (png[10] << 8) | png[11];
      expect(ihdrLength).toBe(13);

      // Type: IHDR (ASCII)
      expect(String.fromCharCode(png[12], png[13], png[14], png[15])).toBe("IHDR");

      // Width: 1 (big-endian at offset 16)
      const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
      expect(width).toBe(1);

      // Height: 1 (big-endian at offset 20)
      const height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
      expect(height).toBe(1);

      // Bit depth: 8
      expect(png[24]).toBe(8);

      // Color type: 6 (RGBA)
      expect(png[25]).toBe(6);
    });

    it("creates IDAT and IEND chunks", () => {
      const rgbaData = new Uint8ClampedArray([0, 0, 255, 255]); // 1x1 blue pixel
      const png = encodeRgbaToPng(rgbaData, 1, 1);

      // Find IDAT chunk (after IHDR)
      // IHDR: 8 (signature) + 4 (len) + 4 (type) + 13 (data) + 4 (crc) = 33 bytes
      const idatStart = 33;
      expect(String.fromCharCode(png[idatStart + 4], png[idatStart + 5], png[idatStart + 6], png[idatStart + 7]))
        .toBe("IDAT");

      // Find IEND chunk at the end
      const iendOffset = png.length - 12; // IEND is always 12 bytes (4 len + 4 type + 0 data + 4 crc)
      expect(String.fromCharCode(png[iendOffset + 4], png[iendOffset + 5], png[iendOffset + 6], png[iendOffset + 7]))
        .toBe("IEND");
    });

    it("encodes larger images correctly", () => {
      // 2x2 image: red, green, blue, white
      const rgbaData = new Uint8ClampedArray([
        255, 0, 0, 255,     // red
        0, 255, 0, 255,     // green
        0, 0, 255, 255,     // blue
        255, 255, 255, 255, // white
      ]);
      const png = encodeRgbaToPng(rgbaData, 2, 2);

      // Verify IHDR has correct dimensions
      const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
      const height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
      expect(width).toBe(2);
      expect(height).toBe(2);

      // Verify PNG has valid structure (signature + chunks)
      expect(png.length).toBeGreaterThan(33 + 12); // At least IHDR + IEND
    });
  });

  describe("encodeRgbaToPngDataUrl", () => {
    it("returns data URL with image/png MIME type", () => {
      const rgbaData = new Uint8ClampedArray([128, 128, 128, 255]); // 1x1 gray pixel
      const dataUrl = encodeRgbaToPngDataUrl(rgbaData, 1, 1);

      expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    });

    it("produces valid base64 encoded PNG", () => {
      const rgbaData = new Uint8ClampedArray([255, 0, 0, 255]); // 1x1 red pixel
      const dataUrl = encodeRgbaToPngDataUrl(rgbaData, 1, 1);

      // Extract base64 part
      const base64 = dataUrl.replace("data:image/png;base64,", "");

      // Decode and verify PNG signature
      const binary = atob(base64);
      expect(binary.charCodeAt(0)).toBe(0x89);
      expect(binary.charCodeAt(1)).toBe(0x50); // 'P'
      expect(binary.charCodeAt(2)).toBe(0x4e); // 'N'
      expect(binary.charCodeAt(3)).toBe(0x47); // 'G'
    });
  });

  describe("handles edge cases", () => {
    it("encodes transparent pixels correctly", () => {
      const rgbaData = new Uint8ClampedArray([255, 0, 0, 0]); // fully transparent red
      const png = encodeRgbaToPng(rgbaData, 1, 1);

      // Should produce valid PNG without errors
      expect(png[0]).toBe(0x89);
      expect(png.length).toBeGreaterThan(33);
    });

    it("encodes semi-transparent pixels", () => {
      const rgbaData = new Uint8ClampedArray([255, 0, 0, 128]); // 50% transparent red
      const png = encodeRgbaToPng(rgbaData, 1, 1);

      expect(png[0]).toBe(0x89);
      expect(png.length).toBeGreaterThan(33);
    });

    it("handles large images (100x100)", () => {
      const size = 100 * 100 * 4;
      const rgbaData = new Uint8ClampedArray(size);
      // Fill with gradient
      for (let i = 0; i < size; i += 4) {
        const pixel = i / 4;
        rgbaData[i] = pixel % 256;
        rgbaData[i + 1] = Math.floor(pixel / 256);
        rgbaData[i + 2] = 128;
        rgbaData[i + 3] = 255;
      }

      const png = encodeRgbaToPng(rgbaData, 100, 100);

      // Verify structure
      expect(png[0]).toBe(0x89);
      const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
      const height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
      expect(width).toBe(100);
      expect(height).toBe(100);
    });
  });
});
