/**
 * @file Tests for text utilities
 */

import { wrapText } from "./text-utils";

describe("text-utils", () => {
  describe("wrapText", () => {
    it("returns a single line when text fits within width", () => {
      expect(wrapText("Hello world", 20)).toEqual(["Hello world"]);
    });

    it("wraps at word boundaries", () => {
      expect(wrapText("Hello world foo", 11)).toEqual(["Hello world", "foo"]);
    });

    it("breaks long words that exceed width", () => {
      const result = wrapText("abcdefghij", 5);
      expect(result).toEqual(["abcde", "fghij"]);
    });

    it("handles multiple paragraphs (newlines)", () => {
      const result = wrapText("Line one\nLine two", 20);
      expect(result).toEqual(["Line one", "Line two"]);
    });

    it("preserves empty lines", () => {
      const result = wrapText("A\n\nB", 20);
      expect(result).toEqual(["A", "", "B"]);
    });

    it("returns empty array for zero width", () => {
      expect(wrapText("Hello", 0)).toEqual([]);
    });

    it("wraps long sentences correctly", () => {
      const result = wrapText("The quick brown fox jumps over the lazy dog", 15);
      expect(result[0]).toBe("The quick brown");
      expect(result[1]).toBe("fox jumps over");
      expect(result[2]).toBe("the lazy dog");
    });
  });
});
