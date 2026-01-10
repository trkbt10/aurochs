/**
 * @file ZIP Builder Tests
 */

import {
  createZipBuilder,
  createZipBuilderFromBuffer,
  createZipBuilderFromBlob,
} from "./zip-builder";

describe("ZipBuilder", () => {
  describe("createZipBuilder", () => {
    it("creates an empty builder", () => {
      const builder = createZipBuilder();
      expect(builder.getPaths()).toEqual([]);
    });

    it("adds text files", () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "Hello World");
      expect(builder.exists("test.txt")).toBe(true);
      expect(builder.getPaths()).toContain("test.txt");
    });

    it("adds binary files", () => {
      const builder = createZipBuilder();
      const data = new Uint8Array([1, 2, 3, 4]);
      builder.addBinary("test.bin", data);
      expect(builder.exists("test.bin")).toBe(true);
    });

    it("removes files", () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "Hello");
      expect(builder.exists("test.txt")).toBe(true);
      builder.remove("test.txt");
      expect(builder.exists("test.txt")).toBe(false);
    });

    it("overwrites existing files", () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "First");
      builder.addText("test.txt", "Second");
      expect(builder.getPaths().filter((p) => p === "test.txt")).toHaveLength(1);
    });
  });

  describe("toBlob", () => {
    it("generates a valid Blob", async () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "Hello");
      const blob = await builder.toBlob();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it("uses PPTX MIME type by default", async () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "Hello");
      const blob = await builder.toBlob();
      expect(blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
    });

    it("allows custom MIME type", async () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "Hello");
      const blob = await builder.toBlob({ mimeType: "application/zip" });
      expect(blob.type).toBe("application/zip");
    });
  });

  describe("toArrayBuffer", () => {
    it("generates a valid ArrayBuffer", async () => {
      const builder = createZipBuilder();
      builder.addText("test.txt", "Hello");
      const buffer = await builder.toArrayBuffer();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe("round-trip", () => {
    it("preserves content through round-trip", async () => {
      // Create a ZIP with content
      const builder1 = createZipBuilder();
      builder1.addText("file1.txt", "Content 1");
      builder1.addText("file2.xml", "<root>Hello</root>");
      builder1.addBinary("file3.bin", new Uint8Array([1, 2, 3, 4, 5]));

      // Export and re-import
      const buffer = await builder1.toArrayBuffer();
      const builder2 = await createZipBuilderFromBuffer(buffer);

      // Verify paths are preserved
      const paths = builder2.getPaths().sort();
      expect(paths).toEqual(["file1.txt", "file2.xml", "file3.bin"]);
    });

    it("supports createZipBuilderFromBlob", async () => {
      const builder1 = createZipBuilder();
      builder1.addText("test.txt", "Hello Blob");
      const blob = await builder1.toBlob();

      const builder2 = await createZipBuilderFromBlob(blob);
      expect(builder2.exists("test.txt")).toBe(true);
    });
  });

  describe("PPTX-like structure", () => {
    it("handles PPTX directory structure", async () => {
      const builder = createZipBuilder();

      // Typical PPTX structure
      builder.addText("[Content_Types].xml", '<?xml version="1.0"?><Types/>');
      builder.addText("_rels/.rels", '<?xml version="1.0"?><Relationships/>');
      builder.addText("ppt/presentation.xml", '<?xml version="1.0"?><p:presentation/>');
      builder.addText("ppt/slides/slide1.xml", '<?xml version="1.0"?><p:sld/>');
      builder.addText("ppt/_rels/presentation.xml.rels", '<?xml version="1.0"?><Relationships/>');

      const paths = builder.getPaths().sort();
      expect(paths).toEqual([
        "[Content_Types].xml",
        "_rels/.rels",
        "ppt/_rels/presentation.xml.rels",
        "ppt/presentation.xml",
        "ppt/slides/slide1.xml",
      ]);

      // Verify it can be exported and re-imported
      const buffer = await builder.toArrayBuffer();
      const builder2 = await createZipBuilderFromBuffer(buffer);
      expect(builder2.getPaths().sort()).toEqual(paths);
    });
  });
});
