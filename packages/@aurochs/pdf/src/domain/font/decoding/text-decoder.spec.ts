/**
 * @file src/pdf/domain/font/text-decoder.spec.ts
 */

import { decodeText } from "./text-decoder";
import { decodeCIDFallback } from "../cid/cid-ordering";
import type { FontInfo, FontMappings } from "../types";

function createFontInfo(args: Partial<FontInfo> & Pick<FontInfo, "codeByteWidth">): FontInfo {
  return {
    mapping: args.mapping ?? new Map<number, string>(),
    codeByteWidth: args.codeByteWidth,
    toUnicodeByteMapping: args.toUnicodeByteMapping,
    toUnicodeSourceCodeByteLengths: args.toUnicodeSourceCodeByteLengths,
    toUnicodeDiagnostics: args.toUnicodeDiagnostics,
    metrics: args.metrics ?? {
      widths: new Map<number, number>(),
      defaultWidth: 500,
      ascender: 800,
      descender: -200,
    },
    ordering: args.ordering,
    cidCodeToUnicodeFallbackMap: args.cidCodeToUnicodeFallbackMap,
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

  it("prefers ToUnicode byte mapping with mixed source code lengths", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        toUnicodeByteMapping: new Map([
          ["20", "A"],
          ["8140", "あ"],
          ["000102", "い"],
        ]),
        toUnicodeSourceCodeByteLengths: [3, 2, 1],
      })],
    ]);

    const raw = String.fromCharCode(0x20, 0x81, 0x40, 0x00, 0x01, 0x02);
    expect(decodeText(raw, "F1", fontMappings)).toBe("Aあい");
  });

  it("keeps alignment on miss when ToUnicode source lengths are mixed", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        toUnicodeByteMapping: new Map([
          ["20", " "],
          ["8140", "あ"],
        ]),
        toUnicodeSourceCodeByteLengths: [2, 1],
      })],
    ]);

    // 0x81 is unmapped; decoder should advance by 1 byte and recover alignment.
    const raw = String.fromCharCode(0x81, 0x20, 0x81, 0x40);
    expect(decodeText(raw, "F1", fontMappings)).toBe("\uFFFD あ");
  });

  it("decodes surrogate pairs through ToUnicode byte mapping", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        toUnicodeByteMapping: new Map([["0001", "😀"]]),
        toUnicodeSourceCodeByteLengths: [2],
      })],
    ]);

    const raw = "\x00\x01";
    expect(decodeText(raw, "F1", fontMappings)).toBe("😀");
  });

  it("does not use CID fallback when ToUnicode exists but is partial", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Japan1",
        toUnicodeByteMapping: new Map([["0001", "A"]]),
        toUnicodeSourceCodeByteLengths: [2],
      })],
    ]);

    const raw = "\x00\x02";
    expect(decodeText(raw, "F1", fontMappings)).toBe("\uFFFD");
  });

  it("does not infer CID ordering from baseFont when ordering is Identity", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Identity",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([[0x0060, "\uFFFD"]]),
        toUnicodeByteMapping: new Map([["0060", "\uFFFD"]]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 1]]),
        },
      })],
    ]);

    const raw = "\x00\x60";
    expect(decodeText(raw, "F1", fontMappings)).toBe("\uFFFD");
  });

  it("uses CID fallback only for bad ToUnicode entries and keeps valid entries", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Japan1",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([
          [0x0060, "\uFFFD"],
          [0x8140, "あ"],
        ]),
        toUnicodeByteMapping: new Map([
          ["0060", "\uFFFD"],
          ["8140", "あ"],
        ]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 2]]),
        },
      })],
    ]);

    const raw = "\x00\x60\x81\x40";
    expect(decodeText(raw, "F1", fontMappings)).toBe(`${decodeCIDFallback(0x0060, "Japan1")}あ`);
  });

  it("prefers CID->GID derived fallback map over generic CID ordering fallback", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Identity",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([
          [0x0060, "\uFFFD"],
          [0x8140, "あ"],
        ]),
        toUnicodeByteMapping: new Map([
          ["0060", "\uFFFD"],
          ["8140", "あ"],
        ]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 2]]),
        },
        cidCodeToUnicodeFallbackMap: new Map([[0x0060, "官"]]),
      })],
    ]);

    const raw = "\x00\x60\x81\x40";
    expect(decodeText(raw, "F1", fontMappings)).toBe("官あ");
  });

  it("uses CID->GID derived fallback map on ToUnicode miss in severe mode", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Identity",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([
          [0x0060, "\uFFFD"],
          [0x8140, "あ"],
        ]),
        toUnicodeByteMapping: new Map([
          ["0060", "\uFFFD"],
          ["8140", "あ"],
        ]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 2]]),
        },
        cidCodeToUnicodeFallbackMap: new Map([[0x0073, "報"]]),
      })],
    ]);

    const raw = "\x00\x73\x81\x40";
    expect(decodeText(raw, "F1", fontMappings)).toBe("報あ");
  });

  it("does not use ASCII fallback on ToUnicode miss even in severe mode", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Identity",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([
          [0x0060, "\uFFFD"],
          [0x8140, "あ"],
        ]),
        toUnicodeByteMapping: new Map([
          ["0060", "\uFFFD"],
          ["8140", "あ"],
        ]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 2]]),
        },
      })],
    ]);

    // 0x0073 is not in ToUnicode map; CID fallback does not resolve this code,
    // so decoder should keep replacement rather than guessing ASCII.
    const raw = "\x00\x73\x81\x40";
    expect(decodeText(raw, "F1", fontMappings)).toBe("\uFFFDあ");
  });

  it("treats bad legacy mapping as missing in severe mode", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Japan1",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([[0x0060, "\uFFFD"]]),
        toUnicodeByteMapping: new Map([["0061", "\uFFFD"]]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 1]]),
        },
      })],
    ]);

    const raw = "\x00\x60";
    expect(decodeText(raw, "F1", fontMappings)).toBe(decodeCIDFallback(0x0060, "Japan1"));
  });

  it("does not use ASCII byte fallback in severe 2-byte mode", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Identity",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map([[0x0073, "\uFFFD"]]),
        toUnicodeByteMapping: new Map([["0073", "\uFFFD"]]),
        toUnicodeSourceCodeByteLengths: [2],
        toUnicodeDiagnostics: {
          invalidEntryCount: 0,
          truncatedRangeCount: 0,
          sourceLengthOutsideCodeSpaceCount: 0,
          replacementCharMapCount: 1,
          privateUseCharMapCount: 0,
          sourceCodeLengthHistogram: new Map([[2, 1]]),
        },
      })],
    ]);

    const raw = "\x00\x73";
    expect(decodeText(raw, "F1", fontMappings)).toBe("\uFFFD");
  });

  it("uses CID->GID derived fallback map when ToUnicode is absent", () => {
    const fontMappings: FontMappings = new Map([
      ["F1", createFontInfo({
        codeByteWidth: 2,
        ordering: "Identity",
        baseFont: "/DFHSMinchoRPro6N-W3",
        mapping: new Map(),
        cidCodeToUnicodeFallbackMap: new Map([
          [0x1234, "法"],
          [0x1235, "令"],
        ]),
      })],
    ]);

    const raw = "\x12\x34\x12\x35";
    expect(decodeText(raw, "F1", fontMappings)).toBe("法令");
  });
});
