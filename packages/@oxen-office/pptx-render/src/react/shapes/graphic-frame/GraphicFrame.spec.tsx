/**
 * @file Tests for GraphicFrame Renderer
 *
 * Tests rendering of graphic frame elements (tables, charts, diagrams, OLE objects).
 *
 * @see ECMA-376 Part 1, Section 19.3.1.21 (p:graphicFrame)
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { GraphicFrame as GraphicFrameType, Transform } from "@oxen-office/pptx/domain";
import type { Table } from "@oxen-office/pptx/domain/table/types";
import type { SlideSize } from "@oxen-office/pptx/domain";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import { createResourceStore, type ResourceStore } from "@oxen-office/pptx/domain/resource-store";
import { px, deg } from "@oxen-office/ooxml/domain/units";
import { RenderProvider } from "../../context";
import { SvgDefsProvider } from "../../hooks/useSvgDefs";
import { GraphicFrameRenderer } from "./GraphicFrameRenderer";

// =============================================================================
// Test Fixtures
// =============================================================================

const testSlideSize: SlideSize = {
  width: px(960),
  height: px(540),
};

/**
 * ColorContext with all required scheme colors.
 * This is critical for table rendering which accesses colorScheme.accent2 etc.
 */
const testColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "44546A",
    lt2: "E7E6E6",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "A5A5A5",
    accent4: "FFC000",
    accent5: "5B9BD5",
    accent6: "70AD47",
    hlink: "0563C1",
    folHlink: "954F72",
  },
  colorMap: {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  },
};

/**
 * Default transform for test shapes
 */
const defaultTransform: Transform = {
  x: px(0),
  y: px(0),
  width: px(200),
  height: px(100),
  rotation: deg(0),
  flipH: false,
  flipV: false,
};

/**
 * Default nonVisual properties for test shapes
 */
const defaultNonVisual = {
  id: "1",
  name: "Test Shape",
};

/**
 * Minimal table for testing
 */
const testTable: Table = {
  properties: {},
  grid: {
    columns: [{ width: px(100) }, { width: px(100) }],
  },
  rows: [
    {
      height: px(30),
      cells: [
        { properties: {} },
        { properties: {} },
      ],
    },
  ],
};

/**
 * Create a test GraphicFrame shape with table content
 */
function createTableGraphicFrame(): GraphicFrameType {
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "table",
      data: {
        table: testTable,
      },
    },
  };
}

/**
 * Create a test GraphicFrame shape with unknown content
 */
function createUnknownGraphicFrame(): GraphicFrameType {
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "unknown",
      uri: "http://unknown.uri",
    },
  };
}

/**
 * Create a test GraphicFrame shape with chart content (without parsedChart)
 */
function createChartGraphicFrame(): GraphicFrameType {
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "chart",
      data: {
        resourceId: "rId1",
        // No parsedChart - should render placeholder
      },
    },
  };
}

/**
 * Create a test GraphicFrame shape with diagram content
 */
function createDiagramGraphicFrame(): GraphicFrameType {
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "diagram",
      data: {
        dataResourceId: "rId1",
        // No parsedContent - should render placeholder
      },
    },
  };
}

/**
 * Create a test GraphicFrame shape with OLE object content
 */
function createOleObjectGraphicFrame(): GraphicFrameType {
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "oleObject",
      data: {
        progId: "Excel.Sheet.12",
        // No preview image - should render placeholder
      },
    },
  };
}

/**
 * Create a test GraphicFrame shape with OLE object containing preview image
 */
function createOleObjectWithPreviewGraphicFrame(): GraphicFrameType {
  // Note: previewImageUrl is now stored in ResourceStore, not on OleReference
  // Tests that need preview should mock ResourceStore
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "oleObject",
      data: {
        resourceId: "rId-ole-1",
        progId: "Excel.Sheet.12",
      },
    },
  };
}

/**
 * Create a test GraphicFrame shape with OLE object in showAsIcon mode
 */
function createOleObjectShowAsIconGraphicFrame(): GraphicFrameType {
  return {
    type: "graphicFrame",
    nonVisual: defaultNonVisual,
    transform: defaultTransform,
    content: {
      type: "oleObject",
      data: {
        progId: "Excel.Sheet.12",
        name: "Embedded Spreadsheet",
        showAsIcon: true,
      },
    },
  };
}

/**
 * Wrapper component that provides required context
 */
function TestWrapper({
  children,
  resourceStore,
}: {
  readonly children: React.ReactNode;
  readonly resourceStore?: ResourceStore;
}) {
  return (
    <RenderProvider slideSize={testSlideSize} colorContext={testColorContext} resourceStore={resourceStore}>
      <SvgDefsProvider>
        <svg>{children}</svg>
      </SvgDefsProvider>
    </RenderProvider>
  );
}

/**
 * Wrapper with minimal/empty color context to test error handling
 */
function MinimalContextWrapper({ children }: { readonly children: React.ReactNode }) {
  return (
    <RenderProvider slideSize={testSlideSize}>
      <SvgDefsProvider>
        <svg>{children}</svg>
      </SvgDefsProvider>
    </RenderProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("GraphicFrameRenderer", () => {
  describe("table content", () => {
    it("renders table without throwing when colorContext is provided", () => {
      const shape = createTableGraphicFrame();

      // This test verifies that renderTableSvg receives correct colorContext
      // The bug was passing full renderCtx instead of renderCtx.colorContext
      expect(() => {
        render(
          <TestWrapper>
            <GraphicFrameRenderer
              shape={shape}
              width={200}
              height={100}
              shapeId="test-table"
            />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("renders table with correct data attributes", () => {
      const shape = createTableGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-table"
          />
        </TestWrapper>,
      );

      const group = container.querySelector("g[data-shape-type='graphicFrame']");
      expect(group).not.toBeNull();
      expect(group?.getAttribute("data-shape-id")).toBe("test-table");
    });

    it("renders table content as inner HTML", () => {
      const shape = createTableGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-table"
          />
        </TestWrapper>,
      );

      // Table should be rendered via dangerouslySetInnerHTML
      // Look for rect elements (table cells render as rects)
      const rects = container.querySelectorAll("rect");
      expect(rects.length).toBeGreaterThan(0);
    });

    it("handles table with empty colorContext gracefully", () => {
      const shape = createTableGraphicFrame();

      // With minimal context (empty colorScheme), it should still not throw
      // because renderTableSvg handles missing color values
      expect(() => {
        render(
          <MinimalContextWrapper>
            <GraphicFrameRenderer
              shape={shape}
              width={200}
              height={100}
              shapeId="test-table"
            />
          </MinimalContextWrapper>,
        );
      }).not.toThrow();
    });
  });

  describe("unknown content", () => {
    it("renders placeholder for unknown content", () => {
      const shape = createUnknownGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-unknown"
          />
        </TestWrapper>,
      );

      // Should render a placeholder rect
      const rect = container.querySelector("rect");
      expect(rect).not.toBeNull();
      expect(rect?.getAttribute("fill")).toBe("#f0f0f0");

      // Should have placeholder text
      const text = container.querySelector("text");
      expect(text).not.toBeNull();
      expect(text?.textContent).toContain("Unknown");
    });
  });

  describe("chart content", () => {
    it("renders placeholder when parsedChart is missing", () => {
      const shape = createChartGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-chart"
          />
        </TestWrapper>,
      );

      // Should render a placeholder
      const text = container.querySelector("text");
      expect(text).not.toBeNull();
      expect(text?.textContent).toContain("Chart");
    });
  });

  describe("diagram content", () => {
    it("renders diagram without throwing", () => {
      const shape = createDiagramGraphicFrame();

      expect(() => {
        render(
          <TestWrapper>
            <GraphicFrameRenderer
              shape={shape}
              width={200}
              height={100}
              shapeId="test-diagram"
            />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });

  describe("OLE object content", () => {
    it("renders placeholder when preview is missing", () => {
      const shape = createOleObjectGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-ole"
          />
        </TestWrapper>,
      );

      // Should render a placeholder
      const text = container.querySelector("text");
      expect(text).not.toBeNull();
      expect(text?.textContent).toContain("OLE Object");
    });

    it("renders image when preview is available in ResourceStore", () => {
      const shape = createOleObjectWithPreviewGraphicFrame();
      // Create ResourceStore with preview URL
      const resourceStore = createResourceStore();
      const redPixelPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAXxPhfQAAAABJRU5ErkJggg==";
      resourceStore.set("rId-ole-1", {
        kind: "ole",
        source: "parsed",
        data: new ArrayBuffer(0),
        previewUrl: redPixelPng,
      });

      const { container } = render(
        <TestWrapper resourceStore={resourceStore}>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-ole-preview"
          />
        </TestWrapper>,
      );

      // Should render an image element
      const image = container.querySelector("image");
      expect(image).not.toBeNull();
      expect(image?.getAttribute("href")).toContain("data:image/png");
    });

    it("renders icon view when showAsIcon is true", () => {
      const shape = createOleObjectShowAsIconGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-ole-icon"
          />
        </TestWrapper>,
      );

      // Should render icon view with object name
      const text = container.querySelector("text");
      expect(text).not.toBeNull();
      // Should show the object name "Embedded Spreadsheet"
      expect(text?.textContent).toContain("Embedded Spreadsheet");

      // Should have background rect for icon view
      const rects = container.querySelectorAll("rect");
      expect(rects.length).toBeGreaterThan(0);
    });
  });

  describe("transform handling", () => {
    it("applies transform when provided", () => {
      const shape: GraphicFrameType = {
        type: "graphicFrame",
        nonVisual: defaultNonVisual,
        transform: {
          x: px(100),
          y: px(50),
          width: px(200),
          height: px(100),
          rotation: deg(45),
          flipH: false,
          flipV: false,
        },
        content: { type: "unknown", uri: "http://unknown.uri" },
      };

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-transform"
          />
        </TestWrapper>,
      );

      const group = container.querySelector("g[data-shape-type='graphicFrame']");
      expect(group).not.toBeNull();

      const transform = group?.getAttribute("transform");
      expect(transform).toBeDefined();
      expect(transform).toContain("translate");
    });

    it("handles zero rotation transform", () => {
      const shape = createUnknownGraphicFrame();

      const { container } = render(
        <TestWrapper>
          <GraphicFrameRenderer
            shape={shape}
            width={200}
            height={100}
            shapeId="test-no-rotation"
          />
        </TestWrapper>,
      );

      const group = container.querySelector("g[data-shape-type='graphicFrame']");
      expect(group).not.toBeNull();

      // With zero rotation and zero position, transform should still be valid
      const transform = group?.getAttribute("transform");
      expect(transform === null || (transform !== undefined && transform.includes("translate"))).toBe(true);
    });
  });
});
