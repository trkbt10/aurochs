/**
 * @file Tests for MIME type utilities
 */

import { getMimeType } from "./mime";

describe("getMimeType", () => {
  describe("image types", () => {
    it("returns image/jpeg for jpg", () => {
      expect(getMimeType("jpg")).toBe("image/jpeg");
    });

    it("returns image/jpeg for jpeg", () => {
      expect(getMimeType("jpeg")).toBe("image/jpeg");
    });

    it("returns image/png for png", () => {
      expect(getMimeType("png")).toBe("image/png");
    });

    it("returns image/gif for gif", () => {
      expect(getMimeType("gif")).toBe("image/gif");
    });

    it("returns image/bmp for bmp", () => {
      expect(getMimeType("bmp")).toBe("image/bmp");
    });

    it("returns image/tiff for tiff", () => {
      expect(getMimeType("tiff")).toBe("image/tiff");
    });

    it("returns image/tiff for tif", () => {
      expect(getMimeType("tif")).toBe("image/tiff");
    });

    it("returns image/svg+xml for svg", () => {
      expect(getMimeType("svg")).toBe("image/svg+xml");
    });

    it("returns image/webp for webp", () => {
      expect(getMimeType("webp")).toBe("image/webp");
    });
  });

  describe("video types", () => {
    it("returns video/mp4 for mp4", () => {
      expect(getMimeType("mp4")).toBe("video/mp4");
    });

    it("returns video/webm for webm", () => {
      expect(getMimeType("webm")).toBe("video/webm");
    });

    it("returns video/ogg for ogg", () => {
      expect(getMimeType("ogg")).toBe("video/ogg");
    });
  });

  describe("audio types", () => {
    it("returns audio/mpeg for mp3", () => {
      expect(getMimeType("mp3")).toBe("audio/mpeg");
    });

    it("returns audio/wav for wav", () => {
      expect(getMimeType("wav")).toBe("audio/wav");
    });

    it("returns audio/mp4 for m4a", () => {
      expect(getMimeType("m4a")).toBe("audio/mp4");
    });
  });

  describe("case insensitivity", () => {
    it("handles uppercase extensions", () => {
      expect(getMimeType("JPG")).toBe("image/jpeg");
    });

    it("handles mixed case extensions", () => {
      expect(getMimeType("PnG")).toBe("image/png");
    });
  });

  describe("unknown types", () => {
    it("returns application/octet-stream for unknown extension", () => {
      expect(getMimeType("xyz")).toBe("application/octet-stream");
    });

    it("returns application/octet-stream for empty string", () => {
      expect(getMimeType("")).toBe("application/octet-stream");
    });
  });
});
