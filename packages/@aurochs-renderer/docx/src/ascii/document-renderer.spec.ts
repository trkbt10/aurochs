/** @file Tests for ASCII document renderer */
import { renderDocxAscii } from "./document-renderer";

describe("document-renderer", () => {
  it("renders mixed paragraphs and tables", () => {
    const result = renderDocxAscii({
      blocks: [
        { type: "paragraph", headingLevel: 0, text: "Title" },
        { type: "paragraph", text: "Some body text here." },
        {
          type: "table",
          rows: [
            { cells: [{ text: "A" }, { text: "B" }] },
            { cells: [{ text: "1" }, { text: "2" }] },
          ],
        },
      ],
      width: 40,
    });
    expect(result).toContain("# Title");
    expect(result).toContain("Some body text");
    expect(result).toContain("A");
    expect(result).toContain("1");
  });

  it("renders empty blocks array", () => {
    expect(renderDocxAscii({ blocks: [], width: 40 })).toBe("");
  });

  it("separates blocks with blank lines", () => {
    const result = renderDocxAscii({
      blocks: [
        { type: "paragraph", text: "First" },
        { type: "paragraph", text: "Second" },
      ],
      width: 40,
    });
    expect(result).toContain("\n\n");
  });
});
