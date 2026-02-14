/**
 * @file Tests for useLineIndex hook
 */

import {
  buildLineOffsets,
  findLineIndex,
  offsetToLineColumnFromIndex,
  lineColumnToOffsetFromIndex,
} from "./use-line-index";

describe("buildLineOffsets", () => {
  it("returns empty array for empty lines", () => {
    const offsets = buildLineOffsets([]);
    expect(offsets).toEqual([]);
  });

  it("returns [0] for single empty line", () => {
    const offsets = buildLineOffsets([""]);
    expect(offsets).toEqual([0]);
  });

  it("calculates correct offsets for multiple lines", () => {
    // "abc\ndef\nghi" => lines = ["abc", "def", "ghi"]
    // offsets: [0, 4, 8] (each line + newline)
    const offsets = buildLineOffsets(["abc", "def", "ghi"]);
    expect(offsets).toEqual([0, 4, 8]);
  });

  it("handles lines of varying lengths", () => {
    // "a\nbb\nccc" => lines = ["a", "bb", "ccc"]
    // offsets: [0, 2, 5]
    const offsets = buildLineOffsets(["a", "bb", "ccc"]);
    expect(offsets).toEqual([0, 2, 5]);
  });

  it("handles empty lines in the middle", () => {
    // "a\n\nb" => lines = ["a", "", "b"]
    // offsets: [0, 2, 3]
    const offsets = buildLineOffsets(["a", "", "b"]);
    expect(offsets).toEqual([0, 2, 3]);
  });
});

describe("findLineIndex", () => {
  it("returns 0 for empty array", () => {
    expect(findLineIndex([], 0)).toBe(0);
    expect(findLineIndex([], 10)).toBe(0);
  });

  it("finds correct line for single line", () => {
    // Single line starting at offset 0
    expect(findLineIndex([0], 0)).toBe(0);
    expect(findLineIndex([0], 5)).toBe(0);
  });

  it("finds correct line via binary search", () => {
    // offsets: [0, 4, 8] for lines of length 3 each
    const offsets = [0, 4, 8];

    // Line 0: offsets 0-3
    expect(findLineIndex(offsets, 0)).toBe(0);
    expect(findLineIndex(offsets, 3)).toBe(0);

    // Line 1: offsets 4-7
    expect(findLineIndex(offsets, 4)).toBe(1);
    expect(findLineIndex(offsets, 7)).toBe(1);

    // Line 2: offsets 8+
    expect(findLineIndex(offsets, 8)).toBe(2);
    expect(findLineIndex(offsets, 100)).toBe(2);
  });

  it("handles boundary conditions", () => {
    const offsets = [0, 10, 20, 30];

    expect(findLineIndex(offsets, 9)).toBe(0);
    expect(findLineIndex(offsets, 10)).toBe(1);
    expect(findLineIndex(offsets, 19)).toBe(1);
    expect(findLineIndex(offsets, 20)).toBe(2);
  });
});

describe("offsetToLineColumnFromIndex", () => {
  it("returns (1, 1) for empty lines", () => {
    const result = offsetToLineColumnFromIndex([], [], 0);
    expect(result).toEqual({ line: 1, column: 1 });
  });

  it("converts offset 0 to line 1, column 1", () => {
    const lines = ["abc", "def"];
    const offsets = buildLineOffsets(lines);
    expect(offsetToLineColumnFromIndex(lines, offsets, 0)).toEqual({
      line: 1,
      column: 1,
    });
  });

  it("converts mid-line offset correctly", () => {
    const lines = ["abc", "def"];
    const offsets = buildLineOffsets(lines);

    // Offset 2 = line 1, column 3 ("abc"[2] = 'c')
    expect(offsetToLineColumnFromIndex(lines, offsets, 2)).toEqual({
      line: 1,
      column: 3,
    });
  });

  it("converts start of second line correctly", () => {
    const lines = ["abc", "def"];
    const offsets = buildLineOffsets(lines);

    // Offset 4 = start of line 2 (after "abc\n")
    expect(offsetToLineColumnFromIndex(lines, offsets, 4)).toEqual({
      line: 2,
      column: 1,
    });
  });

  it("handles negative offset by clamping to 0", () => {
    const lines = ["abc"];
    const offsets = buildLineOffsets(lines);
    expect(offsetToLineColumnFromIndex(lines, offsets, -5)).toEqual({
      line: 1,
      column: 1,
    });
  });

  it("handles offset past end of text", () => {
    const lines = ["abc", "def"];
    const offsets = buildLineOffsets(lines);

    // Offset 100 = past end, should return last line
    const result = offsetToLineColumnFromIndex(lines, offsets, 100);
    expect(result.line).toBe(2);
  });
});

describe("lineColumnToOffsetFromIndex", () => {
  it("returns 0 for empty lines", () => {
    expect(lineColumnToOffsetFromIndex({ lines: [], lineOffsets: [], line: 1, column: 1 })).toBe(0);
  });

  it("converts line 1, column 1 to offset 0", () => {
    const lines = ["abc", "def"];
    const lineOffsets = buildLineOffsets(lines);
    expect(lineColumnToOffsetFromIndex({ lines, lineOffsets, line: 1, column: 1 })).toBe(0);
  });

  it("converts mid-line position correctly", () => {
    const lines = ["abc", "def"];
    const lineOffsets = buildLineOffsets(lines);

    // Line 1, column 3 = offset 2
    expect(lineColumnToOffsetFromIndex({ lines, lineOffsets, line: 1, column: 3 })).toBe(2);
  });

  it("converts start of second line correctly", () => {
    const lines = ["abc", "def"];
    const lineOffsets = buildLineOffsets(lines);

    // Line 2, column 1 = offset 4
    expect(lineColumnToOffsetFromIndex({ lines, lineOffsets, line: 2, column: 1 })).toBe(4);
  });

  it("clamps line to valid range", () => {
    const lines = ["abc", "def"];
    const lineOffsets = buildLineOffsets(lines);

    // Line 100 should clamp to last line
    const result = lineColumnToOffsetFromIndex({ lines, lineOffsets, line: 100, column: 1 });
    expect(result).toBe(4); // Start of line 2
  });

  it("clamps column to line length", () => {
    const lines = ["abc", "def"];
    const lineOffsets = buildLineOffsets(lines);

    // Column 100 on line 1 should clamp to end of "abc"
    const result = lineColumnToOffsetFromIndex({ lines, lineOffsets, line: 1, column: 100 });
    expect(result).toBe(3); // End of "abc"
  });
});

describe("round-trip conversion", () => {
  it("offset -> lineColumn -> offset is identity", () => {
    const text = "Sub Main()\n    Dim x As Integer\n    x = 42\nEnd Sub";
    const lines = text.split("\n");
    const lineOffsets = buildLineOffsets(lines);

    for (let offset = 0; offset < text.length; offset++) {
      const { line, column } = offsetToLineColumnFromIndex(lines, lineOffsets, offset);
      const recoveredOffset = lineColumnToOffsetFromIndex({ lines, lineOffsets, line, column });
      expect(recoveredOffset).toBe(offset);
    }
  });

  it("handles CJK characters correctly", () => {
    const text = "Dim 変数 As String\n変数 = \"こんにちは\"";
    const lines = text.split("\n");
    const lineOffsets = buildLineOffsets(lines);

    // Test various offsets
    for (const offset of [0, 4, 10, 15, 20, 25]) {
      const clampedOffset = Math.min(offset, text.length);
      const { line, column } = offsetToLineColumnFromIndex(lines, lineOffsets, clampedOffset);
      const recovered = lineColumnToOffsetFromIndex({ lines, lineOffsets, line, column });
      expect(recovered).toBe(clampedOffset);
    }
  });
});

describe("performance characteristics", () => {
  it("handles large files efficiently", () => {
    // Generate 10,000 lines
    const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: Some VBA code here`);
    const offsets = buildLineOffsets(lines);

    // Binary search should be fast even for large files
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      // Random offset
      const offset = Math.floor(Math.random() * 500000);
      offsetToLineColumnFromIndex(lines, offsets, offset);
    }
    const elapsed = performance.now() - start;

    // 1000 lookups should complete in < 10ms
    expect(elapsed).toBeLessThan(10);
  });
});
