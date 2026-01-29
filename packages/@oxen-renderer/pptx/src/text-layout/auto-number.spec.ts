/**
 * @file Auto-numbering format utilities tests
 *
 * Tests for ECMA-376 ST_TextAutonumberScheme implementation.
 * @see ECMA-376 Part 1, Section 21.1.2.1.32
 */

import { formatAutoNumber, isValidAutonumberScheme } from "./auto-number";

describe("formatAutoNumber", () => {
  describe("Arabic numerals", () => {
    it("arabicPeriod formats as 1., 2., 3., ...", () => {
      expect(formatAutoNumber("arabicPeriod", 1)).toBe("1.");
      expect(formatAutoNumber("arabicPeriod", 2)).toBe("2.");
      expect(formatAutoNumber("arabicPeriod", 10)).toBe("10.");
    });

    it("arabicPlain formats as 1, 2, 3, ...", () => {
      expect(formatAutoNumber("arabicPlain", 1)).toBe("1");
      expect(formatAutoNumber("arabicPlain", 5)).toBe("5");
    });

    it("arabicParenR formats as 1), 2), 3), ...", () => {
      expect(formatAutoNumber("arabicParenR", 1)).toBe("1)");
      expect(formatAutoNumber("arabicParenR", 3)).toBe("3)");
    });

    it("arabicParenBoth formats as (1), (2), (3), ...", () => {
      expect(formatAutoNumber("arabicParenBoth", 1)).toBe("(1)");
      expect(formatAutoNumber("arabicParenBoth", 5)).toBe("(5)");
    });

    it("respects startAt parameter", () => {
      expect(formatAutoNumber("arabicPeriod", 1, 5)).toBe("5.");
      expect(formatAutoNumber("arabicPeriod", 2, 5)).toBe("6.");
      expect(formatAutoNumber("arabicPeriod", 3, 5)).toBe("7.");
    });
  });

  describe("Lowercase alphabetic", () => {
    it("alphaLcPeriod formats as a., b., c., ...", () => {
      expect(formatAutoNumber("alphaLcPeriod", 1)).toBe("a.");
      expect(formatAutoNumber("alphaLcPeriod", 2)).toBe("b.");
      expect(formatAutoNumber("alphaLcPeriod", 3)).toBe("c.");
      expect(formatAutoNumber("alphaLcPeriod", 26)).toBe("z.");
    });

    it("alphaLcPeriod wraps correctly (aa, ab, ...)", () => {
      expect(formatAutoNumber("alphaLcPeriod", 27)).toBe("aa.");
      expect(formatAutoNumber("alphaLcPeriod", 28)).toBe("ab.");
      expect(formatAutoNumber("alphaLcPeriod", 52)).toBe("az.");
      expect(formatAutoNumber("alphaLcPeriod", 53)).toBe("ba.");
    });

    it("alphaLcParenR formats as a), b), c), ...", () => {
      expect(formatAutoNumber("alphaLcParenR", 1)).toBe("a)");
      expect(formatAutoNumber("alphaLcParenR", 5)).toBe("e)");
    });

    it("alphaLcParenBoth formats as (a), (b), (c), ...", () => {
      expect(formatAutoNumber("alphaLcParenBoth", 1)).toBe("(a)");
      expect(formatAutoNumber("alphaLcParenBoth", 10)).toBe("(j)");
    });
  });

  describe("Uppercase alphabetic", () => {
    it("alphaUcPeriod formats as A., B., C., ...", () => {
      expect(formatAutoNumber("alphaUcPeriod", 1)).toBe("A.");
      expect(formatAutoNumber("alphaUcPeriod", 2)).toBe("B.");
      expect(formatAutoNumber("alphaUcPeriod", 26)).toBe("Z.");
    });

    it("alphaUcParenR formats as A), B), C), ...", () => {
      expect(formatAutoNumber("alphaUcParenR", 1)).toBe("A)");
      expect(formatAutoNumber("alphaUcParenR", 5)).toBe("E)");
    });

    it("alphaUcParenBoth formats as (A), (B), (C), ...", () => {
      expect(formatAutoNumber("alphaUcParenBoth", 1)).toBe("(A)");
      expect(formatAutoNumber("alphaUcParenBoth", 3)).toBe("(C)");
    });
  });

  describe("Lowercase Roman numerals", () => {
    it("romanLcPeriod formats as i., ii., iii., ...", () => {
      expect(formatAutoNumber("romanLcPeriod", 1)).toBe("i.");
      expect(formatAutoNumber("romanLcPeriod", 2)).toBe("ii.");
      expect(formatAutoNumber("romanLcPeriod", 3)).toBe("iii.");
      expect(formatAutoNumber("romanLcPeriod", 4)).toBe("iv.");
      expect(formatAutoNumber("romanLcPeriod", 5)).toBe("v.");
      expect(formatAutoNumber("romanLcPeriod", 9)).toBe("ix.");
      expect(formatAutoNumber("romanLcPeriod", 10)).toBe("x.");
    });

    it("romanLcPeriod handles larger numbers", () => {
      expect(formatAutoNumber("romanLcPeriod", 50)).toBe("l.");
      expect(formatAutoNumber("romanLcPeriod", 100)).toBe("c.");
      expect(formatAutoNumber("romanLcPeriod", 500)).toBe("d.");
      expect(formatAutoNumber("romanLcPeriod", 1000)).toBe("m.");
    });

    it("romanLcParenR formats as i), ii), iii), ...", () => {
      expect(formatAutoNumber("romanLcParenR", 1)).toBe("i)");
      expect(formatAutoNumber("romanLcParenR", 4)).toBe("iv)");
    });

    it("romanLcParenBoth formats as (i), (ii), (iii), ...", () => {
      expect(formatAutoNumber("romanLcParenBoth", 1)).toBe("(i)");
      expect(formatAutoNumber("romanLcParenBoth", 7)).toBe("(vii)");
    });
  });

  describe("Uppercase Roman numerals", () => {
    it("romanUcPeriod formats as I., II., III., ...", () => {
      expect(formatAutoNumber("romanUcPeriod", 1)).toBe("I.");
      expect(formatAutoNumber("romanUcPeriod", 2)).toBe("II.");
      expect(formatAutoNumber("romanUcPeriod", 4)).toBe("IV.");
      expect(formatAutoNumber("romanUcPeriod", 10)).toBe("X.");
    });

    it("romanUcParenR formats as I), II), III), ...", () => {
      expect(formatAutoNumber("romanUcParenR", 1)).toBe("I)");
      expect(formatAutoNumber("romanUcParenR", 5)).toBe("V)");
    });

    it("romanUcParenBoth formats as (I), (II), (III), ...", () => {
      expect(formatAutoNumber("romanUcParenBoth", 1)).toBe("(I)");
      expect(formatAutoNumber("romanUcParenBoth", 9)).toBe("(IX)");
    });
  });

  describe("Circled numbers", () => {
    it("circleNumWdWhitePlain formats as ①, ②, ③, ...", () => {
      expect(formatAutoNumber("circleNumWdWhitePlain", 1)).toBe("①");
      expect(formatAutoNumber("circleNumWdWhitePlain", 2)).toBe("②");
      expect(formatAutoNumber("circleNumWdWhitePlain", 10)).toBe("⑩");
      expect(formatAutoNumber("circleNumWdWhitePlain", 20)).toBe("⑳");
    });

    it("circleNumWdWhitePlain falls back to plain number for > 20", () => {
      expect(formatAutoNumber("circleNumWdWhitePlain", 21)).toBe("21");
    });

    it("circleNumWdBlackPlain formats as ❶, ❷, ❸, ...", () => {
      expect(formatAutoNumber("circleNumWdBlackPlain", 1)).toBe("❶");
      expect(formatAutoNumber("circleNumWdBlackPlain", 2)).toBe("❷");
      expect(formatAutoNumber("circleNumWdBlackPlain", 10)).toBe("❿");
    });

    it("circleNumWdBlackPlain falls back to white circle for 11-20", () => {
      expect(formatAutoNumber("circleNumWdBlackPlain", 11)).toBe("⑪");
      expect(formatAutoNumber("circleNumWdBlackPlain", 20)).toBe("⑳");
    });
  });

  describe("Double-byte Arabic", () => {
    it("arabicDbPlain formats as full-width numbers", () => {
      expect(formatAutoNumber("arabicDbPlain", 1)).toBe("１");
      expect(formatAutoNumber("arabicDbPlain", 12)).toBe("１２");
    });

    it("arabicDbPeriod formats as full-width numbers with period", () => {
      expect(formatAutoNumber("arabicDbPeriod", 1)).toBe("１.");
      expect(formatAutoNumber("arabicDbPeriod", 5)).toBe("５.");
    });
  });

  describe("Unknown schemes", () => {
    it("falls back to arabicPeriod for unknown schemes", () => {
      expect(formatAutoNumber("unknownScheme", 1)).toBe("1.");
      expect(formatAutoNumber("unknownScheme", 5)).toBe("5.");
    });
  });

  describe("startAt parameter", () => {
    it("respects startAt for all schemes", () => {
      expect(formatAutoNumber("arabicPeriod", 1, 10)).toBe("10.");
      expect(formatAutoNumber("alphaLcPeriod", 1, 3)).toBe("c.");
      expect(formatAutoNumber("romanLcPeriod", 1, 5)).toBe("v.");
    });
  });
});

describe("isValidAutonumberScheme", () => {
  it("returns true for valid schemes", () => {
    expect(isValidAutonumberScheme("arabicPeriod")).toBe(true);
    expect(isValidAutonumberScheme("romanLcPeriod")).toBe(true);
    expect(isValidAutonumberScheme("alphaUcParenBoth")).toBe(true);
  });

  it("returns false for invalid schemes", () => {
    expect(isValidAutonumberScheme("unknown")).toBe(false);
    expect(isValidAutonumberScheme("")).toBe(false);
    expect(isValidAutonumberScheme("ArabicPeriod")).toBe(false); // case-sensitive
  });
});
