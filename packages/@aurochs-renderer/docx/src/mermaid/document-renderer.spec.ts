import { describe, it, expect } from "vitest";
import { renderDocxMermaid } from "./document-renderer";

describe("renderDocxMermaid", () => {
  it("renders plain paragraphs", () => {
    const result = renderDocxMermaid({
      blocks: [
        { type: "paragraph", text: "Hello world" },
        { type: "paragraph", text: "Second paragraph" },
      ],
    });
    expect(result).toBe("Hello world\n\nSecond paragraph");
  });

  it("renders headings with markdown syntax", () => {
    const result = renderDocxMermaid({
      blocks: [
        { type: "paragraph", headingLevel: 0, text: "Title" },
        { type: "paragraph", headingLevel: 1, text: "Subtitle" },
      ],
    });
    expect(result).toContain("# Title");
    expect(result).toContain("## Subtitle");
  });

  it("renders numbered lists", () => {
    const result = renderDocxMermaid({
      blocks: [
        { type: "paragraph", numbering: { numId: 1, level: 0 }, text: "First" },
        { type: "paragraph", numbering: { numId: 1, level: 1 }, text: "Nested" },
      ],
    });
    expect(result).toContain("1. First");
    expect(result).toContain("  1. Nested");
  });

  it("renders tables as markdown tables", () => {
    const result = renderDocxMermaid({
      blocks: [
        {
          type: "table",
          rows: [
            { cells: [{ text: "Name" }, { text: "Age" }] },
            { cells: [{ text: "Alice" }, { text: "30" }] },
          ],
        },
      ],
    });
    expect(result).toContain("| Name | Age |");
    expect(result).toContain("| Alice | 30 |");
  });

  it("skips empty paragraphs", () => {
    const result = renderDocxMermaid({
      blocks: [
        { type: "paragraph", text: "" },
        { type: "paragraph", text: "Content" },
      ],
    });
    expect(result).toBe("Content");
  });

  it("returns empty string for empty blocks", () => {
    expect(renderDocxMermaid({ blocks: [] })).toBe("");
  });

  it("caps heading level at 6", () => {
    const result = renderDocxMermaid({
      blocks: [{ type: "paragraph", headingLevel: 8, text: "Deep" }],
    });
    expect(result).toBe("###### Deep");
  });
});
