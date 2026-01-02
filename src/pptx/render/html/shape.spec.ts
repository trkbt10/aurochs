/**
 * @file HTML shape rendering tests
 *
 * Tests for converting Shape domain objects to HTML output.
 * Uses same domain object structure as SVG renderer tests.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.43 (sp)
 */

import { renderSpShape, renderPicShape, renderShape } from "./shape";
import type { SpShape, PicShape, Transform } from "../../domain";
import { createEmptyHtmlRenderContext } from "./context";
import { px, deg } from "../../domain/types";

// =============================================================================
// Test Helpers
// =============================================================================

function createTransform(x: number, y: number, width: number, height: number): Transform {
  return {
    x: px(x),
    y: px(y),
    width: px(width),
    height: px(height),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
}

// =============================================================================
// renderSpShape Tests
// =============================================================================

describe("renderSpShape", () => {
  describe("basic rendering", () => {
    it("returns empty for shape without transform", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Shape 1" },
        properties: {},
      };
      const ctx = createEmptyHtmlRenderContext();
      expect(renderSpShape(shape, ctx)).toBe("");
    });

    it("renders rectangle shape with transform", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Rectangle 1" },
        properties: {
          transform: createTransform(0, 0, 100, 50),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      expect(result).toContain('class="shape sp"');
      expect(result).toContain("position: absolute");
      expect(result).toContain("width: 100px");
      expect(result).toContain("height: 50px");
    });

    it("renders shape at specified position", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Positioned Shape" },
        properties: {
          transform: createTransform(50, 100, 200, 150),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      expect(result).toContain("left: 50px");
      expect(result).toContain("top: 100px");
    });
  });

  describe("fill rendering", () => {
    it("renders shape with solid fill", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Filled Shape" },
        properties: {
          transform: createTransform(0, 0, 100, 100),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
          fill: {
            type: "solidFill",
            color: { spec: { type: "srgb", value: "FF0000" } },
          },
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      // Fill applied to SVG path
      expect(result).toContain('fill="#FF0000"');
    });

    it("renders shape with no fill as transparent", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "No Fill Shape" },
        properties: {
          transform: createTransform(0, 0, 100, 100),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
          fill: { type: "noFill" },
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      expect(result).toContain('fill="none"');
    });
  });

  describe("geometry rendering", () => {
    it("renders ellipse shape", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Ellipse" },
        properties: {
          transform: createTransform(0, 0, 100, 80),
          geometry: { type: "preset", preset: "ellipse", adjustValues: [] },
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      // Ellipse creates arc path
      expect(result).toContain("<svg");
      expect(result).toContain("<path");
    });

    it("generates unique shape IDs", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Shape" },
        properties: {
          transform: createTransform(0, 0, 100, 100),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
        },
      };
      const ctx = createEmptyHtmlRenderContext();

      const result1 = renderSpShape(shape, ctx);
      const result2 = renderSpShape(shape, ctx);

      expect(result1).toContain('data-shape-id="shape-0"');
      expect(result2).toContain('data-shape-id="shape-1"');
    });

    it("sets data-ooxml-id attribute for animation targeting", () => {
      // Animation player uses data-ooxml-id to find elements
      // @see src/pptx/animation/player.ts - findElement
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "42", name: "Animated Shape" },
        properties: {
          transform: createTransform(0, 0, 100, 100),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      expect(result).toContain('data-ooxml-id="42"');
    });
  });

  describe("text body rendering", () => {
    it("renders shape with text", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Text Shape" },
        properties: {
          transform: createTransform(0, 0, 200, 100),
          geometry: { type: "preset", preset: "rect", adjustValues: [] },
        },
        textBody: {
          bodyProperties: {
            verticalType: "horz",
            wrapping: "square",
            anchor: "top",
            anchorCenter: false,
            overflow: "overflow",
            autoFit: { type: "none" },
            insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
          },
          paragraphs: [
            {
              properties: { level: 0, alignment: "left" },
              runs: [{ type: "text", text: "Hello World", properties: {} }],
            },
          ],
        },
      };
      const ctx = createEmptyHtmlRenderContext();
      const result = renderSpShape(shape, ctx);

      expect(result).toContain("Hello World");
      expect(result).toContain("text-body");
    });
  });
});

// =============================================================================
// renderPicShape Tests
// =============================================================================

describe("renderPicShape", () => {
  it("returns empty for picture without transform", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "1", name: "Picture 1" },
      blipFill: { resourceId: "rId1" },
      properties: {},
    };
    const ctx = createEmptyHtmlRenderContext();
    expect(renderPicShape(pic, ctx)).toBe("");
  });

  it("renders picture with transform", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "1", name: "Picture 1" },
      blipFill: { resourceId: "rId1" },
      properties: {
        transform: createTransform(10, 20, 300, 200),
      },
    };
    const ctx = createEmptyHtmlRenderContext();
    const result = renderPicShape(pic, ctx);

    // Placeholder shown when resource not resolved
    expect(result).toContain("shape pic");
    expect(result).toContain("width: 300px");
    expect(result).toContain("height: 200px");
  });
});

// =============================================================================
// renderShape Tests (type dispatch)
// =============================================================================

describe("renderShape", () => {
  it("dispatches sp shapes to renderSpShape", () => {
    const shape: SpShape = {
      type: "sp",
      nonVisual: { id: "1", name: "Shape" },
      properties: {
        transform: createTransform(0, 0, 100, 100),
        geometry: { type: "preset", preset: "rect", adjustValues: [] },
      },
    };
    const ctx = createEmptyHtmlRenderContext();
    const result = renderShape(shape, ctx);

    expect(result).toContain('class="shape sp"');
  });

  it("dispatches pic shapes to renderPicShape", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "1", name: "Picture" },
      blipFill: { resourceId: "rId1" },
      properties: {
        transform: createTransform(0, 0, 100, 100),
      },
    };
    const ctx = createEmptyHtmlRenderContext();
    const result = renderShape(pic, ctx);

    // Placeholder shown when resource not resolved
    expect(result).toContain("shape pic");
  });
});
