/**
 * @file Tests for text-adapters
 */

import {
  mixedRunToFont,
  fontToRunUpdate,
  mixedRunToFontMetrics,
  fontMetricsToRunUpdate,
  mixedRunToCaseTransform,
  caseTransformToRunUpdate,
} from "./text-adapters";
import type { MixedRunProperties } from "../../editors/text/mixed-properties";

function same<T>(value: T) {
  return { type: "same" as const, value };
}

const na = { type: "notApplicable" as const };
const mixed = { type: "mixed" as const };

function createMixedRun(overrides: Partial<MixedRunProperties> = {}): MixedRunProperties {
  return {
    fontSize: na, fontFamily: na, fontFamilyEastAsian: na,
    fontFamilyComplexScript: na, fontFamilySymbol: na,
    bold: na, italic: na, underline: na, underlineColor: na,
    strike: na, caps: na, baseline: na, spacing: na, kerning: na,
    color: na, fill: na, highlightColor: na, textOutline: na,
    outline: na, shadow: na, emboss: na, language: na, rtl: na,
    ...overrides,
  };
}

describe("Font adapter", () => {
  it("converts fontFamily and bold to FontData", () => {
    const run = createMixedRun({ fontFamily: same("Arial"), bold: same(true) });
    const result = mixedRunToFont(run);
    expect(result.family).toBe("Arial");
    expect(result.weight).toBe("bold");
  });

  it("converts FontData back to RunProperties", () => {
    const update = fontToRunUpdate({ family: "Helvetica", weight: "400" });
    expect(update.fontFamily).toBe("Helvetica");
    expect(update.bold).toBe(false);
  });

  it("handles mixed fontFamily", () => {
    const run = createMixedRun({ fontFamily: mixed });
    const result = mixedRunToFont(run);
    expect(result.family).toBe("");
  });
});

describe("FontMetrics adapter", () => {
  it("converts fontSize to size string", () => {
    const run = createMixedRun({ fontSize: same(12 as never) });
    const result = mixedRunToFontMetrics(run);
    expect(result.size).toBe("12 pt");
  });

  it("converts back to RunProperties", () => {
    const update = fontMetricsToRunUpdate({ size: "14 pt", leading: "auto", kerning: "auto", tracking: "0" });
    expect((update as Record<string, unknown>).fontSize).toBeDefined();
  });
});

describe("CaseTransform adapter", () => {
  it("converts caps and styles", () => {
    const run = createMixedRun({
      caps: same("small" as never),
      underline: same("sng" as never),
      strike: same("noStrike" as never),
      baseline: same(30),
    });
    const result = mixedRunToCaseTransform(run);
    expect(result.case).toBe("small-caps");
    expect(result.styles).toContain("underline");
    expect(result.styles).toContain("superscript");
    expect(result.styles).not.toContain("strikethrough");
  });

  it("converts back to RunProperties", () => {
    const update = caseTransformToRunUpdate({ case: "all-caps", styles: ["underline", "subscript"] });
    expect((update as Record<string, unknown>).caps).toBe("all");
    expect((update as Record<string, unknown>).underline).toBe("sng");
    expect((update as Record<string, unknown>).baseline).toBe(-25);
  });
});
