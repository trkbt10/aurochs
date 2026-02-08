/**
 * @file Text measurement tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  segmentText,
  breakLines,
  breakLinesWord,
  breakLinesChar,
  breakLinesAuto,
} from "./line-break";
import {
  TextMeasurer,
  createTextMeasurer,
  FallbackMeasurementProvider,
} from "./";
import type { MeasurementProvider, FontSpec } from "./types";

describe("text segmentation", () => {
  it("segments text into words and whitespace", () => {
    const text = "Hello World";
    const charWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]; // 11 chars

    const segments = segmentText(text, charWidths);

    expect(segments).toHaveLength(3); // "Hello", " ", "World"
    expect(segments[0].text).toBe("Hello");
    expect(segments[0].isWhitespace).toBe(false);
    expect(segments[1].text).toBe(" ");
    expect(segments[1].isWhitespace).toBe(true);
    expect(segments[2].text).toBe("World");
    expect(segments[2].isWhitespace).toBe(false);
  });

  it("handles newlines as separate segments", () => {
    const text = "Line1\nLine2";
    const charWidths = [10, 10, 10, 10, 10, 0, 10, 10, 10, 10, 10];

    const segments = segmentText(text, charWidths);

    expect(segments).toHaveLength(3); // "Line1", "\n", "Line2"
    expect(segments[1].text).toBe("\n");
    expect(segments[1].isWhitespace).toBe(true);
  });

  it("handles multiple consecutive spaces", () => {
    const text = "A  B";
    const charWidths = [10, 10, 10, 10];

    const segments = segmentText(text, charWidths);

    expect(segments).toHaveLength(3); // "A", "  ", "B"
    expect(segments[1].text).toBe("  ");
    expect(segments[1].width).toBe(20);
  });

  it("handles empty text", () => {
    const segments = segmentText("", []);

    expect(segments).toHaveLength(0);
  });
});

describe("word-based line breaking", () => {
  it("breaks at word boundaries", () => {
    const text = "Hello World Test";
    // H(10) e(10) l(10) l(10) o(10) " "(10) W(10) o(10) r(10) l(10) d(10) " "(10) T(10) e(10) s(10) t(10)
    const charWidths = Array(16).fill(10);

    const lines = breakLinesWord(text, charWidths, 60);

    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe("Hello");
    expect(lines[1].text).toBe("World");
    expect(lines[2].text).toBe("Test");
  });

  it("keeps words on same line when they fit", () => {
    const text = "Hello World";
    const charWidths = Array(11).fill(10);

    const lines = breakLinesWord(text, charWidths, 120);

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Hello World");
  });

  it("respects explicit line breaks", () => {
    const text = "Line1\nLine2";
    const charWidths = Array(11).fill(10);

    const lines = breakLinesWord(text, charWidths, 200);

    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("Line1");
    expect(lines[1].text).toBe("Line2");
  });

  it("handles max lines limit", () => {
    const text = "A B C D E";
    const charWidths = Array(9).fill(10);

    const lines = breakLinesWord(text, charWidths, 15, 2);

    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it("removes trailing whitespace from lines", () => {
    const text = "Hello  World";
    const charWidths = Array(12).fill(10);

    const lines = breakLinesWord(text, charWidths, 55);

    expect(lines[0].text).toBe("Hello");
    expect(lines[0].text.endsWith(" ")).toBe(false);
  });
});

describe("character-based line breaking", () => {
  it("breaks at character boundaries", () => {
    const text = "ABCDEFGH";
    const charWidths = Array(8).fill(10);

    const lines = breakLinesChar(text, charWidths, 30);

    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe("ABC");
    expect(lines[1].text).toBe("DEF");
    expect(lines[2].text).toBe("GH");
  });

  it("respects explicit line breaks", () => {
    const text = "AB\nCD";
    const charWidths = [10, 10, 0, 10, 10];

    const lines = breakLinesChar(text, charWidths, 100);

    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("AB");
    expect(lines[1].text).toBe("CD");
  });

  it("handles single character per line", () => {
    const text = "ABC";
    const charWidths = [20, 20, 20];

    const lines = breakLinesChar(text, charWidths, 20);

    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe("A");
    expect(lines[1].text).toBe("B");
    expect(lines[2].text).toBe("C");
  });
});

describe("auto line breaking", () => {
  it("prefers word breaks", () => {
    const text = "Hello World";
    const charWidths = Array(11).fill(10);

    const lines = breakLinesAuto(text, charWidths, 55);

    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("Hello");
    expect(lines[1].text).toBe("World");
  });

  it("falls back to char break for long words", () => {
    const text = "ABCDEFGHIJ";
    const charWidths = Array(10).fill(10);

    const lines = breakLinesAuto(text, charWidths, 30);

    expect(lines.length).toBeGreaterThan(1);
    // Each line should be at most 30px wide
    for (const line of lines) {
      expect(line.width).toBeLessThanOrEqual(30);
    }
  });
});

describe("breakLines function", () => {
  it("returns single line for mode=none", () => {
    const text = "Hello World Test";
    const charWidths = Array(16).fill(10);

    const lines = breakLines(text, charWidths, 50, "none");

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Hello World Test");
  });

  it("handles explicit line breaks in mode=none", () => {
    const text = "Line1\nLine2";
    const charWidths = Array(11).fill(10);

    const lines = breakLines(text, charWidths, 50, "none");

    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("Line1");
    expect(lines[1].text).toBe("Line2");
  });

  it("uses word mode when specified", () => {
    const text = "Hello World";
    const charWidths = Array(11).fill(10);

    const lines = breakLines(text, charWidths, 55, "word");

    expect(lines).toHaveLength(2);
  });

  it("uses char mode when specified", () => {
    const text = "ABCD";
    const charWidths = Array(4).fill(10);

    const lines = breakLines(text, charWidths, 25, "char");

    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("AB");
    expect(lines[1].text).toBe("CD");
  });

  it("returns empty line for empty text", () => {
    const lines = breakLines("", [], 100, "auto");

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("");
  });
});

describe("FallbackMeasurementProvider", () => {
  const provider = new FallbackMeasurementProvider();
  const font: FontSpec = { fontFamily: "sans-serif", fontSize: 16 };

  it("measures text width", () => {
    const result = provider.measureText("Hello", font);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it("includes ascent and descent", () => {
    const result = provider.measureText("Hg", font);

    expect(result.ascent).toBeGreaterThan(0);
    expect(result.descent).toBeGreaterThan(0);
  });

  it("measures character widths", () => {
    const widths = provider.measureCharWidths("ABC", font);

    expect(widths).toHaveLength(3);
    expect(widths.every((w) => w > 0)).toBe(true);
  });

  it("uses fixed width for monospace fonts", () => {
    const monoFont: FontSpec = { fontFamily: "Courier", fontSize: 16 };
    const widths = provider.measureCharWidths("ABC", monoFont);

    // All characters should have the same width
    expect(widths[0]).toBe(widths[1]);
    expect(widths[1]).toBe(widths[2]);
  });

  it("accounts for letter spacing", () => {
    const fontWithSpacing: FontSpec = {
      fontFamily: "sans-serif",
      fontSize: 16,
      letterSpacing: 2,
    };
    const withSpacing = provider.measureText("Hello", fontWithSpacing);
    const withoutSpacing = provider.measureText("Hello", font);

    expect(withSpacing.width).toBeGreaterThan(withoutSpacing.width);
  });
});

describe("TextMeasurer", () => {
  let mockProvider: MeasurementProvider;
  let measurer: TextMeasurer;

  beforeEach(() => {
    mockProvider = {
      measureText: vi.fn().mockReturnValue({
        width: 50,
        height: 20,
        ascent: 16,
        descent: 4,
      }),
      measureCharWidths: vi.fn().mockImplementation((text: string) =>
        Array(text.length).fill(10)
      ),
    };
    measurer = new TextMeasurer({ provider: mockProvider });
  });

  it("measures single line text", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const result = measurer.measureText("Hello", font);

    expect(result.width).toBe(50);
    expect(mockProvider.measureText).toHaveBeenCalledWith("Hello", font);
  });

  it("measures multi-line text with line breaking", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const result = measurer.measureMultiLine("Hello World", font, {
      maxWidth: 55,
    });

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].text).toBe("Hello");
    expect(result.lines[1].text).toBe("World");
  });

  it("calculates total height based on line count", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const result = measurer.measureMultiLine("A B C", font, { maxWidth: 15 });

    expect(result.totalHeight).toBe(result.lines.length * result.lineHeight);
  });

  it("measures substring", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const width = measurer.measureSubstring("Hello World", 0, 5, font);

    expect(mockProvider.measureText).toHaveBeenCalledWith("Hello", font);
  });

  it("finds character index at x position", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };

    // Each char is 10px wide, so position 25 should be in the 3rd character
    const index = measurer.findCharIndexAtX("ABCDE", 25, font);

    expect(index).toBe(2); // 0-indexed, should be "C"
  });

  it("returns 0 for negative x", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const index = measurer.findCharIndexAtX("ABC", -10, font);

    expect(index).toBe(0);
  });

  it("returns text length for x beyond text", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const index = measurer.findCharIndexAtX("ABC", 100, font);

    expect(index).toBe(3);
  });

  it("gets character x position", () => {
    const font: FontSpec = { fontFamily: "Arial", fontSize: 16 };
    const x = measurer.getCharX("Hello", 2, font);

    expect(mockProvider.measureText).toHaveBeenCalledWith("He", font);
  });
});

describe("createTextMeasurer", () => {
  it("creates a text measurer with default config", () => {
    const measurer = createTextMeasurer();

    expect(measurer).toBeInstanceOf(TextMeasurer);
  });

  it("accepts custom line break mode", () => {
    const measurer = createTextMeasurer({ defaultLineBreakMode: "word" });

    expect(measurer).toBeInstanceOf(TextMeasurer);
  });
});

describe("CJK text handling", () => {
  const provider = new FallbackMeasurementProvider();
  const font: FontSpec = { fontFamily: "sans-serif", fontSize: 16 };

  it("breaks at CJK character boundaries", () => {
    const text = "日本語テスト";
    const charWidths = Array(6).fill(16); // CJK chars are typically full-width

    const lines = breakLinesAuto(text, charWidths, 48);

    // Should break every 3 characters
    expect(lines.length).toBeGreaterThan(1);
  });

  it("handles mixed CJK and Latin text", () => {
    const text = "Hello世界";
    const charWidths = [10, 10, 10, 10, 10, 16, 16]; // Latin + 2 CJK

    const lines = breakLinesAuto(text, charWidths, 50);

    // Should keep "Hello" together but may break before CJK
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});

describe("edge cases", () => {
  it("handles text with only whitespace", () => {
    const text = "   ";
    const charWidths = [10, 10, 10];

    const lines = breakLinesWord(text, charWidths, 100);

    // Whitespace-only should produce one empty line
    expect(lines).toHaveLength(1);
  });

  it("handles text with only newlines", () => {
    const text = "\n\n";
    const charWidths = [0, 0];

    const lines = breakLinesWord(text, charWidths, 100);

    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("handles very long single word", () => {
    const text = "Supercalifragilisticexpialidocious";
    const charWidths = Array(text.length).fill(10);

    const lines = breakLinesAuto(text, charWidths, 50);

    // Should break the word into multiple lines
    expect(lines.length).toBeGreaterThan(1);
    // Each line should fit within max width
    for (const line of lines) {
      expect(line.width).toBeLessThanOrEqual(50);
    }
  });
});
