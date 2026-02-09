import { describe, it, expect } from "vitest";
import { convertSpecToWorkbook, type WorkbookSpec } from "./build-spec";

describe("convertSpecToWorkbook", () => {
  it("converts minimal spec with one string cell", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "Sheet1", rows: [{ row: 1, cells: [{ ref: "A1", value: "Hello" }] }] }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe("Sheet1");
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "string", value: "Hello" });
    expect(wb.sheets[0].xmlPath).toBe("xl/worksheets/sheet1.xml");
    expect(wb.dateSystem).toBe("1900");
  });

  it("resolves shorthand string value", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "test" }] }] }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "string", value: "test" });
  });

  it("resolves shorthand number value", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: 42 }] }] }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "number", value: 42 });
  });

  it("resolves shorthand boolean value", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: true }] }] }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "boolean", value: true });
  });

  it("resolves full value spec objects for all types", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{
          row: 1,
          cells: [
            { ref: "A1", value: { type: "string", value: "hello" } },
            { ref: "B1", value: { type: "number", value: 3.14 } },
            { ref: "C1", value: { type: "boolean", value: false } },
            { ref: "D1", value: { type: "date", value: "2024-01-15T00:00:00Z" } },
            { ref: "E1", value: { type: "error", value: "#DIV/0!" } },
            { ref: "F1", value: { type: "empty" } },
          ],
        }],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    const cells = wb.sheets[0].rows[0].cells;
    expect(cells[0].value).toEqual({ type: "string", value: "hello" });
    expect(cells[1].value).toEqual({ type: "number", value: 3.14 });
    expect(cells[2].value).toEqual({ type: "boolean", value: false });
    expect(cells[3].value.type).toBe("date");
    expect((cells[3].value as { type: "date"; value: Date }).value).toBeInstanceOf(Date);
    expect(cells[4].value).toEqual({ type: "error", value: "#DIV/0!" });
    expect(cells[5].value).toEqual({ type: "empty" });
  });

  it("throws on invalid error value", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "A1", value: { type: "error", value: "#INVALID!" } }] }],
      }],
    };
    expect(() => convertSpecToWorkbook(spec)).toThrow("Invalid error value");
  });

  it("handles cell without value as empty", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1" }] }] }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "empty" });
  });

  it("resolves formula cells", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{
          row: 1,
          cells: [
            { ref: "A1", value: 10 },
            { ref: "B1", value: 20 },
            { ref: "C1", formula: { expression: "SUM(A1:B1)" } },
          ],
        }],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    const c = wb.sheets[0].rows[0].cells[2];
    expect(c.formula).toEqual({ expression: "SUM(A1:B1)", type: "normal" });
  });

  it("resolves array formula type", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "A1", formula: { expression: "TRANSPOSE(B1:D1)", type: "array" } }] }],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].rows[0].cells[0].formula?.type).toBe("array");
  });

  it("parses merge cells", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "A1", value: "merged" }] }],
        mergeCells: ["A1:B2", "D1:E3"],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].mergeCells).toHaveLength(2);
    expect(wb.sheets[0].mergeCells![0].start.col).toBe(1);
    expect(wb.sheets[0].mergeCells![0].end.col).toBe(2);
    expect(wb.sheets[0].mergeCells![0].end.row).toBe(2);
    expect(wb.sheets[0].mergeCells![1].end.col).toBe(5);
  });

  it("resolves column definitions", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }],
        columns: [
          { min: 1, max: 3, width: 15 },
          { min: 4, max: 4, hidden: true },
        ],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].columns).toHaveLength(2);
    expect(wb.sheets[0].columns![0].width).toBe(15);
    expect(wb.sheets[0].columns![1].hidden).toBe(true);
  });

  it("resolves row properties", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, height: 30, hidden: false, customHeight: true, cells: [{ ref: "A1", value: "x" }] }],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    const row = wb.sheets[0].rows[0];
    expect(row.height).toBe(30);
    expect(row.hidden).toBe(false);
    expect(row.customHeight).toBe(true);
  });

  it("builds custom styles - fonts with color", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x", styleId: 1 }] }] }],
      styles: {
        fonts: [{ name: "Arial", size: 14, bold: true, color: "#FF0000" }],
        cellXfs: [{ fontId: 1 }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    // Default font at 0 + custom font at 1
    expect(wb.styles.fonts).toHaveLength(2);
    expect(wb.styles.fonts[1].name).toBe("Arial");
    expect(wb.styles.fonts[1].bold).toBe(true);
    expect(wb.styles.fonts[1].color).toEqual({ type: "rgb", value: "FFFF0000" });
  });

  it("builds custom styles - solid fill", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        fills: [{ type: "solid", color: "#00FF00" }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    // 2 defaults (none, gray125) + 1 custom
    expect(wb.styles.fills).toHaveLength(3);
    const fill = wb.styles.fills[2];
    expect(fill.type).toBe("pattern");
    if (fill.type === "pattern") {
      expect(fill.pattern.patternType).toBe("solid");
      expect(fill.pattern.fgColor).toEqual({ type: "rgb", value: "FF00FF00" });
    }
  });

  it("builds custom styles - borders", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        borders: [{ left: { style: "thin", color: "#000000" }, right: { style: "thin" } }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    // 1 default + 1 custom
    expect(wb.styles.borders).toHaveLength(2);
    expect(wb.styles.borders[1].left?.style).toBe("thin");
    expect(wb.styles.borders[1].left?.color).toEqual({ type: "rgb", value: "FF000000" });
  });

  it("builds custom number formats", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        numberFormats: [{ id: 164, formatCode: "#,##0.00" }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.styles.numberFormats).toHaveLength(1);
    expect((wb.styles.numberFormats[0].numFmtId as number)).toBe(164);
  });

  it("builds cellXfs with alignment and protection", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        cellXfs: [{
          alignment: { horizontal: "center", vertical: "top", wrapText: true },
          protection: { locked: true, hidden: false },
        }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    // Default xf + custom
    expect(wb.styles.cellXfs).toHaveLength(2);
    const xf = wb.styles.cellXfs[1];
    expect(xf.alignment?.horizontal).toBe("center");
    expect(xf.alignment?.wrapText).toBe(true);
    expect(xf.protection?.locked).toBe(true);
    expect(xf.applyAlignment).toBe(true);
    expect(xf.applyProtection).toBe(true);
  });

  it("builds defined names - global and local", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "Sheet1", rows: [{ row: 1, cells: [{ ref: "A1", value: 1 }] }] }],
      definedNames: [
        { name: "TotalRange", formula: "Sheet1!$A$1:$A$10" },
        { name: "_xlnm.Print_Area", formula: "Sheet1!$A$1:$D$20", localSheetId: 0 },
        { name: "HiddenName", formula: "42", hidden: true },
      ],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.definedNames).toHaveLength(3);
    expect(wb.definedNames![0].name).toBe("TotalRange");
    expect(wb.definedNames![0].localSheetId).toBeUndefined();
    expect(wb.definedNames![1].localSheetId).toBe(0);
    expect(wb.definedNames![2].hidden).toBe(true);
  });

  it("builds multiple sheets", () => {
    const spec: WorkbookSpec = {
      sheets: [
        { name: "Data", rows: [{ row: 1, cells: [{ ref: "A1", value: "data" }] }] },
        { name: "Summary", rows: [{ row: 1, cells: [{ ref: "A1", value: "total" }] }] },
        { name: "Hidden", state: "hidden", rows: [{ row: 1, cells: [{ ref: "A1", value: "secret" }] }] },
      ],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets).toHaveLength(3);
    expect(wb.sheets[0].name).toBe("Data");
    expect(wb.sheets[0].sheetId).toBe(1);
    expect(wb.sheets[1].sheetId).toBe(2);
    expect(wb.sheets[2].state).toBe("hidden");
    expect(wb.sheets[2].xmlPath).toBe("xl/worksheets/sheet3.xml");
  });

  it("collects shared strings", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: "hello" }, { ref: "B1", value: "world" }] },
          { row: 2, cells: [{ ref: "A2", value: "hello" }] },
        ],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sharedStrings).toContain("hello");
    expect(wb.sharedStrings).toContain("world");
  });

  it("uses 1904 date system when specified", () => {
    const spec: WorkbookSpec = {
      dateSystem: "1904",
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: 1 }] }] }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.dateSystem).toBe("1904");
    expect(wb.sheets[0].dateSystem).toBe("1904");
  });

  it("resolves color with theme type", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        fonts: [{ name: "Calibri", size: 11, color: { type: "theme", theme: 1, tint: -0.5 } }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.styles.fonts[1].color).toEqual({ type: "theme", theme: 1, tint: -0.5 });
  });

  it("resolves color with full AARRGGBB", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        fonts: [{ name: "Calibri", size: 11, color: { type: "rgb", value: "80FF0000" } }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.styles.fonts[1].color).toEqual({ type: "rgb", value: "80FF0000" });
  });

  it("resolves sheetFormatPr", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }],
        sheetFormatPr: { defaultRowHeight: 18, defaultColWidth: 12 },
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect(wb.sheets[0].sheetFormatPr?.defaultRowHeight).toBe(18);
    expect(wb.sheets[0].sheetFormatPr?.defaultColWidth).toBe(12);
  });

  it("sets cell address correctly from A1 notation", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "C5", value: "test" }] }],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    const addr = wb.sheets[0].rows[0].cells[0].address;
    expect(addr.col).toBe(3);
    expect(addr.row).toBe(5);
  });

  it("applies cellXf applyFont/applyFill/applyBorder flags", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        cellXfs: [{ fontId: 1, fillId: 2, borderId: 1, numFmtId: 164 }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    const xf = wb.styles.cellXfs[1];
    expect(xf.applyFont).toBe(true);
    expect(xf.applyFill).toBe(true);
    expect(xf.applyBorder).toBe(true);
    expect(xf.applyNumberFormat).toBe(true);
  });

  it("builds gradient fill", () => {
    const spec: WorkbookSpec = {
      sheets: [{ name: "S", rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }] }],
      styles: {
        fills: [{
          type: "gradient",
          gradientType: "linear",
          degree: 90,
          stops: [
            { position: 0, color: "#FF0000" },
            { position: 1, color: "#0000FF" },
          ],
        }],
      },
    };
    const wb = convertSpecToWorkbook(spec);
    const fill = wb.styles.fills[2];
    expect(fill.type).toBe("gradient");
    if (fill.type === "gradient") {
      expect(fill.gradient.gradientType).toBe("linear");
      expect(fill.gradient.degree).toBe(90);
      expect(fill.gradient.stops).toHaveLength(2);
    }
  });

  it("handles cell styleId", () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "S",
        rows: [{ row: 1, cells: [{ ref: "A1", value: "styled", styleId: 1 }] }],
      }],
    };
    const wb = convertSpecToWorkbook(spec);
    expect((wb.sheets[0].rows[0].cells[0].styleId as number)).toBe(1);
  });
});
