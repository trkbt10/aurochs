/**
 * @file Diagram renderer tests
 *
 * Tests for rendering DiagramML content to HTML.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 * @see MS-ODRAWXML - Diagram Layout extensions
 */

// Uses global describe/it/expect from test runner
import { renderDiagram, renderDiagramPlaceholder } from "./diagram";
import type { DiagramContent } from "../../domain";
import { createEmptyRenderContext } from "../context";
import type { SpShape } from "../../domain/shape";
import { px, deg } from "../../domain/types";
import type { BodyProperties, ParagraphProperties } from "../../domain/text";

/**
 * Create a basic shape for testing
 */
function createBodyProperties(): BodyProperties {
  return {
    verticalType: "horz",
    wrapping: "none",
    anchor: "top",
    anchorCenter: false,
    overflow: "overflow",
    verticalOverflow: "overflow",
    autoFit: { type: "none" },
    insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
  };
}

function createParagraphProperties(): ParagraphProperties {
  return {
    level: 0,
    alignment: "left",
  };
}

function createBasicShape(id: string, name: string): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name,
    },
    properties: {
      transform: {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
    },
    textBody: undefined,
    style: undefined,
  };
}

/**
 * Create a diagram shape with modelId and textTransform
 * @see MS-ODRAWXML Section 2.4.2 (dsp:sp)
 */
function createDiagramShape(
  id: string,
  name: string,
  options?: {
    modelId?: string;
    textTransform?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name,
    },
    properties: {
      transform: {
        x: px(0),
        y: px(0),
        width: px(200),
        height: px(200),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "ellipse",
        adjustValues: [],
      },
    },
    textBody: {
      bodyProperties: createBodyProperties(),
      paragraphs: [
        {
          properties: createParagraphProperties(),
          runs: [
            {
              type: "text",
              text: "Diagram Text",
            },
          ],
        },
      ],
    },
    style: undefined,
    modelId: options?.modelId,
    textTransform: buildTextTransform(options?.textTransform),
  };
}

function buildTextTransform(
  transform: { x: number; y: number; width: number; height: number } | undefined
): SpShape["textTransform"] | undefined {
  if (!transform) {
    return undefined;
  }

  return {
    x: px(transform.x),
    y: px(transform.y),
    width: px(transform.width),
    height: px(transform.height),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
}

// =============================================================================
// Diagram Renderer Tests
// =============================================================================

describe("renderDiagram", () => {
  describe("Empty diagram handling", () => {
    it("should add warning and return empty HTML for empty diagram", () => {
      const diagram: DiagramContent = { shapes: [] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 500, 300, ctx);

      // Should return EMPTY_HTML (empty string)
      expect(result).toBe("");
      // Should add a warning
      expect(ctx.warnings.getAll().length).toBeGreaterThan(0);
    });
  });

  describe("Basic diagram rendering", () => {
    it("should render diagram with shapes", () => {
      const shape = createBasicShape("1", "Shape 1");
      const diagram: DiagramContent = { shapes: [shape] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 500, 300, ctx);

      // Should contain diagram-content class
      expect(result).toContain('class="diagram-content"');
      // Should have correct dimensions
      expect(result).toContain("width: 500px");
      expect(result).toContain("height: 300px");
    });

    it("should render multiple shapes", () => {
      const shape1 = createBasicShape("1", "Shape 1");
      const shape2 = createBasicShape("2", "Shape 2");
      const diagram: DiagramContent = { shapes: [shape1, shape2] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 600, 400, ctx);

      // Should contain both shapes (via shape wrapper classes)
      expect(result).toContain("diagram-content");
      // Context should have generated multiple shape IDs
      // (shapes are rendered, so IDs would be generated)
    });
  });

  describe("Container styling", () => {
    it("should apply position relative", () => {
      const shape = createBasicShape("1", "Shape 1");
      const diagram: DiagramContent = { shapes: [shape] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 200, 150, ctx);

      expect(result).toContain("position: relative");
    });

    it("should use provided dimensions", () => {
      const shape = createBasicShape("1", "Shape 1");
      const diagram: DiagramContent = { shapes: [shape] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 800, 600, ctx);

      expect(result).toContain("width: 800px");
      expect(result).toContain("height: 600px");
    });
  });

  describe("MS-ODRAWXML Section 2.4.2 - Diagram shape attributes", () => {
    it("should render diagram shape with modelId", () => {
      const shape = createDiagramShape("1", "Diagram Shape 1", {
        modelId: "{DB1843D3-471D-3D4F-8D9B-C7F506BC5FEE}",
      });
      const diagram: DiagramContent = { shapes: [shape] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 500, 300, ctx);

      // Shape should be rendered
      expect(result).toContain("diagram-content");
      expect(result).toContain("Diagram Text");
    });

    it("should render diagram shape with textTransform", () => {
      const shape = createDiagramShape("2", "Text Transform Shape", {
        textTransform: { x: 50, y: 50, width: 100, height: 50 },
      });
      const diagram: DiagramContent = { shapes: [shape] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 500, 300, ctx);

      // Shape should be rendered with text
      expect(result).toContain("Diagram Text");
      // The text-body should use textTransform dimensions
      expect(result).toContain("text-body");
    });

    it("should render diagram shape with both modelId and textTransform", () => {
      const shape = createDiagramShape("3", "Combined Shape", {
        modelId: "{COMBINED-GUID}",
        textTransform: { x: 25, y: 25, width: 150, height: 75 },
      });
      const diagram: DiagramContent = { shapes: [shape] };
      const ctx = createEmptyRenderContext();

      const result = renderDiagram(diagram, 500, 300, ctx);

      expect(result).toContain("diagram-content");
      expect(result).toContain("Diagram Text");
    });
  });
});

describe("renderDiagramPlaceholder", () => {
  describe("Basic placeholder rendering", () => {
    it("should render placeholder with dimensions", () => {
      const result = renderDiagramPlaceholder(400, 300);

      expect(result).toContain('class="diagram-placeholder"');
      expect(result).toContain("width: 400px");
      expect(result).toContain("height: 300px");
    });

    it("should display default message", () => {
      const result = renderDiagramPlaceholder(400, 300);

      expect(result).toContain("SmartArt Diagram");
    });

    it("should display custom message when provided", () => {
      const result = renderDiagramPlaceholder(400, 300, "Custom Message");

      expect(result).toContain("Custom Message");
    });
  });

  describe("Placeholder styling", () => {
    it("should apply flex centering", () => {
      const result = renderDiagramPlaceholder(200, 100);

      expect(result).toContain("display: flex");
      expect(result).toContain("align-items: center");
      expect(result).toContain("justify-content: center");
    });

    it("should have background color", () => {
      const result = renderDiagramPlaceholder(200, 100);

      expect(result).toContain("background: #f5f5f5");
    });

    it("should have border", () => {
      const result = renderDiagramPlaceholder(200, 100);

      expect(result).toContain("border: 1px solid #ddd");
    });

    it("should have muted text color", () => {
      const result = renderDiagramPlaceholder(200, 100);

      expect(result).toContain("color: #999");
    });
  });
});
