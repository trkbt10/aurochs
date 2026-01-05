/**
 * @file Tests for usePatternFill hook
 *
 * Tests pattern fill resolution.
 */

import type { PatternFill, PatternType } from "../../../../domain/color";
import type { ColorContext } from "../../../../domain/resolution";
import { resolvePatternFillForReact, isPatternSupported, getSupportedPatterns } from "./usePatternFill.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const testColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    accent1: "4F81BD",
  },
  colorMap: {
    tx1: "dk1",
    bg1: "lt1",
  },
};

function createMockGetNextId(): (prefix: string) => string {
  const counter = { value: 0 };
  return (prefix: string): string => `${prefix}-${counter.value++}`;
}

function createPatternFill(preset: PatternType): PatternFill {
  return {
    type: "patternFill",
    preset,
    foregroundColor: { spec: { type: "srgb", value: "000000" } },
    backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("resolvePatternFillForReact", () => {
  describe("undefined fill", () => {
    it("returns none for undefined fill", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolvePatternFillForReact(undefined, testColorContext, mockGetNextId);

      expect(result.isSupported).toBe(false);
      expect(result.fill).toBe("none");
      expect(result.defElement).toBeUndefined();
      expect(result.patternId).toBeUndefined();
    });
  });

  describe("supported patterns", () => {
    it("resolves smGrid pattern", () => {
      const mockGetNextId = createMockGetNextId();
      const fill = createPatternFill("smGrid");
      const result = resolvePatternFillForReact(fill, testColorContext, mockGetNextId);

      expect(result.isSupported).toBe(true);
      expect(result.fill).toBe("url(#pattern-0)");
      expect(result.defElement).toBeDefined();
      expect(result.patternId).toBe("pattern-0");
      expect(result.fgColor).toBe("000000");
      expect(result.bgColor).toBe("FFFFFF");
    });

    it("resolves lgCheck pattern", () => {
      const mockGetNextId = createMockGetNextId();
      const fill = createPatternFill("lgCheck");
      const result = resolvePatternFillForReact(fill, testColorContext, mockGetNextId);

      expect(result.isSupported).toBe(true);
      expect(result.fill).toContain("url(#pattern-");
    });

    it("resolves pct50 pattern", () => {
      const mockGetNextId = createMockGetNextId();
      const fill = createPatternFill("pct50");
      const result = resolvePatternFillForReact(fill, testColorContext, mockGetNextId);

      expect(result.isSupported).toBe(true);
    });

    it("resolves diagCross pattern", () => {
      const mockGetNextId = createMockGetNextId();
      const fill = createPatternFill("diagCross");
      const result = resolvePatternFillForReact(fill, testColorContext, mockGetNextId);

      expect(result.isSupported).toBe(true);
    });
  });

  describe("scheme colors", () => {
    it("resolves scheme colors in pattern fill", () => {
      const mockGetNextId = createMockGetNextId();
      const fill: PatternFill = {
        type: "patternFill",
        preset: "smGrid",
        foregroundColor: { spec: { type: "scheme", value: "dk1" } },
        backgroundColor: { spec: { type: "scheme", value: "lt1" } },
      };

      const result = resolvePatternFillForReact(fill, testColorContext, mockGetNextId);

      expect(result.fgColor).toBe("000000");
      expect(result.bgColor).toBe("FFFFFF");
    });
  });

  describe("unresolved colors", () => {
    it("handles unresolved foreground color", () => {
      const mockGetNextId = createMockGetNextId();
      // Use a context without the scheme color to simulate unresolved
      const limitedContext: ColorContext = {
        colorScheme: { lt1: "FFFFFF" },
        colorMap: {},
      };
      const fill: PatternFill = {
        type: "patternFill",
        preset: "smGrid",
        foregroundColor: { spec: { type: "scheme", value: "dk1" } },
        backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
      };

      const result = resolvePatternFillForReact(fill, limitedContext, mockGetNextId);

      expect(result.isSupported).toBe(false);
      expect(result.fill).toBe("#FFFFFF");
    });

    it("handles unresolved background color", () => {
      const mockGetNextId = createMockGetNextId();
      // Use a context without the scheme color to simulate unresolved
      const limitedContext: ColorContext = {
        colorScheme: { dk1: "000000" },
        colorMap: {},
      };
      const fill: PatternFill = {
        type: "patternFill",
        preset: "smGrid",
        foregroundColor: { spec: { type: "srgb", value: "000000" } },
        backgroundColor: { spec: { type: "scheme", value: "lt1" } },
      };

      const result = resolvePatternFillForReact(fill, limitedContext, mockGetNextId);

      expect(result.isSupported).toBe(false);
      expect(result.fill).toBe("none");
    });
  });
});

describe("isPatternSupported", () => {
  it("returns true for supported patterns", () => {
    expect(isPatternSupported("smGrid")).toBe(true);
    expect(isPatternSupported("lgCheck")).toBe(true);
    expect(isPatternSupported("pct50")).toBe(true);
    expect(isPatternSupported("diagCross")).toBe(true);
  });

  it("returns false for unsupported patterns", () => {
    // Some complex patterns may not be supported
    expect(isPatternSupported("sphere" as PatternType)).toBe(false);
    expect(isPatternSupported("weave" as PatternType)).toBe(false);
  });
});

describe("getSupportedPatterns", () => {
  it("returns array of supported patterns", () => {
    const patterns = getSupportedPatterns();

    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns).toContain("smGrid");
    expect(patterns).toContain("lgCheck");
  });
});
