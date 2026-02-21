/**
 * @file DOCX extract API tests
 */

import type { DocxDocument, DocxBody } from "../domain/document";
import type { DocxParagraph } from "../domain/paragraph";
import type { DocxTable, DocxTableRow, DocxTableCell } from "../domain/table";
import type { DocxRun, DocxText } from "../domain/run";
import { extractDocxSegments } from "./index";

// =============================================================================
// Test Helpers
// =============================================================================

function createText(value: string): DocxText {
  return { type: "text", value };
}

function createRun(text: string): DocxRun {
  return {
    type: "run",
    content: [createText(text)],
  };
}

function createParagraph(text: string, options?: { outlineLvl?: number; pStyle?: string }): DocxParagraph {
  return {
    type: "paragraph",
    content: [createRun(text)],
    properties: options ? ({ outlineLvl: options.outlineLvl, pStyle: options.pStyle } as DocxParagraph["properties"]) : undefined,
  };
}

function createTableCell(text: string): DocxTableCell {
  return {
    type: "tableCell",
    content: [createParagraph(text)],
  };
}

function createTableRow(cells: string[]): DocxTableRow {
  return {
    type: "tableRow",
    cells: cells.map(createTableCell),
  };
}

function createTable(rows: string[][]): DocxTable {
  return {
    type: "table",
    rows: rows.map(createTableRow),
  };
}

function createDocument(content: DocxBody["content"]): DocxDocument {
  return {
    body: { content },
  };
}

// =============================================================================
// extractDocxSegments Tests
// =============================================================================

describe("extractDocxSegments", () => {
  it("returns empty segments for empty document", () => {
    const doc = createDocument([]);
    const result = extractDocxSegments(doc);

    expect(result.segments).toHaveLength(0);
    expect(result.totalText).toBe("");
    expect(result.sourceLength).toBe(0);
  });

  it("extracts paragraph segment", () => {
    const doc = createDocument([createParagraph("Hello World")]);
    const result = extractDocxSegments(doc);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].type).toBe("paragraph");
    expect(result.segments[0].text).toBe("Hello World");
  });

  it("extracts heading segment with outline level", () => {
    const doc = createDocument([createParagraph("Chapter 1", { outlineLvl: 0 })]);
    const result = extractDocxSegments(doc);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].type).toBe("heading");
    expect(result.segments[0].text).toBe("Chapter 1");
    expect(result.segments[0].metadata.outlineLevel).toBe(0);
  });

  it("extracts table segment", () => {
    const doc = createDocument([
      createTable([
        ["A1", "B1"],
        ["A2", "B2"],
      ]),
    ]);
    const result = extractDocxSegments(doc);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].type).toBe("table");
    expect(result.segments[0].metadata.rowCount).toBe(2);
    expect(result.segments[0].metadata.cellCount).toBe(4);
  });

  it("extracts multiple segments in order", () => {
    const doc = createDocument([
      createParagraph("Introduction", { outlineLvl: 0 }),
      createParagraph("This is the content."),
      createTable([["Data"]]),
    ]);
    const result = extractDocxSegments(doc);

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].type).toBe("heading");
    expect(result.segments[1].type).toBe("paragraph");
    expect(result.segments[2].type).toBe("table");
  });

  it("skips empty paragraphs", () => {
    const doc = createDocument([
      createParagraph("Content"),
      createParagraph(""),
      createParagraph("More content"),
    ]);
    const result = extractDocxSegments(doc);

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].text).toBe("Content");
    expect(result.segments[1].text).toBe("More content");
  });

  it("includes style ID in metadata", () => {
    const doc = createDocument([createParagraph("Styled text", { pStyle: "Heading1" })]);
    const result = extractDocxSegments(doc);

    expect(result.segments[0].metadata.styleId).toBe("Heading1");
  });

  it("assigns correct segment IDs", () => {
    const doc = createDocument([
      createParagraph("Heading", { outlineLvl: 0 }),
      createParagraph("Paragraph"),
      createTable([["Cell"]]),
    ]);
    const result = extractDocxSegments(doc);

    expect(result.segments[0].id).toBe("heading-0");
    expect(result.segments[1].id).toBe("paragraph-1");
    expect(result.segments[2].id).toBe("table-2");
  });

  it("calculates correct source ranges", () => {
    const doc = createDocument([
      createParagraph("ABC"), // 3 chars
      createParagraph("DEFGH"), // 5 chars
    ]);
    const result = extractDocxSegments(doc);

    expect(result.segments[0].sourceRange.start).toBe(0);
    expect(result.segments[0].sourceRange.end).toBe(3);
    expect(result.segments[1].sourceRange.start).toBe(4); // 3 + 1 (separator)
    expect(result.segments[1].sourceRange.end).toBe(9); // 4 + 5
  });

  it("joins all text in totalText", () => {
    const doc = createDocument([createParagraph("Hello"), createParagraph("World")]);
    const result = extractDocxSegments(doc);

    expect(result.totalText).toBe("Hello\nWorld");
    expect(result.sourceLength).toBe(11);
  });

  it("handles different outline levels", () => {
    const doc = createDocument([
      createParagraph("H1", { outlineLvl: 0 }),
      createParagraph("H2", { outlineLvl: 1 }),
      createParagraph("H3", { outlineLvl: 2 }),
    ]);
    const result = extractDocxSegments(doc);

    expect(result.segments[0].metadata.outlineLevel).toBe(0);
    expect(result.segments[1].metadata.outlineLevel).toBe(1);
    expect(result.segments[2].metadata.outlineLevel).toBe(2);
  });
});
