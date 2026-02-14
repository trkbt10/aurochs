/**
 * @file Search Logic Tests
 */

import { describe, it, expect } from "vitest";
import { findMatches, buildLineIndex } from "./use-search";

describe("buildLineIndex", () => {
  it("should return line 1, column 1 for offset 0", () => {
    const index = buildLineIndex("Hello\nWorld");
    const result = index.getLineAtOffset(0);
    expect(result).toEqual({ line: 1, column: 1 });
  });

  it("should return correct line and column for multi-line text", () => {
    const index = buildLineIndex("Line1\nLine2\nLine3");
    // Line 1: 0-5, Line 2: 6-11, Line 3: 12-17
    expect(index.getLineAtOffset(0)).toEqual({ line: 1, column: 1 }); // 'L' in Line1
    expect(index.getLineAtOffset(5)).toEqual({ line: 1, column: 6 }); // end of Line1
    expect(index.getLineAtOffset(6)).toEqual({ line: 2, column: 1 }); // 'L' in Line2
    expect(index.getLineAtOffset(12)).toEqual({ line: 3, column: 1 }); // 'L' in Line3
  });

  it("should return offset from line and column", () => {
    const index = buildLineIndex("AB\nCD\nEF");
    expect(index.getOffset(1, 1)).toBe(0); // A
    expect(index.getOffset(1, 2)).toBe(1); // B
    expect(index.getOffset(2, 1)).toBe(3); // C
    expect(index.getOffset(3, 2)).toBe(7); // F
  });
});

describe("findMatches", () => {
  it("should return empty array for empty query", () => {
    const matches = findMatches("Hello World", "", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toEqual([]);
  });

  it("should find simple substring matches", () => {
    const matches = findMatches("Hello World Hello", "Hello", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({
      startOffset: 0,
      endOffset: 5,
      line: 1,
      startColumn: 1,
      endColumn: 6,
      text: "Hello",
    });
    expect(matches[1]).toEqual({
      startOffset: 12,
      endOffset: 17,
      line: 1,
      startColumn: 13,
      endColumn: 18,
      text: "Hello",
    });
  });

  it("should be case insensitive by default", () => {
    const matches = findMatches("HELLO hello HeLLo", "hello", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toHaveLength(3);
  });

  it("should respect caseSensitive option", () => {
    const matches = findMatches("HELLO hello HeLLo", "hello", {
      caseSensitive: true,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("hello");
  });

  it("should respect wholeWord option", () => {
    const matches = findMatches("Hello HelloWorld Hello", "Hello", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: true,
    });
    expect(matches).toHaveLength(2);
    expect(matches[0]?.startOffset).toBe(0);
    expect(matches[1]?.startOffset).toBe(17);
  });

  it("should support regex patterns", () => {
    const matches = findMatches("foo123 bar456 baz789", "\\d+", {
      caseSensitive: false,
      useRegex: true,
      wholeWord: false,
    });
    expect(matches).toHaveLength(3);
    expect(matches[0]?.text).toBe("123");
    expect(matches[1]?.text).toBe("456");
    expect(matches[2]?.text).toBe("789");
  });

  it("should handle multi-line text", () => {
    const text = "Line1 Hello\nLine2 Hello\nLine3";
    const matches = findMatches(text, "Hello", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toHaveLength(2);
    expect(matches[0]?.line).toBe(1);
    expect(matches[1]?.line).toBe(2);
  });

  it("should handle invalid regex gracefully", () => {
    const matches = findMatches("Hello World", "[invalid", {
      caseSensitive: false,
      useRegex: true,
      wholeWord: false,
    });
    expect(matches).toEqual([]);
  });

  it("should escape special regex characters when not using regex", () => {
    const matches = findMatches("Hello (World)", "(World)", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("(World)");
  });

  it("should handle VBA code patterns", () => {
    const vbaCode = `Sub Test()
    Dim x As Integer
    x = 10
End Sub

Sub Another()
    Dim x As String
End Sub`;

    const matches = findMatches(vbaCode, "Dim x As", {
      caseSensitive: false,
      useRegex: false,
      wholeWord: false,
    });
    expect(matches).toHaveLength(2);
    expect(matches[0]?.line).toBe(2);
    expect(matches[1]?.line).toBe(7);
  });
});
