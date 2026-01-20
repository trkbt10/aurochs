import { describe, expect, it } from "vitest";
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
});

