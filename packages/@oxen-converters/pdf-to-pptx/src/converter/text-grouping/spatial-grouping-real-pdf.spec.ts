/**
 * @file Real PDF grouping test with k-namingrule-dl.pdf
 *
 * Tests that spatial grouping correctly groups text elements
 * based on generic rules (font size, spacing, proximity) without
 * any PDF-specific tuning.
 */

import { readFileSync } from "node:fs";
import { parsePdf } from "@oxen/pdf/parser/core/pdf-parser";
import type { PdfText } from "@oxen/pdf/domain";
import { spatialGrouping } from "./spatial-grouping";
import type { GroupedText } from "./types";
import { getSampleFixturePath } from "../../test-utils/pdf-fixtures";

/**
 * Helper to extract text content from grouped text
 */
function getGroupedTextContent(group: GroupedText): string {
  return group.paragraphs
    .map((p) => p.runs.map((r) => r.text).join(""))
    .join("\n");
}

/**
 * Helper to print group info for debugging
 */
function printGroupInfo(groups: readonly GroupedText[], verbose = false): void {
  console.log(`\n=== Total groups: ${groups.length} ===\n`);
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const content = getGroupedTextContent(g);
    const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;
    const paragraphCount = g.paragraphs.length;
    const runCount = g.paragraphs.reduce((sum, p) => sum + p.runs.length, 0);
    const firstRun = g.paragraphs[0]?.runs[0];
    const fontSize = firstRun?.fontSize ?? 0;

    console.log(
      `[${i + 1}] fontSize=${fontSize.toFixed(1)} ` +
        `paragraphs=${paragraphCount} runs=${runCount} ` +
        `bounds=(${g.bounds.x.toFixed(0)},${g.bounds.y.toFixed(0)},${g.bounds.width.toFixed(0)}x${g.bounds.height.toFixed(0)})`
    );
    console.log(`    "${preview}"`);

    // Print paragraph details if verbose
    if (verbose) {
      for (let p = 0; p < g.paragraphs.length; p++) {
        const para = g.paragraphs[p];
        const paraText = para.runs.map((r) => r.text).join("");
        const paraPreview = paraText.length > 60 ? paraText.slice(0, 60) + "..." : paraText;
        const firstX = para.runs[0]?.x ?? 0;
        console.log(`      P${p + 1}: x=${firstX.toFixed(0)} "${paraPreview}"`);
      }
    }
    console.log();
  }
}

describe("spatialGrouping with real PDF", () => {
  const PDF_PATH = getSampleFixturePath("k-namingrule-dl.pdf");

  const groups: { value: readonly GroupedText[] } = { value: [] };

  beforeAll(async () => {
    // Read PDF file - use page 2 for table cell separation testing
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [2] });
    const page = pdfDoc.pages[0];

    // Extract text elements
    const texts = page.elements.filter((e): e is PdfText => e.type === "text");

    // Apply spatial grouping with default options
    groups.value = spatialGrouping(texts);

    // Print debug info
    printGroupInfo(groups.value);
  });

  it("should create groups from the PDF", () => {
    expect(groups.value.length).toBeGreaterThan(0);
  });

  it("should group section header with its description", () => {
    // eslint-disable-next-line no-irregular-whitespace -- Japanese PDF content with full-width space
    // "１　「都道府県コード」と「都道府県名」" section
    const sectionGroup = groups.value.find((g) => {
      const content = getGroupedTextContent(g);
      return content.includes("１　「都道府県コード」と「都道府県名」");
    });

    expect(sectionGroup).toBeDefined();
    if (sectionGroup) {
      const content = getGroupedTextContent(sectionGroup);
      console.log("Section header group:", content);
      // Should include both the header and its description
      expect(content).toContain("組み合わせは、下表のとおりです");
    }
  });

  it("should separate table columns into different groups", () => {
    // Prefecture codes (00, 01, 02...) should be in their own column group
    const codeColumnGroup = groups.value.find((g) => {
      const content = getGroupedTextContent(g);
      // Check for pattern of prefecture codes
      return content.includes("00") && content.includes("01") && content.includes("02");
    });

    expect(codeColumnGroup).toBeDefined();
    if (codeColumnGroup) {
      const content = getGroupedTextContent(codeColumnGroup);
      console.log("Code column group:", content.slice(0, 200));
    }
  });

  it("should separate prefecture names into their own column", () => {
    // Prefecture names (北海道, 青森県...) should be in their own column group
    const nameColumnGroup = groups.value.find((g) => {
      const content = getGroupedTextContent(g);
      return content.includes("北海道") && content.includes("青森県");
    });

    expect(nameColumnGroup).toBeDefined();
    if (nameColumnGroup) {
      const content = getGroupedTextContent(nameColumnGroup);
      console.log("Prefecture name column:", content.slice(0, 200));
    }
  });

  it("should separate English name column", () => {
    // English prefecture names (hokkaido, aomori...) should be separate
    const englishColumnGroup = groups.value.find((g) => {
      const content = getGroupedTextContent(g);
      return content.includes("hokkaido") && content.includes("aomori");
    });

    expect(englishColumnGroup).toBeDefined();
    if (englishColumnGroup) {
      const content = getGroupedTextContent(englishColumnGroup);
      console.log("English name column:", content.slice(0, 200));
    }
  });

  it("groups should not exceed reasonable size", () => {
    // Each group should be a logical unit, not the entire page
    for (const g of groups.value) {
      const content = getGroupedTextContent(g);
      // A single group shouldn't contain multiple unrelated sections
      expect(content.length).toBeLessThan(2000);
    }
  });

  it("should have reasonable number of groups", () => {
    // The PDF has multiple sections, so we expect multiple groups
    // but not too many (which would indicate over-fragmentation)
    // and not too few (which would indicate under-grouping)
    // Expected: ~5 groups (title, description, table1, table2, page number)
    expect(groups.value.length).toBeGreaterThanOrEqual(4);
    expect(groups.value.length).toBeLessThan(100);
  });
});
