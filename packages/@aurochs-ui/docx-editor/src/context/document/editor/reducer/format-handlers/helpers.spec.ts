/**
 * @file Format Handlers Helpers Tests
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import { halfPoints } from "@aurochs-office/docx/domain/types";
import {
  getSelectedIndices,
  applyRunPropsToRun,
  applyRunFormatToParagraph,
  getFirstRunProperties,
  clearRunFormatting,
  applyParagraphFormat,
  applyTableFormat,
  applyTableCellFormat,
  updateDocumentContent,
  getSelectedParagraphs,
  getSelectedTables,
} from "./helpers";

// =============================================================================
// Test Fixtures
// =============================================================================

function createParagraph(text: string, bold?: boolean): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties: bold ? { b: true } : undefined,
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createTable(rows: number, cols: number): DocxTable {
  return {
    type: "table",
    rows: Array.from({ length: rows }, () => ({
      type: "tableRow" as const,
      cells: Array.from({ length: cols }, () => ({
        type: "tableCell" as const,
        content: [createParagraph("Cell")],
      })),
    })),
  };
}

function createDocument(content: DocxDocument["body"]["content"]): DocxDocument {
  return { body: { content } };
}

// =============================================================================
// getSelectedIndices
// =============================================================================

describe("getSelectedIndices", () => {
  it("converts string IDs to number indices", () => {
    const result = getSelectedIndices(["0", "2", "5"], 10);
    expect(result).toEqual([0, 2, 5]);
  });

  it("filters out invalid indices", () => {
    const result = getSelectedIndices(["0", "invalid", "15"], 10);
    expect(result).toEqual([0]);
  });

  it("filters out out-of-range indices", () => {
    const result = getSelectedIndices(["0", "10", "-1"], 10);
    expect(result).toEqual([0]);
  });

  it("returns empty array for empty input", () => {
    const result = getSelectedIndices([], 10);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// applyRunPropsToRun
// =============================================================================

describe("applyRunPropsToRun", () => {
  it("applies properties to run without existing properties", () => {
    const run = { type: "run" as const, content: [{ type: "text" as const, value: "hello" }] };
    const result = applyRunPropsToRun(run, { b: true });
    expect(result.properties).toEqual({ b: true });
  });

  it("merges properties with existing properties", () => {
    const run = {
      type: "run" as const,
      properties: { i: true },
      content: [{ type: "text" as const, value: "hello" }],
    };
    const result = applyRunPropsToRun(run, { b: true });
    expect(result.properties).toEqual({ i: true, b: true });
  });

  it("overwrites existing properties", () => {
    const run = {
      type: "run" as const,
      properties: { b: true, sz: halfPoints(24) },
      content: [{ type: "text" as const, value: "hello" }],
    };
    const result = applyRunPropsToRun(run, { b: false });
    expect(result.properties).toEqual({ b: false, sz: halfPoints(24) });
  });
});

// =============================================================================
// applyRunFormatToParagraph
// =============================================================================

describe("applyRunFormatToParagraph", () => {
  it("applies format to all runs in paragraph", () => {
    const para: DocxParagraph = {
      type: "paragraph",
      content: [
        { type: "run", content: [{ type: "text", value: "hello" }] },
        { type: "run", content: [{ type: "text", value: "world" }] },
      ],
    };
    const result = applyRunFormatToParagraph(para, { b: true });
    expect(result.content[0].type === "run" && result.content[0].properties?.b).toBe(true);
    expect(result.content[1].type === "run" && result.content[1].properties?.b).toBe(true);
  });

  it("applies format to runs inside hyperlinks", () => {
    const para: DocxParagraph = {
      type: "paragraph",
      content: [
        {
          type: "hyperlink",
          rId: "rId1" as never,
          content: [{ type: "run", content: [{ type: "text", value: "link" }] }],
        },
      ],
    };
    const result = applyRunFormatToParagraph(para, { i: true });
    const hyperlink = result.content[0];
    if (hyperlink.type === "hyperlink") {
      expect(hyperlink.content[0].properties?.i).toBe(true);
    }
  });
});

// =============================================================================
// getFirstRunProperties
// =============================================================================

describe("getFirstRunProperties", () => {
  it("returns first run properties", () => {
    const para = createParagraph("test", true);
    const result = getFirstRunProperties(para);
    expect(result).toEqual({ b: true });
  });

  it("returns undefined for paragraph without runs", () => {
    const para: DocxParagraph = { type: "paragraph", content: [] };
    const result = getFirstRunProperties(para);
    expect(result).toBeUndefined();
  });

  it("returns properties from first run in hyperlink", () => {
    const para: DocxParagraph = {
      type: "paragraph",
      content: [
        {
          type: "hyperlink",
          rId: "rId1" as never,
          content: [{ type: "run", properties: { i: true }, content: [{ type: "text", value: "link" }] }],
        },
      ],
    };
    const result = getFirstRunProperties(para);
    expect(result).toEqual({ i: true });
  });
});

// =============================================================================
// clearRunFormatting
// =============================================================================

describe("clearRunFormatting", () => {
  it("removes properties from all runs", () => {
    const para: DocxParagraph = {
      type: "paragraph",
      content: [
        { type: "run", properties: { b: true, i: true }, content: [{ type: "text", value: "hello" }] },
      ],
    };
    const result = clearRunFormatting(para);
    expect(result.content[0].type === "run" && result.content[0].properties).toBeUndefined();
  });
});

// =============================================================================
// applyParagraphFormat
// =============================================================================

describe("applyParagraphFormat", () => {
  it("applies properties to paragraph without existing properties", () => {
    const para = createParagraph("test");
    const result = applyParagraphFormat(para, { jc: "center" });
    expect(result.properties).toEqual({ jc: "center" });
  });

  it("merges properties with existing properties", () => {
    const para: DocxParagraph = {
      ...createParagraph("test"),
      properties: { jc: "left" },
    };
    const result = applyParagraphFormat(para, { ind: { left: 720 as never } });
    expect(result.properties).toEqual({ jc: "left", ind: { left: 720 } });
  });
});

// =============================================================================
// applyTableFormat
// =============================================================================

describe("applyTableFormat", () => {
  it("applies properties to table", () => {
    const table = createTable(2, 2);
    const result = applyTableFormat(table, { tblW: { value: 5000, type: "dxa" } });
    expect(result.properties?.tblW).toEqual({ value: 5000, type: "dxa" });
  });
});

// =============================================================================
// applyTableCellFormat
// =============================================================================

describe("applyTableCellFormat", () => {
  it("applies properties to all cells", () => {
    const table = createTable(2, 2);
    const result = applyTableCellFormat(table, { vAlign: "center" });
    for (const row of result.rows) {
      for (const cell of row.cells) {
        expect(cell.properties?.vAlign).toBe("center");
      }
    }
  });
});

// =============================================================================
// updateDocumentContent
// =============================================================================

describe("updateDocumentContent", () => {
  it("updates elements at specified indices", () => {
    const doc = createDocument([
      createParagraph("para1"),
      createParagraph("para2"),
      createParagraph("para3"),
    ]);
    const result = updateDocumentContent(doc, [0, 2], (el) => {
      if (el.type === "paragraph") {
        return applyParagraphFormat(el, { jc: "center" });
      }
      return el;
    });
    expect((result.body.content[0] as DocxParagraph).properties?.jc).toBe("center");
    expect((result.body.content[1] as DocxParagraph).properties?.jc).toBeUndefined();
    expect((result.body.content[2] as DocxParagraph).properties?.jc).toBe("center");
  });

  it("does not modify elements at other indices", () => {
    const original = createParagraph("original");
    const doc = createDocument([original, createParagraph("other")]);
    const result = updateDocumentContent(doc, [1], (el) => {
      if (el.type === "paragraph") {
        return applyParagraphFormat(el, { jc: "right" });
      }
      return el;
    });
    expect(result.body.content[0]).toBe(original);
  });
});

// =============================================================================
// getSelectedParagraphs / getSelectedTables
// =============================================================================

describe("getSelectedParagraphs", () => {
  it("returns only paragraphs at selected indices", () => {
    const doc = createDocument([
      createParagraph("para1"),
      createTable(1, 1),
      createParagraph("para2"),
    ]);
    const result = getSelectedParagraphs(doc, [0, 1, 2]);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("paragraph");
    expect(result[1].type).toBe("paragraph");
  });
});

describe("getSelectedTables", () => {
  it("returns only tables at selected indices", () => {
    const doc = createDocument([
      createParagraph("para1"),
      createTable(1, 1),
      createParagraph("para2"),
    ]);
    const result = getSelectedTables(doc, [0, 1, 2]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("table");
  });
});
