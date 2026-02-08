/**
 * @file Unit tests for the formula parser (expression → AST).
 */

import { parseFormula } from "./parser";
import { colIdx, rowIdx } from "../domain/types";

describe("parseFormula", () => {
  it("parses references", () => {
    expect(parseFormula("A1")).toEqual({
      type: "Reference",
      reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
    });

    expect(parseFormula("$B$2")).toEqual({
      type: "Reference",
      reference: { col: colIdx(2), row: rowIdx(2), colAbsolute: true, rowAbsolute: true },
    });
  });

  it("parses sheet-qualified references", () => {
    expect(parseFormula("Sheet1!A1")).toEqual({
      type: "Reference",
      reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
      sheetName: "Sheet1",
    });
  });

  it("parses ranges", () => {
    expect(parseFormula("A1:B2")).toEqual({
      type: "Range",
      range: {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
      },
    });
  });

  it("parses structured table references", () => {
    expect(parseFormula("Table1[[A]:[B]]")).toEqual({
      type: "StructuredTableReference",
      tableName: "Table1",
      startColumnName: "A",
      endColumnName: "B",
    });
  });

  it("parses single-column structured table references (Table1[Column])", () => {
    expect(parseFormula("Table1[value]")).toEqual({
      type: "StructuredTableReference",
      tableName: "Table1",
      startColumnName: "value",
      endColumnName: "value",
    });
  });

  it("parses structured table references with special items (e.g. #All)", () => {
    expect(parseFormula("Table1[#All]")).toEqual({
      type: "StructuredTableReference",
      tableName: "Table1",
      item: "#All",
    });
  });

  it("parses structured table references with special items + columns (e.g. #This Row/#Totals)", () => {
    expect(parseFormula("Tabelle1[[#This Row],[Field 2]:[Field 3]]")).toEqual({
      type: "StructuredTableReference",
      tableName: "Tabelle1",
      item: "#This Row",
      startColumnName: "Field 2",
      endColumnName: "Field 3",
    });

    expect(parseFormula("Tabelle1[[#Totals],[Field 4 ]]")).toEqual({
      type: "StructuredTableReference",
      tableName: "Tabelle1",
      item: "#Totals",
      startColumnName: "Field 4 ",
      endColumnName: "Field 4 ",
    });
  });

  it("parses concatenation operator (&) with correct precedence", () => {
    expect(parseFormula('A1&"|"&B2')).toEqual({
      type: "Binary",
      operator: "&",
      left: {
        type: "Binary",
        operator: "&",
        left: { type: "Reference", reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false } },
        right: { type: "Literal", value: "|" },
      },
      right: { type: "Reference", reference: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false } },
    });

    expect(parseFormula("1&2+3")).toEqual({
      type: "Binary",
      operator: "&",
      left: { type: "Literal", value: 1 },
      right: {
        type: "Binary",
        operator: "+",
        left: { type: "Literal", value: 2 },
        right: { type: "Literal", value: 3 },
      },
    });
  });

  it("parses operator precedence", () => {
    expect(parseFormula("1+2*3")).toEqual({
      type: "Binary",
      operator: "+",
      left: { type: "Literal", value: 1 },
      right: {
        type: "Binary",
        operator: "*",
        left: { type: "Literal", value: 2 },
        right: { type: "Literal", value: 3 },
      },
    });
  });

  it("parses function calls", () => {
    expect(parseFormula("SUM(A1,2)")).toEqual({
      type: "Function",
      name: "SUM",
      args: [
        { type: "Reference", reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false } },
        { type: "Literal", value: 2 },
      ],
    });
  });

  it("parses future-function namespaces (e.g. _xlfn.XLOOKUP)", () => {
    expect(parseFormula("_xlfn.XLOOKUP(A1,B1:B2,C1:C2)")).toEqual({
      type: "Function",
      name: "_XLFN.XLOOKUP",
      args: [
        { type: "Reference", reference: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false } },
        {
          type: "Range",
          range: {
            start: { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
            end: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
          },
        },
        {
          type: "Range",
          range: {
            start: { col: colIdx(3), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
            end: { col: colIdx(3), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
          },
        },
      ],
    });
  });

  it("parses error literals", () => {
    expect(parseFormula("#REF!")).toEqual({
      type: "Literal",
      value: { type: "error", value: "#REF!" },
    });
  });

  it("parses array literals", () => {
    expect(parseFormula("{1,2;3,4}")).toEqual({
      type: "Array",
      elements: [
        [
          { type: "Literal", value: 1 },
          { type: "Literal", value: 2 },
        ],
        [
          { type: "Literal", value: 3 },
          { type: "Literal", value: 4 },
        ],
      ],
    });
  });

  it("parses NULL/NIL as null", () => {
    expect(parseFormula("NULL")).toEqual({ type: "Literal", value: null });
    expect(parseFormula("NIL")).toEqual({ type: "Literal", value: null });
  });
});
