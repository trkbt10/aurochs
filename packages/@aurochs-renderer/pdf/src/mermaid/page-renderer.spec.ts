/**
 * @file Tests for PDF Mermaid page renderer
 */

import { renderPdfPageMermaid } from "./page-renderer";
import type { MermaidPdfPage, MermaidPdfTextItem } from "./types";

function makeItem(overrides: Partial<MermaidPdfTextItem> & { text: string }): MermaidPdfTextItem {
  return {
    x: 72,
    y: 700,
    width: 100,
    height: 12,
    fontSize: 12,
    ...overrides,
  };
}

function makePage(
  textItems: MermaidPdfTextItem[],
  overrides?: Partial<Omit<MermaidPdfPage, "textItems">>,
): MermaidPdfPage {
  return {
    pageNumber: 1,
    width: 612,
    height: 792,
    textItems,
    ...overrides,
  };
}

describe("renderPdfPageMermaid", () => {
  it("returns empty string for empty page", () => {
    const result = renderPdfPageMermaid(makePage([]));
    expect(result).toBe("");
  });

  it("renders single text item as plain text", () => {
    const result = renderPdfPageMermaid(
      makePage([makeItem({ text: "Hello World" })]),
    );
    expect(result).toBe("Hello World");
  });

  it("groups items on the same Y coordinate into one line", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Hello", x: 72, y: 700 }),
        makeItem({ text: "World", x: 200, y: 700 }),
      ]),
    );
    expect(result).toBe("Hello World");
  });

  it("separates items on different Y coordinates into different lines", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Line 1", x: 72, y: 700 }),
        makeItem({ text: "Line 2", x: 72, y: 680 }),
      ]),
    );
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
    // Lines should be separated
    const lines = result.split("\n\n");
    expect(lines).toHaveLength(2);
  });

  it("orders lines top-to-bottom (descending Y in PDF coordinates)", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Bottom", x: 72, y: 100 }),
        makeItem({ text: "Top", x: 72, y: 700 }),
      ]),
    );
    const lines = result.split("\n\n");
    expect(lines[0]).toBe("Top");
    expect(lines[1]).toBe("Bottom");
  });

  it("orders items left-to-right within a line", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Right", x: 300, y: 700 }),
        makeItem({ text: "Left", x: 72, y: 700 }),
      ]),
    );
    expect(result).toBe("Left Right");
  });

  it("detects headings from larger font size", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Title", x: 72, y: 750, fontSize: 24, height: 24, isBold: true }),
        makeItem({ text: "Body text here.", x: 72, y: 700, fontSize: 12, height: 12 }),
        makeItem({ text: "More body text.", x: 72, y: 680, fontSize: 12, height: 12 }),
      ]),
    );
    expect(result).toContain("# Title");
    expect(result).toContain("Body text here.");
  });

  it("detects h2 from medium-large font size", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Subtitle", x: 72, y: 750, fontSize: 18, height: 18 }),
        makeItem({ text: "Body text.", x: 72, y: 700, fontSize: 12, height: 12 }),
        makeItem({ text: "More text.", x: 72, y: 680, fontSize: 12, height: 12 }),
      ]),
    );
    expect(result).toContain("## Subtitle");
  });

  it("detects h3 from slightly-large font size", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Subheading", x: 72, y: 750, fontSize: 14, height: 14 }),
        makeItem({ text: "Body text.", x: 72, y: 700, fontSize: 12, height: 12 }),
        makeItem({ text: "More text.", x: 72, y: 680, fontSize: 12, height: 12 }),
      ]),
    );
    expect(result).toContain("### Subheading");
  });

  it("strips bold markers from headings", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Bold Title", x: 72, y: 750, fontSize: 24, height: 24, isBold: true }),
        makeItem({ text: "Normal body.", x: 72, y: 700, fontSize: 12, height: 12 }),
        makeItem({ text: "More body.", x: 72, y: 680, fontSize: 12, height: 12 }),
      ]),
    );
    // Should be "# Bold Title" not "# **Bold Title**"
    expect(result).toContain("# Bold Title");
    expect(result).not.toContain("# **Bold Title**");
  });

  it("renders bold text with ** markers", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Normal", x: 72, y: 700 }),
        makeItem({ text: "Bold", x: 200, y: 700, isBold: true }),
      ]),
    );
    expect(result).toContain("**Bold**");
  });

  it("renders italic text with * markers", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Normal", x: 72, y: 700 }),
        makeItem({ text: "Italic", x: 200, y: 700, isItalic: true }),
      ]),
    );
    expect(result).toContain("*Italic*");
  });

  it("renders bold+italic text with *** markers", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Normal", x: 72, y: 700 }),
        makeItem({ text: "BoldItalic", x: 200, y: 700, isBold: true, isItalic: true }),
      ]),
    );
    expect(result).toContain("***BoldItalic***");
  });

  it("does not insert space when items are adjacent", () => {
    // Two items with no gap (x + width == next x)
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Hel", x: 72, y: 700, width: 30 }),
        makeItem({ text: "lo", x: 102, y: 700, width: 20 }),
      ]),
    );
    expect(result).toBe("Hello");
  });

  it("skips empty text items", () => {
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "  ", x: 72, y: 700 }),
        makeItem({ text: "Visible", x: 72, y: 680 }),
      ]),
    );
    expect(result).toBe("Visible");
  });

  it("groups items with slightly different Y as same line", () => {
    // Items with Y difference less than half the height should be on the same line
    const result = renderPdfPageMermaid(
      makePage([
        makeItem({ text: "Same", x: 72, y: 700, height: 12 }),
        makeItem({ text: "Line", x: 200, y: 703, height: 12 }),
      ]),
    );
    expect(result).toBe("Same Line");
  });
});
