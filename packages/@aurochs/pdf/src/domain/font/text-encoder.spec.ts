/**
 * @file Text encoder tests
 *
 * Tests for re-encoding Unicode text to PDF byte sequences.
 */
import { describe, it, expect } from "vitest";
import { buildReverseToUnicodeMap, encodeTextForFont, hexStringToUint8Array, splitTextByEncodability } from "./text-encoder";
import type { ResolvedFont } from "./font-provider";

// =============================================================================
// buildReverseToUnicodeMap
// =============================================================================

describe("buildReverseToUnicodeMap", () => {
  it("builds reverse mapping from forward ToUnicode map", () => {
    const forward = new Map([
      ["8140", "\u3042"], // あ
      ["8141", "\u3044"], // い
      ["8142", "\u3046"], // う
    ]);

    const reverse = buildReverseToUnicodeMap(forward);

    expect(reverse.get("\u3042")).toBe("8140");
    expect(reverse.get("\u3044")).toBe("8141");
    expect(reverse.get("\u3046")).toBe("8142");
  });

  it("first mapping wins when multiple sources map to same unicode", () => {
    const forward = new Map([
      ["0041", "A"],
      ["0061", "A"], // duplicate unicode target
    ]);

    const reverse = buildReverseToUnicodeMap(forward);

    // First mapping "0041" → "A" should win
    expect(reverse.get("A")).toBe("0041");
  });

  it("normalizes hex to uppercase", () => {
    const forward = new Map([
      ["abcd", "X"],
    ]);

    const reverse = buildReverseToUnicodeMap(forward);
    expect(reverse.get("X")).toBe("ABCD");
  });

  it("returns empty map for empty input", () => {
    const reverse = buildReverseToUnicodeMap(new Map());
    expect(reverse.size).toBe(0);
  });
});

// =============================================================================
// hexStringToUint8Array
// =============================================================================

describe("hexStringToUint8Array", () => {
  it("converts hex string to bytes", () => {
    const result = hexStringToUint8Array("8140AB");
    expect(result).toEqual(new Uint8Array([0x81, 0x40, 0xAB]));
  });

  it("handles empty string", () => {
    const result = hexStringToUint8Array("");
    expect(result).toEqual(new Uint8Array(0));
  });
});

// =============================================================================
// encodeTextForFont
// =============================================================================

describe("encodeTextForFont", () => {
  describe("CID fonts (codeByteWidth=2)", () => {
    const cidFont: ResolvedFont = {
      source: "embedded",
      cssFontFamily: "MS-Gothic",
      pdfBaseFont: "/ABCDEF+MS-Gothic",
      codeByteWidth: 2,
      ordering: "Japan1",
      toUnicode: {
        byteMapping: new Map([
          ["8140", "\u3042"], // あ
          ["8141", "\u3044"], // い
          ["8142", "\u3046"], // う
        ]),
        sourceCodeByteLengths: [2],
      },
      isBold: false,
      isItalic: false,
    };

    it("encodes text using reverse ToUnicode map", () => {
      const result = encodeTextForFont("\u3042\u3044\u3046", cidFont);

      expect(result).not.toBeNull();
      expect(result!.codeByteWidth).toBe(2);
      expect(result!.rawBytes).toEqual(new Uint8Array([0x81, 0x40, 0x81, 0x41, 0x81, 0x42]));
    });

    it("returns null when character is not in ToUnicode map", () => {
      const result = encodeTextForFont("\u3048", cidFont); // え — not in map
      expect(result).toBeNull();
    });

    it("returns null when font has no ToUnicode", () => {
      const noToUnicode: ResolvedFont = { ...cidFont, toUnicode: undefined };
      const result = encodeTextForFont("\u3042", noToUnicode);
      expect(result).toBeNull();
    });

    it("handles empty text", () => {
      const result = encodeTextForFont("", cidFont);
      expect(result).not.toBeNull();
      expect(result!.rawBytes.length).toBe(0);
    });
  });

  describe("single-byte fonts (WinAnsiEncoding)", () => {
    const winAnsiFont: ResolvedFont = {
      source: "standard14",
      cssFontFamily: "Arial",
      pdfBaseFont: "Helvetica",
      codeByteWidth: 1,
      isBold: false,
      isItalic: false,
    };

    it("encodes ASCII text", () => {
      const result = encodeTextForFont("Hello", winAnsiFont);

      expect(result).not.toBeNull();
      expect(result!.codeByteWidth).toBe(1);
      // H=0x48, e=0x65, l=0x6C, l=0x6C, o=0x6F
      expect(result!.rawBytes).toEqual(new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]));
    });

    it("encodes WinAnsi special characters", () => {
      const result = encodeTextForFont("\u00E9", winAnsiFont); // é
      expect(result).not.toBeNull();
      expect(result!.rawBytes).toEqual(new Uint8Array([0xE9]));
    });

    it("returns null for characters outside WinAnsi range", () => {
      const result = encodeTextForFont("\u3042", winAnsiFont); // あ — not in WinAnsi
      expect(result).toBeNull();
    });

    it("handles empty text", () => {
      const result = encodeTextForFont("", winAnsiFont);
      expect(result).not.toBeNull();
      expect(result!.rawBytes.length).toBe(0);
    });
  });

  describe("round-trip: encode then verify", () => {
    it("CID encoded bytes match original ToUnicode mapping", () => {
      const toUnicode = new Map([
        ["0041", "A"],
        ["0042", "B"],
        ["0043", "C"],
      ]);

      const font: ResolvedFont = {
        source: "embedded",
        cssFontFamily: "Test",
        pdfBaseFont: "Test",
        codeByteWidth: 2,
        toUnicode: { byteMapping: toUnicode, sourceCodeByteLengths: [2] },
        isBold: false,
        isItalic: false,
      };

      const encoded = encodeTextForFont("ABC", font);
      expect(encoded).not.toBeNull();

      // Verify each character maps back through the forward mapping
      const bytes = encoded!.rawBytes;
      for (let i = 0; i < 3; i++) {
        const hex = bytes[i * 2].toString(16).padStart(2, "0").toUpperCase()
          + bytes[i * 2 + 1].toString(16).padStart(2, "0").toUpperCase();
        expect(toUnicode.get(hex)).toBe("ABC"[i]);
      }
    });
  });
});

// =============================================================================
// splitTextByEncodability
// =============================================================================

describe("splitTextByEncodability", () => {
  describe("CID fonts", () => {
    const cidFont: ResolvedFont = {
      source: "embedded",
      cssFontFamily: "Test-CJK",
      pdfBaseFont: "Test-CJK",
      codeByteWidth: 2,
      toUnicode: {
        byteMapping: new Map([
          ["8140", "\u3042"], // あ
          ["8141", "\u3044"], // い
          ["8142", "\u3046"], // う
        ]),
        sourceCodeByteLengths: [2],
      },
      isBold: false,
      isItalic: false,
    };

    it("all encodable → single encodable run", () => {
      const runs = splitTextByEncodability("\u3042\u3044\u3046", cidFont);
      expect(runs).toEqual([{ text: "\u3042\u3044\u3046", encodable: true }]);
    });

    it("all non-encodable → single non-encodable run", () => {
      const runs = splitTextByEncodability("ABC", cidFont);
      expect(runs).toEqual([{ text: "ABC", encodable: false }]);
    });

    it("mixed → split into runs", () => {
      // あ(encodable) + X(not) + い(encodable)
      const runs = splitTextByEncodability("\u3042X\u3044", cidFont);
      expect(runs).toEqual([
        { text: "\u3042", encodable: true },
        { text: "X", encodable: false },
        { text: "\u3044", encodable: true },
      ]);
    });

    it("consecutive non-encodable characters merge into one run", () => {
      const runs = splitTextByEncodability("XYZ\u3042", cidFont);
      expect(runs).toEqual([
        { text: "XYZ", encodable: false },
        { text: "\u3042", encodable: true },
      ]);
    });

    it("no ToUnicode → entire text is non-encodable", () => {
      const noTU: ResolvedFont = { ...cidFont, toUnicode: undefined };
      const runs = splitTextByEncodability("\u3042", noTU);
      expect(runs).toEqual([{ text: "\u3042", encodable: false }]);
    });

    it("empty text → empty array", () => {
      expect(splitTextByEncodability("", cidFont)).toEqual([]);
    });
  });

  describe("single-byte fonts (WinAnsi)", () => {
    const winAnsiFont: ResolvedFont = {
      source: "standard14",
      cssFontFamily: "Arial",
      pdfBaseFont: "Helvetica",
      codeByteWidth: 1,
      isBold: false,
      isItalic: false,
    };

    it("ASCII text → all encodable", () => {
      const runs = splitTextByEncodability("Hello", winAnsiFont);
      expect(runs).toEqual([{ text: "Hello", encodable: true }]);
    });

    it("CJK text → all non-encodable", () => {
      const runs = splitTextByEncodability("\u3042\u3044", winAnsiFont);
      expect(runs).toEqual([{ text: "\u3042\u3044", encodable: false }]);
    });

    it("mixed Latin + CJK → split into runs", () => {
      const runs = splitTextByEncodability("Hello\u3042World", winAnsiFont);
      expect(runs).toEqual([
        { text: "Hello", encodable: true },
        { text: "\u3042", encodable: false },
        { text: "World", encodable: true },
      ]);
    });
  });
});
