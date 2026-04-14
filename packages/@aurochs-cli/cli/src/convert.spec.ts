/**
 * @file Tests for the unified conversion pipeline
 */

import {
  convert,
  convertToMarkdown,
  getSupportedExtensions,
  getSupportedOutputExtensions,
  getSupportedOutputFormats,
} from "./convert";

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

  it("includes DSV input extensions", () => {
    const extensions = getSupportedExtensions();
    expect(extensions).toContain(".csv");
    expect(extensions).toContain(".tsv");
  });

  it("returns 10 supported extensions", () => {
    expect(getSupportedExtensions()).toHaveLength(10);
  });
});

describe("getSupportedOutputExtensions", () => {
  it("includes all expected output extensions", () => {
    const extensions = getSupportedOutputExtensions();
    expect(extensions).toContain(".md");
    expect(extensions).toContain(".markdown");
    expect(extensions).toContain(".svg");
    expect(extensions).toContain(".txt");
    expect(extensions).toContain(".png");
    expect(extensions).toContain(".csv");
    expect(extensions).toContain(".tsv");
    expect(extensions).toContain(".jsonl");
    expect(extensions).toContain(".xlsx");
  });
});

describe("getSupportedOutputFormats", () => {
  it("pptx supports markdown, svg, text, png", () => {
    const formats = getSupportedOutputFormats("pptx");
    expect(formats).toContain("markdown");
    expect(formats).toContain("svg");
    expect(formats).toContain("text");
    expect(formats).toContain("png");
  });

  it("xlsx supports markdown, svg, text, png, csv, tsv, jsonl", () => {
    const formats = getSupportedOutputFormats("xlsx");
    expect(formats).toContain("markdown");
    expect(formats).toContain("svg");
    expect(formats).toContain("text");
    expect(formats).toContain("png");
    expect(formats).toContain("csv");
    expect(formats).toContain("tsv");
    expect(formats).toContain("jsonl");
  });

  it("csv supports xlsx output", () => {
    const formats = getSupportedOutputFormats("csv");
    expect(formats).toContain("xlsx");
  });

  it("tsv supports xlsx output", () => {
    const formats = getSupportedOutputFormats("tsv");
    expect(formats).toContain("xlsx");
  });

  it("docx supports markdown, svg, text, png", () => {
    const formats = getSupportedOutputFormats("docx");
    expect(formats).toContain("markdown");
    expect(formats).toContain("svg");
    expect(formats).toContain("text");
    expect(formats).toContain("png");
  });

  it("pdf supports markdown, svg, png but NOT text", () => {
    const formats = getSupportedOutputFormats("pdf");
    expect(formats).toContain("markdown");
    expect(formats).toContain("svg");
    expect(formats).toContain("png");
    expect(formats).not.toContain("text");
  });
});

describe("convertToMarkdown", () => {
  it("rejects unsupported file extensions", async () => {
    await expect(convertToMarkdown("file.txt")).rejects.toThrow("Unsupported input format");
  });

  it("rejects unknown extensions with helpful message", async () => {
    await expect(convertToMarkdown("image.bmp")).rejects.toThrow(".pptx");
  });

  it("rejects files without extension", async () => {
    await expect(convertToMarkdown("noextension")).rejects.toThrow("Unsupported input format");
  });
});

describe("convert", () => {
  it("rejects unsupported input format", async () => {
    await expect(convert("file.bmp")).rejects.toThrow("Unsupported input format");
  });

  it("rejects unsupported conversion: pdf → text", async () => {
    await expect(
      convert("file.pdf", { outputFormat: "text" }),
    ).rejects.toThrow("Unsupported conversion: pdf → text");
  });

  it("infers output format from output path extension", async () => {
    // This will fail because the input file doesn't exist, but the error
    // should NOT be about unsupported format — it should be a file read error
    await expect(
      convert("nonexistent.pptx", { outputPath: "output.svg" }),
    ).rejects.not.toThrow("Unsupported");
  });

  it("defaults to markdown when no output format specified", async () => {
    // Will fail on file read, but not on format detection
    await expect(
      convert("nonexistent.pptx"),
    ).rejects.not.toThrow("Unsupported");
  });

  it("rejects unknown output extension", async () => {
    await expect(
      convert("file.pptx", { outputPath: "output.json" }),
    ).rejects.toThrow('Cannot infer output format from extension ".json"');
  });
});
