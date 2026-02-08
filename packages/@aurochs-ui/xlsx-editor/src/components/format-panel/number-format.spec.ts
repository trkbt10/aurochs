/**
 * @file Unit tests for number format code helpers used by the xlsx format panel.
 */

import { buildDecimalFormat, buildScientificFormat } from "./number-format";

describe("xlsx-editor/components/format-panel/number-format", () => {
  describe("buildDecimalFormat", () => {
    it("builds decimal formats", () => {
      expect(buildDecimalFormat({ decimals: 0, thousands: false })).toBe("0");
      expect(buildDecimalFormat({ decimals: 2, thousands: false })).toBe("0.00");
      expect(buildDecimalFormat({ decimals: 3, thousands: true })).toBe("#,##0.000");
    });
  });

  describe("buildScientificFormat", () => {
    it("builds scientific formats with significant digits", () => {
      expect(buildScientificFormat({ significantDigits: 1 })).toBe("0E+00");
      expect(buildScientificFormat({ significantDigits: 3 })).toBe("0.00E+00");
      expect(buildScientificFormat({ significantDigits: 10 })).toBe("0.000000000E+00");
    });
  });
});
