/**
 * @file src/pdf/domain/font/text-decoder.spec.ts
 */

import { decodeText } from "./text-decoder";
import type { FontInfo, FontMappings } from "./types";

function createFontInfo(args: Partial<FontInfo> & Pick<FontInfo, "codeByteWidth">): FontInfo {
  return {
    mapping: args.mapping ?? new Map<number, string>(),
    codeByteWidth: args.codeByteWidth,
    metrics: args.metrics ?? {
      widths: new Map<number, number>(),
      defaultWidth: 500,
      ascender: 800,
      descender: -200,
    },
    ordering: args.ordering,
    encodingMap: args.encodingMap,
    isBold: args.isBold,
    isItalic: args.isItalic,
    baseFont: args.baseFont,
  };
}

describe("decodeText", () => {
  it("falls back to encodingMap for unmapped single-byte codes when ToUnicode is partial", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 1,
        mapping: new Map([[0x41, "α"]]), // only 'A'
        encodingMap: new Map([[0x42, "β"]]), // 'B'
      })],
    ]);

    const raw = String.fromCharCode(0x41, 0x42); // "AB" as 8-bit codes
    expect(decodeText(raw, "F1", fontMappings)).toBe("αβ");
  });

  it("uses raw bytes when neither ToUnicode nor encodingMap provides a mapping", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 1,
        mapping: new Map([[0x41, "α"]]),
      })],
    ]);

    const raw = String.fromCharCode(0x41, 0x42);
    expect(decodeText(raw, "F1", fontMappings)).toBe("αB");
  });
});
