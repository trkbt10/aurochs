import { describe, it, expect } from "vitest";
import { renderDiagramMermaid } from "./diagram-renderer";

describe("renderDiagramMermaid", () => {
  it("returns empty string for no shapes", () => {
    expect(renderDiagramMermaid({ shapes: [] })).toBe("");
  });

  it("renders shapes as fenced mermaid flowchart", () => {
    const result = renderDiagramMermaid({
      shapes: [
        { id: "a", text: "Start" },
        { id: "b", text: "End" },
      ],
    });
    expect(result).toMatch(/^```mermaid\n/);
    expect(result).toMatch(/\n```$/);
    expect(result).toContain("flowchart");
    expect(result).toContain('a["Start"]');
    expect(result).toContain("a --> b");
  });

  it("renders single shape without arrows", () => {
    const result = renderDiagramMermaid({
      shapes: [{ id: "only", text: "Solo" }],
    });
    expect(result).toContain('only["Solo"]');
    expect(result).not.toContain("-->");
  });
});
