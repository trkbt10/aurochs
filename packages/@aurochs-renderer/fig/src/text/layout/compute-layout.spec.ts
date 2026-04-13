/**
 * @file Tests for computeTextLayout and textLayoutToCursorLayout
 */

import { describe, it, expect } from "vitest";
import { computeTextLayout, textLayoutToCursorLayout, type TextLayout } from "./compute-layout";
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

  it("multiline: each line becomes a separate paragraph", () => {
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
