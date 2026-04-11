/**
 * @file Integration tests for the unified conversion pipeline
 *
 * Tests actual file conversion with real fixture files from the monorepo.
 */

import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFile, unlink } from "node:fs/promises";
import { convertToMarkdown, convert } from "./convert";

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

// =============================================================================
// convert() - multi-format output
// =============================================================================

describe("convert - SVG output", () => {
  it("converts PPTX to SVG", async () => {
    const result = await convert(FIXTURES.pptx, { outputFormat: "svg" });
    expect(result.inputFormat).toBe("pptx");
    expect(result.outputFormat).toBe("svg");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      expect(page.content as string).toContain("<svg");
    }
  });

  it("converts XLSX to SVG", async () => {
    const result = await convert(FIXTURES.xlsx, { outputFormat: "svg" });
    expect(result.inputFormat).toBe("xlsx");
    expect(result.outputFormat).toBe("svg");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      expect(page.content as string).toContain("<svg");
    }
  });

  it("converts DOCX to SVG", async () => {
    const result = await convert(FIXTURES.docx, { outputFormat: "svg" });
    expect(result.inputFormat).toBe("docx");
    expect(result.outputFormat).toBe("svg");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      expect(page.content as string).toContain("<svg");
    }
  });

  it("converts PDF to SVG", async () => {
    const result = await convert(FIXTURES.pdf, { outputFormat: "svg" });
    expect(result.inputFormat).toBe("pdf");
    expect(result.outputFormat).toBe("svg");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      expect(page.content as string).toContain("<svg");
    }
  });
});

describe("convert - text output", () => {
  it("converts PPTX to text", async () => {
    const result = await convert(FIXTURES.pptx, { outputFormat: "text" });
    expect(result.inputFormat).toBe("pptx");
    expect(result.outputFormat).toBe("text");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
    }
  });

  it("converts XLSX to text", async () => {
    const result = await convert(FIXTURES.xlsx, { outputFormat: "text" });
    expect(result.inputFormat).toBe("xlsx");
    expect(result.outputFormat).toBe("text");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
  });

  it("converts DOCX to text", async () => {
    const result = await convert(FIXTURES.docx, { outputFormat: "text" });
    expect(result.inputFormat).toBe("docx");
    expect(result.outputFormat).toBe("text");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects PDF to text", async () => {
    await expect(
      convert(FIXTURES.pdf, { outputFormat: "text" }),
    ).rejects.toThrow("Unsupported conversion: pdf → text");
  });
});

describe("convert - output format inference from file extension", () => {
  it("infers SVG from .svg output path with %d placeholder", async () => {
    const ts = Date.now();
    const outputPath = join(tmpdir(), `aurochs-test-${ts}_%d.svg`);

    try {
      const result = await convert(FIXTURES.pptx, { outputPath });
      expect(result.outputFormat).toBe("svg");
      // blank.pptx has 2 slides → 2 files
      for (const page of result.pages) {
        const filePath = join(tmpdir(), `aurochs-test-${ts}_${page.index}.svg`);
        const content = await readFile(filePath, "utf-8");
        expect(content).toContain("<svg");
      }
    } finally {
      for (const i of Array.from({ length: 10 }, (_, k) => k + 1)) {
        await unlink(join(tmpdir(), `aurochs-test-${ts}_${i}.svg`)).catch(() => {});
      }
    }
  });

  it("infers text from .txt output path", async () => {
    const outputPath = join(tmpdir(), `aurochs-test-${Date.now()}.txt`);

    try {
      const result = await convert(FIXTURES.pptx, { outputPath });
      expect(result.outputFormat).toBe("text");
    } finally {
      await unlink(outputPath).catch(() => {});
    }
  });
});

describe("convertToMarkdown - file output", () => {
  it("writes markdown to a file when outputPath is given", async () => {
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
