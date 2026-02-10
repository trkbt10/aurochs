/**
 * @file Formula analysis tests
 */

import { analyzeFormula } from "./formula-analysis";

describe("formula-edit/formula-analysis", () => {
  describe("basic parsing", () => {
    it("returns empty analysis for non-formula text", () => {
      const result = analyzeFormula("Hello", 5);
      expect(result.tokens).toEqual([]);
      expect(result.references).toEqual([]);
      expect(result.ast).toBeUndefined();
      expect(result.isValid).toBe(false);
    });

    it("parses a valid simple formula", () => {
      const result = analyzeFormula("=A1+B2", 6);
      expect(result.isValid).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast?.type).toBe("Binary");
    });

    it("returns ast=undefined for incomplete formula", () => {
      const result = analyzeFormula("=SUM(A1,", 9);
      expect(result.isValid).toBe(false);
      expect(result.ast).toBeUndefined();
      // But tokens and references should still work
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it("handles just = as formula", () => {
      const result = analyzeFormula("=", 1);
      expect(result.isValid).toBe(false);
      expect(result.tokens).toEqual([]);
      expect(result.references).toEqual([]);
    });
  });

  describe("token offsets include = prefix", () => {
    it("offsets are shifted by +1 for the leading =", () => {
      const result = analyzeFormula("=A1+B2", 6);
      const refTokens = result.tokens.filter((t) => t.type === "reference");
      expect(refTokens).toHaveLength(2);

      // "A1" is at positions 1-3 in "=A1+B2"
      expect(refTokens[0].text).toBe("A1");
      expect(refTokens[0].startOffset).toBe(1);
      expect(refTokens[0].endOffset).toBe(3);

      // "B2" is at positions 4-6 in "=A1+B2"
      expect(refTokens[1].text).toBe("B2");
      expect(refTokens[1].startOffset).toBe(4);
      expect(refTokens[1].endOffset).toBe(6);
    });

    it("function token offset is shifted by +1", () => {
      const result = analyzeFormula("=SUM(A1)", 8);
      const funcToken = result.tokens.find((t) => t.type === "function");
      expect(funcToken?.text).toBe("SUM");
      expect(funcToken?.startOffset).toBe(1);
      expect(funcToken?.endOffset).toBe(4);
    });
  });

  describe("reference extraction", () => {
    it("extracts single cell references with color indices", () => {
      const result = analyzeFormula("=A1+B2+C3", 10);
      expect(result.references).toHaveLength(3);
      expect(result.references[0].colorIndex).toBe(0);
      expect(result.references[1].colorIndex).toBe(1);
      expect(result.references[2].colorIndex).toBe(2);
    });

    it("extracts range reference", () => {
      const result = analyzeFormula("=SUM(A1:B5)", 12);
      expect(result.references).toHaveLength(1);
      const ref = result.references[0];
      expect(ref.range.start.col).toBe(1); // A
      expect(ref.range.start.row).toBe(1);
      expect(ref.range.end.col).toBe(2); // B
      expect(ref.range.end.row).toBe(5);
      expect(ref.sheetName).toBeUndefined();
    });

    it("extracts sheet-qualified reference", () => {
      const result = analyzeFormula("=Sheet1!A1", 11);
      expect(result.references).toHaveLength(1);
      expect(result.references[0].sheetName).toBe("Sheet1");
      expect(result.references[0].range.start.col).toBe(1);
      expect(result.references[0].range.start.row).toBe(1);
    });

    it("extracts quoted sheet name reference", () => {
      const result = analyzeFormula("='My Sheet'!A1:B5", 18);
      expect(result.references).toHaveLength(1);
      expect(result.references[0].sheetName).toBe("My Sheet");
    });

    it("color indices cycle through 8 colors", () => {
      const formula = "=A1+B1+C1+D1+E1+F1+G1+H1+I1";
      const result = analyzeFormula(formula, formula.length);
      expect(result.references).toHaveLength(9);
      expect(result.references[0].colorIndex).toBe(0);
      expect(result.references[7].colorIndex).toBe(7);
      expect(result.references[8].colorIndex).toBe(0); // wraps around
    });

    it("extracts absolute references", () => {
      const result = analyzeFormula("=$A$1", 5);
      expect(result.references).toHaveLength(1);
      const ref = result.references[0];
      expect(ref.range.start.colAbsolute).toBe(true);
      expect(ref.range.start.rowAbsolute).toBe(true);
    });

    it("extracts references from incomplete formulas", () => {
      const result = analyzeFormula("=SUM(A1,B2,", 12);
      expect(result.references).toHaveLength(2);
      expect(result.references[0].range.start.col).toBe(1);
      expect(result.references[1].range.start.col).toBe(2);
    });
  });

  describe("active function detection", () => {
    it("detects function when caret is inside arguments", () => {
      // =SUM(|)  — caret at position 5 (after the `(`)
      const result = analyzeFormula("=SUM()", 5);
      expect(result.activeFunctionName).toBe("SUM");
      expect(result.activeFunctionArgIndex).toBe(0);
    });

    it("detects correct argument index after comma", () => {
      // =SUM(A1,|B2) — caret at position 8 (after the `,`)
      const result = analyzeFormula("=SUM(A1,B2)", 8);
      expect(result.activeFunctionName).toBe("SUM");
      expect(result.activeFunctionArgIndex).toBe(1);
    });

    it("detects argument index for third argument", () => {
      // =IF(A1>0,TRUE,|FALSE) — caret at position 15
      const result = analyzeFormula("=IF(A1>0,TRUE,FALSE)", 15);
      expect(result.activeFunctionName).toBe("IF");
      expect(result.activeFunctionArgIndex).toBe(2);
    });

    it("detects innermost function in nested calls", () => {
      // =IF(SUM(|A1:A5)>10,TRUE,FALSE) — caret at position 8 (inside SUM's args)
      const result = analyzeFormula("=IF(SUM(A1:A5)>10,TRUE,FALSE)", 8);
      expect(result.activeFunctionName).toBe("SUM");
      expect(result.activeFunctionArgIndex).toBe(0);
    });

    it("returns outer function after inner function closes", () => {
      // =IF(SUM(A1:A5)|>10,TRUE,FALSE) — caret at position 14 (after SUM's `)`)
      const result = analyzeFormula("=IF(SUM(A1:A5)>10,TRUE,FALSE)", 14);
      // After the closing `)` of SUM, we're back in IF's first argument
      expect(result.activeFunctionName).toBe("IF");
      expect(result.activeFunctionArgIndex).toBe(0);
    });

    it("returns undefined when caret is outside any function", () => {
      const result = analyzeFormula("=A1+B2", 6);
      expect(result.activeFunctionName).toBeUndefined();
      expect(result.activeFunctionArgIndex).toBeUndefined();
    });

    it("returns undefined for incomplete function without opening paren", () => {
      const result = analyzeFormula("=SUM", 4);
      expect(result.activeFunctionName).toBeUndefined();
    });

    it("detects function in incomplete formula", () => {
      // =VLOOKUP(A1, — caret at position 13
      const result = analyzeFormula("=VLOOKUP(A1,", 13);
      expect(result.activeFunctionName).toBe("VLOOKUP");
      expect(result.activeFunctionArgIndex).toBe(1);
    });
  });
});
