/**
 * @file ToUnicode Writer Tests
 */

import { generateToUnicodeStream } from "./tounicode-writer";
import type { PdfFontToUnicode } from "../../domain/document";

const decoder = new TextDecoder();

describe("generateToUnicodeStream", () => {
  it("generates valid CMap header and footer", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map([["0041", "A"]]),
      sourceCodeByteLengths: [2],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    expect(text).toContain("/CIDInit /ProcSet findresource begin");
    expect(text).toContain("begincmap");
    expect(text).toContain("/CMapName /aurochs-ToUnicode def");
    expect(text).toContain("/CMapType 2 def");
    expect(text).toContain("endcmap");
    expect(text).toContain("CMapName currentdict /CMap defineresource pop");
    expect(text).toContain("end");
  });

  it("generates codespacerange for 2-byte codes", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map([["82A0", "あ"]]),
      sourceCodeByteLengths: [2],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    expect(text).toContain("begincodespacerange");
    expect(text).toContain("<0000> <FFFF>");
    expect(text).toContain("endcodespacerange");
  });

  it("generates codespacerange for mixed byte lengths", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map([
        ["41", "A"],
        ["82A0", "あ"],
      ]),
      sourceCodeByteLengths: [2, 1],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    expect(text).toContain("2 begincodespacerange");
    expect(text).toContain("<00> <FF>");
    expect(text).toContain("<0000> <FFFF>");
  });

  it("generates bfchar for individual mappings", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map([
        ["82A0", "あ"],
        ["82A2", "い"],
      ]),
      sourceCodeByteLengths: [2],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    expect(text).toContain("beginbfchar");
    expect(text).toContain("<82A0> <3042>"); // あ = U+3042
    expect(text).toContain("<82A2> <3044>"); // い = U+3044
    expect(text).toContain("endbfchar");
  });

  it("generates bfrange for consecutive mappings", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map([
        ["0001", "A"],
        ["0002", "B"],
        ["0003", "C"],
        ["0004", "D"],
      ]),
      sourceCodeByteLengths: [2],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    // Consecutive mappings should be combined into bfrange
    expect(text).toContain("beginbfrange");
    expect(text).toContain("<0001> <0004> <0041>"); // A-D range
    expect(text).toContain("endbfrange");
    expect(text).not.toContain("beginbfchar");
  });

  it("handles surrogate pairs for emoji", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map([["0001", "😀"]]), // U+1F600
      sourceCodeByteLengths: [2],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    // Emoji should be encoded as UTF-16BE surrogate pair
    // U+1F600 = 0xD83D 0xDE00
    expect(text).toContain("<0001> <D83DDE00>");
  });

  it("handles empty mapping", () => {
    const toUnicode: PdfFontToUnicode = {
      byteMapping: new Map(),
      sourceCodeByteLengths: [],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    // Should still produce valid CMap structure
    expect(text).toContain("begincmap");
    expect(text).toContain("endcmap");
    expect(text).not.toContain("beginbfchar");
    expect(text).not.toContain("beginbfrange");
  });

  it("chunks large bfchar sections", () => {
    // Create more than 100 non-consecutive mappings
    const mappings = new Map<string, string>();
    for (let i = 0; i < 150; i++) {
      const hex = (i * 2).toString(16).padStart(4, "0").toUpperCase();
      mappings.set(hex, String.fromCodePoint(0x4E00 + i)); // CJK characters
    }

    const toUnicode: PdfFontToUnicode = {
      byteMapping: mappings,
      sourceCodeByteLengths: [2],
    };

    const result = generateToUnicodeStream(toUnicode);
    const text = decoder.decode(result);

    // Should have multiple bfchar blocks (max 100 per block)
    const bfcharMatches = text.match(/beginbfchar/g);
    expect(bfcharMatches?.length).toBeGreaterThan(1);
  });
});
