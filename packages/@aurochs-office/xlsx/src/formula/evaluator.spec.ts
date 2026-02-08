/**
 * @file Unit tests for the formula evaluator (AST execution + workbook lookup).
 */

import { colIdx, rowIdx } from "../domain/types";
import type { Cell, CellValue } from "../domain/cell/types";
import type { XlsxRow, XlsxWorksheet, XlsxWorkbook } from "../domain/workbook";
import { createDefaultStyleSheet } from "../domain/style/types";
import { createFormulaEvaluator } from "./evaluator";

function numberCell(col: number, row: number, value: number): Cell {
  const cellValue: CellValue = { type: "number", value };
  return {
    address: { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    value: cellValue,
  };
}

function stringCell(col: number, row: number, value: string): Cell {
  const cellValue: CellValue = { type: "string", value };
  return {
    address: { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    value: cellValue,
  };
}

function formulaCell(col: number, row: number, formula: string): Cell {
  return {
    address: { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    value: { type: "empty" },
    formula: { type: "normal", expression: formula },
  };
}

function makeWorksheet(name: string, sheetId: number, cells: readonly Cell[]): XlsxWorksheet {
  const rowsByNumber = new Map<number, Cell[]>();
  for (const cell of cells) {
    const rowNumber = cell.address.row as number;
    const current = rowsByNumber.get(rowNumber) ?? [];
    current.push(cell);
    rowsByNumber.set(rowNumber, current);
  }

  const rows: XlsxRow[] = [...rowsByNumber.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, rowCells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells: rowCells.sort((a, b) => (a.address.col as number) - (b.address.col as number)),
    }));

  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    rows,
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

function makeWorkbook(sheets: readonly XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

describe("createFormulaEvaluator", () => {
  it("evaluates simple arithmetic and references", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 1), // A1
      numberCell(1, 2, 2), // A2
      formulaCell(2, 1, "A1+A2"), // B1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(3);
  });

  it("evaluates ranges via SUM", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 1), // A1
      numberCell(1, 2, 2), // A2
      formulaCell(3, 1, "SUM(A1:A2)"), // C1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(3), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(3);
  });

  it("evaluates cross-sheet references (case-insensitive)", () => {
    const sheet1 = makeWorksheet("Sheet1", 1, [formulaCell(1, 1, "other!A1+1")]);
    const other = makeWorksheet("Other", 2, [numberCell(1, 1, 41)]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet1, other]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(42);
  });

  it("evaluates IF and comparisons", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 2), // A1
      formulaCell(2, 1, "IF(A1>1,10,20)"), // B1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(10);
  });

  it("evaluates concatenation operator (&)", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      stringCell(1, 1, "A"), // A1
      numberCell(1, 2, 3), // A2
      formulaCell(2, 1, 'A1&"|"&A2'), // B1
    ]);

    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe("A|3");
  });

  it("evaluates array literals", () => {
    const sheet = makeWorksheet("Sheet1", 1, [formulaCell(1, 1, "SUM({1,2;3,4})")]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(10);
  });

  it("evaluates VLOOKUP over an array literal", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      formulaCell(1, 1, 'VLOOKUP(2,{1,"A";2,"B";3,"C"},2,FALSE)'),
    ]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe("B");
  });

  it("evaluates IFERROR by catching formula errors", () => {
    const sheet = makeWorksheet("Sheet1", 1, [formulaCell(1, 1, "IFERROR(1/0,0)")]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(0);
  });

  it("evaluates INDIRECT", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 5),
      formulaCell(2, 1, 'INDIRECT("A1")+1'),
    ]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(6);
  });

  it("evaluates OFFSET by constructing a displaced range", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 10),
      numberCell(1, 2, 20),
      numberCell(1, 3, 30),
      formulaCell(2, 1, "SUM(OFFSET(A1,1,0,2,1))"),
    ]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toBe(50);
  });

  it("can return non-scalar results for preview (evaluateFormulaResult)", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      numberCell(1, 1, 10),
      numberCell(1, 2, 20),
      numberCell(1, 3, 30),
    ]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    const origin = { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false };
    expect(evaluator.evaluateFormulaResult(0, origin, "OFFSET(A1,0,0,2,1)")).toEqual([[10], [20]]);
  });

  it("returns #REF! for unknown sheet names", () => {
    const sheet = makeWorksheet("Sheet1", 1, [formulaCell(1, 1, "NoSuchSheet!A1")]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toEqual({
      type: "error",
      value: "#REF!",
    });
  });

  it("returns #REF! for circular references", () => {
    const sheet = makeWorksheet("Sheet1", 1, [
      formulaCell(1, 1, "B1"),
      formulaCell(2, 1, "A1"),
    ]);
    const evaluator = createFormulaEvaluator(makeWorkbook([sheet]));
    expect(evaluator.evaluateCell(0, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })).toEqual({
      type: "error",
      value: "#REF!",
    });
  });
});
