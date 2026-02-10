/**
 * @file Formula autocomplete tests
 */

import { detectAutocompleteContext, filterFunctions, acceptAutocomplete } from "./formula-autocomplete";
import { analyzeFormula } from "./formula-analysis";

describe("formula-edit/formula-autocomplete", () => {
  describe("detectAutocompleteContext", () => {
    it("detects partial function name at caret", () => {
      const analysis = analyzeFormula("=SU", 3);
      const ctx = detectAutocompleteContext(analysis.tokens, 3);
      expect(ctx).toBeDefined();
      expect(ctx!.shouldOpen).toBe(true);
      expect(ctx!.query).toBe("SU");
      expect(ctx!.tokenStartOffset).toBe(1); // after "="
    });

    it("does not open for completed function name (followed by paren)", () => {
      const analysis = analyzeFormula("=SUM(", 4);
      const ctx = detectAutocompleteContext(analysis.tokens, 4);
      // SUM is followed by (, so it's already a complete call
      expect(ctx).toBeUndefined();
    });

    it("does not open when caret is on a reference token", () => {
      const analysis = analyzeFormula("=A1", 3);
      const ctx = detectAutocompleteContext(analysis.tokens, 3);
      // A1 is a reference, not a function token
      expect(ctx).toBeUndefined();
    });

    it("detects function name inside nested expression", () => {
      const analysis = analyzeFormula("=IF(VL", 6);
      const ctx = detectAutocompleteContext(analysis.tokens, 6);
      expect(ctx).toBeDefined();
      expect(ctx!.query).toBe("VL");
    });

    it("returns undefined when caret is not on a function token", () => {
      const analysis = analyzeFormula("=123+", 5);
      const ctx = detectAutocompleteContext(analysis.tokens, 5);
      expect(ctx).toBeUndefined();
    });

    it("handles empty formula body", () => {
      const analysis = analyzeFormula("=", 1);
      const ctx = detectAutocompleteContext(analysis.tokens, 1);
      expect(ctx).toBeUndefined();
    });
  });

  describe("filterFunctions", () => {
    it("returns functions matching SU prefix", () => {
      const results = filterFunctions("SU");
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
      for (const fn of results) {
        expect(fn.name.toUpperCase().startsWith("SU")).toBe(true);
      }
    });

    it("returns SUM as the first result for exact match query", () => {
      const results = filterFunctions("SUM");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toUpperCase()).toBe("SUM");
    });

    it("returns empty for non-matching query", () => {
      const results = filterFunctions("ZZZZNOTAFUNCTION");
      expect(results).toEqual([]);
    });

    it("returns at most 10 results", () => {
      // Empty query returns first 10 alphabetically
      const results = filterFunctions("");
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it("is case-insensitive", () => {
      const upper = filterFunctions("SUM");
      const lower = filterFunctions("sum");
      expect(upper.map((f) => f.name)).toEqual(lower.map((f) => f.name));
    });
  });

  describe("acceptAutocomplete", () => {
    it("replaces partial token with function name and paren", () => {
      // "=SU" → accept "SUM" → "=SUM("
      const result = acceptAutocomplete({ editingText: "=SU", tokenStartOffset: 1, caretOffset: 3, functionName: "SUM" });
      expect(result.text).toBe("=SUM(");
      expect(result.caretOffset).toBe(5);
    });

    it("preserves text after the caret", () => {
      // "=SU+A1" with caret at 3 → accept "SUM" → "=SUM(+A1"
      const result = acceptAutocomplete({ editingText: "=SU+A1", tokenStartOffset: 1, caretOffset: 3, functionName: "SUM" });
      expect(result.text).toBe("=SUM(+A1");
      expect(result.caretOffset).toBe(5);
    });

    it("handles accept at nested position", () => {
      // "=IF(VL" → accept "VLOOKUP" at offset 4-6 → "=IF(VLOOKUP("
      const result = acceptAutocomplete({ editingText: "=IF(VL", tokenStartOffset: 4, caretOffset: 6, functionName: "VLOOKUP" });
      expect(result.text).toBe("=IF(VLOOKUP(");
      expect(result.caretOffset).toBe(12);
    });
  });
});
