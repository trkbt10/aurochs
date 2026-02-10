/**
 * @file Formula tokenizer tests
 */

import { tokenizeFormula } from "./formula-tokenizer";

describe("formula-edit/formula-tokenizer", () => {
  it("tokenizes a simple cell reference", () => {
    const tokens = tokenizeFormula("A1");
    expect(tokens).toEqual([{ type: "reference", text: "A1", startOffset: 0, endOffset: 2 }]);
  });

  it("tokenizes an absolute cell reference", () => {
    const tokens = tokenizeFormula("$A$1");
    expect(tokens).toEqual([{ type: "reference", text: "$A$1", startOffset: 0, endOffset: 4 }]);
  });

  it("tokenizes a cell range", () => {
    const tokens = tokenizeFormula("A1:B5");
    expect(tokens).toEqual([{ type: "reference", text: "A1:B5", startOffset: 0, endOffset: 5 }]);
  });

  it("tokenizes a function call", () => {
    const tokens = tokenizeFormula("SUM(A1,B2)");
    expect(tokens).toHaveLength(6);
    expect(tokens[0]).toEqual({ type: "function", text: "SUM", startOffset: 0, endOffset: 3 });
    expect(tokens[1]).toEqual({ type: "paren", text: "(", startOffset: 3, endOffset: 4 });
    expect(tokens[2]).toEqual({ type: "reference", text: "A1", startOffset: 4, endOffset: 6 });
    expect(tokens[3]).toEqual({ type: "comma", text: ",", startOffset: 6, endOffset: 7 });
    expect(tokens[4]).toEqual({ type: "reference", text: "B2", startOffset: 7, endOffset: 9 });
    expect(tokens[5]).toEqual({ type: "paren", text: ")", startOffset: 9, endOffset: 10 });
  });

  it("tokenizes nested functions", () => {
    const tokens = tokenizeFormula("IF(SUM(A1:A5)>10,TRUE,FALSE)");
    const types = tokens.map((t) => t.type);
    expect(types).toEqual([
      "function",   // IF
      "paren",      // (
      "function",   // SUM
      "paren",      // (
      "reference",  // A1:A5
      "paren",      // )
      "operator",   // >
      "literal",    // 10
      "comma",      // ,
      "function",   // TRUE — 4-letter bare identifier (not column-like, not followed by `(`)
      "comma",      // ,
      "function",   // FALSE — same
      "paren",      // )
    ]);
  });

  it("tokenizes arithmetic expression", () => {
    const tokens = tokenizeFormula("A1+B2*3");
    expect(tokens).toHaveLength(5);
    expect(tokens[0]).toEqual({ type: "reference", text: "A1", startOffset: 0, endOffset: 2 });
    expect(tokens[1]).toEqual({ type: "operator", text: "+", startOffset: 2, endOffset: 3 });
    expect(tokens[2]).toEqual({ type: "reference", text: "B2", startOffset: 3, endOffset: 5 });
    expect(tokens[3]).toEqual({ type: "operator", text: "*", startOffset: 5, endOffset: 6 });
    expect(tokens[4]).toEqual({ type: "literal", text: "3", startOffset: 6, endOffset: 7 });
  });

  it("tokenizes string literal", () => {
    const tokens = tokenizeFormula('"Hello World"');
    expect(tokens).toEqual([{ type: "string", text: '"Hello World"', startOffset: 0, endOffset: 13 }]);
  });

  it("tokenizes string with escaped quotes", () => {
    const tokens = tokenizeFormula('"Say ""Hi"""');
    expect(tokens).toEqual([{ type: "string", text: '"Say ""Hi"""', startOffset: 0, endOffset: 12 }]);
  });

  it("tokenizes unclosed string gracefully", () => {
    const tokens = tokenizeFormula('"unterminated');
    expect(tokens).toEqual([{ type: "string", text: '"unterminated', startOffset: 0, endOffset: 13 }]);
  });

  it("tokenizes comparison operators", () => {
    const tokens = tokenizeFormula("A1<>B1");
    expect(tokens).toHaveLength(3);
    expect(tokens[1]).toEqual({ type: "operator", text: "<>", startOffset: 2, endOffset: 4 });
  });

  it("tokenizes >= and <= operators", () => {
    const tokensGe = tokenizeFormula("A1>=10");
    expect(tokensGe[1]).toEqual({ type: "operator", text: ">=", startOffset: 2, endOffset: 4 });

    const tokensLe = tokenizeFormula("A1<=10");
    expect(tokensLe[1]).toEqual({ type: "operator", text: "<=", startOffset: 2, endOffset: 4 });
  });

  it("tokenizes error literals", () => {
    const tokens = tokenizeFormula("#REF!+#N/A");
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: "error", text: "#REF!", startOffset: 0, endOffset: 5 });
    expect(tokens[2]).toEqual({ type: "error", text: "#N/A", startOffset: 6, endOffset: 10 });
  });

  it("preserves whitespace as tokens", () => {
    const tokens = tokenizeFormula("A1 + B2");
    expect(tokens).toHaveLength(5);
    expect(tokens[1]).toEqual({ type: "whitespace", text: " ", startOffset: 2, endOffset: 3 });
    expect(tokens[3]).toEqual({ type: "whitespace", text: " ", startOffset: 4, endOffset: 5 });
  });

  it("tokenizes sheet-qualified reference", () => {
    const tokens = tokenizeFormula("Sheet1!A1");
    expect(tokens).toEqual([{ type: "reference", text: "Sheet1!A1", startOffset: 0, endOffset: 9 }]);
  });

  it("tokenizes quoted sheet name reference", () => {
    const tokens = tokenizeFormula("'My Sheet'!A1:B5");
    expect(tokens).toEqual([{ type: "reference", text: "'My Sheet'!A1:B5", startOffset: 0, endOffset: 16 }]);
  });

  it("handles empty input", () => {
    const tokens = tokenizeFormula("");
    expect(tokens).toEqual([]);
  });

  it("handles incomplete formula gracefully (trailing operator)", () => {
    const tokens = tokenizeFormula("SUM(A1,");
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(["function", "paren", "reference", "comma"]);
  });

  it("handles incomplete formula gracefully (just a function name)", () => {
    const tokens = tokenizeFormula("SU");
    expect(tokens).toHaveLength(1);
    // SU looks like a column-range-ish but also a 2-letter identifier
    // Since it's not followed by `(`, it won't be classified as function
  });

  it("tokenizes number with decimal", () => {
    const tokens = tokenizeFormula("3.14");
    expect(tokens).toEqual([{ type: "literal", text: "3.14", startOffset: 0, endOffset: 4 }]);
  });

  it("tokenizes number with exponent", () => {
    const tokens = tokenizeFormula("1.5e10");
    expect(tokens).toEqual([{ type: "literal", text: "1.5e10", startOffset: 0, endOffset: 6 }]);
  });

  it("tokenizes brackets (array literals)", () => {
    const tokens = tokenizeFormula("{1,2;3,4}");
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(["bracket", "literal", "comma", "literal", "semicolon", "literal", "comma", "literal", "bracket"]);
  });

  it("tokenizes unrecognized characters as error", () => {
    const tokens = tokenizeFormula("A1@B2");
    expect(tokens).toHaveLength(3);
    expect(tokens[1]).toEqual({ type: "error", text: "@", startOffset: 2, endOffset: 3 });
  });

  it("offsets are contiguous across all tokens", () => {
    const formula = "SUM(A1:B5, C1) + 10";
    const tokens = tokenizeFormula(formula);

    // Verify that tokens cover the entire input without gaps
    let expectedStart = 0;
    for (const token of tokens) {
      expect(token.startOffset).toBe(expectedStart);
      expect(token.endOffset).toBeGreaterThan(token.startOffset);
      expectedStart = token.endOffset;
    }
    expect(expectedStart).toBe(formula.length);
  });
});
