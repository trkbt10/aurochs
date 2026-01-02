/**
 * @file SVG Diagram renderer tests
 *
 * Tests for rendering DiagramML content to SVG.
 * These tests verify the diagram rendering in the SVG slide renderer.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 * @see MS-ODRAWXML Section 2.4 - Diagram Drawing Elements
 */

import { renderSlideSvg } from "../svg/renderer";
import { createRenderContext, type RenderContext, type ResourceResolver } from "../context";
import type { Slide, GraphicFrame } from "../../domain";
import { px, deg } from "../../domain/types";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal Slide with a diagram graphic frame
 */
function createSlideWithDiagram(diagramFrame: GraphicFrame): Slide {
  return {
    shapes: [diagramFrame],
    background: undefined,
  };
}

/**
 * Create a diagram graphic frame for testing
 */
function createDiagramFrame(transform: { x: number; y: number; width: number; height: number }): GraphicFrame {
  return {
    type: "graphicFrame",
    nonVisual: {
      id: "diagram-1",
      name: "Diagram 1",
    },
    transform: {
      x: px(transform.x),
      y: px(transform.y),
      width: px(transform.width),
      height: px(transform.height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "diagram",
      data: {},
    },
  };
}

/**
 * Create a mock RenderContext with diagram drawing support
 */
function createMockContextWithDiagram(diagramXml: string, slideWidth = 960, slideHeight = 720): RenderContext {
  const encoder = new TextEncoder();

  const resourceResolver: ResourceResolver = {
    resolve: () => undefined,
    getMimeType: () => undefined,
    getFilePath: () => undefined,
    getResourceByType: (type: string) => {
      if (type === "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing") {
        return "ppt/diagrams/drawing1.xml";
      }
      return undefined;
    },
    readFile: (path: string) => {
      if (path === "ppt/diagrams/drawing1.xml") {
        return encoder.encode(diagramXml);
      }
      return null;
    },
  };

  return createRenderContext({
    slideSize: { width: px(slideWidth), height: px(slideHeight) },
    colorContext: {
      colorScheme: {
        lt1: "FFFFFF",
        dk1: "000000",
        lt2: "EEEEEE",
        dk2: "1F497D",
        accent1: "4F81BD",
        accent2: "C0504D",
        accent3: "9BBB59",
        accent4: "8064A2",
        accent5: "4BACC6",
        accent6: "F79646",
        hlink: "0000FF",
        folHlink: "800080",
      },
      colorMap: {
        bg1: "lt1",
        tx1: "dk1",
        bg2: "lt2",
        tx2: "dk2",
        accent1: "accent1",
        accent2: "accent2",
        accent3: "accent3",
        accent4: "accent4",
        accent5: "accent5",
        accent6: "accent6",
        hlink: "hlink",
        folHlink: "folHlink",
      },
    },
    resources: resourceResolver,
  });
}

/**
 * Create a context without diagram drawing (for fallback testing)
 */
function createMockContextNoDiagram(slideWidth = 960, slideHeight = 720): RenderContext {
  const resourceResolver: ResourceResolver = {
    resolve: () => undefined,
    getMimeType: () => undefined,
    getFilePath: () => undefined,
    getResourceByType: () => undefined,
    readFile: () => null,
  };

  return createRenderContext({
    slideSize: { width: px(slideWidth), height: px(slideHeight) },
    colorContext: {
      colorScheme: {
        lt1: "FFFFFF",
        dk1: "000000",
        accent1: "4F81BD",
      },
      colorMap: {
        bg1: "lt1",
        tx1: "dk1",
        accent1: "accent1",
      },
    },
    resources: resourceResolver,
  });
}

// =============================================================================
// Diagram Drawing XML Templates
// =============================================================================

/**
 * Generate a minimal diagram drawing XML with a single shape
 * @see MS-ODRAWXML Section 2.4.2 (dsp:sp)
 */
function createDiagramDrawingXml(shapes: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dsp:drawing xmlns:dsp="http://schemas.microsoft.com/office/drawing/2008/diagram"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <dsp:spTree>
    <dsp:nvGrpSpPr>
      <dsp:cNvPr id="0" name=""/>
      <dsp:cNvGrpSpPr/>
    </dsp:nvGrpSpPr>
    <dsp:grpSpPr/>
    ${shapes.join("\n")}
  </dsp:spTree>
</dsp:drawing>`;
}

/**
 * Create a basic rectangle shape XML
 */
function createRectShapeXml(
  id: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  fillColor = "4F81BD",
): string {
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"/>
    <a:solidFill>
      <a:srgbClr val="${fillColor}"/>
    </a:solidFill>
  </dsp:spPr>
</dsp:sp>`;
}

/**
 * Create a shape with text XML
 */
function createShapeWithTextXml(
  id: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  text: string,
): string {
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="roundRect"/>
    <a:solidFill>
      <a:srgbClr val="4F81BD"/>
    </a:solidFill>
  </dsp:spPr>
  <dsp:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr lang="en-US"/>
        <a:t>${text}</a:t>
      </a:r>
    </a:p>
  </dsp:txBody>
</dsp:sp>`;
}

/**
 * Create a shape with textTransform (dsp:txXfrm)
 * @see MS-ODRAWXML Section 2.4.4
 */
function createShapeWithTextTransformXml(
  id: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  txX: number,
  txY: number,
  txCx: number,
  txCy: number,
  text: string,
): string {
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="ellipse"/>
    <a:solidFill>
      <a:srgbClr val="C0504D"/>
    </a:solidFill>
  </dsp:spPr>
  <dsp:txXfrm>
    <a:off x="${txX}" y="${txY}"/>
    <a:ext cx="${txCx}" cy="${txCy}"/>
  </dsp:txXfrm>
  <dsp:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr lang="en-US"/>
        <a:t>${text}</a:t>
      </a:r>
    </a:p>
  </dsp:txBody>
</dsp:sp>`;
}

/**
 * Create a shape with rotation
 */
function createRotatedShapeXml(
  id: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  rotation: number,
): string {
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm rot="${rotation}">
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"/>
    <a:solidFill>
      <a:srgbClr val="9BBB59"/>
    </a:solidFill>
  </dsp:spPr>
</dsp:sp>`;
}

/**
 * Create a shape with flipH/flipV
 */
function createFlippedShapeXml(
  id: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  flipH: boolean,
  flipV: boolean,
): string {
  const flipHAttr = flipH ? ' flipH="1"' : "";
  const flipVAttr = flipV ? ' flipV="1"' : "";
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm${flipHAttr}${flipVAttr}>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rightArrow"/>
    <a:solidFill>
      <a:srgbClr val="F79646"/>
    </a:solidFill>
  </dsp:spPr>
</dsp:sp>`;
}

/**
 * Create a shape with noFill
 */
function createNoFillShapeXml(id: string, name: string, x: number, y: number, cx: number, cy: number): string {
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"/>
    <a:noFill/>
    <a:ln w="12700">
      <a:solidFill>
        <a:srgbClr val="000000"/>
      </a:solidFill>
    </a:ln>
  </dsp:spPr>
</dsp:sp>`;
}

/**
 * Create a shape with gradient fill
 */
function createGradientShapeXml(id: string, name: string, x: number, y: number, cx: number, cy: number): string {
  return `<dsp:sp modelId="{${id}}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"/>
    <a:gradFill>
      <a:gsLst>
        <a:gs pos="0">
          <a:srgbClr val="4F81BD"/>
        </a:gs>
        <a:gs pos="100000">
          <a:srgbClr val="1F497D"/>
        </a:gs>
      </a:gsLst>
      <a:lin ang="5400000"/>
    </a:gradFill>
  </dsp:spPr>
</dsp:sp>`;
}

/**
 * Create a group shape with children
 * @see MS-ODRAWXML Section 2.4.3 (dsp:grpSp)
 */
function createGroupShapeXml(
  id: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  children: string[],
): string {
  return `<dsp:grpSp>
  <dsp:nvGrpSpPr>
    <dsp:cNvPr id="${id}" name="${name}"/>
    <dsp:cNvGrpSpPr/>
  </dsp:nvGrpSpPr>
  <dsp:grpSpPr>
    <a:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
      <a:chOff x="0" y="0"/>
      <a:chExt cx="${cx}" cy="${cy}"/>
    </a:xfrm>
  </dsp:grpSpPr>
  ${children.join("\n")}
</dsp:grpSp>`;
}

// =============================================================================
// Tests
// =============================================================================

describe("SVG Diagram Renderer", () => {
  describe("Fallback handling", () => {
    it("should render placeholder when diagram drawing not available", () => {
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextNoDiagram();

      const result = renderSlideSvg(slide, ctx);

      // Should contain placeholder
      expect(result.svg).toContain("[Diagram]");
      expect(result.svg).toContain('fill="#f0f0f0"');
      // Should have fallback warning
      const warnings = ctx.warnings.getAll();
      expect(warnings.some((w) => w.type === "fallback")).toBe(true);
    });

    it("should render placeholder when diagram XML is empty", () => {
      const emptyXml = createDiagramDrawingXml([]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(emptyXml);

      renderSlideSvg(slide, ctx);

      // Should have warning for empty diagram
      const warnings = ctx.warnings.getAll();
      expect(warnings.some((w) => w.message?.includes("no shapes"))).toBe(true);
    });
  });

  describe("Basic shape rendering", () => {
    it("should render single rectangle shape", () => {
      const shapeXml = createRectShapeXml("1", "Rect 1", 0, 0, 914400, 914400);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain path element (from preset geometry)
      expect(result.svg).toContain("<path");
      // Should NOT contain placeholder
      expect(result.svg).not.toContain("[Diagram]");
    });

    it("should render multiple shapes", () => {
      const shape1 = createRectShapeXml("1", "Rect 1", 0, 0, 914400, 457200, "4F81BD");
      const shape2 = createRectShapeXml("2", "Rect 2", 914400, 0, 914400, 457200, "C0504D");
      const shape3 = createRectShapeXml("3", "Rect 3", 1828800, 0, 914400, 457200, "9BBB59");
      const diagramXml = createDiagramDrawingXml([shape1, shape2, shape3]);
      const diagramFrame = createDiagramFrame({ x: 50, y: 50, width: 600, height: 400 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain multiple path elements
      const pathMatches = result.svg.match(/<path/g) ?? [];
      expect(pathMatches.length).toBeGreaterThanOrEqual(3);
      // Should have different fill colors
      expect(result.svg).toContain("#4F81BD");
      expect(result.svg).toContain("#C0504D");
      expect(result.svg).toContain("#9BBB59");
    });
  });

  describe("Text rendering in diagrams", () => {
    it("should render shape with text content", () => {
      const shapeXml = createShapeWithTextXml("1", "Text Shape", 0, 0, 914400, 457200, "Hello Diagram");
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain text element with content
      // Note: Text may be wrapped into multiple lines
      expect(result.svg).toContain("<text");
      expect(result.svg).toContain("Hello");
    });

    it("should render shape with special characters in text", () => {
      // Use characters that need escaping in SVG output
      // Note: <> would be parsed by XML parser, so use & " ' which survive parsing
      const shapeXml = createShapeWithTextXml(
        "1",
        "Special Text",
        0,
        0,
        914400,
        457200,
        "Test &amp; &quot;quote&quot;",
      );
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // After XML parsing, & becomes & and needs re-escaping in SVG
      expect(result.svg).toContain("&amp;");
      expect(result.svg).toContain("&quot;");
    });
  });

  describe("MS-ODRAWXML Section 2.4.4 - dsp:txXfrm", () => {
    it("should render shape with textTransform", () => {
      const shapeXml = createShapeWithTextTransformXml(
        "1",
        "txXfrm Shape",
        0,
        0,
        1828800,
        914400,
        228600,
        228600,
        1371600,
        457200,
        "Centered Text",
      );
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 50, y: 50, width: 500, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain both shape and text
      expect(result.svg).toContain("<path");
      expect(result.svg).toContain("<text");
      expect(result.svg).toContain("Centered Text");
    });
  });

  describe("Transform attributes", () => {
    it("should render rotated shape", () => {
      // 45 degrees = 2700000 EMUs (60000 EMU per degree)
      const shapeXml = createRotatedShapeXml("1", "Rotated", 0, 0, 914400, 914400, 2700000);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain rotate transform
      expect(result.svg).toContain("rotate(");
    });

    it("should render horizontally flipped shape", () => {
      const shapeXml = createFlippedShapeXml("1", "FlipH", 0, 0, 914400, 457200, true, false);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain scale(-1, 1) for horizontal flip
      expect(result.svg).toContain("scale(-1, 1)");
    });

    it("should render vertically flipped shape", () => {
      const shapeXml = createFlippedShapeXml("1", "FlipV", 0, 0, 914400, 457200, false, true);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain scale(1, -1) for vertical flip
      expect(result.svg).toContain("scale(1, -1)");
    });

    it("should render shape with both rotation and flip", () => {
      const shapeXml = `<dsp:sp modelId="{1}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="1" name="RotateFlip"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm rot="5400000" flipH="1">
      <a:off x="0" y="0"/>
      <a:ext cx="914400" cy="457200"/>
    </a:xfrm>
    <a:prstGeom prst="rightArrow"/>
    <a:solidFill>
      <a:srgbClr val="8064A2"/>
    </a:solidFill>
  </dsp:spPr>
</dsp:sp>`;
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain both rotate and scale transforms
      expect(result.svg).toContain("rotate(");
      expect(result.svg).toContain("scale(-1, 1)");
    });
  });

  describe("Fill types", () => {
    it("should render shape with noFill (outline only)", () => {
      const shapeXml = createNoFillShapeXml("1", "NoFill", 0, 0, 914400, 914400);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain fill="none" for noFill
      expect(result.svg).toContain('fill="none"');
      // Should have stroke
      expect(result.svg).toContain('stroke="');
    });

    it("should render shape with gradient fill", () => {
      const shapeXml = createGradientShapeXml("1", "Gradient", 0, 0, 914400, 914400);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should have gradient definition in defs
      expect(result.svg).toContain("<defs>");
      expect(result.svg).toContain("<linearGradient");
      expect(result.svg).toContain("<stop");
      // Should reference gradient
      expect(result.svg).toContain('fill="url(#');
    });
  });

  describe("Group shapes (dsp:grpSp)", () => {
    it("should render nested group with children", () => {
      const child1 = createRectShapeXml("2", "Child1", 0, 0, 457200, 457200, "4F81BD");
      const child2 = createRectShapeXml("3", "Child2", 457200, 0, 457200, 457200, "C0504D");
      const groupXml = createGroupShapeXml("1", "Group1", 0, 0, 914400, 457200, [child1, child2]);
      const diagramXml = createDiagramDrawingXml([groupXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should contain multiple shapes
      const pathMatches = result.svg.match(/<path/g) ?? [];
      expect(pathMatches.length).toBeGreaterThanOrEqual(2);
      // Should have nested g elements
      expect(result.svg).toContain("<g");
    });

    it("should render deeply nested groups", () => {
      const innerChild = createRectShapeXml("3", "InnerChild", 0, 0, 228600, 228600, "9BBB59");
      const innerGroup = createGroupShapeXml("2", "InnerGroup", 0, 0, 457200, 457200, [innerChild]);
      const outerGroup = createGroupShapeXml("1", "OuterGroup", 0, 0, 914400, 914400, [innerGroup]);
      const diagramXml = createDiagramDrawingXml([outerGroup]);
      const diagramFrame = createDiagramFrame({ x: 50, y: 50, width: 300, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should have nested g elements (at least 3 levels: diagram frame + outer + inner)
      const gMatches = result.svg.match(/<g/g) ?? [];
      expect(gMatches.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Preset geometry", () => {
    it("should render roundRect preset geometry", () => {
      const shapeXml = createShapeWithTextXml("1", "RoundRect", 0, 0, 914400, 457200, "Round");
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should have path with curved corners (Q or C commands)
      expect(result.svg).toContain("<path");
      // roundRect typically has Q (quadratic) or C (cubic) commands for corners
    });

    it("should render ellipse preset geometry", () => {
      const shapeXml = createShapeWithTextTransformXml(
        "1",
        "Ellipse",
        0,
        0,
        914400,
        914400,
        0,
        0,
        914400,
        914400,
        "Circle",
      );
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Ellipse geometry uses arc commands (A)
      expect(result.svg).toContain("<path");
    });

    it("should render rightArrow preset geometry", () => {
      const shapeXml = createFlippedShapeXml("1", "Arrow", 0, 0, 914400, 457200, false, false);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 300, height: 150 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should render as path
      expect(result.svg).toContain("<path");
      expect(result.svg).toContain("#F79646");
    });
  });

  describe("Diagram frame positioning", () => {
    it("should apply frame transform to diagram content", () => {
      const shapeXml = createRectShapeXml("1", "Rect", 0, 0, 914400, 914400);
      const diagramXml = createDiagramDrawingXml([shapeXml]);
      const diagramFrame = createDiagramFrame({ x: 200, y: 150, width: 400, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Should have translate transform for frame position
      expect(result.svg).toContain("translate(200, 150)");
    });
  });

  describe("Hidden shapes", () => {
    it("should not render hidden shapes", () => {
      const hiddenShapeXml = `<dsp:sp modelId="{1}">
  <dsp:nvSpPr>
    <dsp:cNvPr id="1" name="Hidden" hidden="1"/>
    <dsp:cNvSpPr/>
  </dsp:nvSpPr>
  <dsp:spPr>
    <a:xfrm>
      <a:off x="0" y="0"/>
      <a:ext cx="914400" cy="914400"/>
    </a:xfrm>
    <a:prstGeom prst="rect"/>
    <a:solidFill>
      <a:srgbClr val="FF0000"/>
    </a:solidFill>
  </dsp:spPr>
</dsp:sp>`;
      const visibleShapeXml = createRectShapeXml("2", "Visible", 914400, 0, 914400, 914400, "00FF00");
      const diagramXml = createDiagramDrawingXml([hiddenShapeXml, visibleShapeXml]);
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 200 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(diagramXml);

      const result = renderSlideSvg(slide, ctx);

      // Hidden shape (red #FF0000) should not be rendered
      expect(result.svg).not.toContain("#FF0000");
      // Visible shape (green #00FF00) should be rendered
      expect(result.svg).toContain("#00FF00");
    });
  });

  describe("Error handling", () => {
    it("should handle malformed XML gracefully", () => {
      const malformedXml = "<dsp:drawing><invalid></dsp:drawing>";
      const diagramFrame = createDiagramFrame({ x: 100, y: 100, width: 400, height: 300 });
      const slide = createSlideWithDiagram(diagramFrame);
      const ctx = createMockContextWithDiagram(malformedXml);

      // Should not throw, should render placeholder
      const result = renderSlideSvg(slide, ctx);

      // Should fall back to placeholder
      expect(result.svg).toContain("[Diagram]");
    });
  });
});
