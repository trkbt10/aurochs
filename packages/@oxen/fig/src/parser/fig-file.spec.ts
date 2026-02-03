/**
 * @file Tests for fig-file parsing API
 */

import {
  parseFigFile,
  parseFigFileSync,
  isFigmaZipFile,
} from "./fig-file";
import { isFigFile } from "./header";
import { createSampleFigFile } from "../kiwi/test-helpers";

describe("fig-file", () => {
  describe("isFigFile", () => {
    it("returns true for valid fig-kiwi data", () => {
      const { file } = createSampleFigFile();
      expect(isFigFile(file)).toBe(true);
    });

    it("returns false for non-fig data", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(isFigFile(data)).toBe(false);
    });

    it("returns false for ZIP data", () => {
      const zipMagic = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
      expect(isFigFile(zipMagic)).toBe(false);
    });
  });

  describe("isFigmaZipFile", () => {
    it("returns true for ZIP magic bytes", () => {
      const zipData = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
      expect(isFigmaZipFile(zipData)).toBe(true);
    });

    it("returns false for fig-kiwi data", () => {
      const { file } = createSampleFigFile();
      expect(isFigmaZipFile(file)).toBe(false);
    });

    it("returns false for short data", () => {
      const shortData = new Uint8Array([0x50, 0x4b]);
      expect(isFigmaZipFile(shortData)).toBe(false);
    });
  });

  describe("parseFigFileSync", () => {
    it("parses raw fig-kiwi data", () => {
      const { file } = createSampleFigFile();
      const result = parseFigFileSync(file);

      expect(result.schema).toBeDefined();
      expect(result.schema.definitions.length).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it("throws for ZIP files", () => {
      const zipData = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
      expect(() => parseFigFileSync(zipData)).toThrow(
        "ZIP-wrapped .fig files require async parsing"
      );
    });

    it("throws for invalid data", () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(() => parseFigFileSync(invalidData)).toThrow(
        "Invalid fig-kiwi data"
      );
    });
  });

  describe("parseFigFile", () => {
    it("parses raw fig-kiwi data asynchronously", async () => {
      const { file } = createSampleFigFile();
      const result = await parseFigFile(file);

      expect(result.schema).toBeDefined();
      expect(result.schema.definitions.length).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it("throws for invalid data", async () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      await expect(parseFigFile(invalidData)).rejects.toThrow(
        "Invalid fig-kiwi data"
      );
    });
  });
});
