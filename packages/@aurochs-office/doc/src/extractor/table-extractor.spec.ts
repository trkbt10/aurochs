/** @file Table extractor tests */
import { extractTables } from "./table-extractor";
import type { DocParagraph, DocTable } from "../domain/types";

function para(text: string, opts?: Partial<DocParagraph>): DocParagraph {
  return { runs: [{ text }], ...opts };
}

function isTable(item: DocParagraph | DocTable): item is DocTable {
  return "rows" in item;
}

function expectTable(item: DocParagraph | DocTable): DocTable {
  if (!isTable(item)) {
    throw new Error("Expected DocTable but got DocParagraph");
  }
  return item;
}

describe("extractTables", () => {
  it("passes through non-table paragraphs", () => {
    const result = extractTables([para("Hello"), para("World")]);
    expect(result).toHaveLength(2);
    expect(isTable(result[0])).toBe(false);
  });

  it("extracts a simple 1x2 table", () => {
    const paragraphs: DocParagraph[] = [
      para("Cell1\x07", { inTable: true }),
      para("Cell2\x07", { inTable: true }),
      para("", { inTable: true, isRowEnd: true }),
    ];
    const result = extractTables(paragraphs);
    expect(result).toHaveLength(1);
    expect(isTable(result[0])).toBe(true);

    const table = expectTable(result[0]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].cells).toHaveLength(2);
    expect(table.rows[0].cells[0].paragraphs[0].runs[0].text).toBe("Cell1");
    expect(table.rows[0].cells[1].paragraphs[0].runs[0].text).toBe("Cell2");
  });

  it("extracts a 2x2 table", () => {
    const paragraphs: DocParagraph[] = [
      para("A1\x07", { inTable: true }),
      para("A2\x07", { inTable: true }),
      para("", { inTable: true, isRowEnd: true }),
      para("B1\x07", { inTable: true }),
      para("B2\x07", { inTable: true }),
      para("", { inTable: true, isRowEnd: true }),
    ];
    const result = extractTables(paragraphs);
    expect(result).toHaveLength(1);

    const table = expectTable(result[0]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].cells).toHaveLength(2);
    expect(table.rows[1].cells).toHaveLength(2);
  });

  it("handles table between normal paragraphs", () => {
    const paragraphs: DocParagraph[] = [
      para("Before"),
      para("Cell\x07", { inTable: true }),
      para("", { inTable: true, isRowEnd: true }),
      para("After"),
    ];
    const result = extractTables(paragraphs);
    expect(result).toHaveLength(3);
    expect(isTable(result[0])).toBe(false);
    expect(isTable(result[1])).toBe(true);
    expect(isTable(result[2])).toBe(false);
  });

  it("strips cell marks from cell content", () => {
    const paragraphs: DocParagraph[] = [
      para("Content\x07", { inTable: true }),
      para("", { inTable: true, isRowEnd: true }),
    ];
    const result = extractTables(paragraphs);
    const table = expectTable(result[0]);
    expect(table.rows[0].cells[0].paragraphs[0].runs[0].text).toBe("Content");
  });
});
