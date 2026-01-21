/**
 * @file Spreadsheet fixtures (POI) integration checks
 *
 * Uses `fixtures/poi-test-data/test-data/spreadsheet/*.xlsx` as regression inputs and verifies:
 * - Workbook parsing (OOXML)
 * - Formula evaluation (supported subset) and shared formula expansion
 * - Style resolution (font/fill/border/alignment) as used by the xlsx-editor UI selectors
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseXlsxWorkbook, type XlsxParseOptions } from "../../src/xlsx/parser";
import { createFormulaEvaluator } from "../../src/xlsx/formula/evaluator";
import { colIdx, rowIdx } from "../../src/xlsx/domain/types";
import type { CellAddress } from "../../src/xlsx/domain/cell/address";
import type { CellValue } from "../../src/xlsx/domain/cell/types";
import { getCell } from "../../src/xlsx-editor/cell/query";
import { resolveCellRenderStyle } from "../../src/xlsx-editor/selectors/cell-render-style";
import { resolveCellStyleDetails } from "../../src/xlsx-editor/selectors/cell-style-details";
import { formatCellValueForDisplay, resolveCellFormatCode } from "../../src/xlsx-editor/selectors/cell-display-text";
import { resolveCellConditionalDifferentialFormat } from "../../src/xlsx-editor/selectors/conditional-formatting";
import { createSheetLayout } from "../../src/xlsx-editor/selectors/sheet-layout";
import { buildBorderOverlayLines } from "../../src/xlsx-editor/selectors/border-overlay";
import { createGetZipTextFileContentFromBytes } from "../../src/files/ooxml-zip";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "fixtures/poi-test-data/test-data/spreadsheet", name);
}

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

async function parseWorkbookFromFixture(name: string) {
  const bytes = await readFile(fixturePath(name));
  const getFileContent = await createGetZipTextFileContentFromBytes(bytes);
  return parseXlsxWorkbook(getFileContent);
}

async function parseWorkbookFromFixtureWithOptions(name: string, options: XlsxParseOptions) {
  const bytes = await readFile(fixturePath(name));
  const getFileContent = await createGetZipTextFileContentFromBytes(bytes);
  return parseXlsxWorkbook(getFileContent, options);
}

function toExpectedScalar(value: CellValue): ReturnType<ReturnType<typeof createFormulaEvaluator>["evaluateCell"]> {
  switch (value.type) {
    case "empty":
      return null;
    case "string":
      return value.value;
    case "number":
      return value.value;
    case "boolean":
      return value.value;
    case "error":
      return { type: "error", value: value.value };
    case "date":
      return value.value.toISOString();
  }
}

describe("POI spreadsheet fixtures (parsing + formulas + style)", () => {
  it("formula-eval.xlsx: evaluates SUM and matches cached value", async () => {
    const workbook = await parseWorkbookFromFixture("formula-eval.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const address = createAddress(4, 1); // D1
    const cell = getCell(sheet, address);
    if (!cell?.formula) {
      throw new Error("D1 must be a formula cell");
    }

    expect(cell.formula.expression).toBe("SUM(A1:C1)");
    expect(evaluator.evaluateCell(0, address)).toBe(6.75);
    expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
  });

  it("shared_formulas.xlsx: expands shared formulas and can evaluate shifted references", async () => {
    const workbook = await parseWorkbookFromFixture("shared_formulas.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const addresses: readonly CellAddress[] = [
      createAddress(1, 2), // A2 (base)
      createAddress(1, 3), // A3 (shifted)
      createAddress(1, 41), // A41 (shifted)
    ];

    for (const address of addresses) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected shared formula cell to exist");
      }
      if (cell.formula.type !== "shared") {
        throw new Error("Expected shared formula type");
      }
      expect(cell.formula.expression.trim().length).toBeGreaterThan(0);
      expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("50784-font_theme_colours.xlsx: resolves theme vs rgb font colors", async () => {
    const workbook = await parseWorkbookFromFixture("50784-font_theme_colours.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const themed = createAddress(1, 1); // A1
    const rgb = createAddress(2, 1); // B1

    const themedCss = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: themed, cell: getCell(sheet, themed) });
    const rgbCss = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: rgb, cell: getCell(sheet, rgb) });

    expect(themedCss.color).toBe("#B97135");
    expect(rgbCss.color).toBe("#FF0000");
    expect(typeof themedCss.fontFamily).toBe("string");
    expect(typeof themedCss.fontSize).toBe("string");
  });

  it("50786-indexed_colours.xlsx: resolves indexed fill + center alignment", async () => {
    const workbook = await parseWorkbookFromFixture("50786-indexed_colours.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const address = createAddress(2, 3); // B3
    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell: getCell(sheet, address) });

    expect(css.backgroundColor).toBe("#CCFFCC");
    expect(css.justifyContent).toBe("center");
    expect(css.alignItems).toBe("center");
    expect(css.whiteSpace).toBe("normal");
  });

  it("50846-border_colours.xlsx: border overlay lines use resolved colors", async () => {
    const workbook = await parseWorkbookFromFixture("50846-border_colours.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const layout = createSheetLayout(sheet, {
      rowCount: 50,
      colCount: 20,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 72,
    });

    const lines = buildBorderOverlayLines({
      sheet,
      styles: workbook.styles,
      layout,
      rowRange: { start: 0, end: 5 },
      colRange: { start: 0, end: 5 },
      rowCount: 50,
      colCount: 20,
      scrollTop: 0,
      scrollLeft: 0,
      defaultBorderColor: "#000000",
    });

    const colors = new Set(lines.map((line) => line.stroke));
    expect(lines.length).toBeGreaterThan(0);
    expect(colors.has("#903C3A")).toBe(true);
    expect(colors.has("#FF0000")).toBe(true);
  });

  it("decimal-format.xlsx: resolves number format code and formats display text", async () => {
    const workbook = await parseWorkbookFromFixture("decimal-format.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const a1 = createAddress(1, 1);
    const a2 = createAddress(1, 2);

    const a1Cell = getCell(sheet, a1);
    const a2Cell = getCell(sheet, a2);
    if (!a1Cell || !a2Cell) {
      throw new Error("A1 and A2 must exist");
    }

    const a1Details = resolveCellStyleDetails({ styles: workbook.styles, sheet, address: a1, cell: a1Cell });
    const a2Details = resolveCellStyleDetails({ styles: workbook.styles, sheet, address: a2, cell: a2Cell });
    expect(a1Details.formatCode).toBe("0.00_ ");
    expect(a2Details.formatCode).toBe("0.00_ ");

    const a1FormatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: a1, cell: a1Cell });
    const a2FormatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: a2, cell: a2Cell });
    expect(a1FormatCode).toBe("0.00_ ");
    expect(a2FormatCode).toBe("0.00_ ");

    expect(formatCellValueForDisplay(a1Cell.value, a1FormatCode)).toBe("1.01");
    expect(formatCellValueForDisplay(a2Cell.value, a2FormatCode)).toBe("1.00");
  });

  it("NewlineInFormulas.xlsx: evaluates formulas containing newlines and matches cached value", async () => {
    const workbook = await parseWorkbookFromFixture("NewlineInFormulas.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const address = createAddress(1, 1); // A1
    const cell = getCell(sheet, address);
    if (!cell?.formula) {
      throw new Error("A1 must be a formula cell");
    }

    expect(cell.formula.expression).toBe("SUM(\r\n1,2\r\n)");
    expect(evaluator.evaluateCell(0, address)).toBe(3);
    expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
  });

  it("InlineStrings.xlsx: parses inline strings and evaluates formulas with absolute refs", async () => {
    const workbook = await parseWorkbookFromFixture("InlineStrings.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const a1 = createAddress(1, 1);
    const b2 = createAddress(2, 2);
    const c2 = createAddress(3, 2);

    const a1Cell = getCell(sheet, a1);
    const b2Cell = getCell(sheet, b2);
    const c2Cell = getCell(sheet, c2);
    if (!a1Cell || !b2Cell || !c2Cell) {
      throw new Error("Expected A1, B2 and C2 to exist");
    }

    expect(
      formatCellValueForDisplay(a1Cell.value, resolveCellFormatCode({ styles: workbook.styles, sheet, address: a1, cell: a1Cell })),
    ).toBe("Numbers");
    expect(
      formatCellValueForDisplay(b2Cell.value, resolveCellFormatCode({ styles: workbook.styles, sheet, address: b2, cell: b2Cell })),
    ).toBe("A");
    expect(
      formatCellValueForDisplay(c2Cell.value, resolveCellFormatCode({ styles: workbook.styles, sheet, address: c2, cell: c2Cell })),
    ).toBe("1st Inline String");

    const evaluator = createFormulaEvaluator(workbook);
    const d2 = createAddress(4, 2);
    const d4 = createAddress(4, 4);
    const d7 = createAddress(4, 7);

    const d2Cell = getCell(sheet, d2);
    const d4Cell = getCell(sheet, d4);
    const d7Cell = getCell(sheet, d7);
    if (!d2Cell?.formula || !d4Cell?.formula || !d7Cell?.formula) {
      throw new Error("D2/D4/D7 must be formula cells");
    }

    expect(d2Cell.formula.expression).toBe("A2");
    expect(d4Cell.formula.expression).toBe("A4-A$2");
    expect(d7Cell.formula.expression).toBe("A7-A$2");

    expect(evaluator.evaluateCell(0, d2)).toEqual(toExpectedScalar(d2Cell.value));
    expect(evaluator.evaluateCell(0, d4)).toEqual(toExpectedScalar(d4Cell.value));
    expect(evaluator.evaluateCell(0, d7)).toEqual(toExpectedScalar(d7Cell.value));
  });

  it("61060-conditional-number-formatting.xlsx: applies dxfs (fill + numFmt) via conditionalFormatting", async () => {
    const workbook = await parseWorkbookFromFixture("61060-conditional-number-formatting.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{
      readonly address: CellAddress;
      readonly expectedFormatCode: string;
      readonly expectedBackground: string;
    }> = [
      { address: createAddress(1, 1), expectedFormatCode: "0.00", expectedBackground: "#DBEEF4" },
      { address: createAddress(1, 2), expectedFormatCode: "0.00", expectedBackground: "#DBEEF4" },
      { address: createAddress(1, 3), expectedFormatCode: "0.00E+00", expectedBackground: "#FDEADA" },
      { address: createAddress(1, 5), expectedFormatCode: "\"$\"#,##0_);[Red]\\(\"$\"#,##0\\)", expectedBackground: "#F2DCDB" },
    ];

    for (const { address, expectedFormatCode, expectedBackground } of cases) {
      const cell = getCell(sheet, address);
      if (!cell) {
        throw new Error("Expected cell to exist");
      }
      const conditionalFormat = resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex: 0,
        address,
        cell,
        formulaEvaluator: evaluator,
      });
      if (!conditionalFormat) {
        throw new Error("Expected conditional formatting to apply");
      }

      expect(resolveCellFormatCode({ styles: workbook.styles, sheet, address, cell, conditionalFormat })).toBe(expectedFormatCode);
      const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell, conditionalFormat });
      expect(css.backgroundColor).toBe(expectedBackground);
    }

    const a4 = createAddress(1, 4);
    const a4Cell = getCell(sheet, a4);
    if (!a4Cell) {
      throw new Error("A4 must exist");
    }
    expect(
      resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex: 0,
        address: a4,
        cell: a4Cell,
        formulaEvaluator: evaluator,
      }),
    ).toBeUndefined();
  });

  it("55406_Conditional_formatting_sample.xlsx: evaluates expression rules (ISEVEN(ROW())) and applies dxfs", async () => {
    const workbook = await parseWorkbookFromFixture("55406_Conditional_formatting_sample.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const a1 = createAddress(1, 1);
    const a2 = createAddress(1, 2);
    const a1Cell = getCell(sheet, a1);
    const a2Cell = getCell(sheet, a2);
    if (!a1Cell || !a2Cell) {
      throw new Error("A1 and A2 must exist");
    }

    const a1Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: a1,
      cell: a1Cell,
      formulaEvaluator: evaluator,
    });
    expect(a1Format).toBeUndefined();

    const a2Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: a2,
      cell: a2Cell,
      formulaEvaluator: evaluator,
    });
    if (!a2Format) {
      throw new Error("Expected conditional formatting to apply for A2");
    }

    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a2, cell: a2Cell, conditionalFormat: a2Format });
    expect(css.backgroundColor).toBe("#000000");
  });

  it("50795.xlsx: parses legacy comments and associates them to cells", async () => {
    const workbook = await parseWorkbookFromFixture("50795.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const comments = sheet.comments;
    if (!comments || comments.length === 0) {
      throw new Error("Expected sheet comments to be parsed");
    }
    expect(comments).toHaveLength(1);
    expect(comments[0]?.author).toBe("Автор");
    expect(comments[0]?.address.col).toBe(1);
    expect(comments[0]?.address.row).toBe(1);
    expect(comments[0]?.text).toBe("Автор:\ncomment");
  });

  it("sharedhyperlink.xlsx: parses hyperlinks and resolves relationship targets", async () => {
    const workbook = await parseWorkbookFromFixture("sharedhyperlink.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const hyperlinks = sheet.hyperlinks;
    if (!hyperlinks) {
      throw new Error("Expected hyperlinks to be parsed");
    }
    expect(hyperlinks).toHaveLength(2);

    const h0 = hyperlinks[0];
    const h1 = hyperlinks[1];
    if (!h0 || !h1) {
      throw new Error("Expected two hyperlinks");
    }
    expect(h0.ref.start.col).toBe(1);
    expect(h0.ref.start.row).toBe(1);
    expect(h0.ref.end.col).toBe(1);
    expect(h0.ref.end.row).toBe(1);
    expect(h0.target).toBe("http://www.apache.org/");
    expect(h0.targetMode).toBe("External");

    expect(h1.ref.start.col).toBe(1);
    expect(h1.ref.start.row).toBe(3);
    expect(h1.ref.end.col).toBe(1);
    expect(h1.ref.end.row).toBe(5);
    expect(h1.display).toBe("http://www.apache.org");
    expect(h1.target).toBe("http://www.apache.org/");
    expect(h1.targetMode).toBe("External");
  });

  it("conditional_formatting_cell_is.xlsx: applies cellIs rules referencing other cells", async () => {
    const workbook = await parseWorkbookFromFixture("conditional_formatting_cell_is.xlsx");
    const sheet = workbook.sheets[1];
    if (!sheet) {
      throw new Error("sheet[1] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const targets: ReadonlyArray<CellAddress> = [
      createAddress(2, 3), // B3 (equals B2)
      createAddress(2, 4), // B4 (notEqual B3)
      createAddress(4, 3), // D3 (equals D2)
      createAddress(6, 3), // F3 (equals F2)
    ];

    for (const address of targets) {
      const cell = getCell(sheet, address);
      const conditionalFormat = resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex: 1,
        address,
        cell,
        formulaEvaluator: evaluator,
      });
      if (!conditionalFormat) {
        throw new Error("Expected conditional formatting to apply");
      }
      const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell, conditionalFormat });
      expect(css.backgroundColor).toBe("#FF0000");
    }
  });

  it("conditional_formatting_multiple_ranges.xlsx: parses multi-range sqref and evaluates criterion references", async () => {
    const workbook = await parseWorkbookFromFixture("conditional_formatting_multiple_ranges.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const conditionals = sheet.conditionalFormattings;
    if (!conditionals) {
      throw new Error("Expected conditional formatting definitions");
    }
    expect(conditionals).toHaveLength(1);
    expect(conditionals[0]?.ranges).toHaveLength(3);

    const evaluator = createFormulaEvaluator(workbook);
    const address = createAddress(1, 2); // A2 (10)
    const cell = getCell(sheet, address);
    const conditionalFormat = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address,
      cell,
      formulaEvaluator: evaluator,
    });
    expect(conditionalFormat).toBeUndefined();
  });

  it("conditional_formatting_with_formula_on_second_sheet.xlsx: treats non-zero numeric expressions as TRUE", async () => {
    const workbook = await parseWorkbookFromFixture("conditional_formatting_with_formula_on_second_sheet.xlsx");
    const sheet = workbook.sheets[1];
    if (!sheet) {
      throw new Error("sheet[1] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const shouldApply: ReadonlyArray<CellAddress> = [
      createAddress(1, 10), // A10: expression 1
      createAddress(3, 10), // C10: expression 3
      createAddress(4, 10), // D10: expression -1
    ];
    for (const address of shouldApply) {
      const cell = getCell(sheet, address);
      const conditionalFormat = resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex: 1,
        address,
        cell,
        formulaEvaluator: evaluator,
      });
      if (!conditionalFormat) {
        throw new Error("Expected conditional formatting to apply");
      }
      const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell, conditionalFormat });
      expect(css.backgroundColor).toBe("#FFFF00");
    }

    const b10 = createAddress(2, 10); // B10: expression 0
    const b10Cell = getCell(sheet, b10);
    expect(
      resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex: 1,
        address: b10,
        cell: b10Cell,
        formulaEvaluator: evaluator,
      }),
    ).toBeUndefined();
  });

  it("test_conditional_formatting.xlsx: evaluates non-expression rule formulas (containsText) and applies dxfs", async () => {
    const workbook = await parseWorkbookFromFixture("test_conditional_formatting.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const b1 = createAddress(2, 1);
    const b1Cell = getCell(sheet, b1);
    if (!b1Cell) {
      throw new Error("B1 must exist");
    }

    const conditionalFormat = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: b1,
      cell: b1Cell,
      formulaEvaluator: evaluator,
    });
    if (!conditionalFormat) {
      throw new Error("Expected conditional formatting to apply for B1");
    }

    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: b1, cell: b1Cell, conditionalFormat });
    expect(css.backgroundColor).toBe("#FFEB9C");
  });

  it("NewStyleConditionalFormattings.xlsx: applies expression dxfs even when sheet contains iconSet/dataBar rules", async () => {
    const workbook = await parseWorkbookFromFixture("NewStyleConditionalFormattings.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const t2 = createAddress(20, 2);
    const t3 = createAddress(20, 3);

    const t2Cell = getCell(sheet, t2);
    const t3Cell = getCell(sheet, t3);
    if (!t2Cell || !t3Cell) {
      throw new Error("T2 and T3 must exist");
    }

    expect(
      resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex: 0,
        address: t2,
        cell: t2Cell,
        formulaEvaluator: evaluator,
      }),
    ).toBeUndefined();

    const t3Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: t3,
      cell: t3Cell,
      formulaEvaluator: evaluator,
    });
    if (!t3Format) {
      throw new Error("Expected conditional formatting to apply for T3");
    }

    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: t3, cell: t3Cell, conditionalFormat: t3Format });
    expect(css.backgroundColor).toBe("#7030A0");
  });

  it("NumberFormatTests.xlsx: evaluates TEXT() formatting and matches cached string values", async () => {
    const workbook = await parseWorkbookFromFixture("NumberFormatTests.xlsx");
    const sheet = workbook.sheets[1];
    if (!sheet) {
      throw new Error("sheet[1] (Tests) is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 2, expected: "12.34" },
      { row: 4, expected: "012.30" },
      { row: 5, expected: "£012.30" },
      { row: 15, expected: "-$12.30" },
      { row: 334, expected: "314,159.00" },
      { row: 335, expected: "$000,314,159" },
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.formula.expression.startsWith("TEXT(")).toBe(true);
      expect(evaluator.evaluateCell(1, address)).toBe(expected);
      expect(evaluator.evaluateCell(1, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("WithConditionalFormatting.xlsx: applies dxfs that override font styling (color/name/bold/italic)", async () => {
    const workbook = await parseWorkbookFromFixture("WithConditionalFormatting.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const a3 = createAddress(1, 3);
    const a4 = createAddress(1, 4);
    const b9 = createAddress(2, 9);

    const a3Cell = getCell(sheet, a3);
    const a4Cell = getCell(sheet, a4);
    const b9Cell = getCell(sheet, b9);
    if (!a3Cell || !a4Cell || !b9Cell) {
      throw new Error("Expected A3, A4, and B9 to exist");
    }

    const a3Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: a3,
      cell: a3Cell,
      formulaEvaluator: evaluator,
    });
    if (!a3Format) {
      throw new Error("Expected conditional formatting to apply for A3");
    }
    const a3Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a3, cell: a3Cell, conditionalFormat: a3Format });
    expect(a3Css.color).toBe("#00B050");
    expect(a3Css.fontStyle).toBe("normal");

    const a4Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: a4,
      cell: a4Cell,
      formulaEvaluator: evaluator,
    });
    if (!a4Format) {
      throw new Error("Expected conditional formatting to apply for A4");
    }
    const a4Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a4, cell: a4Cell, conditionalFormat: a4Format });
    expect(a4Css.color).toBe("#FF0000");
    expect(a4Css.fontFamily).toBe("Cambria");
    expect(a4Css.fontStyle).toBe("italic");
    expect(a4Css.fontWeight).toBe(700);

    const b9Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex: 0,
      address: b9,
      cell: b9Cell,
      formulaEvaluator: evaluator,
    });
    if (!b9Format) {
      throw new Error("Expected conditional formatting to apply for B9");
    }
    const b9Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: b9, cell: b9Cell, conditionalFormat: b9Format });
    expect(b9Css.color).toBe("#FF0000");
  });

  it("DateFormatTests.xlsx: evaluates TEXT() date/time formats using 1904 date system and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("DateFormatTests.xlsx");
    expect(workbook.dateSystem).toBe("1904");

    const sheet = workbook.sheets[1];
    if (!sheet) {
      throw new Error("sheet[1] (Tests) is required");
    }
    expect(sheet.dateSystem).toBe("1904");

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 2, expected: "11-10-52" },
      { row: 4, expected: "Sat-Oct-1952" },
      { row: 5, expected: "Saturday-October-1952" },
      { row: 10, expected: "14:35:27" },
      { row: 11, expected: "02:35:27 p" },
      { row: 13, expected: "02:35:27.000 PM" },
      { row: 43, expected: "11 days 14" },
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(1, address)).toBe(expected);
      expect(evaluator.evaluateCell(1, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("VLookupFullColumn.xlsx: evaluates VLOOKUP over full-column ranges and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("VLookupFullColumn.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const b4 = createAddress(2, 4); // B4
    const b5 = createAddress(2, 5); // B5

    const b4Cell = getCell(sheet, b4);
    const b5Cell = getCell(sheet, b5);
    if (!b4Cell?.formula || !b5Cell?.formula) {
      throw new Error("B4 and B5 must be formula cells");
    }

    expect(b4Cell.formula.expression).toBe("VLOOKUP(A4,$D:$E,2,0)");
    expect(evaluator.evaluateCell(0, b4)).toBe("Value1");
    expect(evaluator.evaluateCell(0, b4)).toEqual(toExpectedScalar(b4Cell.value));

    expect(b5Cell.formula.expression).toBe("VLOOKUP(A5,$D:$E,2,0)");
    expect(evaluator.evaluateCell(0, b5)).toEqual(toExpectedScalar(b5Cell.value));
  });

  it("Booleans.xlsx: evaluates TRUE/FALSE and matches cached boolean values", async () => {
    const workbook = await parseWorkbookFromFixture("Booleans.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const a1 = createAddress(1, 1); // TRUE()
    const a4 = createAddress(1, 4); // FALSE()

    const a1Cell = getCell(sheet, a1);
    const a4Cell = getCell(sheet, a4);
    if (!a1Cell?.formula || !a4Cell?.formula) {
      throw new Error("A1/A4 must be formula cells");
    }

    expect(a1Cell.formula.expression).toBe("TRUE()");
    expect(evaluator.evaluateCell(0, a1)).toBe(true);
    expect(evaluator.evaluateCell(0, a1)).toEqual(toExpectedScalar(a1Cell.value));

    expect(a4Cell.formula.expression).toBe("FALSE()");
    expect(evaluator.evaluateCell(0, a4)).toBe(false);
    expect(evaluator.evaluateCell(0, a4)).toEqual(toExpectedScalar(a4Cell.value));
  });

  it("56822-Countifs.xlsx: evaluates COUNTIFS and matches cached value", async () => {
    const workbook = await parseWorkbookFromFixture("56822-Countifs.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const d1 = createAddress(4, 1); // D1
    const d1Cell = getCell(sheet, d1);
    if (!d1Cell?.formula) {
      throw new Error("D1 must be a formula cell");
    }

    expect(d1Cell.formula.expression).toBe('COUNTIFS(A3:A8,"a",B3:B8,1)');
    expect(evaluator.evaluateCell(0, d1)).toBe(2);
    expect(evaluator.evaluateCell(0, d1)).toEqual(toExpectedScalar(d1Cell.value));
  });

  it("55906-MultiSheetRefs.xlsx: evaluates 3D references (Sheet1:Sheet3) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("55906-MultiSheetRefs.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly expectedFormula: string }> = [
      { address: createAddress(1, 3), expectedFormula: "SUM(Sheet1:Sheet3!A1)" }, // A3
      { address: createAddress(2, 3), expectedFormula: "AVERAGE(Sheet1:Sheet3!A1)" }, // B3
      { address: createAddress(3, 3), expectedFormula: "COUNTA(Sheet1:Sheet3!C1)" }, // C3
      { address: createAddress(4, 3), expectedFormula: "COUNTA(Sheet1:Sheet3!D1)" }, // D3
      { address: createAddress(5, 3), expectedFormula: "COUNTA(Sheet1:Sheet3!E1)" }, // E3
      { address: createAddress(8, 3), expectedFormula: "SUM(Sheet1:Sheet3!A1:B2)" }, // H3
      { address: createAddress(9, 3), expectedFormula: "AVERAGE(Sheet1:Sheet3!A1:B2)" }, // I3
      { address: createAddress(2, 4), expectedFormula: "MIN(Sheet1:Sheet3!A$1)" }, // B4
    ];

    for (const { address, expectedFormula } of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toBe(expectedFormula);
      expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("46535.xlsx: evaluates defined names (named ranges) used in formulas and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("46535.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly expectedFormula: string; readonly expectedValue: string }> = [
      {
        address: createAddress(3, 1), // C1
        expectedFormula: 'IF(ISERROR(VLOOKUP(A1,AirportCode,2,FALSE)),"",VLOOKUP(B1,AirportCode,2,FALSE))',
        expectedValue: "Hong Kong International",
      },
      {
        address: createAddress(5, 1), // E1
        expectedFormula: 'IF(ISERROR(VLOOKUP(B1,AirportCode,2,FALSE)),"",VLOOKUP(A1,AirportCode,2,FALSE))',
        expectedValue: "Abadan",
      },
    ];

    for (const { address, expectedFormula, expectedValue } of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toBe(expectedFormula);
      expect(evaluator.evaluateCell(0, address)).toBe(expectedValue);
      expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("50755_workday_formula_example.xlsx: evaluates WORKDAY and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("50755_workday_formula_example.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly expectedFormula: string }> = [
      { address: createAddress(2, 2), expectedFormula: "WORKDAY(A2,5)" }, // B2
      { address: createAddress(2, 3), expectedFormula: "WORKDAY(A3,5)" }, // B3
      { address: createAddress(2, 4), expectedFormula: "WORKDAY(A4,5)" }, // B4
    ];

    for (const { address, expectedFormula } of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toBe(expectedFormula);
      expect(evaluator.evaluateCell(0, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("evaluate_formula_with_structured_table_references.xlsx: evaluates structured table references and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("evaluate_formula_with_structured_table_references.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const c3 = createAddress(3, 3); // C3
    const cell = getCell(sheet, c3);
    if (!cell?.formula) {
      throw new Error("C3 must be a formula cell");
    }

    expect(cell.formula.expression).toBe("SUM(Table1[[A]:[B]])");
    expect(evaluator.evaluateCell(0, c3)).toBe(10);
    expect(evaluator.evaluateCell(0, c3)).toEqual(toExpectedScalar(cell.value));
  });

  it("MatrixFormulaEvalTestData.xlsx: evaluates array/matrix formulas and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("MatrixFormulaEvalTestData.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly expectedFormula: string }> = [
      { address: createAddress(8, 2), expectedFormula: "B2:D4 + E2:G4" }, // H2 (array)
      { address: createAddress(8, 6), expectedFormula: "TRANSPOSE(B6:D8)" }, // H6 (array)
      { address: createAddress(8, 10), expectedFormula: "MDETERM(B10:D12)" }, // H10 (scalar)
      { address: createAddress(8, 14), expectedFormula: "MINVERSE(B14:D16)" }, // H14 (array)
      { address: createAddress(8, 18), expectedFormula: "MMULT(B18:D20,E18:G20)" }, // H18 (array)
    ];

    for (const { address, expectedFormula } of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toBe(expectedFormula);

      const expected = toExpectedScalar(cell.value);
      const actual = evaluator.evaluateCell(0, address);

      if (typeof expected === "number") {
        if (typeof actual !== "number") {
          throw new Error("Expected numeric evaluation result");
        }
        expect(actual).toBeCloseTo(expected, 10);
      } else {
        expect(actual).toEqual(expected);
      }
    }
  });

  it("FormulaEvalTestData_Copy.xlsx: evaluates selected functions and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("FormulaEvalTestData_Copy.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly expectedFormula: string }> = [
      { address: createAddress(4, 96), expectedFormula: "ABS(B7)" }, // D96
      { address: createAddress(4, 104), expectedFormula: "ACOS(0)" }, // D104
      { address: createAddress(4, 136), expectedFormula: "AND(B7:B9,C9,D7,E7)" }, // D136
      { address: createAddress(4, 156), expectedFormula: "ASIN(B7)" }, // D156
    ];

    for (const { address, expectedFormula } of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toBe(expectedFormula);

      const expected = toExpectedScalar(cell.value);
      const actual = evaluator.evaluateCell(0, address);

      if (typeof expected === "number") {
        if (typeof actual !== "number") {
          throw new Error("Expected numeric evaluation result");
        }
        expect(actual).toBeCloseTo(expected, 10);
      } else {
        expect(actual).toEqual(expected);
      }
    }
  });

  it("54288.xlsx: parses rows with missing cell references (r attribute) using positional fallback", async () => {
    const workbook = await parseWorkbookFromFixtureWithOptions("54288.xlsx", {
      compatibility: { allowMissingCellRef: true },
    });
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const c3 = createAddress(3, 3);
    const d3 = createAddress(4, 3);
    const i3 = createAddress(9, 3);

    const c3Cell = getCell(sheet, c3);
    if (!c3Cell || c3Cell.value.type !== "number") {
      throw new Error("C3 must be a number cell");
    }
    expect(c3Cell.value.value).toBe(41229);

    const d3Cell = getCell(sheet, d3);
    if (!d3Cell) {
      throw new Error("D3 must exist (positional fallback)");
    }
    expect(d3Cell.value.type).toBe("empty");

    const i3Cell = getCell(sheet, i3);
    if (!i3Cell) {
      throw new Error("I3 must exist (positional fallback after sequential cells)");
    }
  });

  it("59746_NoRowNums.xlsx: parses namespace-prefixed worksheet XML with missing row/cell refs (compat)", async () => {
    const workbook = await parseWorkbookFromFixtureWithOptions("59746_NoRowNums.xlsx", {
      compatibility: { allowMissingCellRef: true },
    });
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const firstRow = sheet.rows[0];
    const secondRow = sheet.rows[1];
    if (!firstRow || !secondRow) {
      throw new Error("sheet must have at least 2 rows");
    }
    expect(firstRow.rowNumber).toBe(1);
    expect(secondRow.rowNumber).toBe(2);

    const a1 = createAddress(1, 1);
    const b1 = createAddress(2, 1);
    const a2 = createAddress(1, 2);
    const b2 = createAddress(2, 2);

    const a1Cell = getCell(sheet, a1);
    const b1Cell = getCell(sheet, b1);
    const a2Cell = getCell(sheet, a2);
    const b2Cell = getCell(sheet, b2);
    if (!a1Cell || !b1Cell || !a2Cell || !b2Cell) {
      throw new Error("A1/B1/A2/B2 must exist");
    }

    expect(a1Cell.value).toEqual({ type: "string", value: "Checked" });
    expect(b1Cell.value).toEqual({ type: "string", value: "Ion" });
    expect(a2Cell.value).toEqual({ type: "boolean", value: true });
    expect(b2Cell.value).toEqual({ type: "string", value: "[M+Na]+1" });
  });

  it("54084 - Greek - beyond BMP.xlsx: parses shared strings with non-BMP code points", async () => {
    const workbook = await parseWorkbookFromFixture("54084 - Greek - beyond BMP.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const a1 = createAddress(1, 1);
    const cell = getCell(sheet, a1);
    if (!cell || cell.value.type !== "string") {
      throw new Error("A1 must be a string cell");
    }

    expect(cell.value.value.includes("𝝊")).toBe(true);
    expect([...cell.value.value].length).toBeGreaterThan(1);
  });

  it("50867_with_table.xlsx: parses table definitions for structured references", async () => {
    const workbook = await parseWorkbookFromFixture("50867_with_table.xlsx");
    const table = workbook.tables?.[0];
    if (!table) {
      throw new Error("Expected at least one table");
    }

    expect(table.name).toBe("Tabella1");
    expect(table.displayName).toBe("Tabella1");
    expect(table.sheetIndex).toBe(0);
    expect(table.columns.map((c) => c.name)).toEqual(["a", "b", "c"]);
    expect(table.ref.start.col).toBe(1);
    expect(table.ref.start.row).toBe(1);
    expect(table.ref.end.col).toBe(3);
    expect(table.ref.end.row).toBe(3);
  });

  it("poc-shared-strings.xlsx: parses very large shared strings without data loss", async () => {
    const workbook = await parseWorkbookFromFixture("poc-shared-strings.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const a1 = createAddress(1, 1);
    const cell = getCell(sheet, a1);
    if (!cell || cell.value.type !== "string") {
      throw new Error("A1 must be a string cell");
    }

    expect(workbook.sharedStrings.length).toBeGreaterThan(0);
    expect(cell.value.value.length).toBeGreaterThan(1_000_000);
  });

  it("noSharedStringTable.xlsx: parses workbook without sharedStrings.xml", async () => {
    const workbook = await parseWorkbookFromFixture("noSharedStringTable.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    expect(workbook.sharedStrings.length).toBe(0);

    const a1 = createAddress(1, 1);
    const b1 = createAddress(2, 1);
    const a1Cell = getCell(sheet, a1);
    const b1Cell = getCell(sheet, b1);
    if (!a1Cell || !b1Cell) {
      throw new Error("A1/B1 must exist");
    }
    expect(a1Cell.value).toEqual({ type: "number", value: 38819 });
    expect(b1Cell.value).toEqual({ type: "number", value: 123 });
  });

  it("FillWithoutColor.xlsx: resolves fills even when some color components are omitted", async () => {
    const workbook = await parseWorkbookFromFixture("FillWithoutColor.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const i3 = createAddress(9, 3); // I3
    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: i3, cell: getCell(sheet, i3) });
    expect(css.backgroundColor).toBe("#CCFFFF");
  });

  it("1_NoIden.xlsx: parses cols widths and merged cells", async () => {
    const workbook = await parseWorkbookFromFixture("1_NoIden.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    if (!sheet.columns) {
      throw new Error("sheet.columns is required");
    }
    if (!sheet.mergeCells) {
      throw new Error("sheet.mergeCells is required");
    }

    expect(sheet.columns.length).toBe(3);
    expect(sheet.columns[0]).toEqual({
      min: colIdx(2),
      max: colIdx(2),
      width: 16,
      hidden: undefined,
      bestFit: true,
      styleId: undefined,
    });
    expect(sheet.columns[1]?.width).toBeCloseTo(49.83203125, 10);
    expect(sheet.columns[2]?.width).toBeCloseTo(13.1640625, 10);

    expect(sheet.mergeCells.length).toBe(2);
    expect(sheet.mergeCells[0]).toEqual({
      start: createAddress(3, 7),
      end: createAddress(4, 7),
    });
    expect(sheet.mergeCells[1]).toEqual({
      start: createAddress(2, 2),
      end: createAddress(3, 2),
    });

    const b2 = createAddress(2, 2);
    const b2Cell = getCell(sheet, b2);
    if (!b2Cell || b2Cell.value.type !== "string") {
      throw new Error("B2 must be a string cell");
    }
    expect(b2Cell.value.value).toBe("가나다");
  });

  it("47737.xlsx: parses frozen panes and selection in sheetView", async () => {
    const workbook = await parseWorkbookFromFixture("47737.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }
    if (!sheet.sheetView?.pane) {
      throw new Error("sheetView.pane is required");
    }
    if (!sheet.sheetView.selection) {
      throw new Error("sheetView.selection is required");
    }

    expect(sheet.sheetView.pane).toEqual({
      xSplit: undefined,
      ySplit: 5,
      topLeftCell: "A6",
      activePane: "bottomLeft",
      state: "frozen",
    });
    expect(sheet.sheetView.selection).toEqual({
      pane: "bottomLeft",
      activeCell: "B20",
      sqref: "B20",
    });
  });

  it("47813.xlsx: parses frozen panes and selection in sheetView", async () => {
    const workbook = await parseWorkbookFromFixture("47813.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }
    if (!sheet.sheetView?.pane) {
      throw new Error("sheetView.pane is required");
    }
    if (!sheet.sheetView.selection) {
      throw new Error("sheetView.selection is required");
    }

    expect(sheet.sheetView.pane).toEqual({
      xSplit: undefined,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomLeft",
      state: "frozen",
    });
    expect(sheet.sheetView.selection).toEqual({
      pane: "bottomLeft",
      activeCell: "A2",
      sqref: "A2",
    });
  });
});
