/**
 * @file useFormulaAutocomplete integration test
 *
 * Tests the pure logic that drives the autocomplete hook:
 * detectAutocompleteContext + filterFunctions + acceptAutocomplete
 * composed as they would be in the hook.
 */

import { analyzeFormula } from "../formula-edit/formula-analysis";
import {
  detectAutocompleteContext,
  filterFunctions,
  acceptAutocomplete,
} from "../formula-edit/formula-autocomplete";

function simulateAutocomplete(text: string, caretOffset: number) {
  const analysis = analyzeFormula(text, caretOffset);
  const context = detectAutocompleteContext(analysis.tokens, caretOffset);
  if (!context?.shouldOpen) {
    return { isOpen: false, candidates: [], context: undefined };
  }
  const candidates = filterFunctions(context.query);
  return {
    isOpen: candidates.length > 0,
    candidates,
    context,
  };
}

describe("useFormulaAutocomplete (pure logic)", () => {
  it("opens autocomplete for partial function name =SU", () => {
    const result = simulateAutocomplete("=SU", 3);
    expect(result.isOpen).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const c of result.candidates) {
      expect(c.name.toUpperCase().startsWith("SU")).toBe(true);
    }
  });

  it("does not open after completed function call =SUM(", () => {
    const result = simulateAutocomplete("=SUM(", 4);
    expect(result.isOpen).toBe(false);
  });

  it("does not open for cell reference =A1", () => {
    const result = simulateAutocomplete("=A1", 3);
    expect(result.isOpen).toBe(false);
  });

  it("opens for nested partial =IF(VL", () => {
    const result = simulateAutocomplete("=IF(VL", 6);
    expect(result.isOpen).toBe(true);
    expect(result.candidates.some((c) => c.name === "VLOOKUP")).toBe(true);
  });

  it("accept replaces partial with function name + paren", () => {
    const { context } = simulateAutocomplete("=SU", 3);
    expect(context).toBeDefined();
    const result = acceptAutocomplete("=SU", context!.tokenStartOffset, 3, "SUM");
    expect(result.text).toBe("=SUM(");
    expect(result.caretOffset).toBe(5);
  });

  it("accept preserves text after caret", () => {
    const { context } = simulateAutocomplete("=SU+A1", 3);
    expect(context).toBeDefined();
    const result = acceptAutocomplete("=SU+A1", context!.tokenStartOffset, 3, "SUM");
    expect(result.text).toBe("=SUM(+A1");
    expect(result.caretOffset).toBe(5);
  });
});
