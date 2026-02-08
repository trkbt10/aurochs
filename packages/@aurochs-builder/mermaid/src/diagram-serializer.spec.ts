import { describe, it, expect } from "vitest";
import { serializeDiagramToMermaid } from "./diagram-serializer";

describe("serializeDiagramToMermaid", () => {
  it("returns empty string for no shapes", () => {
    expect(serializeDiagramToMermaid({ shapes: [] })).toBe("");
  });

  it("renders a single shape", () => {
    const result = serializeDiagramToMermaid({
      shapes: [{ id: "s1", text: "Start" }],
    });
    expect(result).toContain("flowchart TD");
    expect(result).toContain('s1["Start"]');
    expect(result).not.toContain("-->");
  });

  it("connects shapes sequentially", () => {
    const result = serializeDiagramToMermaid({
      shapes: [
        { id: "a", text: "Step A" },
        { id: "b", text: "Step B" },
        { id: "c", text: "Step C" },
      ],
    });
    expect(result).toContain("a --> b");
    expect(result).toContain("b --> c");
  });

  it("infers LR direction for horizontal layout", () => {
    const result = serializeDiagramToMermaid({
      shapes: [
        { id: "a", text: "Left", bounds: { x: 0, y: 0, width: 100, height: 50 } },
        { id: "b", text: "Right", bounds: { x: 200, y: 0, width: 100, height: 50 } },
      ],
    });
    expect(result).toContain("flowchart LR");
  });

  it("infers TD direction for vertical layout", () => {
    const result = serializeDiagramToMermaid({
      shapes: [
        { id: "a", text: "Top", bounds: { x: 0, y: 0, width: 100, height: 50 } },
        { id: "b", text: "Bottom", bounds: { x: 0, y: 200, width: 100, height: 50 } },
      ],
    });
    expect(result).toContain("flowchart TD");
  });

  it("sanitizes shape IDs", () => {
    const result = serializeDiagramToMermaid({
      shapes: [{ id: "shape-1", text: "Hello" }],
    });
    expect(result).toContain('shape_1["Hello"]');
  });

  it("uses id as label when text is missing", () => {
    const result = serializeDiagramToMermaid({
      shapes: [{ id: "myNode" }],
    });
    expect(result).toContain('myNode["myNode"]');
  });
});
