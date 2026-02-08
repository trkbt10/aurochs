import { describe, it, expect } from "vitest";
import { renderSlideMermaid } from "./slide-renderer";

describe("renderSlideMermaid", () => {
  it("renders text shapes as plain text", () => {
    const result = renderSlideMermaid({
      shapes: [{ name: "Title", type: "sp", text: "Hello World" }],
    });
    expect(result).toBe("Hello World");
  });

  it("renders placeholder shapes", () => {
    const result = renderSlideMermaid({
      shapes: [{ name: "ph", type: "sp", placeholder: { type: "title" } }],
    });
    expect(result).toContain("*[title]*");
  });

  it("renders table content as markdown table", () => {
    const result = renderSlideMermaid({
      shapes: [
        {
          name: "tbl",
          type: "graphicFrame",
          content: {
            type: "table",
            table: {
              rows: 2,
              cols: 2,
              data: [
                { cells: [{ text: "A" }, { text: "B" }] },
                { cells: [{ text: "1" }, { text: "2" }] },
              ],
            },
          },
        },
      ],
    });
    expect(result).toContain("| A | B |");
    expect(result).toContain("| 1 | 2 |");
  });

  it("renders chart content as mermaid fence", () => {
    const result = renderSlideMermaid({
      shapes: [
        {
          name: "chart1",
          type: "graphicFrame",
          content: {
            type: "chart",
            chart: {
              resourceId: "r1",
              chartType: "bar",
              title: "Sales",
              series: [{ values: [10, 20], categories: ["Q1", "Q2"] }],
            },
          },
        },
      ],
    });
    expect(result).toContain("```mermaid");
    expect(result).toContain("xychart-beta");
    expect(result).toContain("bar [10, 20]");
    expect(result).toContain("```");
  });

  it("renders diagram content as mermaid flowchart", () => {
    const result = renderSlideMermaid({
      shapes: [
        {
          name: "diag",
          type: "graphicFrame",
          content: {
            type: "diagram",
            diagram: {
              shapes: [
                { bounds: { x: 0, y: 0, width: 100, height: 50 }, text: "Step 1" },
                { bounds: { x: 0, y: 100, width: 100, height: 50 }, text: "Step 2" },
              ],
            },
          },
        },
      ],
    });
    expect(result).toContain("```mermaid");
    expect(result).toContain("flowchart");
    expect(result).toContain("Step 1");
    expect(result).toContain("-->");
  });

  it("joins multiple shapes with blank lines", () => {
    const result = renderSlideMermaid({
      shapes: [
        { name: "a", type: "sp", text: "First" },
        { name: "b", type: "sp", text: "Second" },
      ],
    });
    expect(result).toBe("First\n\nSecond");
  });

  it("skips shapes without renderable content", () => {
    const result = renderSlideMermaid({
      shapes: [
        { name: "pic", type: "pic" },
        { name: "text", type: "sp", text: "Hello" },
      ],
    });
    expect(result).toBe("Hello");
  });

  it("returns empty string when no shapes have content", () => {
    const result = renderSlideMermaid({
      shapes: [{ name: "pic", type: "pic" }],
    });
    expect(result).toBe("");
  });
});
