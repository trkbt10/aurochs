/**
 * @file WordprocessingShape Component Tests
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WordprocessingShape } from "./WordprocessingShape";
import type { DocxWordprocessingShape } from "@aurochs-office/docx/domain/drawing";
import { emu } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockShape(overrides?: Partial<DocxWordprocessingShape>): DocxWordprocessingShape {
  return {
    ...overrides,
  };
}

function renderShape(props: {
  shape?: DocxWordprocessingShape;
  width?: number;
  height?: number;
  idPrefix?: string;
}): string {
  const element = createElement(WordprocessingShape, {
    shape: props.shape ?? createMockShape(),
    width: props.width ?? 100,
    height: props.height ?? 100,
    idPrefix: props.idPrefix,
  });
  return renderToStaticMarkup(element);
}

// =============================================================================
// Tests
// =============================================================================

describe("WordprocessingShape", () => {
  describe("basic rendering", () => {
    it("renders a default rectangle shape", () => {
      const html = renderShape({});

      expect(html).toContain("<path");
      expect(html).toContain('data-element-type="wordprocessing-shape"');
    });

    it("renders with correct dimensions for rectangle", () => {
      const html = renderShape({ width: 200, height: 150 });

      expect(html).toContain("M 0 0 L 200 0 L 200 150 L 0 150 Z");
    });
  });

  describe("preset geometry", () => {
    it("renders rectangle preset", () => {
      const shape = createMockShape({
        spPr: { prstGeom: "rect" },
      });
      const html = renderShape({ shape, width: 100, height: 50 });

      expect(html).toContain("M 0 0 L 100 0 L 100 50 L 0 50 Z");
    });

    it("renders ellipse preset", () => {
      const shape = createMockShape({
        spPr: { prstGeom: "ellipse" },
      });
      const html = renderShape({ shape, width: 100, height: 100 });

      expect(html).toContain("<path");
      expect(html).toContain('d="M 50 0');
    });

    it("renders triangle preset", () => {
      const shape = createMockShape({
        spPr: { prstGeom: "triangle" },
      });
      const html = renderShape({ shape, width: 100, height: 100 });

      expect(html).toContain("M 50 0 L 100 100 L 0 100 Z");
    });

    it("renders diamond preset", () => {
      const shape = createMockShape({
        spPr: { prstGeom: "diamond" },
      });
      const html = renderShape({ shape, width: 100, height: 100 });

      expect(html).toContain("M 50 0 L 100 50 L 50 100 L 0 50 Z");
    });
  });

  describe("fill", () => {
    it("applies solid fill color", () => {
      const shape = createMockShape({
        spPr: {
          solidFill: "FF0000",
        },
      });
      const html = renderShape({ shape });

      expect(html).toContain('fill="#FF0000"');
    });

    it("applies no fill when specified", () => {
      const shape = createMockShape({
        spPr: { noFill: true },
      });
      const html = renderShape({ shape });

      expect(html).toContain('fill="none"');
    });

    it("uses default white fill when not specified", () => {
      const html = renderShape({});

      expect(html).toContain('fill="#ffffff"');
    });
  });

  describe("line (stroke)", () => {
    it("applies solid line color", () => {
      const shape = createMockShape({
        spPr: {
          ln: { solidFill: "0000FF" },
        },
      });
      const html = renderShape({ shape });

      expect(html).toContain('stroke="#0000FF"');
    });

    it("applies no stroke when noFill specified", () => {
      const shape = createMockShape({
        spPr: {
          ln: { noFill: true },
        },
      });
      const html = renderShape({ shape });

      expect(html).toContain('stroke="none"');
    });

    it("applies line width", () => {
      const shape = createMockShape({
        spPr: {
          // 9525 EMU = 1 pt = ~1.33 px (96 / 914400 * 9525 ≈ 1)
          ln: { w: emu(9525) },
        },
      });
      const html = renderShape({ shape });

      // Should have a stroke-width close to 1
      expect(html).toMatch(/stroke-width="[\d.]+"/);
    });
  });

  describe("textbox", () => {
    it("indicates when shape has textbox content", () => {
      const shape = createMockShape({
        txbx: {
          content: [{ type: "paragraph", content: [], properties: {} }],
        },
      });
      const html = renderShape({ shape });

      expect(html).toContain('data-has-textbox="true"');
      expect(html).toContain('data-element-type="textbox"');
    });

    it("indicates when shape has no textbox", () => {
      const html = renderShape({});

      expect(html).toContain('data-has-textbox="false"');
    });
  });
});
