/**
 * @file Unit tests for formula formatting (AST → normalized text).
 */

import { formatFormula } from "./format";
import { parseFormula } from "./parser";

describe("xlsx/formula/format", () => {
  it("formats references, functions, and string literals", () => {
    const ast = parseFormula('IF(A1>0,"OK","NG")');
    expect(formatFormula(ast)).toBe('IF(A1>0,"OK","NG")');
  });

  it("formats sheet-qualified references", () => {
    const ast = parseFormula("'My Sheet'!A1+1");
    expect(formatFormula(ast)).toBe("'My Sheet'!A1+1");
  });

  it("formats array literals", () => {
    const ast = parseFormula('{1,"A";2,"B"}');
    expect(formatFormula(ast)).toBe('{1,"A";2,"B"}');
  });
});
