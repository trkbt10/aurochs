/**
 * @file Unicode Script detection tests
 *
 * Verifies script detection based on Unicode Standard Annex #24.
 * @see https://www.unicode.org/reports/tr24/
 */
import { detectScriptFromText } from "./unicode-script";

describe("detectScriptFromText (UAX #24)", () => {
  describe("East Asian scripts", () => {
    it("detects CJK Unified Ideographs as eastAsian", () => {
      // U+4E00 - U+9FFF
      expect(detectScriptFromText("中文")).toBe("eastAsian");
      expect(detectScriptFromText("漢字")).toBe("eastAsian");
      expect(detectScriptFromText("一二三")).toBe("eastAsian");
    });

    it("detects Hiragana as eastAsian", () => {
      // U+3040 - U+309F
      expect(detectScriptFromText("あいうえお")).toBe("eastAsian");
      expect(detectScriptFromText("ひらがな")).toBe("eastAsian");
    });

    it("detects Katakana as eastAsian", () => {
      // U+30A0 - U+30FF
      expect(detectScriptFromText("アイウエオ")).toBe("eastAsian");
      expect(detectScriptFromText("カタカナ")).toBe("eastAsian");
    });

    it("detects Hangul as eastAsian", () => {
      // U+AC00 - U+D7AF (Hangul Syllables)
      expect(detectScriptFromText("한글")).toBe("eastAsian");
      expect(detectScriptFromText("안녕하세요")).toBe("eastAsian");
    });

    it("detects CJK Symbols and Punctuation as eastAsian", () => {
      // U+3000 - U+303F
      expect(detectScriptFromText("　")).toBe("eastAsian"); // U+3000 Ideographic Space
      expect(detectScriptFromText("「」")).toBe("eastAsian"); // U+300C, U+300D
    });

    it("detects Fullwidth forms as eastAsian", () => {
      // U+FF00 - U+FFEF
      expect(detectScriptFromText("１２３")).toBe("eastAsian");
      expect(detectScriptFromText("ＡＢＣ")).toBe("eastAsian");
    });
  });

  describe("Complex scripts", () => {
    it("detects Arabic as complexScript", () => {
      // U+0600 - U+06FF
      expect(detectScriptFromText("العربية")).toBe("complexScript");
      expect(detectScriptFromText("مرحبا")).toBe("complexScript");
    });

    it("detects Hebrew as complexScript", () => {
      // U+0590 - U+05FF
      expect(detectScriptFromText("עברית")).toBe("complexScript");
      expect(detectScriptFromText("שלום")).toBe("complexScript");
    });

    it("detects Devanagari as complexScript", () => {
      // U+0900 - U+097F
      expect(detectScriptFromText("हिन्दी")).toBe("complexScript");
      expect(detectScriptFromText("नमस्ते")).toBe("complexScript");
    });

    it("detects Thai as complexScript", () => {
      // U+0E00 - U+0E7F
      expect(detectScriptFromText("ภาษาไทย")).toBe("complexScript");
      expect(detectScriptFromText("สวัสดี")).toBe("complexScript");
    });

    it("detects Tamil as complexScript", () => {
      // U+0B80 - U+0BFF
      expect(detectScriptFromText("தமிழ்")).toBe("complexScript");
    });

    it("detects Bengali as complexScript", () => {
      // U+0980 - U+09FF
      expect(detectScriptFromText("বাংলা")).toBe("complexScript");
    });
  });

  describe("Latin scripts", () => {
    it("detects ASCII as latin", () => {
      expect(detectScriptFromText("Hello World")).toBe("latin");
      expect(detectScriptFromText("ABC 123")).toBe("latin");
    });

    it("detects Latin Extended as latin", () => {
      expect(detectScriptFromText("Café")).toBe("latin");
      expect(detectScriptFromText("naïve")).toBe("latin");
      expect(detectScriptFromText("résumé")).toBe("latin");
    });

    it("returns latin for empty string", () => {
      expect(detectScriptFromText("")).toBe("latin");
    });
  });

  describe("mixed content", () => {
    it("detects first non-ASCII script", () => {
      // Japanese with ASCII prefix
      expect(detectScriptFromText("Hello 世界")).toBe("eastAsian");
      // Arabic with ASCII prefix
      expect(detectScriptFromText("Test: مرحبا")).toBe("complexScript");
    });
  });
});
