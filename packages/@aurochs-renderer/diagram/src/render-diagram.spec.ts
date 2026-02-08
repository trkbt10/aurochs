/**
 * @file Diagram renderer tests
 */

import { renderDiagram, renderDiagramPlaceholder } from "./render-diagram";
import type { DiagramContent, DiagramRenderContext, WarningCollector } from "./types";

function createWarningCollector(): WarningCollector {
  const warnings: { type: "unsupported" | "fallback" | "error"; message: string; element?: string; details?: string }[] = [];
  return {
    add: (w) => warnings.push(w),
    getAll: () => warnings,
    hasErrors: () => warnings.some((w) => w.type === "error"),
  };
}

describe("renderDiagram", () => {
  it("returns empty string and adds warning for empty diagram", () => {
    const warnings = createWarningCollector();
    const ctx: DiagramRenderContext<{ id: string }, string> = {
      renderShape: (s) => `<span>${s.id}</span>`,
      getResource: () => undefined,
      warnings,
    };
    const diagram: DiagramContent<{ id: string }> = { shapes: [] };

    const result = renderDiagram({ diagram, width: 500, height: 300, ctx });

    expect(result).toBe("");
    expect(warnings.getAll().length).toBeGreaterThan(0);
  });

  it("wraps rendered shapes in a container with dimensions", () => {
    const warnings = createWarningCollector();
    const ctx: DiagramRenderContext<{ id: string }, string> = {
      renderShape: (s) => `<span data-shape-id="${s.id}"></span>`,
      getResource: () => undefined,
      warnings,
    };
    const diagram: DiagramContent<{ id: string }> = { shapes: [{ id: "a" }, { id: "b" }] };

    const result = renderDiagram({ diagram, width: 600, height: 400, ctx });

    expect(result).toContain('class="diagram-content"');
    expect(result).toContain("width: 600px");
    expect(result).toContain("height: 400px");
    expect(result).toContain('data-shape-id="a"');
    expect(result).toContain('data-shape-id="b"');
  });
});

describe("renderDiagramPlaceholder", () => {
  it("renders default placeholder label", () => {
    const result = renderDiagramPlaceholder({ width: 200, height: 100 });
    expect(result).toContain('class="diagram-placeholder"');
    expect(result).toContain("SmartArt Diagram");
  });

  it("renders custom placeholder label", () => {
    const result = renderDiagramPlaceholder({ width: 200, height: 100, message: "Custom" });
    expect(result).toContain("Custom");
  });
});

