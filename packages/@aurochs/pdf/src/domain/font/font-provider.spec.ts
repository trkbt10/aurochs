/**
 * @file FontProvider tests
 *
 * Tests for the central font resolution layer.
 */
import { describe, it, expect } from "vitest";
import { createFontProvider, createFontProviderForDocument } from "./font-provider";
import type { FontRegistrationInput, ResolvedFont, FontFallbackStrategy } from "./font-provider";

// =============================================================================
// Test fixtures
// =============================================================================

function createTestEmbeddedFont(overrides: Partial<FontRegistrationInput> = {}): FontRegistrationInput {
  return {
    fontFamily: "TestFont",
    baseFontName: "/ABCDEF+TestFont",
    format: "truetype",
    data: new Uint8Array([0x00, 0x01]),
    mimeType: "font/ttf",
    ...overrides,
  };
}

function createCIDFont(overrides: Partial<FontRegistrationInput> = {}): FontRegistrationInput {
  return createTestEmbeddedFont({
    fontFamily: "MS-Gothic",
    baseFontName: "/XYZABC+MS-Gothic",
    ordering: "Japan1",
    codeByteWidth: 2,
    toUnicode: {
      byteMapping: new Map([
        ["8140", "\u3042"], // あ
        ["8141", "\u3044"], // い
        ["8142", "\u3046"], // う
      ]),
      sourceCodeByteLengths: [2],
    },
    ...overrides,
  });
}

// =============================================================================
// Resolution priority tests
// =============================================================================

describe("FontProvider", () => {
  describe("resolve", () => {
    it("resolves embedded font by fontFamily with all properties", () => {
      const provider = createFontProvider({ embeddedFonts: [createTestEmbeddedFont()] });
      const resolved = provider.resolve("F1", "TestFont");

      expect(resolved.source).toBe("embedded");
      expect(resolved.cssFontFamily).toBe("TestFont");
      expect(resolved.pdfBaseFont).toBe("/ABCDEF+TestFont");
      expect(resolved.format).toBe("truetype");
      expect(resolved.data).toEqual(new Uint8Array([0x00, 0x01]));
      expect(resolved.codeByteWidth).toBe(1);
    });

    it("resolves embedded font by baseFontName with subset prefix stripped", () => {
      const provider = createFontProvider({ embeddedFonts: [createTestEmbeddedFont()] });
      const resolved = provider.resolve("F1", "ABCDEF+TestFont");

      // Subset prefix "ABCDEF+" is stripped for lookup → matches "TestFont"
      expect(resolved.source).toBe("embedded");
      expect(resolved.cssFontFamily).toBe("TestFont");
    });

    it("resolves embedded font by baseFontName with leading slash stripped", () => {
      const provider = createFontProvider({ embeddedFonts: [createTestEmbeddedFont()] });
      const resolved = provider.resolve("F1", "/ABCDEF+TestFont");

      // Leading "/" and subset prefix are both stripped for lookup
      expect(resolved.source).toBe("embedded");
      expect(resolved.cssFontFamily).toBe("TestFont");
    });

    it("resolves Standard 14 Helvetica to Arial per ISO 32000-1 Section 9.6.2.2", () => {
      // ISO 32000-1:2008 defines 14 standard fonts. Helvetica maps to
      // Arial for CSS rendering because Arial is the web-equivalent of Helvetica.
      const provider = createFontProvider({ embeddedFonts: [] });
      const resolved = provider.resolve("F1", "Helvetica");

      expect(resolved.source).toBe("standard14");
      expect(resolved.cssFontFamily).toBe("Arial");
      expect(resolved.pdfBaseFont).toBe("Helvetica");
      expect(resolved.codeByteWidth).toBe(1);
      expect(resolved.isBold).toBe(false);
      expect(resolved.isItalic).toBe(false);
    });

    it("resolves Standard 14 Helvetica-Bold with bold flag and prefix stripping", () => {
      const provider = createFontProvider({ embeddedFonts: [] });
      const resolved = provider.resolve("F1", "ABCDEF+Helvetica-Bold");

      expect(resolved.source).toBe("standard14");
      expect(resolved.cssFontFamily).toBe("Arial");
      expect(resolved.pdfBaseFont).toBe("Helvetica-Bold");
      expect(resolved.isBold).toBe(true);
      expect(resolved.isItalic).toBe(false);
    });

    it("prioritizes embedded font over Standard 14 with same name", () => {
      const helveticaFont = createTestEmbeddedFont({
        fontFamily: "Helvetica",
        baseFontName: "/ABCDEF+Helvetica",
      });
      const provider = createFontProvider({ embeddedFonts: [helveticaFont] });
      const resolved = provider.resolve("F1", "Helvetica");

      // Embedded font takes priority over Standard 14 mapping
      expect(resolved.source).toBe("embedded");
      expect(resolved.cssFontFamily).toBe("Helvetica");
    });

    it("resolves system font when registered with all properties", () => {
      const provider = createFontProvider({ embeddedFonts: [] });
      provider.registerSystemFont(
        "MySystemFont",
        new Uint8Array([0x00]),
        "truetype",
        "font/ttf",
      );

      const resolved = provider.resolve("F1", "MySystemFont");
      expect(resolved.source).toBe("system");
      expect(resolved.cssFontFamily).toBe("MySystemFont");
      expect(resolved.pdfBaseFont).toBe("MySystemFont");
      expect(resolved.format).toBe("truetype");
      expect(resolved.data).toEqual(new Uint8Array([0x00]));
    });

    it("returns best-effort fallback for unknown font (never undefined)", () => {
      const provider = createFontProvider({ embeddedFonts: [] });
      const resolved = provider.resolve("F1", "NonExistentFont");

      expect(resolved.source).toBe("system");
      expect(resolved.cssFontFamily).toBe("NonExistentFont");
      expect(resolved.pdfBaseFont).toBe("NonExistentFont");
      expect(resolved.codeByteWidth).toBe(1);
      expect(resolved.isBold).toBe(false);
      expect(resolved.isItalic).toBe(false);
    });

    it("resolves CID font with ordering, codeByteWidth, and complete ToUnicode", () => {
      const provider = createFontProvider({ embeddedFonts: [createCIDFont()] });
      const resolved = provider.resolve("F1", "MS-Gothic");

      expect(resolved.source).toBe("embedded");
      expect(resolved.codeByteWidth).toBe(2);
      expect(resolved.ordering).toBe("Japan1");
      // Verify the full ToUnicode mapping is preserved (not just one entry)
      expect(resolved.toUnicode).toBeDefined();
      expect(resolved.toUnicode!.byteMapping.size).toBe(3);
      expect(resolved.toUnicode!.byteMapping.get("8140")).toBe("\u3042"); // あ
      expect(resolved.toUnicode!.byteMapping.get("8141")).toBe("\u3044"); // い
      expect(resolved.toUnicode!.byteMapping.get("8142")).toBe("\u3046"); // う
      expect(resolved.toUnicode!.sourceCodeByteLengths).toEqual([2]);
    });
  });

  describe("isAvailable", () => {
    it("returns true for embedded fonts", () => {
      const provider = createFontProvider({ embeddedFonts: [createTestEmbeddedFont()] });
      expect(provider.isAvailable("TestFont")).toBe(true);
    });

    it("returns true for Standard 14 fonts", () => {
      const provider = createFontProvider({ embeddedFonts: [] });
      expect(provider.isAvailable("Helvetica")).toBe(true);
      expect(provider.isAvailable("Times-Roman")).toBe(true);
    });

    it("returns false for unknown fonts", () => {
      const provider = createFontProvider({ embeddedFonts: [] });
      expect(provider.isAvailable("NonExistentFont")).toBe(false);
    });
  });

  describe("getAllFontFaceCss", () => {
    it("generates @font-face CSS for embedded fonts", () => {
      const provider = createFontProvider({ embeddedFonts: [createTestEmbeddedFont()] });
      const css = provider.getAllFontFaceCss();

      expect(css).toContain("@font-face");
      expect(css).toContain("TestFont");
      expect(css).toContain("font/ttf");
    });

    it("generates @font-face CSS for system fonts with data", () => {
      const provider = createFontProvider({ embeddedFonts: [] });
      provider.registerSystemFont(
        "MyFont",
        new Uint8Array([0x00]),
        "truetype",
        "font/ttf",
      );
      const css = provider.getAllFontFaceCss();

      expect(css).toContain("@font-face");
      expect(css).toContain("MyFont");
    });
  });

  describe("createFontProviderForDocument", () => {
    it("creates provider from document with embedded fonts", () => {
      const provider = createFontProviderForDocument({
        embeddedFonts: [createTestEmbeddedFont()],
      });
      expect(provider.resolve("F1", "TestFont")).toBeDefined();
    });

    it("creates provider from document without embedded fonts", () => {
      const provider = createFontProviderForDocument({});
      // Standard 14 should still work
      expect(provider.resolve("F1", "Helvetica")).toBeDefined();
    });
  });

  describe("resolveFallback", () => {
    it("default strategy returns Helvetica (Standard 14)", () => {
      const cidFont = createCIDFont();
      const provider = createFontProvider({ embeddedFonts: [cidFont] });
      const primaryResolved = provider.resolve("F1", "MS-Gothic");

      const fallback = provider.resolveFallback("X", primaryResolved);
      expect(fallback).toBeDefined();
      expect(fallback!.source).toBe("standard14");
      expect(fallback!.cssFontFamily).toBe("Arial"); // Helvetica → Arial
      expect(fallback!.pdfBaseFont).toBe("Helvetica");
    });

    it("custom fallback strategy is invoked (DI)", () => {
      const customFont: ResolvedFont = {
        source: "system",
        cssFontFamily: "Noto Sans CJK",
        pdfBaseFont: "NotoSansCJK",
        codeByteWidth: 1,
        isBold: false,
        isItalic: false,
      };

      const customStrategy: FontFallbackStrategy = (_text, _primary, _provider) => customFont;

      const provider = createFontProvider({
        embeddedFonts: [createCIDFont()],
        fallbackStrategy: customStrategy,
      });
      const primaryResolved = provider.resolve("F1", "MS-Gothic");

      const fallback = provider.resolveFallback("\u9F8D", primaryResolved);
      expect(fallback).toBeDefined();
      expect(fallback!.cssFontFamily).toBe("Noto Sans CJK");
    });

    it("custom strategy can return undefined (no fallback available)", () => {
      const noFallback: FontFallbackStrategy = () => undefined;

      const provider = createFontProvider({
        embeddedFonts: [],
        fallbackStrategy: noFallback,
      });
      const primary = provider.resolve("F1", "Helvetica");

      const fallback = provider.resolveFallback("\u9F8D", primary);
      expect(fallback).toBeUndefined();
    });
  });
});
