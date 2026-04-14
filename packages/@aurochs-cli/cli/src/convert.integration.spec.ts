/**
 * @file Integration tests for the unified conversion pipeline
 *
 * Tests actual file conversion with real fixture files from the monorepo.
 */

import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFile, unlink, writeFile } from "node:fs/promises";
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

// =============================================================================
// convert() - DSV output (XLSX → CSV/TSV/JSONL)
// =============================================================================

describe("convert - XLSX to CSV output", () => {
  it("converts XLSX to CSV", async () => {
    const result = await convert(FIXTURES.xlsx, { outputFormat: "csv" });
    expect(result.inputFormat).toBe("xlsx");
    expect(result.outputFormat).toBe("csv");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      // CSV should contain comma-separated values
      expect(page.content as string).toContain(",");
    }
  });

  it("writes CSV to a file when outputPath is given", async () => {
    const outputPath = join(tmpdir(), `aurochs-test-${Date.now()}.csv`);

    try {
      const result = await convert(FIXTURES.xlsx, { outputPath });
      expect(result.outputFormat).toBe("csv");
      const fileContent = await readFile(outputPath, "utf-8");
      expect(fileContent).toContain(",");
    } finally {
      await unlink(outputPath).catch(() => {});
    }
  });
});

describe("convert - XLSX to TSV output", () => {
  it("converts XLSX to TSV", async () => {
    const result = await convert(FIXTURES.xlsx, { outputFormat: "tsv" });
    expect(result.inputFormat).toBe("xlsx");
    expect(result.outputFormat).toBe("tsv");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      // TSV should contain tab-separated values
      expect(page.content as string).toContain("\t");
    }
  });
});

describe("convert - XLSX to JSONL output", () => {
  it("converts XLSX to JSONL", async () => {
    const result = await convert(FIXTURES.xlsx, { outputFormat: "jsonl" });
    expect(result.inputFormat).toBe("xlsx");
    expect(result.outputFormat).toBe("jsonl");
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    for (const page of result.pages) {
      expect(typeof page.content).toBe("string");
      const lines = (page.content as string).trim().split("\n");
      // Each line should be valid JSON
      for (const line of lines) {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      }
    }
  });
});

// =============================================================================
// convert() - DSV input (CSV/TSV → XLSX)
// =============================================================================

describe("convert - TSV to XLSX", () => {
  it("converts TSV to XLSX binary", async () => {
    const tsvContent = "Name\tAge\tCity\nAlice\t30\tTokyo\nBob\t25\tOsaka\n";
    const tsvPath = join(tmpdir(), `aurochs-test-${Date.now()}.tsv`);
    const xlsxPath = join(tmpdir(), `aurochs-test-${Date.now()}.xlsx`);

    try {
      await writeFile(tsvPath, tsvContent, "utf-8");
      const result = await convert(tsvPath, { outputPath: xlsxPath });
      expect(result.inputFormat).toBe("tsv");
      expect(result.outputFormat).toBe("xlsx");
      expect(result.pages).toHaveLength(1);
      // Output should be binary (Buffer)
      expect(Buffer.isBuffer(result.pages[0].content)).toBe(true);
      // File should exist and have PK (ZIP) header
      const fileContent = await readFile(xlsxPath);
      expect(fileContent[0]).toBe(0x50); // 'P'
      expect(fileContent[1]).toBe(0x4b); // 'K'
    } finally {
      await unlink(tsvPath).catch(() => {});
      await unlink(xlsxPath).catch(() => {});
    }
  });
});

describe("convert - CSV to XLSX", () => {
  it("converts CSV to XLSX binary", async () => {
    const csvContent = "Name,Age,City\nAlice,30,Tokyo\nBob,25,Osaka\n";
    const csvPath = join(tmpdir(), `aurochs-test-${Date.now()}.csv`);
    const xlsxPath = join(tmpdir(), `aurochs-test-${Date.now()}-csv.xlsx`);

    try {
      await writeFile(csvPath, csvContent, "utf-8");
      const result = await convert(csvPath, { outputPath: xlsxPath });
      expect(result.inputFormat).toBe("csv");
      expect(result.outputFormat).toBe("xlsx");
      expect(result.pages).toHaveLength(1);
      expect(Buffer.isBuffer(result.pages[0].content)).toBe(true);
      const fileContent = await readFile(xlsxPath);
      expect(fileContent[0]).toBe(0x50); // 'P'
      expect(fileContent[1]).toBe(0x4b); // 'K'
    } finally {
      await unlink(csvPath).catch(() => {});
      await unlink(xlsxPath).catch(() => {});
    }
  });
});

// =============================================================================
// convert() - round-trip (XLSX → TSV → XLSX)
// =============================================================================

describe("convert - round-trip XLSX → TSV → XLSX", () => {
  it("round-trips XLSX through TSV and back to XLSX", async () => {
    const ts = Date.now();
    const tsvPath = join(tmpdir(), `aurochs-roundtrip-${ts}.tsv`);
    const xlsxPath = join(tmpdir(), `aurochs-roundtrip-${ts}.xlsx`);

    try {
      // XLSX → TSV
      const tsvResult = await convert(FIXTURES.xlsx, { outputPath: tsvPath });
      expect(tsvResult.outputFormat).toBe("tsv");
      const tsvContent = await readFile(tsvPath, "utf-8");
      expect(tsvContent.length).toBeGreaterThan(0);

      // TSV → XLSX
      const xlsxResult = await convert(tsvPath, { outputPath: xlsxPath });
      expect(xlsxResult.outputFormat).toBe("xlsx");
      const xlsxContent = await readFile(xlsxPath);
      expect(xlsxContent[0]).toBe(0x50); // 'P'
      expect(xlsxContent[1]).toBe(0x4b); // 'K'
    } finally {
      await unlink(tsvPath).catch(() => {});
      await unlink(xlsxPath).catch(() => {});
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
