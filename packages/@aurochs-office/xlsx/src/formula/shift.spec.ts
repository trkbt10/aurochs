/**
 * @file Unit tests for shifting formula references (copy/paste behavior).
 */

import { shiftFormulaReferences } from "./shift";

describe("xlsx/formula/shift", () => {
  it("shifts relative references", () => {
    expect(shiftFormulaReferences("A1+1", 2, 2)).toBe("C3+1");
  });

  it("keeps $ absolute refs intact", () => {
    expect(shiftFormulaReferences("$A$1+A$1+$A1", 2, 2)).toBe("$A$1+C$1+$A3");
  });

  it("shifts ranges", () => {
    expect(shiftFormulaReferences("SUM(A1:B2)", 1, 1)).toBe("SUM(B2:C3)");
  });

  it("shifts sheet-qualified refs", () => {
    expect(shiftFormulaReferences("Sheet2!A1", 1, 0)).toBe("Sheet2!B1");
  });

  it("converts out-of-bounds references to #REF!", () => {
    expect(shiftFormulaReferences("A1", -1, 0)).toBe("#REF!");
  });

  it("shifts references inside array literals", () => {
    expect(shiftFormulaReferences("{A1,1;2,3}", 1, 1)).toBe("{B2,1;2,3}");
  });
});
