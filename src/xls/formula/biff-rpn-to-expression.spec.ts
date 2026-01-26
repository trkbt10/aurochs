/**
 * @file BIFF formula token conversion tests
 */

import { convertBiffRpnToFormulaExpression, tryConvertBiffRpnToFormulaExpression } from "./biff-rpn-to-expression";
import { createXlsWarningCollector } from "../warnings";

describe("convertBiffRpnToFormulaExpression", () => {
  it("converts a simple arithmetic formula (=5+6)", () => {
    const tokens = new Uint8Array([0x1e, 0x05, 0x00, 0x1e, 0x06, 0x00, 0x03]);
    const expr = convertBiffRpnToFormulaExpression(tokens, { baseRow: 0, baseCol: 0 });
    expect(expr).toBe("5+6");
  });

  it("converts absolute ptgRef to $A$1 notation", () => {
    const tokens = new Uint8Array([0x24, 0x04, 0x00, 0x02, 0x00]); // $C$5
    const expr = convertBiffRpnToFormulaExpression(tokens, { baseRow: 0, baseCol: 0 });
    expect(expr).toBe("$C$5");
  });

  it("converts relative ptgRef to A1 notation using base cell", () => {
    const tokens = new Uint8Array([0x24, 0x04, 0x00, 0x02, 0xc0]); // C5 relative from A1
    const expr = convertBiffRpnToFormulaExpression(tokens, { baseRow: 0, baseCol: 0 });
    expect(expr).toBe("C5");
  });

  it("converts ptgArea to an A1 range", () => {
    const tokens = new Uint8Array([0x25, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00]); // $A$1:$B$2
    const expr = convertBiffRpnToFormulaExpression(tokens, { baseRow: 0, baseCol: 0 });
    expect(expr).toBe("$A$1:$B$2");
  });
});

describe("tryConvertBiffRpnToFormulaExpression", () => {
  it("warns and returns undefined on unsupported tokens in lenient mode", () => {
    const collector = createXlsWarningCollector();
    const expr = tryConvertBiffRpnToFormulaExpression(
      new Uint8Array([0x7f]),
      { baseRow: 0, baseCol: 0 },
      { mode: "lenient", warn: collector.warn },
    );
    expect(expr).toBeUndefined();
    expect(collector.warnings.map((w) => w.code)).toContain("FORMULA_CONVERSION_FAILED");
  });

  it("warns and returns undefined on unsupported tokens in strict mode when a warning sink is provided", () => {
    const collector = createXlsWarningCollector();
    const expr = tryConvertBiffRpnToFormulaExpression(
      new Uint8Array([0x7f]),
      { baseRow: 0, baseCol: 0 },
      { mode: "strict", warn: collector.warn },
    );
    expect(expr).toBeUndefined();
    expect(collector.warnings.map((w) => w.code)).toContain("FORMULA_CONVERSION_FAILED");
  });
});
