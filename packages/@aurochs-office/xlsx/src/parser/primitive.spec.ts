/**
 * @file Tests for XML attribute value primitive parsers
 */

import {
  parseBooleanAttr,
  parseBooleanDefault,
  parseColIndexAttr,
  parseFloatAttr,
  parseIntAttr,
  parseIntRequired,
  parseRgbHex,
  parseRowIndexAttr,
  parseStyleIdAttr,
  parseXstring,
} from "./primitive";

describe("primitive", () => {
  // ===========================================================================
  // Integer Parsing
  // ===========================================================================

  describe("parseIntAttr", () => {
    it("should parse valid integer strings", () => {
      expect(parseIntAttr("0")).toBe(0);
      expect(parseIntAttr("1")).toBe(1);
      expect(parseIntAttr("42")).toBe(42);
      expect(parseIntAttr("-1")).toBe(-1);
      expect(parseIntAttr("-100")).toBe(-100);
    });

    it("should return undefined for empty or undefined values", () => {
      expect(parseIntAttr(undefined)).toBeUndefined();
      expect(parseIntAttr("")).toBeUndefined();
    });

    it("should return undefined for invalid values", () => {
      expect(parseIntAttr("abc")).toBeUndefined();
      expect(parseIntAttr("12.34")).toBe(12); // parseInt truncates
      expect(parseIntAttr("NaN")).toBeUndefined();
    });

    it("should parse strings with leading zeros", () => {
      expect(parseIntAttr("007")).toBe(7);
      expect(parseIntAttr("0100")).toBe(100);
    });
  });

  describe("parseIntRequired", () => {
    it("should parse valid integer strings", () => {
      expect(parseIntRequired("42", "count")).toBe(42);
      expect(parseIntRequired("0", "index")).toBe(0);
      expect(parseIntRequired("-5", "offset")).toBe(-5);
    });

    it("should throw for undefined values", () => {
      expect(() => parseIntRequired(undefined, "count")).toThrow(
        'Required attribute "count" is missing or invalid',
      );
    });

    it("should throw for empty values", () => {
      expect(() => parseIntRequired("", "count")).toThrow(
        'Required attribute "count" is missing or invalid',
      );
    });

    it("should throw for invalid values", () => {
      expect(() => parseIntRequired("abc", "count")).toThrow(
        'Required attribute "count" is missing or invalid',
      );
    });
  });

  // ===========================================================================
  // Float Parsing
  // ===========================================================================

  describe("parseFloatAttr", () => {
    it("should parse valid float strings", () => {
      expect(parseFloatAttr("0")).toBe(0);
      expect(parseFloatAttr("1.5")).toBe(1.5);
      expect(parseFloatAttr("3.14159")).toBe(3.14159);
      expect(parseFloatAttr("-2.5")).toBe(-2.5);
      expect(parseFloatAttr(".5")).toBe(0.5);
    });

    it("should return undefined for empty or undefined values", () => {
      expect(parseFloatAttr(undefined)).toBeUndefined();
      expect(parseFloatAttr("")).toBeUndefined();
    });

    it("should return undefined for invalid values", () => {
      expect(parseFloatAttr("abc")).toBeUndefined();
      expect(parseFloatAttr("NaN")).toBeUndefined();
    });

    it("should handle scientific notation", () => {
      expect(parseFloatAttr("1e10")).toBe(1e10);
      expect(parseFloatAttr("2.5e-3")).toBe(0.0025);
    });
  });

  // ===========================================================================
  // Boolean Parsing
  // ===========================================================================

  describe("parseBooleanAttr", () => {
    it("should parse '1' as true", () => {
      expect(parseBooleanAttr("1")).toBe(true);
    });

    it("should parse '0' as false", () => {
      expect(parseBooleanAttr("0")).toBe(false);
    });

    it("should parse 'true' as true", () => {
      expect(parseBooleanAttr("true")).toBe(true);
    });

    it("should parse 'false' as false", () => {
      expect(parseBooleanAttr("false")).toBe(false);
    });

    it("should return undefined for undefined values", () => {
      expect(parseBooleanAttr(undefined)).toBeUndefined();
    });

    it("should return undefined for unrecognized values", () => {
      expect(parseBooleanAttr("yes")).toBeUndefined();
      expect(parseBooleanAttr("no")).toBeUndefined();
      expect(parseBooleanAttr("TRUE")).toBeUndefined();
      expect(parseBooleanAttr("FALSE")).toBeUndefined();
      expect(parseBooleanAttr("")).toBeUndefined();
    });
  });

  describe("parseBooleanDefault", () => {
    it("should return parsed value when valid", () => {
      expect(parseBooleanDefault("1", false)).toBe(true);
      expect(parseBooleanDefault("0", true)).toBe(false);
      expect(parseBooleanDefault("true", false)).toBe(true);
      expect(parseBooleanDefault("false", true)).toBe(false);
    });

    it("should return default for undefined", () => {
      expect(parseBooleanDefault(undefined, true)).toBe(true);
      expect(parseBooleanDefault(undefined, false)).toBe(false);
    });

    it("should return default for unrecognized values", () => {
      expect(parseBooleanDefault("invalid", true)).toBe(true);
      expect(parseBooleanDefault("invalid", false)).toBe(false);
      expect(parseBooleanDefault("", true)).toBe(true);
    });
  });

  // ===========================================================================
  // Branded Type Parsing
  // ===========================================================================

  describe("parseRowIndexAttr", () => {
    it("should parse valid row index", () => {
      expect(parseRowIndexAttr("1")).toBe(1);
      expect(parseRowIndexAttr("100")).toBe(100);
    });

    it("should return undefined for invalid values", () => {
      expect(parseRowIndexAttr(undefined)).toBeUndefined();
      expect(parseRowIndexAttr("")).toBeUndefined();
      expect(parseRowIndexAttr("abc")).toBeUndefined();
    });
  });

  describe("parseColIndexAttr", () => {
    it("should parse valid column index", () => {
      expect(parseColIndexAttr("1")).toBe(1);
      expect(parseColIndexAttr("26")).toBe(26);
    });

    it("should return undefined for invalid values", () => {
      expect(parseColIndexAttr(undefined)).toBeUndefined();
      expect(parseColIndexAttr("")).toBeUndefined();
      expect(parseColIndexAttr("abc")).toBeUndefined();
    });
  });

  describe("parseStyleIdAttr", () => {
    it("should parse valid style ID", () => {
      expect(parseStyleIdAttr("0")).toBe(0);
      expect(parseStyleIdAttr("5")).toBe(5);
    });

    it("should return undefined for invalid values", () => {
      expect(parseStyleIdAttr(undefined)).toBeUndefined();
      expect(parseStyleIdAttr("")).toBeUndefined();
      expect(parseStyleIdAttr("abc")).toBeUndefined();
    });
  });

  // ===========================================================================
  // RGB Hex Parsing
  // ===========================================================================

  describe("parseRgbHex", () => {
    it("should return hex string as-is for RRGGBB format", () => {
      expect(parseRgbHex("FF0000")).toBe("FF0000");
      expect(parseRgbHex("00FF00")).toBe("00FF00");
      expect(parseRgbHex("0000FF")).toBe("0000FF");
    });

    it("should return hex string as-is for AARRGGBB format", () => {
      expect(parseRgbHex("FFFF0000")).toBe("FFFF0000");
      expect(parseRgbHex("80000000")).toBe("80000000");
    });

    it("should return undefined for empty or undefined values", () => {
      expect(parseRgbHex(undefined)).toBeUndefined();
      expect(parseRgbHex("")).toBeUndefined();
    });
  });

  // ===========================================================================
  // Xstring Parsing
  // ===========================================================================

  describe("parseXstring", () => {
    it("should return normal text unchanged", () => {
      expect(parseXstring("Hello World")).toBe("Hello World");
      expect(parseXstring("")).toBe("");
      expect(parseXstring("Special: <>&\"'")).toBe("Special: <>&\"'");
    });

    it("should unescape _x0000_ format escape sequences", () => {
      // Carriage return
      expect(parseXstring("Hello_x000D_World")).toBe("Hello\rWorld");
      // Line feed
      expect(parseXstring("Hello_x000A_World")).toBe("Hello\nWorld");
      // Tab
      expect(parseXstring("Tab_x0009_Here")).toBe("Tab\tHere");
      // Null character
      expect(parseXstring("Null_x0000_Char")).toBe("Null\x00Char");
    });

    it("should handle multiple escape sequences", () => {
      expect(parseXstring("Line1_x000D__x000A_Line2")).toBe("Line1\r\nLine2");
    });

    it("should handle lowercase hex digits", () => {
      expect(parseXstring("Test_x000d_Value")).toBe("Test\rValue");
      expect(parseXstring("Test_x000a_Value")).toBe("Test\nValue");
    });

    it("should handle mixed case hex digits", () => {
      expect(parseXstring("Test_x000D_Value_x000a_End")).toBe(
        "Test\rValue\nEnd",
      );
    });

    it("should not unescape partial patterns", () => {
      expect(parseXstring("_x000")).toBe("_x000");
      expect(parseXstring("_x000D")).toBe("_x000D");
      expect(parseXstring("x000D_")).toBe("x000D_");
      expect(parseXstring("_x00_")).toBe("_x00_");
    });

    it("should handle Unicode characters", () => {
      // Unicode character (e.g., Japanese character)
      expect(parseXstring("_x3042_")).toBe("\u3042"); // Hiragana 'a'
      expect(parseXstring("_xFFFF_")).toBe("\uFFFF");
    });
  });
});
