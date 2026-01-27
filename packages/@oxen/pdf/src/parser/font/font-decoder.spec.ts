/**
 * @file Tests for PDF font decoder
 *
 * Tests ToUnicode CMap parsing and text decoding.
 * PDF Reference 9.10.3 - ToUnicode CMaps
 * PDF Reference 5.2-5.7 - Font metrics
 */

import { decodeText, DEFAULT_FONT_METRICS, type FontMapping, type FontInfo, type FontMappings, type FontMetrics } from "../../domain/font";
import { extractFontInfoWithDeps, logExtractionErrors, type ExtractFontInfoDeps, type FontExtractionResult } from "./font-decoder";

function createConsoleWarnSpy(): Readonly<{
  readonly calls: readonly ReadonlyArray<unknown>[];
  readonly restore: () => void;
}> {
  const calls: ReadonlyArray<unknown>[] = [];
  const original = console.warn;

  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };

  const restore = (): void => {
    console.warn = original;
  };

  return { calls, restore };
}

describe("font-decoder", () => {
  describe("decodeText", () => {
    describe("single-byte font encoding", () => {
      it("decodes ASCII text with simple mapping", () => {
        const mapping: FontMapping = new Map([
          [65, "A"], // 0x41
          [66, "B"], // 0x42
          [67, "C"], // 0x43
        ]);
        const fontInfo: FontInfo = { mapping, codeByteWidth: 1, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["TestFont", fontInfo]]);

        // Raw text with character codes 65, 66, 67
        const rawText = "ABC";
        const result = decodeText(rawText, "TestFont", mappings);
        expect(result).toBe("ABC");
      });

      it("passes through unmapped characters", () => {
        const mapping: FontMapping = new Map([[65, "X"]]);
        const fontInfo: FontInfo = { mapping, codeByteWidth: 1, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["TestFont", fontInfo]]);

        const rawText = "ABC";
        const result = decodeText(rawText, "TestFont", mappings);
        expect(result).toBe("XBC");
      });

      it("returns raw text when no mapping found", () => {
        const mappings: FontMappings = new Map();

        const rawText = "Hello";
        const result = decodeText(rawText, "UnknownFont", mappings);
        expect(result).toBe("Hello");
      });

      it("matches font by subset prefix removal", () => {
        const mapping: FontMapping = new Map([[65, "Z"]]);
        const fontInfo: FontInfo = { mapping, codeByteWidth: 1, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["Arial", fontInfo]]);

        const rawText = "A";
        // Font name with subset prefix like "XGIAKD+Arial"
        const result = decodeText(rawText, "XGIAKD+Arial", mappings);
        expect(result).toBe("Z");
      });

      it("removes leading slash from font name", () => {
        const mapping: FontMapping = new Map([[65, "Y"]]);
        const fontInfo: FontInfo = { mapping, codeByteWidth: 1, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["TestFont", fontInfo]]);

        const rawText = "A";
        const result = decodeText(rawText, "/TestFont", mappings);
        expect(result).toBe("Y");
      });
    });

    describe("two-byte font encoding (CID fonts)", () => {
      it("decodes 2-byte character codes as big-endian", () => {
        // CID font with 2-byte codes
        // <0057> -> 'W' (code 87 in big-endian: 0x00 0x57)
        const mapping: FontMapping = new Map([
          [0x0057, "W"],
          [0x0065, "e"],
          [0x0062, "b"],
        ]);
        // codeByteWidth: 2 indicates this font uses 2-byte character codes
        const fontInfo: FontInfo = { mapping, codeByteWidth: 2, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["CIDFont", fontInfo]]);

        // Raw text is byte sequence: 0x00 0x57 0x00 0x65 0x00 0x62
        // When parsed as string: "\x00W\x00e\x00b"
        const rawText = "\x00W\x00e\x00b";
        const result = decodeText(rawText, "CIDFont", mappings);
        expect(result).toBe("Web");
      });

      it("handles mixed ASCII and non-ASCII in 2-byte encoding", () => {
        const mapping: FontMapping = new Map([
          [0x0041, "A"],
          [0x3042, "あ"], // Hiragana "a"
        ]);
        const fontInfo: FontInfo = { mapping, codeByteWidth: 2, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["CIDFont", fontInfo]]);

        // Raw: 0x00 0x41 0x30 0x42
        const rawText = "\x00A\x30B";
        const result = decodeText(rawText, "CIDFont", mappings);
        expect(result).toBe("Aあ");
      });
    });

    describe("edge cases", () => {
      it("handles empty string", () => {
        const mapping: FontMapping = new Map([[65, "A"]]);
        const fontInfo: FontInfo = { mapping, codeByteWidth: 1, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["TestFont", fontInfo]]);

        const result = decodeText("", "TestFont", mappings);
        expect(result).toBe("");
      });

      it("handles empty mapping", () => {
        const mapping: FontMapping = new Map();
        const fontInfo: FontInfo = { mapping, codeByteWidth: 1, metrics: DEFAULT_FONT_METRICS };
        const mappings: FontMappings = new Map([["TestFont", fontInfo]]);

        const result = decodeText("ABC", "TestFont", mappings);
        expect(result).toBe("ABC");
      });
    });
  });

  describe("FontMetrics", () => {
    describe("DEFAULT_FONT_METRICS", () => {
      it("has default width of 500 (half em-width)", () => {
        expect(DEFAULT_FONT_METRICS.defaultWidth).toBe(500);
      });

      it("has typical ascender of 800", () => {
        expect(DEFAULT_FONT_METRICS.ascender).toBe(800);
      });

      it("has typical descender of -200", () => {
        expect(DEFAULT_FONT_METRICS.descender).toBe(-200);
      });

      it("has empty widths map", () => {
        expect(DEFAULT_FONT_METRICS.widths.size).toBe(0);
      });
    });

    describe("FontMetrics type", () => {
      it("supports custom glyph widths", () => {
        const metrics: FontMetrics = {
          widths: new Map([
            [65, 600], // 'A'
            [66, 550], // 'B'
            [32, 200], // space
          ]),
          defaultWidth: 500,
          ascender: 850,
          descender: -150,
        };

        expect(metrics.widths.get(65)).toBe(600);
        expect(metrics.widths.get(66)).toBe(550);
        expect(metrics.widths.get(32)).toBe(200);
      });

      it("supports CID font metrics with 2-byte codes", () => {
        const metrics: FontMetrics = {
          widths: new Map([
            [0x3042, 1000], // あ
            [0x3044, 1000], // い
            [0x0041, 500], // A
          ]),
          defaultWidth: 1000, // CID fonts typically use 1000 as default
          ascender: 880,
          descender: -120,
        };

        expect(metrics.widths.get(0x3042)).toBe(1000);
        expect(metrics.defaultWidth).toBe(1000);
      });
    });
  });

  describe("extractFontInfoWithDeps", () => {
    type FakePage = { readonly pageId: string };
    type FakeResources = { readonly resourcesId: string };

    const TO_UNICODE = {
      mapping: new Map<number, string>([[0x41, "A"]]),
      codeByteWidth: 1 as const,
    };

    const METRICS: FontMetrics = {
      widths: new Map(),
      defaultWidth: 500,
      ascender: 800,
      descender: -200,
    };

    it("handles ToUnicode success + metrics failure", () => {
      const deps = {
        getPageResources: (): FakeResources => ({ resourcesId: "r1" }),
        extractToUnicode: () => TO_UNICODE,
        extractFontMetrics: () => {
          throw new Error("metrics broken");
        },
      } satisfies ExtractFontInfoDeps<FakePage, FakeResources>;

      const result = extractFontInfoWithDeps({ pageId: "p1" }, "F1", deps);

      expect(result.toUnicode).toEqual(TO_UNICODE);
      expect(result.metrics).toBeNull();
      expect(result.errors).toEqual([
        "Failed to extract metrics for F1: metrics broken",
      ]);
    });

    it("handles ToUnicode failure + metrics success", () => {
      const deps = {
        getPageResources: (): FakeResources => ({ resourcesId: "r1" }),
        extractToUnicode: () => {
          throw new Error("cmap broken");
        },
        extractFontMetrics: () => METRICS,
      } satisfies ExtractFontInfoDeps<FakePage, FakeResources>;

      const result = extractFontInfoWithDeps({ pageId: "p1" }, "F1", deps);

      expect(result.toUnicode).toBeNull();
      expect(result.metrics).toEqual(METRICS);
      expect(result.errors).toEqual([
        "Failed to extract ToUnicode for F1: cmap broken",
      ]);
    });

    it("handles both success", () => {
      const deps = {
        getPageResources: (): FakeResources => ({ resourcesId: "r1" }),
        extractToUnicode: () => TO_UNICODE,
        extractFontMetrics: () => METRICS,
      } satisfies ExtractFontInfoDeps<FakePage, FakeResources>;

      const result = extractFontInfoWithDeps({ pageId: "p1" }, "F1", deps);

      expect(result.toUnicode).toEqual(TO_UNICODE);
      expect(result.metrics).toEqual(METRICS);
      expect(result.errors).toEqual([]);
    });

    it("handles both failure", () => {
      const deps = {
        getPageResources: (): FakeResources => ({ resourcesId: "r1" }),
        extractToUnicode: () => {
          throw new Error("cmap broken");
        },
        extractFontMetrics: () => {
          throw new Error("metrics broken");
        },
      } satisfies ExtractFontInfoDeps<FakePage, FakeResources>;

      const result = extractFontInfoWithDeps({ pageId: "p1" }, "F1", deps);

      expect(result.toUnicode).toBeNull();
      expect(result.metrics).toBeNull();
      expect(result.errors).toEqual([
        "Failed to extract ToUnicode for F1: cmap broken",
        "Failed to extract metrics for F1: metrics broken",
      ]);
    });

    it("handles resources failure", () => {
      const deps = {
        getPageResources: () => {
          throw new Error("resources broken");
        },
        extractToUnicode: () => TO_UNICODE,
        extractFontMetrics: () => METRICS,
      } satisfies ExtractFontInfoDeps<FakePage, FakeResources>;

      const result = extractFontInfoWithDeps({ pageId: "p1" }, "F1", deps);

      expect(result.toUnicode).toBeNull();
      expect(result.metrics).toBeNull();
      expect(result.errors).toEqual([
        "Failed to get page resources: resources broken",
      ]);
    });
  });

  describe("logExtractionErrors", () => {
    it("does not log when no errors", () => {
      const warn = createConsoleWarnSpy();
      const result: FontExtractionResult = { toUnicode: null, metrics: null, ordering: null, encoding: null, isBold: false, isItalic: false, baseFont: null, errors: [] };

      logExtractionErrors(result, "F1");

      expect(warn.calls).toHaveLength(0);
      warn.restore();
    });

    it("logs partial extraction summary", () => {
      const warn = createConsoleWarnSpy();
      const result: FontExtractionResult = {
        toUnicode: { mapping: new Map(), codeByteWidth: 1 },
        metrics: null,
        ordering: null,
        encoding: null,
        isBold: false,
        isItalic: false,
        baseFont: null,
        errors: ["Failed to extract metrics for F1: metrics broken"],
      };

      logExtractionErrors(result, "F1");

      expect(warn.calls).toEqual([
        ["[PDF Font] Partial extraction for \"F1\": succeeded: [ToUnicode], failed: 1 operation(s)"],
      ]);
      warn.restore();
    });

    it("logs complete extraction failure summary with messages", () => {
      const warn = createConsoleWarnSpy();
      const result: FontExtractionResult = {
        toUnicode: null,
        metrics: null,
        ordering: null,
        encoding: null,
        isBold: false,
        isItalic: false,
        baseFont: null,
        errors: [
          "Failed to extract ToUnicode for F1: cmap broken",
          "Failed to extract metrics for F1: metrics broken",
        ],
      };

      logExtractionErrors(result, "F1");

      expect(warn.calls).toEqual([
        [
          "[PDF Font] Complete extraction failure for \"F1\": " +
            "Failed to extract ToUnicode for F1: cmap broken; " +
            "Failed to extract metrics for F1: metrics broken",
        ],
      ]);
      warn.restore();
    });
  });
});
