/**
 * @file Tests for SpreadsheetML format-value helpers
 *
 * Focus: percent scaling and percent literal behavior.
 */

import { formatNumberByCode } from "./format-value";

describe("formatNumberByCode", () => {
  it("formats built-in percent patterns (0% and 0.00%)", () => {
    expect(formatNumberByCode(0.1, "0%")).toBe("10%");
    expect(formatNumberByCode(0.1, "0.00%")).toBe("10.00%");
  });

  it("formats percent without duplicating % (0.0%)", () => {
    expect(formatNumberByCode(0.1, "0.0%")).toBe("10.0%");
  });

  it("scales once per % sign (0%%)", () => {
    expect(formatNumberByCode(0.1, "0%%")).toBe("1000%%");
  });

  it("does not scale for escaped % (0\\%)", () => {
    expect(formatNumberByCode(0.1, "0\\%")).toBe("0%");
  });

  it("treats quoted sections without placeholders as literals", () => {
    expect(formatNumberByCode(0.1, "\"10%%\"")).toBe("10%%");
  });
});
