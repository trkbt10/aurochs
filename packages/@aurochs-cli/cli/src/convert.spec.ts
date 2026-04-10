/**
 * @file Tests for the unified conversion pipeline
 */

import { getSupportedExtensions } from "./convert";

describe("getSupportedExtensions", () => {
  it("includes all expected extensions", () => {
    const extensions = getSupportedExtensions();
    expect(extensions).toContain(".pptx");
    expect(extensions).toContain(".ppt");
    expect(extensions).toContain(".xlsx");
    expect(extensions).toContain(".xls");
    expect(extensions).toContain(".docx");
    expect(extensions).toContain(".doc");
    expect(extensions).toContain(".pdf");
  });

  it("returns 7 supported extensions", () => {
    expect(getSupportedExtensions()).toHaveLength(7);
  });
});

describe("convertToMarkdown", () => {
  // NOTE: Full integration tests with actual fixture files are in
  // convert.integration.spec.ts. These tests verify the convert module's
  // error handling and format detection without requiring fixture files.

  it("rejects unsupported file extensions", async () => {
    const { convertToMarkdown } = await import("./convert");
    await expect(convertToMarkdown("file.txt")).rejects.toThrow("Unsupported file format");
  });

  it("rejects unknown extensions with helpful message", async () => {
    const { convertToMarkdown } = await import("./convert");
    await expect(convertToMarkdown("image.png")).rejects.toThrow(".pptx");
  });

  it("rejects files without extension", async () => {
    const { convertToMarkdown } = await import("./convert");
    await expect(convertToMarkdown("noextension")).rejects.toThrow("Unsupported file format");
  });
});
