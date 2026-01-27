/**
 * @file Unit tests for mixed-properties
 */

import { describe, it, expect } from "vitest";
import {
  extractCommonProperty,
  extractMixedRunProperties,
  extractMixedParagraphProperties,
  getExtractionValue,
  isMixed,
  hasValue,
  isNotApplicable,
  mergeRunProperties,
  areRunPropertiesEqual,
} from "./mixed-properties";
import type { RunProperties, ParagraphProperties } from "@oxen/pptx/domain/text";
import type { Points, Pixels } from "@oxen/ooxml/domain/units";

describe("extractCommonProperty", () => {
  it("returns notApplicable for empty array", () => {
    const result = extractCommonProperty([]);
    expect(result).toEqual({ type: "notApplicable" });
  });

  it("returns notApplicable when all values are undefined", () => {
    const result = extractCommonProperty([undefined, undefined, undefined]);
    expect(result).toEqual({ type: "notApplicable" });
  });

  it("returns same when all defined values are equal (primitives)", () => {
    const result = extractCommonProperty([true, true, true]);
    expect(result).toEqual({ type: "same", value: true });
  });

  it("returns same when single value is defined", () => {
    const result = extractCommonProperty([undefined, 12, undefined]);
    expect(result).toEqual({ type: "same", value: 12 });
  });

  it("returns mixed when values differ", () => {
    const result = extractCommonProperty([true, false, true]);
    expect(result).toEqual({ type: "mixed" });
  });

  it("returns same for equal objects", () => {
    const obj = { type: "solid" as const, color: "red" };
    const result = extractCommonProperty([obj, { type: "solid" as const, color: "red" }]);
    expect(result).toEqual({ type: "same", value: obj });
  });

  it("returns mixed for different objects", () => {
    const result = extractCommonProperty([
      { type: "solid" as const, color: "red" },
      { type: "solid" as const, color: "blue" },
    ]);
    expect(result).toEqual({ type: "mixed" });
  });

  it("returns same for equal arrays", () => {
    const result = extractCommonProperty([
      [1, 2, 3],
      [1, 2, 3],
    ]);
    expect(result).toEqual({ type: "same", value: [1, 2, 3] });
  });

  it("returns mixed for different arrays", () => {
    const result = extractCommonProperty([
      [1, 2, 3],
      [1, 2, 4],
    ]);
    expect(result).toEqual({ type: "mixed" });
  });
});

describe("extractMixedRunProperties", () => {
  it("extracts same values when all runs have identical properties", () => {
    const runs: RunProperties[] = [
      { fontSize: 12 as Points, bold: true },
      { fontSize: 12 as Points, bold: true },
    ];

    const result = extractMixedRunProperties(runs);

    expect(result.fontSize).toEqual({ type: "same", value: 12 });
    expect(result.bold).toEqual({ type: "same", value: true });
  });

  it("extracts mixed when runs have different values", () => {
    const runs: RunProperties[] = [
      { fontSize: 12 as Points, bold: true },
      { fontSize: 14 as Points, bold: false },
    ];

    const result = extractMixedRunProperties(runs);

    expect(result.fontSize).toEqual({ type: "mixed" });
    expect(result.bold).toEqual({ type: "mixed" });
  });

  it("returns notApplicable for undefined properties", () => {
    const runs: RunProperties[] = [
      { fontSize: 12 as Points },
      { fontSize: 12 as Points },
    ];

    const result = extractMixedRunProperties(runs);

    expect(result.fontSize).toEqual({ type: "same", value: 12 });
    expect(result.bold).toEqual({ type: "notApplicable" });
  });

  it("handles mixed defined and undefined values", () => {
    const runs: RunProperties[] = [
      { fontSize: 12 as Points, bold: true },
      { fontSize: 12 as Points },
    ];

    const result = extractMixedRunProperties(runs);

    expect(result.fontSize).toEqual({ type: "same", value: 12 });
    expect(result.bold).toEqual({ type: "same", value: true });
  });

  it("handles empty array", () => {
    const result = extractMixedRunProperties([]);

    expect(result.fontSize).toEqual({ type: "notApplicable" });
    expect(result.bold).toEqual({ type: "notApplicable" });
  });
});

describe("extractMixedParagraphProperties", () => {
  it("extracts same values when all paragraphs have identical properties", () => {
    const paras: ParagraphProperties[] = [
      { alignment: "center", level: 0 },
      { alignment: "center", level: 0 },
    ];

    const result = extractMixedParagraphProperties(paras);

    expect(result.alignment).toEqual({ type: "same", value: "center" });
    expect(result.level).toEqual({ type: "same", value: 0 });
  });

  it("extracts mixed when paragraphs have different values", () => {
    const paras: ParagraphProperties[] = [
      { alignment: "left", level: 0 },
      { alignment: "center", level: 1 },
    ];

    const result = extractMixedParagraphProperties(paras);

    expect(result.alignment).toEqual({ type: "mixed" });
    expect(result.level).toEqual({ type: "mixed" });
  });

  it("returns notApplicable for undefined properties", () => {
    const paras: ParagraphProperties[] = [
      { alignment: "left" },
      { alignment: "left" },
    ];

    const result = extractMixedParagraphProperties(paras);

    expect(result.alignment).toEqual({ type: "same", value: "left" });
    expect(result.level).toEqual({ type: "notApplicable" });
  });
});

describe("helper functions", () => {
  describe("getExtractionValue", () => {
    it("returns value for same extraction", () => {
      expect(getExtractionValue({ type: "same", value: 12 })).toBe(12);
    });

    it("returns undefined for mixed extraction", () => {
      expect(getExtractionValue({ type: "mixed" })).toBeUndefined();
    });

    it("returns undefined for notApplicable extraction", () => {
      expect(getExtractionValue({ type: "notApplicable" })).toBeUndefined();
    });
  });

  describe("isMixed", () => {
    it("returns true for mixed", () => {
      expect(isMixed({ type: "mixed" })).toBe(true);
    });

    it("returns false for same", () => {
      expect(isMixed({ type: "same", value: 12 })).toBe(false);
    });

    it("returns false for notApplicable", () => {
      expect(isMixed({ type: "notApplicable" })).toBe(false);
    });
  });

  describe("hasValue", () => {
    it("returns true for same", () => {
      expect(hasValue({ type: "same", value: 12 })).toBe(true);
    });

    it("returns false for mixed", () => {
      expect(hasValue({ type: "mixed" })).toBe(false);
    });

    it("returns false for notApplicable", () => {
      expect(hasValue({ type: "notApplicable" })).toBe(false);
    });
  });

  describe("isNotApplicable", () => {
    it("returns true for notApplicable", () => {
      expect(isNotApplicable({ type: "notApplicable" })).toBe(true);
    });

    it("returns false for same", () => {
      expect(isNotApplicable({ type: "same", value: 12 })).toBe(false);
    });

    it("returns false for mixed", () => {
      expect(isNotApplicable({ type: "mixed" })).toBe(false);
    });
  });
});

describe("mergeRunProperties", () => {
  it("merges update into existing properties", () => {
    const existing: RunProperties = { fontSize: 12 as Points, bold: true };
    const update: Partial<RunProperties> = { italic: true };

    const result = mergeRunProperties(existing, update);

    expect(result).toEqual({ fontSize: 12, bold: true, italic: true });
  });

  it("overwrites existing values", () => {
    const existing: RunProperties = { fontSize: 12 as Points, bold: true };
    const update: Partial<RunProperties> = { fontSize: 14 as Points };

    const result = mergeRunProperties(existing, update);

    expect(result).toEqual({ fontSize: 14, bold: true });
  });

  it("handles undefined existing properties", () => {
    const update: Partial<RunProperties> = { fontSize: 12 as Points };

    const result = mergeRunProperties(undefined, update);

    expect(result).toEqual({ fontSize: 12 });
  });

  it("preserves existing when update is empty", () => {
    const existing: RunProperties = { fontSize: 12 as Points };

    const result = mergeRunProperties(existing, {});

    expect(result).toEqual({ fontSize: 12 });
  });
});

describe("areRunPropertiesEqual", () => {
  it("returns true for identical properties", () => {
    const a: RunProperties = { fontSize: 12 as Points, bold: true };
    const b: RunProperties = { fontSize: 12 as Points, bold: true };

    expect(areRunPropertiesEqual(a, b)).toBe(true);
  });

  it("returns false for different properties", () => {
    const a: RunProperties = { fontSize: 12 as Points, bold: true };
    const b: RunProperties = { fontSize: 12 as Points, bold: false };

    expect(areRunPropertiesEqual(a, b)).toBe(false);
  });

  it("returns true for both undefined", () => {
    expect(areRunPropertiesEqual(undefined, undefined)).toBe(true);
  });

  it("returns false for one undefined", () => {
    const a: RunProperties = { fontSize: 12 as Points };

    expect(areRunPropertiesEqual(a, undefined)).toBe(false);
    expect(areRunPropertiesEqual(undefined, a)).toBe(false);
  });

  it("handles nested objects", () => {
    const a: RunProperties = {
      fontSize: 12 as Points,
      color: { spec: { type: "srgb", value: "FF0000" } },
    };
    const b: RunProperties = {
      fontSize: 12 as Points,
      color: { spec: { type: "srgb", value: "FF0000" } },
    };

    expect(areRunPropertiesEqual(a, b)).toBe(true);
  });
});
