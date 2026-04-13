/**
 * @file Tests for computeTextLayout and textLayoutToCursorLayout
 */

import { computeTextLayout, textLayoutToCursorLayout } from "./compute-layout";
import type { ExtractedTextProps } from "./types";

// =============================================================================
// Helpers
// =============================================================================

function makeProps(overrides: Partial<ExtractedTextProps> = {}): ExtractedTextProps {
  return {
    transform: undefined,
    characters: "Hello World",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: 400,
    fontStyle: undefined,
    letterSpacing: undefined,
    lineHeight: 20,
    fillPaints: undefined,
    opacity: 1,
    textAlignHorizontal: "LEFT",
    textAlignVertical: "TOP",
    textAutoResize: "WIDTH_AND_HEIGHT",
    textDecoration: "NONE",
    size: { width: 200, height: 40 },
    ...overrides,
  };
}

// =============================================================================
// computeTextLayout
// =============================================================================

describe("computeTextLayout", () => {
  it("produces lines with estimatedWidth", () => {
    const layout = computeTextLayout({ props: makeProps() });
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].text).toBe("Hello World");
    expect(layout.lines[0].estimatedWidth).toBeGreaterThan(0);
  });

  it("estimatedWidth scales with character count", () => {
    const short = computeTextLayout({ props: makeProps({ characters: "Hi" }) });
    const long = computeTextLayout({ props: makeProps({ characters: "Hello World Long Text" }) });
    expect(long.lines[0].estimatedWidth).toBeGreaterThan(short.lines[0].estimatedWidth);
  });

  it("multiline text produces multiple lines", () => {
    const layout = computeTextLayout({
      props: makeProps({ characters: "Line1\nLine2\nLine3" }),
    });
    expect(layout.lines).toHaveLength(3);
    expect(layout.lines[0].text).toBe("Line1");
    expect(layout.lines[1].text).toBe("Line2");
    expect(layout.lines[2].text).toBe("Line3");
  });

  it("CENTER alignment sets x to width/2", () => {
    const layout = computeTextLayout({
      props: makeProps({ textAlignHorizontal: "CENTER" }),
    });
    expect(layout.lines[0].x).toBe(100); // 200/2
  });

  it("RIGHT alignment sets x to width", () => {
    const layout = computeTextLayout({
      props: makeProps({ textAlignHorizontal: "RIGHT" }),
    });
    expect(layout.lines[0].x).toBe(200);
  });
});

// =============================================================================
// textLayoutToCursorLayout
// =============================================================================

describe("textLayoutToCursorLayout", () => {
  it("LEFT alignment: leftX equals line.x", () => {
    const layout = computeTextLayout({ props: makeProps() });
    const cursor = textLayoutToCursorLayout(layout);

    expect(cursor.paragraphs).toHaveLength(1);
    const line = cursor.paragraphs[0].lines[0];
    expect(line.x).toBe(layout.lines[0].x);
    expect(line.spans[0].width).toBe(layout.lines[0].estimatedWidth);
  });

  it("CENTER alignment: leftX = anchorX - width/2", () => {
    const layout = computeTextLayout({
      props: makeProps({ textAlignHorizontal: "CENTER" }),
    });
    const cursor = textLayoutToCursorLayout(layout);

    const line = cursor.paragraphs[0].lines[0];
    const anchorX = layout.lines[0].x; // 100 (width/2)
    const textWidth = layout.lines[0].estimatedWidth;
    expect(line.x).toBeCloseTo(anchorX - textWidth / 2, 5);
  });

  it("RIGHT alignment: leftX = anchorX - width", () => {
    const layout = computeTextLayout({
      props: makeProps({ textAlignHorizontal: "RIGHT" }),
    });
    const cursor = textLayoutToCursorLayout(layout);

    const line = cursor.paragraphs[0].lines[0];
    const anchorX = layout.lines[0].x; // 200 (width)
    const textWidth = layout.lines[0].estimatedWidth;
    expect(line.x).toBeCloseTo(anchorX - textWidth, 5);
  });

  it("uses provided getLineTextWidth for accurate measurement", () => {
    const layout = computeTextLayout({ props: makeProps() });
    const measuredWidth = 78.5; // fake precise measurement
    const cursor = textLayoutToCursorLayout(layout, () => measuredWidth);

    const span = cursor.paragraphs[0].lines[0].spans[0];
    expect(span.width).toBe(measuredWidth);
  });

  it("newline-separated text: each \\n segment becomes a separate paragraph", () => {
    const layout = computeTextLayout({
      props: makeProps({ characters: "AA\nBBBB" }),
    });
    const cursor = textLayoutToCursorLayout(layout);

    expect(cursor.paragraphs).toHaveLength(2);
    expect(cursor.paragraphs[0].lines[0].spans[0].text).toBe("AA");
    expect(cursor.paragraphs[1].lines[0].spans[0].text).toBe("BBBB");
    // Line 2 has more characters → wider estimated width
    expect(cursor.paragraphs[1].lines[0].spans[0].width).toBeGreaterThan(
      cursor.paragraphs[0].lines[0].spans[0].width,
    );
  });

  it("word-wrapped text: wrapped lines stay within the same paragraph", () => {
    // Use a narrow box (60px) with fontSize 16 to force wrapping.
    // "Hello World" at ~0.55 * 16 = 8.8px/char → "Hello " = 6 chars = 52.8px fits,
    // "World" wraps to second line. Both belong to paragraph 0.
    const layout = computeTextLayout({
      props: makeProps({
        characters: "Hello World",
        size: { width: 60, height: 100 },
        textAutoResize: "NONE",
      }),
    });

    // Should have produced multiple layout lines from a single paragraph
    expect(layout.lines.length).toBeGreaterThan(1);
    // All lines should have paragraphIndex 0
    for (const line of layout.lines) {
      expect(line.paragraphIndex).toBe(0);
    }

    const cursor = textLayoutToCursorLayout(layout);
    // Single paragraph with multiple lines
    expect(cursor.paragraphs).toHaveLength(1);
    expect(cursor.paragraphs[0].lines.length).toBeGreaterThan(1);
  });

  it("mixed newlines and wrapping: paragraphs match \\n segments", () => {
    // "AAAA BBBB\nCC" with width 50 → paragraph 0 wraps into 2+ lines,
    // paragraph 1 stays as 1 line.
    const layout = computeTextLayout({
      props: makeProps({
        characters: "AAAA BBBB\nCC",
        size: { width: 50, height: 100 },
        textAutoResize: "NONE",
      }),
    });

    const cursor = textLayoutToCursorLayout(layout);
    // Exactly 2 paragraphs (matching the 2 \n-delimited segments)
    expect(cursor.paragraphs).toHaveLength(2);
    // First paragraph has multiple lines due to wrapping
    expect(cursor.paragraphs[0].lines.length).toBeGreaterThanOrEqual(2);
    // Second paragraph has 1 line ("CC" fits in 50px)
    expect(cursor.paragraphs[1].lines).toHaveLength(1);
    expect(cursor.paragraphs[1].lines[0].spans[0].text).toBe("CC");
  });

  it("span.height equals layout.lineHeight", () => {
    const layout = computeTextLayout({ props: makeProps() });
    const cursor = textLayoutToCursorLayout(layout);

    expect(cursor.paragraphs[0].lines[0].height).toBe(layout.lineHeight);
  });

  it("span.fontSize equals layout.fontSize", () => {
    const layout = computeTextLayout({ props: makeProps({ fontSize: 24 }) });
    const cursor = textLayoutToCursorLayout(layout);

    expect(cursor.paragraphs[0].lines[0].spans[0].fontSize).toBe(24);
  });
});
