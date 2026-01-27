/**
 * @file ZIP Package Tests
 */

import { zipSync } from "fflate";
import { loadZipPackage, createEmptyZipPackage, isBinaryFile } from "./zip-package";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestZipBytes(
  files: Record<string, string | Uint8Array>,
): Uint8Array {
  const encoder = new TextEncoder();
  const entries: Record<string, Uint8Array> = {};

  for (const [path, content] of Object.entries(files)) {
    entries[path] = typeof content === "string" ? encoder.encode(content) : content;
  }

  return zipSync(entries, { level: 6 });
}

// =============================================================================
// loadZipPackage Tests
// =============================================================================

describe("loadZipPackage", () => {
  it("loads a ZIP buffer and reads text files", async () => {
    const bytes = createTestZipBytes({
      "hello.txt": "Hello, World!",
      "folder/nested.xml": "<root/>",
    });

    const pkg = await loadZipPackage(bytes);

    expect(pkg.readText("hello.txt")).toBe("Hello, World!");
    expect(pkg.readText("folder/nested.xml")).toBe("<root/>");
  });

  it("returns null for non-existent files", async () => {
    const bytes = createTestZipBytes({
      "exists.txt": "content",
    });

    const pkg = await loadZipPackage(bytes);

    expect(pkg.readText("not-exists.txt")).toBeNull();
    expect(pkg.readBinary("not-exists.bin")).toBeNull();
  });

  it("reads binary files", async () => {
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const bytes = createTestZipBytes({
      "image.png": binaryData,
    });

    const pkg = await loadZipPackage(bytes);
    const result = pkg.readBinary("image.png");

    expect(result).not.toBeNull();
    const arr = new Uint8Array(result!);
    expect(arr[0]).toBe(0x89);
    expect(arr[1]).toBe(0x50);
  });

  it("lists all files", async () => {
    const bytes = createTestZipBytes({
      "a.txt": "a",
      "b.txt": "b",
      "folder/c.txt": "c",
    });

    const pkg = await loadZipPackage(bytes);
    const files = pkg.listFiles();

    expect(files).toContain("a.txt");
    expect(files).toContain("b.txt");
    expect(files).toContain("folder/c.txt");
    expect(files).toHaveLength(3);
  });

  it("checks file existence", async () => {
    const bytes = createTestZipBytes({
      "exists.txt": "content",
    });

    const pkg = await loadZipPackage(bytes);

    expect(pkg.exists("exists.txt")).toBe(true);
    expect(pkg.exists("not-exists.txt")).toBe(false);
  });
});

// =============================================================================
// createEmptyZipPackage Tests
// =============================================================================

describe("createEmptyZipPackage", () => {
  it("creates an empty package", () => {
    const pkg = createEmptyZipPackage();

    expect(pkg.listFiles()).toHaveLength(0);
    expect(pkg.readText("anything")).toBeNull();
  });

  it("allows writing and reading text files", () => {
    const pkg = createEmptyZipPackage();

    pkg.writeText("test.xml", "<root/>");

    expect(pkg.readText("test.xml")).toBe("<root/>");
    expect(pkg.exists("test.xml")).toBe(true);
    expect(pkg.listFiles()).toContain("test.xml");
  });

  it("allows writing and reading binary files", () => {
    const pkg = createEmptyZipPackage();
    const binaryData = new Uint8Array([1, 2, 3, 4]);

    pkg.writeBinary("data.bin", binaryData);

    const result = pkg.readBinary("data.bin");
    expect(result).not.toBeNull();
    expect(new Uint8Array(result!)).toEqual(binaryData);
  });
});

// =============================================================================
// Write Operations Tests
// =============================================================================

describe("write operations", () => {
  function createPkg(): ReturnType<typeof loadZipPackage> {
    return loadZipPackage(
      createTestZipBytes({
        "original.txt": "original content",
      }),
    );
  }

  it("overwrites existing files", async () => {
    const pkg = await createPkg();
    pkg.writeText("original.txt", "new content");

    expect(pkg.readText("original.txt")).toBe("new content");
  });

  it("adds new files", async () => {
    const pkg = await createPkg();
    pkg.writeText("new.txt", "new file");

    expect(pkg.readText("new.txt")).toBe("new file");
    expect(pkg.listFiles()).toContain("new.txt");
  });

  it("removes files", async () => {
    const pkg = await createPkg();
    pkg.remove("original.txt");

    expect(pkg.exists("original.txt")).toBe(false);
    expect(pkg.readText("original.txt")).toBeNull();
    expect(pkg.listFiles()).not.toContain("original.txt");
  });

  it("handles remove of non-existent file gracefully", async () => {
    const pkg = await createPkg();
    // Should not throw
    pkg.remove("not-exists.txt");
    expect(pkg.exists("not-exists.txt")).toBe(false);
  });
});

// =============================================================================
// Export Operations Tests
// =============================================================================

describe("export operations", () => {
  it("exports to Blob", async () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("test.txt", "content");

    const blob = await pkg.toBlob();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
  });

  it("exports to ArrayBuffer", async () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("test.txt", "content");

    const buffer = await pkg.toArrayBuffer();

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("round-trips correctly", async () => {
    const pkg1 = createEmptyZipPackage();
    pkg1.writeText("a.xml", "<root>test</root>");
    pkg1.writeBinary("b.bin", new Uint8Array([1, 2, 3]));

    const buffer = await pkg1.toArrayBuffer();
    const pkg2 = await loadZipPackage(buffer);

    expect(pkg2.readText("a.xml")).toBe("<root>test</root>");
    expect(new Uint8Array(pkg2.readBinary("b.bin")!)).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("supports custom compression level", async () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("test.txt", "content".repeat(1000));

    const compressed = await pkg.toArrayBuffer({ compressionLevel: 9 });
    const uncompressed = await pkg.toArrayBuffer({ compressionLevel: 0 });

    expect(compressed.byteLength).toBeLessThan(uncompressed.byteLength);
  });
});

// =============================================================================
// asPresentationFile Tests
// =============================================================================

describe("asPresentationFile", () => {
  it("returns a PresentationFile compatible interface", async () => {
    const bytes = createTestZipBytes({
      "test.xml": "<root/>",
      "data.bin": new Uint8Array([1, 2, 3]),
    });
    const pkg = await loadZipPackage(bytes);

    const pf = pkg.asPresentationFile();

    expect(pf.readText("test.xml")).toBe("<root/>");
    expect(pf.readBinary("data.bin")).not.toBeNull();
    expect(pf.exists("test.xml")).toBe(true);
    expect(pf.listFiles!()).toContain("test.xml");
  });

  it("reflects writes made to the package", async () => {
    const pkg = createEmptyZipPackage();
    const pf = pkg.asPresentationFile();

    pkg.writeText("new.txt", "content");

    expect(pf.readText("new.txt")).toBe("content");
    expect(pf.listFiles!()).toContain("new.txt");
  });
});

// =============================================================================
// isBinaryFile Tests
// =============================================================================

describe("isBinaryFile", () => {
  it("identifies image files as binary", () => {
    expect(isBinaryFile("image.png")).toBe(true);
    expect(isBinaryFile("photo.jpg")).toBe(true);
    expect(isBinaryFile("photo.jpeg")).toBe(true);
    expect(isBinaryFile("icon.gif")).toBe(true);
    expect(isBinaryFile("pic.bmp")).toBe(true);
    expect(isBinaryFile("vector.wmf")).toBe(true);
    expect(isBinaryFile("vector.emf")).toBe(true);
  });

  it("identifies media files as binary", () => {
    expect(isBinaryFile("audio.wav")).toBe(true);
    expect(isBinaryFile("audio.mp3")).toBe(true);
    expect(isBinaryFile("video.mp4")).toBe(true);
  });

  it("identifies XML/text files as non-binary", () => {
    expect(isBinaryFile("slide.xml")).toBe(false);
    expect(isBinaryFile("readme.txt")).toBe(false);
    expect(isBinaryFile("[Content_Types].xml")).toBe(false);
    expect(isBinaryFile("ppt/slides/slide1.xml")).toBe(false);
  });

  it("handles case insensitivity", () => {
    expect(isBinaryFile("IMAGE.PNG")).toBe(true);
    expect(isBinaryFile("Photo.JPG")).toBe(true);
  });

  it("handles files without extension", () => {
    expect(isBinaryFile("noextension")).toBe(false);
    expect(isBinaryFile("folder/file")).toBe(false);
  });
});
