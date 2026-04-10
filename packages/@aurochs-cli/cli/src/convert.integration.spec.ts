/**
 * @file Integration tests for the unified conversion pipeline
 *
 * Tests actual file conversion with real fixture files from the monorepo.
 */

import { join } from "node:path";
import { convertToMarkdown } from "./convert";

const ROOT = join(import.meta.dirname, "../../../..");

// Fixture paths
const FIXTURES = {
  pptx: join(ROOT, "packages/@aurochs-cli/pptx-cli/spec/verify-cases/templates/blank.pptx"),
  pptxWithTable: join(ROOT, "packages/@aurochs-cli/pptx-cli/spec/preview-fixtures/table.pptx"),
  xlsx: join(ROOT, "packages/@aurochs-ui/xlsx-editor/fixtures/visual/xlsx/cell-formatting.xlsx"),
  docx: join(ROOT, "fixtures/poi-test-data/test-data/document/TestDocument.docx"),
  pdf: join(ROOT, "fixtures/samples/receipt.pdf"),
};

describe("convertToMarkdown - PPTX", () => {
  it("converts a blank PPTX to markdown", async () => {
    const result = await convertToMarkdown(FIXTURES.pptx);
    expect(result.format).toBe("pptx");
    expect(result.isLegacy).toBe(false);
    expect(typeof result.markdown).toBe("string");
    expect(result.markdown).toContain("## Slide");
  });

  it("converts a PPTX with table to markdown containing a table", async () => {
    const result = await convertToMarkdown(FIXTURES.pptxWithTable);
    expect(result.markdown).toContain("|");
    expect(result.markdown).toContain("---");
  });
});

describe("convertToMarkdown - XLSX", () => {
  it("converts an XLSX to markdown", async () => {
    const result = await convertToMarkdown(FIXTURES.xlsx);
    expect(result.format).toBe("xlsx");
    expect(result.isLegacy).toBe(false);
    expect(typeof result.markdown).toBe("string");
    // XLSX output should contain a markdown table
    expect(result.markdown).toContain("|");
  });
});

describe("convertToMarkdown - DOCX", () => {
  it("converts a DOCX to markdown", async () => {
    const result = await convertToMarkdown(FIXTURES.docx);
    expect(result.format).toBe("docx");
    expect(result.isLegacy).toBe(false);
    expect(typeof result.markdown).toBe("string");
    expect(result.markdown).toContain("## Section");
  });
});

describe("convertToMarkdown - PDF", () => {
  it("converts a PDF to markdown", async () => {
    const result = await convertToMarkdown(FIXTURES.pdf);
    expect(result.format).toBe("pdf");
    expect(result.isLegacy).toBe(false);
    expect(typeof result.markdown).toBe("string");
    expect(result.markdown).toContain("## Page");
  });
});

describe("convertToMarkdown - file output", () => {
  it("writes markdown to a file when outputPath is given", async () => {
    const { tmpdir } = await import("node:os");
    const { readFile, unlink } = await import("node:fs/promises");
    const outputPath = join(tmpdir(), `aurochs-test-${Date.now()}.md`);

    try {
      const result = await convertToMarkdown(FIXTURES.pptx, { outputPath });
      const fileContent = await readFile(outputPath, "utf-8");
      expect(fileContent).toBe(result.markdown);
    } finally {
      await unlink(outputPath).catch(() => {});
    }
  });
});
