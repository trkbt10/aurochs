/** @file Unit tests for file-utils shared utilities */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { detectImageMimeType, readFileToArrayBuffer, uint8ArrayToArrayBuffer } from "./file-utils";

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

// =============================================================================
// readFileToArrayBuffer
// =============================================================================

async function withTmpDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "file-utils-test-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("readFileToArrayBuffer", () => {
  it("reads a file into an ArrayBuffer with correct content", () =>
    withTmpDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "test.bin");
      const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await fs.writeFile(filePath, data);

      const result = await readFileToArrayBuffer(filePath);

      expect(result.byteLength).toBe(8);
      const view = new Uint8Array(result);
      expect(view[0]).toBe(0x89);
      expect(view[1]).toBe(0x50);
      expect(view[7]).toBe(0x0a);
    }));

  it("reads an empty file", () =>
    withTmpDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "empty.bin");
      await fs.writeFile(filePath, Buffer.alloc(0));

      const result = await readFileToArrayBuffer(filePath);
      expect(result.byteLength).toBe(0);
    }));

  it("throws when file does not exist", () =>
    withTmpDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "nonexistent.bin");
      await expect(readFileToArrayBuffer(filePath)).rejects.toThrow();
    }));
});
