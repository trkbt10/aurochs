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
import { colIdx, rowIdx, styleId } from "../../src/xlsx/domain/types";
import type { CellAddress } from "../../src/xlsx/domain/cell/address";
import type { Cell } from "../../src/xlsx/domain/cell/types";
import type { CellValue } from "../../src/xlsx/domain/cell/types";
import { getCell } from "../../src/xlsx-editor/cell/query";
import { resolveCellBorderDecoration, resolveCellRenderStyle } from "../../src/xlsx-editor/selectors/cell-render-style";
import { resolveCellStyleDetails } from "../../src/xlsx-editor/selectors/cell-style-details";
import { formatCellValueForDisplay, resolveCellFormatCode } from "../../src/xlsx-editor/selectors/cell-display-text";
import { resolveCellConditionalDifferentialFormat } from "../../src/xlsx-editor/selectors/conditional-formatting";
import { xlsxColorToCss } from "../../src/xlsx-editor/selectors/xlsx-color";
import { resolveCellTableStyleDifferentialFormat } from "../../src/xlsx-editor/selectors/table-style";
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
    expect(css.alignItems).toBeUndefined();
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

  it("ConditionalFormattingSamples.xlsx: applies containsText/cellIs rules and resolves dxf fill + font colors", async () => {
    const workbook = await parseWorkbookFromFixture("ConditionalFormattingSamples.xlsx");
    const sheetIndex = 1;
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) {
      throw new Error(`sheet[${sheetIndex}] (Products1) is required`);
    }

    const evaluator = createFormulaEvaluator(workbook);

    const b9 = createAddress(2, 9); // "Grain" (containsText rule)
    const b9Cell = getCell(sheet, b9);
    if (!b9Cell) {
      throw new Error("B9 must exist");
    }

    const b9Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex,
      address: b9,
      cell: b9Cell,
      formulaEvaluator: evaluator,
    });
    if (!b9Format) {
      throw new Error("Expected conditional formatting to apply for B9");
    }
    const b9Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: b9, cell: b9Cell, conditionalFormat: b9Format });
    expect(b9Css.backgroundColor).toBe("#FFEB9C");
    expect(b9Css.color).toBe("#9C6500");

    const b3 = createAddress(2, 3); // "Dairy" (no match)
    const b3Cell = getCell(sheet, b3);
    if (!b3Cell) {
      throw new Error("B3 must exist");
    }
    expect(
      resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex,
        address: b3,
        cell: b3Cell,
        formulaEvaluator: evaluator,
      }),
    ).toBeUndefined();

    const d7 = createAddress(4, 7); // 192.1 (<500 rule)
    const d7Cell = getCell(sheet, d7);
    if (!d7Cell) {
      throw new Error("D7 must exist");
    }

    const d7Format = resolveCellConditionalDifferentialFormat({
      sheet,
      styles: workbook.styles,
      sheetIndex,
      address: d7,
      cell: d7Cell,
      formulaEvaluator: evaluator,
    });
    if (!d7Format) {
      throw new Error("Expected conditional formatting to apply for D7");
    }
    const d7Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: d7, cell: d7Cell, conditionalFormat: d7Format });
    expect(d7Css.backgroundColor).toBe("#00B0F0");

    const d3 = createAddress(4, 3); // 1148 (no match)
    const d3Cell = getCell(sheet, d3);
    if (!d3Cell) {
      throw new Error("D3 must exist");
    }
    expect(
      resolveCellConditionalDifferentialFormat({
        sheet,
        styles: workbook.styles,
        sheetIndex,
        address: d3,
        cell: d3Cell,
        formulaEvaluator: evaluator,
      }),
    ).toBeUndefined();
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
    expect(a3Css.fontStyle).toBeUndefined();

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

  it("DateFormatNumberTests.xlsx: rounds fractional seconds per format and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("DateFormatNumberTests.xlsx");
    expect(workbook.dateSystem).toBe("1904");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 2, expected: "1904-01-02 00:00:00.000" },
      { row: 4, expected: "1904-01-02 00:04:37.638" },
      { row: 5, expected: "1904-01-02 00:04:37.64" },
      { row: 6, expected: "1904-01-02 00:04:37.6" },
      { row: 7, expected: "1904-01-02 00:04:38" },
      { row: 8, expected: "1904-01-02 00:00:00.414" },
      { row: 9, expected: "1904-01-02 00:00:00.41" },
      { row: 10, expected: "1904-01-02 00:00:00.4" },
      { row: 11, expected: "1904-01-02 00:00:00" },
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(sheetIndex, address)).toBe(expected);
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("ElapsedFormatTests.xlsx: evaluates TEXT() with elapsed tokens ([h]/[m]/[s]) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("ElapsedFormatTests.xlsx");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 2, expected: "75:23:53.376" },
      { row: 3, expected: "4523:53.376" },
      { row: 4, expected: "271433.376" },
      { row: 5, expected: "75:23:53.4" },
      { row: 6, expected: "4523:53.4" },
      { row: 8, expected: "53:23 @ hour 75" },
      { row: 9, expected: "53 secs and 4523 mins" },
      { row: 10, expected: "It was 75 [yes, 75] hours and 23:53" },
      { row: 11, expected: "271433 [yes, 271433] seconds" },
      { row: 12, expected: "2:3:4.000" },
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(sheetIndex, address)).toBe(expected);
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("FormatChoiceTests.xlsx: evaluates TEXT() with conditional format codes ([<10]/[>10]) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("FormatChoiceTests.xlsx");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string; readonly expression: string }> = [
      { row: 2, expected: "2 Wow", expression: "TEXT(C2,B2)" },
      { row: 3, expected: "10", expression: "TEXT(C3,B3)" },
      { row: 5, expected: "10", expression: "TEXT(C5,B5)" },
      { row: 6, expected: "11 Big", expression: "TEXT(C6,B6)" },
    ];

    for (const { row, expected, expression } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.value.type).toBe("string");
      expect(cell.formula.expression.replace(/\s+/gu, "")).toBe(expression);
      expect(evaluator.evaluateCell(sheetIndex, address)).toBe(expected);
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("FormatConditionTests.xlsx: evaluates TEXT() with conditional format codes (multiple conditions/sections) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("FormatConditionTests.xlsx");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<CellAddress> = [
      createAddress(1, 2), // A2
      createAddress(1, 3), // A3
      createAddress(1, 5), // A5
      createAddress(1, 6), // A6
      createAddress(1, 24), // A24 (negative + conditional)
      createAddress(1, 29), // A29 (negative boundary)
      createAddress(1, 35), // A35 (negative + suffix)
    ];

    for (const address of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression.toUpperCase()).toContain("TEXT(");
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("TextFormatTests.xlsx: evaluates CONCATENATE + TEXT() text sections (\";;;\" prefix) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("TextFormatTests.xlsx");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<CellAddress> = [
      createAddress(1, 2), // A2
      createAddress(1, 6), // A6
      createAddress(1, 10), // A10
      createAddress(1, 12), // A12 (TRUE)
      createAddress(1, 16), // A16
      createAddress(1, 25), // A25 (FALSE)
    ];

    for (const address of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression.toUpperCase()).toContain("TEXT(");
      expect(cell.formula.expression.toUpperCase()).toContain("CONCATENATE(");
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("GeneralFormatTests.xlsx: evaluates TEXT() with General format and matches cached values (scientific thresholds)", async () => {
    const workbook = await parseWorkbookFromFixture("GeneralFormatTests.xlsx");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 2, expected: "1" },
      { row: 11, expected: "1.23456789" },
      { row: 17, expected: "10000000000" },
      { row: 18, expected: "1E+11" },
      { row: 27, expected: "0.000000001" },
      { row: 28, expected: "1E-10" },
      { row: 52, expected: "-1E+11" },
      { row: 61, expected: "-0.000000001" },
      { row: 62, expected: "-1E-10" },
      { row: 70, expected: "hello" },
      { row: 72, expected: "TRUE" },
      { row: 73, expected: "FALSE" },
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(sheetIndex, address)).toBe(expected);
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("NumberFormatApproxTests.xlsx: evaluates TEXT() scientific notation variants (e+/e-) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("NumberFormatApproxTests.xlsx");

    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Tests");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Tests" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 2, expected: "|1e5|" },
      { row: 4, expected: "|1%e5|" },
      { row: 6, expected: "|1|e|5|" },
      { row: 8, expected: "|12.3457|e|4|" },
      { row: 10, expected: "|123,456.789|e|0|" },
      { row: 13, expected: "|0012.3457|e|4|" },
      { row: 18, expected: "|  12.3457|e|4|" },
      { row: 21, expected: "|1e+5|" },
      { row: 40, expected: "|1.2|E|5|" },
      { row: 42, expected: "|1e-5|" },
      { row: 48, expected: "|1234.5679|e|-8|" },
      { row: 54, expected: "|0000123.4568|e|-7|" },
      { row: 61, expected: "|1e-5|" },
      { row: 67, expected: "|1.2346|e|-4|" },
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row); // A{row}
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected A{row} to be a formula cell");
      }
      expect(cell.value.type).toBe("string");
      expect(evaluator.evaluateCell(sheetIndex, address)).toBe(expected);
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("FormatKM.xlsx: formats display text via conditional numFmt sections (#, K/M scaling) and matches expected strings", async () => {
    const workbook = await parseWorkbookFromFixture("FormatKM.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const cases: ReadonlyArray<{ readonly row: number }> = [
      { row: 2 },
      { row: 5 },
      { row: 6 },
      { row: 8 },
      { row: 9 },
      { row: 11 },
      { row: 12 },
    ];

    for (const { row } of cases) {
      const bAddress = createAddress(2, row);
      const cAddress = createAddress(3, row);
      const dAddress = createAddress(4, row);
      const eAddress = createAddress(5, row);

      const bCell = getCell(sheet, bAddress);
      const cCell = getCell(sheet, cAddress);
      const dCell = getCell(sheet, dAddress);
      const eCell = getCell(sheet, eAddress);
      if (!bCell || !cCell || !dCell || !eCell) {
        throw new Error("Expected B/C/D/E cells to exist");
      }
      if (cCell.value.type !== "string" || eCell.value.type !== "string") {
        throw new Error("Expected C/E to be string cells");
      }

      const bFormatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: bAddress, cell: bCell });
      const dFormatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: dAddress, cell: dCell });

      expect(formatCellValueForDisplay(bCell.value, bFormatCode)).toBe(cCell.value.value);
      expect(formatCellValueForDisplay(dCell.value, dFormatCode)).toBe(eCell.value.value);
    }
  });

  it("Formatting.xlsx: resolves numFmt codes and formats date/number display text", async () => {
    const workbook = await parseWorkbookFromFixture("Formatting.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const dateSystem = workbook.dateSystem;
    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly formatCode: string; readonly expected: string }> = [
      { address: createAddress(2, 2), formatCode: "mm-dd-yy", expected: "11-24-06" }, // B2
      { address: createAddress(2, 3), formatCode: "yyyy/mm/dd", expected: "2006/11/24" }, // B3
      { address: createAddress(2, 4), formatCode: "yyyy\\-mm\\-dd", expected: "2006-11-24" }, // B4
      { address: createAddress(2, 6), formatCode: "d/m/yy;@", expected: "24/11/06" }, // B6
      { address: createAddress(2, 7), formatCode: "dd\\-mm\\-yy", expected: "24-11-06" }, // B7
      { address: createAddress(2, 11), formatCode: "0.000", expected: "10.520" }, // B11
      { address: createAddress(2, 12), formatCode: "0.0", expected: "10.5" }, // B12
      { address: createAddress(2, 13), formatCode: "\"£\"#,##0.00", expected: "£10.52" }, // B13
    ];

    for (const { address, formatCode, expected } of cases) {
      const cell = getCell(sheet, address);
      if (!cell) {
        throw new Error("Expected cell to exist");
      }
      const resolved = resolveCellFormatCode({ styles: workbook.styles, sheet, address, cell });
      expect(resolved).toBe(formatCode);
      expect(formatCellValueForDisplay(cell.value, resolved, { dateSystem })).toBe(expected);
    }
  });

  it("StructuredRefs-lots-with-lookups.xlsx: evaluates structured references (#All) + concatenation (&) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("StructuredRefs-lots-with-lookups.xlsx");
    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "Profile");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "Profile" is required');
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<CellAddress> = [
      createAddress(3, 8), // C8
      createAddress(16, 8), // P8
      createAddress(3, 14), // C14
    ];

    for (const address of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toContain("[#All]");
      expect(cell.formula.expression).toContain("&");
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("xlookup.xlsx: evaluates _xlfn.XLOOKUP (exact/approx + binary search modes) and matches cached values", async () => {
    const workbook = await parseWorkbookFromFixture("xlookup.xlsx");
    const evaluator = createFormulaEvaluator(workbook);

    const cases: ReadonlyArray<{ readonly sheetIndex: number; readonly address: CellAddress }> = [
      { sheetIndex: 0, address: createAddress(3, 2) }, // Sheet1!C2
      { sheetIndex: 1, address: createAddress(6, 2) }, // Sheet2!F2
      { sheetIndex: 1, address: createAddress(6, 12) }, // Sheet2!F12
      { sheetIndex: 2, address: createAddress(6, 4) }, // Sheet3!F4 (XMATCH in same fixture)
    ];

    for (const { sheetIndex, address } of cases) {
      const sheet = workbook.sheets[sheetIndex];
      if (!sheet) {
        throw new Error(`sheet[${sheetIndex}] is required`);
      }
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression.toUpperCase()).toContain("_XLFN.");
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
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

  it("WithTable.xlsx: parses tableStyleInfo even when styles.xml has no tableStyles/dxfs", async () => {
    const workbook = await parseWorkbookFromFixture("WithTable.xlsx");
    const tables = workbook.tables;
    if (!tables) {
      throw new Error("workbook.tables is required");
    }

    const table = tables.find((candidate) => candidate.name === "Tabella1");
    if (!table) {
      throw new Error('Expected table "Tabella1" to exist');
    }

    expect(table.sheetIndex).toBe(0);
    expect(table.ref.start).toEqual(createAddress(1, 1)); // A1
    expect(table.ref.end).toEqual(createAddress(2, 2)); // B2
    expect(table.headerRowCount).toBe(1);
    expect(table.totalsRowCount).toBe(0);
    expect(table.columns.map((c) => c.name)).toEqual(["a", "b"]);
    expect(table.styleInfo).toEqual({
      name: "TableStyleMedium9",
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: true,
      showColumnStripes: false,
    });

    // In this fixture, tableStyleInfo references a built-in name but styles.xml doesn't include
    // explicit tableStyles/dxfs mappings, so table-style DXF resolution must be a no-op.
    expect(workbook.styles.tableStyles).toBeUndefined();
    expect(workbook.styles.dxfs).toBeUndefined();

    const sheetIndex = 0;
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }
    const address = createAddress(1, 1);
    expect(
      resolveCellTableStyleDifferentialFormat({
        sheetIndex,
        tables,
        styles: workbook.styles,
        address,
      }),
    ).toBeUndefined();
  });

  it("simple-table-named-range.xlsx: evaluates definedName referencing structured table references", async () => {
    const workbook = await parseWorkbookFromFixture("simple-table-named-range.xlsx");
    const sheetIndex = 0;
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const tables = workbook.tables;
    if (!tables) {
      throw new Error("workbook.tables is required");
    }
    const table = tables.find((candidate) => candidate.name === "Table1");
    if (!table) {
      throw new Error('Expected table "Table1" to exist');
    }
    expect(table.columns.map((c) => c.name)).toEqual(["a", "b", "c"]);

    const names = workbook.definedNames;
    if (!names) {
      throw new Error("workbook.definedNames is required");
    }
    const total = names.find((n) => n.name === "total");
    if (!total) {
      throw new Error('Expected definedName "total" to exist');
    }
    expect(total.formula).toBe("SUM(Table1[c])");

    const evaluator = createFormulaEvaluator(workbook);

    const b7 = createAddress(2, 7);
    const b7Cell = getCell(sheet, b7);
    if (!b7Cell?.formula) {
      throw new Error("B7 must be a formula cell");
    }
    expect(b7Cell.formula.expression).toBe("total");
    expect(evaluator.evaluateCell(sheetIndex, b7)).toEqual(toExpectedScalar(b7Cell.value));
  });

  it("SingleCellTable.xlsx: evaluates structured refs when table has no header row", async () => {
    const workbook = await parseWorkbookFromFixture("SingleCellTable.xlsx");
    const sheetIndex = 0;
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const tables = workbook.tables;
    if (!tables) {
      throw new Error("workbook.tables is required");
    }
    const table = tables.find((candidate) => candidate.name === "Table3");
    if (!table) {
      throw new Error('Expected table "Table3" to exist');
    }

    expect(table.sheetIndex).toBe(sheetIndex);
    expect(table.ref.start).toEqual(createAddress(1, 2)); // A2
    expect(table.ref.end).toEqual(createAddress(1, 2)); // A2
    expect(table.headerRowCount).toBe(0);
    expect(table.totalsRowCount).toBe(0);
    expect(table.columns.map((c) => c.name)).toEqual(["Column1"]);

    const evaluator = createFormulaEvaluator(workbook);
    expect(evaluator.evaluateFormula(sheetIndex, "SUM(Table3[Column1])")).toBe(99);

    expect(
      resolveCellTableStyleDifferentialFormat({
        sheetIndex,
        tables,
        styles: workbook.styles,
        address: createAddress(1, 2),
      }),
    ).toBeUndefined();
  });

  it("table-sample.xlsx: parses table totals row and evaluates structured references (#This Row/#Totals)", async () => {
    const workbook = await parseWorkbookFromFixture("table-sample.xlsx");
    const sheetIndex = 0;
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const tables = workbook.tables;
    if (!tables) {
      throw new Error("workbook.tables is required");
    }
    const table = tables.find((candidate) => candidate.name === "Tabelle1");
    if (!table) {
      throw new Error('Expected table "Tabelle1" to exist');
    }

    expect(table.ref.start).toEqual(createAddress(3, 4)); // C4
    expect(table.ref.end).toEqual(createAddress(7, 9)); // G9
    expect(table.headerRowCount).toBe(1);
    expect(table.totalsRowCount).toBe(1);
    expect(table.styleInfo?.name).toBe("TableStyleMedium2");
    expect(table.columns.map((c) => c.name)).toEqual(["Field 1", "Field 2", "Field 3", "Field 4 ", "Field 5"]);

    const evaluator = createFormulaEvaluator(workbook);

    const f5 = createAddress(6, 5); // F5: SUM(Tabelle1[[#This Row],...])
    const f5Cell = getCell(sheet, f5);
    if (!f5Cell?.formula) {
      throw new Error("F5 must be a formula cell");
    }
    expect(f5Cell.formula.expression).toBe("SUM(Tabelle1[[#This Row],[Field 2]:[Field 3]])");
    expect(evaluator.evaluateCell(sheetIndex, f5)).toEqual(toExpectedScalar(f5Cell.value));

    const g5 = createAddress(7, 5); // G5: ... / Tabelle1[[#Totals],[Field 4 ]]
    const g5Cell = getCell(sheet, g5);
    if (!g5Cell?.formula) {
      throw new Error("G5 must be a formula cell");
    }
    expect(g5Cell.formula.expression).toBe("Tabelle1[[#This Row],[Field 4 ]]/Tabelle1[[#Totals],[Field 4 ]]");
    expect(evaluator.evaluateCell(sheetIndex, g5)).toEqual(toExpectedScalar(g5Cell.value));

    const d9 = createAddress(4, 9); // D9: SUBTOTAL(101, Tabelle1[Field 2])
    const d9Cell = getCell(sheet, d9);
    if (!d9Cell?.formula) {
      throw new Error("D9 must be a formula cell");
    }
    expect(d9Cell.formula.expression).toBe("SUBTOTAL(101,Tabelle1[Field 2])");
    expect(evaluator.evaluateCell(sheetIndex, d9)).toEqual(toExpectedScalar(d9Cell.value));

    const f9 = createAddress(6, 9); // F9: SUBTOTAL(109, Tabelle1[[Field 4 ]]) (column name contains trailing space)
    const f9Cell = getCell(sheet, f9);
    if (!f9Cell?.formula) {
      throw new Error("F9 must be a formula cell");
    }
    expect(f9Cell.formula.expression).toBe("SUBTOTAL(109,Tabelle1[[Field 4 ]])");
    expect(evaluator.evaluateCell(sheetIndex, f9)).toEqual(toExpectedScalar(f9Cell.value));
  });

  it("ExcelTables.xlsx: parses tables and evaluates calculated formulas inside the table range", async () => {
    const workbook = await parseWorkbookFromFixture("ExcelTables.xlsx");
    const sheetIndex = 0;
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const table = workbook.tables?.find((candidate) => candidate.name === "TableName");
    if (!table) {
      throw new Error('Expected table "TableName" to exist');
    }

    expect(table.sheetIndex).toBe(sheetIndex);
    expect(table.ref.start.col).toBe(7); // G
    expect(table.ref.start.row).toBe(1);
    expect(table.ref.end.col).toBe(9); // I
    expect(table.ref.end.row).toBe(4);
    expect(table.columns.map((c) => c.name)).toEqual(["Name", "Age", "AgeGroup"]);

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{ readonly address: CellAddress; readonly expectedExpression: string }> = [
      { address: createAddress(3, 2), expectedExpression: "INT(B2/10)" }, // C2
      { address: createAddress(3, 3), expectedExpression: "INT(B3/10)" }, // C3
      { address: createAddress(3, 4), expectedExpression: "INT(B4/10)" }, // C4
      { address: createAddress(9, 2), expectedExpression: "INT(H2/10)" }, // I2
      { address: createAddress(9, 3), expectedExpression: "INT(H3/10)" }, // I3
      { address: createAddress(9, 4), expectedExpression: "INT(H4/10)" }, // I4
    ];

    for (const { address, expectedExpression } of cases) {
      const cell = getCell(sheet, address);
      if (!cell?.formula) {
        throw new Error("Expected formula cell to exist");
      }
      expect(cell.formula.expression).toBe(expectedExpression);
      expect(evaluator.evaluateCell(sheetIndex, address)).toEqual(toExpectedScalar(cell.value));
    }
  });

  it("TablesWithDifferentHeaders.xlsx: parses multiple tables with numeric header names", async () => {
    const workbook = await parseWorkbookFromFixture("TablesWithDifferentHeaders.xlsx");
    const tables = workbook.tables;
    if (!tables) {
      throw new Error("workbook.tables is required");
    }

    const table1 = tables.find((table) => table.name === "Table1");
    const table2 = tables.find((table) => table.name === "Table2");
    const table3 = tables.find((table) => table.name === "Table3");
    if (!table1 || !table2 || !table3) {
      throw new Error("Expected Table1/Table2/Table3 to exist");
    }

    expect(table1.sheetIndex).toBe(0);
    expect(table1.columns.map((c) => c.name)).toEqual(["12", "34"]);
    expect(table1.ref.start.col).toBe(1);
    expect(table1.ref.start.row).toBe(1);
    expect(table1.ref.end.col).toBe(2);
    expect(table1.ref.end.row).toBe(2);

    expect(table2.sheetIndex).toBe(1);
    expect(table2.columns.map((c) => c.name)).toEqual(["12.34", "34.56"]);
    expect(table2.ref.start.col).toBe(1);
    expect(table2.ref.start.row).toBe(1);
    expect(table2.ref.end.col).toBe(2);
    expect(table2.ref.end.row).toBe(2);

    expect(table3.sheetIndex).toBe(2);
    expect(table3.columns.map((c) => c.name)).toEqual(["Column1", "Column2"]);
    expect(table3.ref.start.col).toBe(1);
    expect(table3.ref.start.row).toBe(1);
    expect(table3.ref.end.col).toBe(2);
    expect(table3.ref.end.row).toBe(3);
  });

  it("SheetTabColors.xlsx: parses worksheet tabColor (indexed + rgb)", async () => {
    const workbook = await parseWorkbookFromFixture("SheetTabColors.xlsx");

    const sheetDefault = workbook.sheets[0];
    const sheetIndexed = workbook.sheets[1];
    const sheetRgb = workbook.sheets[2];

    if (!sheetDefault || !sheetIndexed || !sheetRgb) {
      throw new Error("Expected 3 sheets to exist");
    }

    expect(sheetDefault.name).toBe("default");
    expect(sheetDefault.tabColor).toBeUndefined();

    expect(sheetIndexed.name).toBe("indexedRed");
    expect(sheetIndexed.tabColor).toEqual({ type: "indexed", index: 10 });
    expect(xlsxColorToCss(sheetIndexed.tabColor)).toBe("#FF0000");

    expect(sheetRgb.name).toBe("customOrange");
    expect(sheetRgb.tabColor).toEqual({ type: "rgb", value: "FF7F2700" });
    expect(xlsxColorToCss(sheetRgb.tabColor)).toBe("#7F2700");
  });

  it("customIndexedColors.xlsx: resolves indexed colors using the workbook palette overrides", async () => {
    const workbook = await parseWorkbookFromFixture("customIndexedColors.xlsx");
    const sheet = workbook.sheets.find((candidate) => candidate.xmlPath.endsWith("sheet2.xml"));
    if (!sheet) {
      throw new Error("sheet2.xml is required");
    }

    const address = createAddress(1, 1); // A1 (styled cell with indexed fill/font)
    const cell = getCell(sheet, address);
    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell });

    // styles.xml defines a custom indexedColors palette; indexed=61 should resolve to 00E8E8E8 => #E8E8E8.
    expect(css.backgroundColor).toBe("#E8E8E8");
    // font indexed=18 should resolve to 00094A74 => #094A74.
    expect(css.color).toBe("#094A74");
  });

  it("Themes.xlsx: resolves theme font colors (0..11) via styles.xml + theme indices", async () => {
    const workbook = await parseWorkbookFromFixture("Themes.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const cases: ReadonlyArray<{ readonly row: number; readonly expected: string }> = [
      { row: 1, expected: "#000000" }, // theme 0 (dk1)
      { row: 2, expected: "#FFFFFF" }, // theme 1 (lt1)
      { row: 3, expected: "#1F497D" }, // theme 2 (dk2)
      { row: 4, expected: "#EEECE1" }, // theme 3 (lt2)
      { row: 5, expected: "#4F81BD" }, // theme 4 (accent1)
      { row: 6, expected: "#C0504D" }, // theme 5 (accent2)
      { row: 7, expected: "#9BBB59" }, // theme 6 (accent3)
      { row: 8, expected: "#8064A2" }, // theme 7 (accent4)
      { row: 9, expected: "#4BACC6" }, // theme 8 (accent5)
      { row: 10, expected: "#F79646" }, // theme 9 (accent6)
      { row: 11, expected: "#0000FF" }, // theme 10 (hlink)
      { row: 12, expected: "#800080" }, // theme 11 (folHlink)
    ];

    for (const { row, expected } of cases) {
      const address = createAddress(1, row);
      const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell: getCell(sheet, address) });
      expect(css.color).toBe(expected);
    }
  });

  it("Themes2.xlsx: applies conditional formatting dxfs with theme bgColor + rgb fontColor", async () => {
    const workbook = await parseWorkbookFromFixture("Themes2.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const evaluator = createFormulaEvaluator(workbook);
    const cases: ReadonlyArray<{
      readonly address: CellAddress;
      readonly expectedBackground: string;
      readonly expectedColor: string;
    }> = [
      { address: createAddress(7, 2), expectedBackground: "#000000", expectedColor: "#00B0F0" }, // G2=1 -> dxfId 2 -> bg theme 0
      { address: createAddress(7, 3), expectedBackground: "#FFFFFF", expectedColor: "#00B0F0" }, // G3=2 -> dxfId 1 -> bg theme 1
      { address: createAddress(7, 4), expectedBackground: "#1F497D", expectedColor: "#00B0F0" }, // G4=3 -> dxfId 0 -> bg theme 2
    ];

    for (const { address, expectedBackground, expectedColor } of cases) {
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

      const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell, conditionalFormat });
      expect(css.backgroundColor).toBe(expectedBackground);
      expect(css.color).toBe(expectedColor);
    }
  });

  it("dataValidationTableRange.xlsx: parses dataValidations referencing defined names (table ranges)", async () => {
    const workbook = await parseWorkbookFromFixture("dataValidationTableRange.xlsx");
    const sheetIndex = workbook.sheets.findIndex((candidate) => candidate.name === "County Ranking");
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet || sheetIndex === -1) {
      throw new Error('sheet "County Ranking" is required');
    }

    const validations = sheet.dataValidations;
    if (!validations) {
      throw new Error("Expected dataValidations to exist");
    }

    const bySqref = new Map(validations.map((dv) => [dv.sqref, dv]));
    const cases: ReadonlyArray<{ readonly sqref: string; readonly formula1: string }> = [
      { sqref: "B5", formula1: "states" },
      { sqref: "E5", formula1: "years" },
      { sqref: "C5", formula1: "Measures" },
      { sqref: "G5", formula1: "highlight" },
      { sqref: "G9", formula1: "highlight_list" },
    ];

    for (const { sqref, formula1 } of cases) {
      const dv = bySqref.get(sqref);
      if (!dv) {
        throw new Error(`Expected dataValidation for sqref ${sqref}`);
      }
      expect(dv.type).toBe("list");
      expect(dv.allowBlank).toBe(true);
      expect(dv.showInputMessage).toBe(true);
      expect(dv.showErrorMessage).toBe(true);
      expect(dv.formula1).toBe(formula1);
      expect(dv.ranges.length).toBe(1);
    }
  });

  it("tableStyle.xlsx: parses tableStyleInfo + tableStyles and applies table-style DXFs", async () => {
    const workbook = await parseWorkbookFromFixture("tableStyle.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const table = workbook.tables?.find((candidate) => candidate.name === "Table1");
    if (!table) {
      throw new Error('Expected table "Table1" to exist');
    }
    if (!table.styleInfo) {
      throw new Error("Expected table.styleInfo to exist");
    }

    expect(table.styleInfo.name).toBe("TestTableStyle");
    expect(table.styleInfo.showFirstColumn).toBe(true);
    expect(table.styleInfo.showLastColumn).toBe(true);
    expect(table.styleInfo.showRowStripes).toBe(true);
    expect(table.styleInfo.showColumnStripes).toBe(true);

    const tableStyles = workbook.styles.tableStyles;
    if (!tableStyles) {
      throw new Error("Expected styles.tableStyles to exist");
    }
    expect(tableStyles.some((style) => style.name === "TestTableStyle")).toBe(true);

    const tableStyleFormat = resolveCellTableStyleDifferentialFormat({
      sheetIndex: 0,
      tables: workbook.tables,
      styles: workbook.styles,
      address: createAddress(2, 2), // B2 (first header cell)
    });
    if (!tableStyleFormat) {
      throw new Error("Expected table style format to resolve for B2");
    }

    const b2 = createAddress(2, 2);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address: b2,
      cell: getCell(sheet, b2),
      tableStyleFormat,
    });
    expect(css.color).toBe("#FF0000");

    const evaluator = createFormulaEvaluator(workbook);
    const e7 = createAddress(5, 7); // E7 = SUBTOTAL(109,Table1[value])
    const e7Cell = getCell(sheet, e7);
    if (!e7Cell?.formula) {
      throw new Error("E7 must be a formula cell");
    }
    expect(e7Cell.formula.expression).toBe("SUBTOTAL(109,Table1[value])");
    expect(evaluator.evaluateCell(0, e7)).toEqual(toExpectedScalar(e7Cell.value));
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

  it("FillWithoutColor.xlsx: parses alignment.indent and exposes indent CSS variables", async () => {
    const workbook = await parseWorkbookFromFixture("FillWithoutColor.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex(
      (xf) => xf.alignment?.indent === 1 && (xf.alignment.horizontal === "left" || xf.alignment.horizontal === undefined),
    );
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with indent=1");
    }

    const address = createAddress(1, 1);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(xfIndex) },
    });
    expect(css["--xlsx-cell-indent-start"]).toBe("2ch");
  });

  it("45544.xlsx: formats percent number formats without duplicating %", async () => {
    const workbook = await parseWorkbookFromFixture("45544.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const percentNumberFormat = workbook.styles.numberFormats.find((fmt) => fmt.formatCode === "0.0%");
    if (!percentNumberFormat) {
      throw new Error('Expected custom number format "0.0%" to exist');
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.numFmtId === percentNumberFormat.numFmtId);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf using the percent numFmtId");
    }

    const address = createAddress(1, 1);
    const cell = { address, value: { type: "number", value: 0.1 }, styleId: styleId(xfIndex) } satisfies Cell;
    const formatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address, cell });
    expect(formatCode).toBe("0.0%");

    const display = formatCellValueForDisplay(cell.value, formatCode);
    expect(display).toBe("10.0%");
  });

  it("bug66215.xlsx: formats built-in percent (numFmtId=9) without duplicating % and aligns numbers to the right (general)", async () => {
    const workbook = await parseWorkbookFromFixture("bug66215.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.numFmtId === 9);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with numFmtId=9 (0%)");
    }

    const address = createAddress(1, 1);
    const cell = { address, value: { type: "number", value: 0.1 }, styleId: styleId(xfIndex) } satisfies Cell;

    const formatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address, cell });
    expect(formatCode).toBe("0%");

    const display = formatCellValueForDisplay(cell.value, formatCode);
    expect(display).toBe("10%");
    expect(display.includes("%%")).toBe(false);

    const css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell });
    expect(css.justifyContent).toBe("flex-end");
  });

  it("ShrinkToFit.xlsx: parses alignment.shrinkToFit and resolves a shrink-to-fit CSS hint", async () => {
    const workbook = await parseWorkbookFromFixture("ShrinkToFit.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.alignment?.shrinkToFit === true);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with shrinkToFit");
    }

    const address = createAddress(1, 1);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(xfIndex) },
    });
    expect(css.whiteSpace).toBeUndefined();
    expect(css.overflow).toBeUndefined();

    // The fixture's shrink-to-fit style uses horizontal="general"; numbers should align to the right.
    const numberCss = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "number", value: 123 }, styleId: styleId(xfIndex) },
    });
    expect(numberCss.justifyContent).toBe("flex-end");
  });

  it("bug66675.xlsx: parses alignment.readingOrder and resolves CSS direction", async () => {
    const workbook = await parseWorkbookFromFixture("bug66675.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.alignment?.readingOrder === 1);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with readingOrder=1");
    }

    const address = createAddress(1, 1);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(xfIndex) },
    });
    expect(css.direction).toBe("ltr");
  });

  it("picture.xlsx: parses alignment.textRotation and resolves CSS rotate transform", async () => {
    const workbook = await parseWorkbookFromFixture("picture.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.alignment?.textRotation === 90);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with textRotation=90");
    }

    const address = createAddress(1, 1);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(xfIndex) },
    });
    expect(css.transform).toBe("rotate(-90deg)");
    expect(css.transformOrigin).toBe("center");
  });

  it("49273.xlsx: parses alignment.textRotation=31 and resolves CSS rotate transform", async () => {
    const workbook = await parseWorkbookFromFixture("49273.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.alignment?.textRotation === 31);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with textRotation=31");
    }

    const address = createAddress(1, 1);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(xfIndex) },
    });
    expect(css.transform).toBe("rotate(-31deg)");
    expect(css.transformOrigin).toBe("center");
  });

  it("FormulaEvalTestData_Copy.xlsx: parses alignment.textRotation=255 and resolves vertical writing mode", async () => {
    const workbook = await parseWorkbookFromFixture("FormulaEvalTestData_Copy.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const xfIndex = workbook.styles.cellXfs.findIndex((xf) => xf.alignment?.textRotation === 255);
    if (xfIndex === -1) {
      throw new Error("Expected at least one cellXf with textRotation=255");
    }

    const address = createAddress(1, 1);
    const css = resolveCellRenderStyle({
      styles: workbook.styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(xfIndex) },
    });
    expect(css.writingMode).toBe("vertical-rl");
    expect(css.textOrientation).toBe("upright");
  });

  it("styles.xlsx: resolves basic font/decoration/alignment/fill styles", async () => {
    const workbook = await parseWorkbookFromFixture("styles.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    const a1 = createAddress(1, 1); // bold Arial
    const a1Cell = getCell(sheet, a1);
    if (!a1Cell) {
      throw new Error("A1 must exist");
    }
    const a1Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a1, cell: a1Cell });
    expect(a1Css.fontFamily).toBe("Arial");
    expect(a1Css.fontWeight).toBe(700);
    expect(a1Css.color).toBe("#000000");
    const a1FontSize = a1Css.fontSize;
    if (typeof a1FontSize !== "string") {
      throw new Error("A1 fontSize must be a string");
    }
    expect(a1FontSize.endsWith("px")).toBe(true);
    expect(Number.parseFloat(a1FontSize)).toBeCloseTo(14.666666666666666, 8);

    const a2 = createAddress(1, 2); // italic Arial
    const a2Cell = getCell(sheet, a2);
    if (!a2Cell) {
      throw new Error("A2 must exist");
    }
    const a2Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a2, cell: a2Cell });
    expect(a2Css.fontFamily).toBe("Arial");
    expect(a2Css.fontStyle).toBe("italic");

    const a3 = createAddress(1, 3); // underline Arial
    const a3Cell = getCell(sheet, a3);
    if (!a3Cell) {
      throw new Error("A3 must exist");
    }
    const a3Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a3, cell: a3Cell });
    expect(a3Css.textDecorationLine).toBe("underline");

    const a4 = createAddress(1, 4); // horizontal center
    const a4Cell = getCell(sheet, a4);
    if (!a4Cell) {
      throw new Error("A4 must exist");
    }
    const a4Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a4, cell: a4Cell });
    expect(a4Css.justifyContent).toBe("center");

    const a5 = createAddress(1, 5); // horizontal right
    const a5Cell = getCell(sheet, a5);
    if (!a5Cell) {
      throw new Error("A5 must exist");
    }
    const a5Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a5, cell: a5Cell });
    expect(a5Css.justifyContent).toBe("flex-end");

    const a11 = createAddress(1, 11); // theme fill
    const a11Cell = getCell(sheet, a11);
    if (!a11Cell) {
      throw new Error("A11 must exist");
    }
    const a11Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a11, cell: a11Cell });
    expect(a11Css.backgroundColor).toBe("#F5F4ED");
  });

  it("style-alternate-content.xlsx: parses merges and resolves border + font styles", async () => {
    const workbook = await parseWorkbookFromFixture("style-alternate-content.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }

    expect(sheet.name).toBe("Sheet2");
    expect(sheet.columns?.length).toBe(9);
    expect(sheet.mergeCells?.length).toBe(12);
    expect(workbook.styles.dxfs?.length).toBe(7);

    if (!sheet.mergeCells) {
      throw new Error("sheet.mergeCells is required");
    }
    expect(sheet.mergeCells).toContainEqual({
      start: createAddress(1, 1),
      end: createAddress(3, 1),
    });

    const a4 = createAddress(1, 4);
    const a4Cell = getCell(sheet, a4);
    if (!a4Cell || a4Cell.value.type !== "string") {
      throw new Error("A4 must be a string cell");
    }
    expect(a4Cell.value.value).toBe("1. 센터명");

    const a4Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: a4, cell: a4Cell });
    expect(a4Css.fontFamily).toBe("맑은 고딕");
    expect(a4Css.fontSize).toBe("14.666666666666666px");

    const a4Border = resolveCellBorderDecoration({
      styles: workbook.styles,
      sheet,
      address: a4,
      cell: a4Cell,
      defaultBorderColor: "#000000",
    });
    expect(a4Border).toEqual({
      left: { width: 1, style: "solid", color: "#000000" },
      right: { width: 1, style: "solid", color: "#000000" },
      top: { width: 1, style: "solid", color: "#000000" },
      bottom: { width: 1, style: "solid", color: "#000000" },
    });

    const b36 = createAddress(2, 36);
    const b36Cell = getCell(sheet, b36);
    if (!b36Cell) {
      throw new Error("B36 must exist");
    }
    const b36Css = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: b36, cell: b36Cell });
    expect(b36Css.fontFamily).toBe("맑은 고딕");
    expect(b36Css.fontSize).toBe("13.333333333333334px");
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

  it("WidthsAndHeights.xlsx: respects row height/hidden + column width/hidden in sheet layout", async () => {
    const workbook = await parseWorkbookFromFixture("WidthsAndHeights.xlsx");
    const sheet = workbook.sheets[0];
    if (!sheet) {
      throw new Error("sheet[0] is required");
    }
    if (!sheet.columns) {
      throw new Error("sheet.columns is required");
    }
    if (!sheet.rows) {
      throw new Error("sheet.rows is required");
    }

    const row1 = sheet.rows.find((r) => r.rowNumber === rowIdx(1));
    const row3 = sheet.rows.find((r) => r.rowNumber === rowIdx(3));
    if (!row1 || !row3) {
      throw new Error("row 1 and row 3 are required");
    }
    expect(row1.height).toBe(37.5);
    expect(row1.customHeight).toBe(true);
    expect(row3.height).toBe(0.75);
    expect(row3.customHeight).toBe(true);
    expect(row3.hidden).toBe(true);

    const colA = sheet.columns.find((c) => c.min === colIdx(1) && c.max === colIdx(1));
    const colC = sheet.columns.find((c) => c.min === colIdx(3) && c.max === colIdx(3));
    if (!colA || !colC) {
      throw new Error("Expected column definitions for A and C");
    }
    expect(colA.width).toBe(20);
    expect(colC.hidden).toBe(true);

    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 5,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 72,
    });

    expect(layout.rows.getSizePx(0)).toBe(50); // row 1: 37.5pt -> 50px
    expect(layout.rows.getSizePx(1)).toBe(20); // row 2: default
    expect(layout.rows.getSizePx(2)).toBe(0); // row 3: hidden

    expect(layout.cols.getSizePx(0)).toBe(145); // col A width=20 chars -> 145px (approx)
    expect(layout.cols.getSizePx(1)).toBe(72); // col B: default
    expect(layout.cols.getSizePx(2)).toBe(0); // col C: hidden
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
