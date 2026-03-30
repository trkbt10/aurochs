/**
 * @file Tests for packer.ts
 */

import { pack } from "./packer";
import { readUInt32BE } from "./buffer-util";
import { COLORTYPE_COLOR } from "./constants";

describe("pack", () => {
  describe("PNG structure", () => {
    it("starts with PNG signature", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      expect(Array.from(png.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });

    it("has IHDR as first chunk", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      expect(readUInt32BE(png, 8)).toBe(13); // IHDR data length
      expect(String.fromCharCode(png[12], png[13], png[14], png[15])).toBe("IHDR");
    });

    it("IHDR contains correct dimensions", () => {
      const png = pack({ width: 10, height: 20, data: new Uint8Array(10 * 20 * 4) });
      expect(readUInt32BE(png, 16)).toBe(10);
      expect(readUInt32BE(png, 20)).toBe(20);
    });

    it("IHDR has bit depth 8 and colorType 6 by default", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      expect(png[24]).toBe(8);
      expect(png[25]).toBe(6);
    });

    it("contains IDAT chunk", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const str = Array.from(png).map((b) => String.fromCharCode(b)).join("");
      expect(str).toContain("IDAT");
    });

    it("ends with IEND chunk (last 12 bytes)", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const iendStart = png.length - 12;
      expect(readUInt32BE(png, iendStart)).toBe(0); // length=0
      expect(String.fromCharCode(png[iendStart + 4], png[iendStart + 5], png[iendStart + 6], png[iendStart + 7])).toBe("IEND");
    });
  });

  describe("gamma", () => {
    it("includes gAMA chunk when gamma is set", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4), gamma: 2.2 });
      const str = Array.from(png).map((b) => String.fromCharCode(b)).join("");
      expect(str).toContain("gAMA");
    });

    it("omits gAMA chunk when gamma is not set", () => {
      const png = pack({ width: 1, height: 1, data: new Uint8Array(4) });
      const str = Array.from(png).map((b) => String.fromCharCode(b)).join("");
      expect(str).not.toContain("gAMA");
    });
  });

  describe("options", () => {
    it("respects custom colorType", () => {
      const png = pack(
        { width: 1, height: 1, data: new Uint8Array(4) },
        { colorType: COLORTYPE_COLOR },
      );
      expect(png[25]).toBe(COLORTYPE_COLOR);
    });

    it("respects custom deflateLevel", () => {
      const data = new Uint8Array(4);
      const fast = pack({ width: 1, height: 1, data }, { deflateLevel: 1 });
      const slow = pack({ width: 1, height: 1, data }, { deflateLevel: 9 });
      expect(fast[0]).toBe(0x89);
      expect(slow[0]).toBe(0x89);
    });
  });

  describe("error handling", () => {
    it("throws on unsupported colorType (e.g. 99)", () => {
      expect(() => pack({ width: 1, height: 1, data: new Uint8Array(4) }, { colorType: 99 }))
        .toThrow("color type");
    });

    it("throws on unsupported inputColorType (e.g. 99)", () => {
      expect(() => pack({ width: 1, height: 1, data: new Uint8Array(4) }, { inputColorType: 99 }))
        .toThrow("input color type");
    });

    it("throws on unsupported bitDepth (e.g. 4)", () => {
      expect(() => pack({ width: 1, height: 1, data: new Uint8Array(4) }, { bitDepth: 4 }))
        .toThrow("bit depth");
    });
  });
});
