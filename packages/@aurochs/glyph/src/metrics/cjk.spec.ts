/**
 * @file CJK character detection tests
 */

import { isCjkCodePoint, isCjkChar } from "./cjk";

describe("isCjkCodePoint", () => {
  describe("CJK Unified Ideographs (0x4e00-0x9fff)", () => {
    it("should return true for common Chinese characters", () => {
      expect(isCjkCodePoint(0x4e2d)).toBe(true); // 中
      expect(isCjkCodePoint(0x6587)).toBe(true); // 文
      expect(isCjkCodePoint(0x5b57)).toBe(true); // 字
    });

    it("should return true for range boundaries", () => {
      expect(isCjkCodePoint(0x4e00)).toBe(true); // start
      expect(isCjkCodePoint(0x9fff)).toBe(true); // end
    });
  });

  describe("CJK Extension A (0x3400-0x4dbf)", () => {
    it("should return true for Extension A characters", () => {
      expect(isCjkCodePoint(0x3400)).toBe(true); // start
      expect(isCjkCodePoint(0x4dbf)).toBe(true); // end
    });
  });

  describe("CJK Symbols and Punctuation (0x3000-0x303f)", () => {
    it("should return true for ideographic space", () => {
      expect(isCjkCodePoint(0x3000)).toBe(true); // ideographic space
    });

    it("should return true for punctuation marks", () => {
      expect(isCjkCodePoint(0x3001)).toBe(true); // 、
      expect(isCjkCodePoint(0x3002)).toBe(true); // 。
    });
  });

  describe("Hiragana (0x3040-0x309f)", () => {
    it("should return true for hiragana characters", () => {
      expect(isCjkCodePoint(0x3042)).toBe(true); // あ
      expect(isCjkCodePoint(0x3044)).toBe(true); // い
      expect(isCjkCodePoint(0x3046)).toBe(true); // う
    });
  });

  describe("Katakana (0x30a0-0x30ff)", () => {
    it("should return true for katakana characters", () => {
      expect(isCjkCodePoint(0x30a2)).toBe(true); // ア
      expect(isCjkCodePoint(0x30a4)).toBe(true); // イ
      expect(isCjkCodePoint(0x30a6)).toBe(true); // ウ
    });
  });

  describe("Halfwidth and Fullwidth Forms (0xff00-0xffef)", () => {
    it("should return true for fullwidth Latin", () => {
      expect(isCjkCodePoint(0xff21)).toBe(true); // Ａ
      expect(isCjkCodePoint(0xff41)).toBe(true); // ａ
    });

    it("should return true for halfwidth katakana", () => {
      expect(isCjkCodePoint(0xff66)).toBe(true); // ｦ
    });
  });

  describe("non-CJK characters", () => {
    it("should return false for ASCII", () => {
      expect(isCjkCodePoint(0x41)).toBe(false); // A
      expect(isCjkCodePoint(0x61)).toBe(false); // a
      expect(isCjkCodePoint(0x30)).toBe(false); // 0
      expect(isCjkCodePoint(0x20)).toBe(false); // space
    });

    it("should return false for Latin Extended", () => {
      expect(isCjkCodePoint(0x00e9)).toBe(false); // é
      expect(isCjkCodePoint(0x00fc)).toBe(false); // ü
    });

    it("should return false for characters between ranges", () => {
      expect(isCjkCodePoint(0x2fff)).toBe(false); // before CJK Symbols
      expect(isCjkCodePoint(0xa000)).toBe(false); // after CJK Unified
    });
  });
});

describe("isCjkChar", () => {
  it("should work with character strings", () => {
    expect(isCjkChar("中")).toBe(true);
    expect(isCjkChar("あ")).toBe(true);
    expect(isCjkChar("ア")).toBe(true);
    expect(isCjkChar("A")).toBe(false);
    expect(isCjkChar(" ")).toBe(false);
  });
});
