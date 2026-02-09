import { describe, it, expect } from "vitest";
import { buildDocx, getBuildData } from "./builder";
import type { DocxBuildSpec } from "./types";

// =============================================================================
// buildDocx
// =============================================================================

describe("buildDocx", () => {
  it("builds minimal document", async () => {
    const spec: DocxBuildSpec = {
      output: "test.docx",
      content: [{ type: "paragraph", runs: [{ text: "Hello World" }] }],
    };
    const result = await buildDocx(spec);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // ZIP magic bytes
    expect(result[0]).toBe(0x50); // P
    expect(result[1]).toBe(0x4b); // K
  });

  it("builds document with styles", async () => {
    const spec: DocxBuildSpec = {
      output: "styled.docx",
      content: [
        { type: "paragraph", style: "Heading1", runs: [{ text: "Title", bold: true }] },
      ],
      styles: [
        { type: "paragraph", styleId: "Heading1", name: "heading 1", run: { bold: true, fontSize: 32 } },
      ],
    };
    const result = await buildDocx(spec);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("builds document with numbering", async () => {
    const spec: DocxBuildSpec = {
      output: "numbered.docx",
      content: [
        { type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "Item 1" }] },
      ],
      numbering: [
        { abstractNumId: 0, numId: 1, levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }] },
      ],
    };
    const result = await buildDocx(spec);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("builds document with table", async () => {
    const spec: DocxBuildSpec = {
      output: "table.docx",
      content: [
        {
          type: "table",
          grid: [2880, 2880],
          rows: [{
            cells: [
              { content: [{ type: "paragraph", runs: [{ text: "A1" }] }] },
              { content: [{ type: "paragraph", runs: [{ text: "B1" }] }] },
            ],
          }],
        },
      ],
    };
    const result = await buildDocx(spec);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("builds document with section properties", async () => {
    const spec: DocxBuildSpec = {
      output: "sectioned.docx",
      content: [{ type: "paragraph", runs: [{ text: "Content" }] }],
      section: {
        pageSize: { w: 12240, h: 15840 },
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    };
    const result = await buildDocx(spec);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("builds empty document", async () => {
    const spec: DocxBuildSpec = {
      output: "empty.docx",
      content: [],
    };
    const result = await buildDocx(spec);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(0x50);
    expect(result[1]).toBe(0x4b);
  });
});

// =============================================================================
// getBuildData
// =============================================================================

describe("getBuildData", () => {
  it("counts paragraphs", () => {
    const data = getBuildData({
      output: "test.docx",
      content: [
        { type: "paragraph", runs: [{ text: "A" }] },
        { type: "paragraph", runs: [{ text: "B" }] },
        { type: "paragraph", runs: [{ text: "C" }] },
      ],
    });
    expect(data.outputPath).toBe("test.docx");
    expect(data.paragraphCount).toBe(3);
    expect(data.tableCount).toBe(0);
  });

  it("counts tables and paragraphs inside cells", () => {
    const data = getBuildData({
      output: "test.docx",
      content: [
        { type: "paragraph", runs: [{ text: "Before" }] },
        {
          type: "table",
          rows: [{
            cells: [
              { content: [{ type: "paragraph", runs: [{ text: "A1" }] }] },
              { content: [
                { type: "paragraph", runs: [{ text: "B1 line 1" }] },
                { type: "paragraph", runs: [{ text: "B1 line 2" }] },
              ] },
            ],
          }],
        },
      ],
    });
    expect(data.paragraphCount).toBe(4); // 1 top-level + 3 in cells
    expect(data.tableCount).toBe(1);
  });

  it("returns zero counts for empty document", () => {
    const data = getBuildData({ output: "test.docx", content: [] });
    expect(data.paragraphCount).toBe(0);
    expect(data.tableCount).toBe(0);
  });
});
