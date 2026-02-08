/** @file Unit tests for file-utils shared utilities */
import { detectImageMimeType, uint8ArrayToArrayBuffer } from "./file-utils";

describe("detectImageMimeType", () => {
  it("detects PNG", () => {
    expect(detectImageMimeType("photo.png")).toBe("image/png");
  });

  it("detects JPEG (.jpg)", () => {
    expect(detectImageMimeType("photo.jpg")).toBe("image/jpeg");
  });

  it("detects JPEG (.jpeg)", () => {
    expect(detectImageMimeType("photo.jpeg")).toBe("image/jpeg");
  });

  it("detects GIF", () => {
    expect(detectImageMimeType("animation.gif")).toBe("image/gif");
  });

  it("detects SVG", () => {
    expect(detectImageMimeType("icon.svg")).toBe("image/svg+xml");
  });

  it("is case-insensitive", () => {
    expect(detectImageMimeType("photo.PNG")).toBe("image/png");
    expect(detectImageMimeType("photo.JPG")).toBe("image/jpeg");
  });

  it("throws for unsupported extension", () => {
    expect(() => detectImageMimeType("file.bmp")).toThrow("Unsupported image extension");
  });

  it("throws for unknown extension", () => {
    expect(() => detectImageMimeType("file.xyz")).toThrow("Unsupported image extension");
  });

  it("handles paths with directories", () => {
    expect(detectImageMimeType("/path/to/photo.png")).toBe("image/png");
  });
});

describe("uint8ArrayToArrayBuffer", () => {
  it("creates a copy of the data", () => {
    const source = new Uint8Array([1, 2, 3, 4]);
    const result = uint8ArrayToArrayBuffer(source);

    expect(result.byteLength).toBe(4);
    expect(new Uint8Array(result)).toEqual(source);
  });

  it("produces an independent copy", () => {
    const source = new Uint8Array([10, 20]);
    const result = uint8ArrayToArrayBuffer(source);

    // Mutating source should not affect result
    source[0] = 99;
    expect(new Uint8Array(result)[0]).toBe(10);
  });

  it("handles empty input", () => {
    const result = uint8ArrayToArrayBuffer(new Uint8Array(0));
    expect(result.byteLength).toBe(0);
  });
});
