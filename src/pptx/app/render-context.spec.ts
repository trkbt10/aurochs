/**
 * @file Tests for render-context helpers
 *
 * Verifies that render context built from API Slide properly includes:
 * - Theme colors (colorScheme)
 * - Color map (colorMap)
 * - Font scheme
 * - Resource resolver
 * - Background resolution
 */

import { describe, it, expect } from "vitest";
import { createRenderContextFromApiSlide, createSlideRenderContextFromApiSlide } from "./render-context";
import type { Slide as ApiSlide } from "./types";
import type { XmlElement, XmlDocument } from "../../xml";
import type { ResourceMap } from "../opc";
import type { IndexTables } from "../core/types";
import { px } from "../domain/types";
import type { ZipFile } from "../domain";
import { resolveColor } from "../render/core/drawing-ml";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a minimal API slide with theme colors for testing
 *
 * API Slide structure:
 * - theme: XmlDocument (root) containing a:theme element
 * - master: XmlDocument (root) containing p:sldMaster element
 * - content: XmlDocument (root) containing p:sld element
 * - layout: XmlDocument (root) containing p:sldLayout element
 */
// Helper to create XmlElement with type: "element"
const elem = (name: string, attrs: Record<string, string>, children: XmlElement[]): XmlElement =>
  ({ type: "element" as const, name, attrs, children });

// Helper to create mock ResourceMap
const mockResourceMap = (): ResourceMap => ({
  getTarget: () => undefined,
  getType: () => undefined,
  getTargetByType: () => undefined,
  getAllTargetsByType: () => [],
});

// Helper to create mock IndexTables
const mockIndexTables = (): IndexTables => ({
  idTable: {},
  idxTable: new Map(),
  typeTable: {},
});

function createMockApiSlide(): ApiSlide {
  // XmlDocument containing a:theme (theme file structure)
  const theme = {
    children: [
      elem("a:theme", {}, [
        elem("a:themeElements", {}, [
          elem("a:clrScheme", { name: "Office" }, [
            elem("a:dk1", {}, [elem("a:sysClr", { val: "windowText", lastClr: "000000" }, [])]),
            elem("a:lt1", {}, [elem("a:sysClr", { val: "window", lastClr: "FFFFFF" }, [])]),
            elem("a:dk2", {}, [elem("a:srgbClr", { val: "44546A" }, [])]),
            elem("a:lt2", {}, [elem("a:srgbClr", { val: "E7E6E6" }, [])]),
            elem("a:accent1", {}, [elem("a:srgbClr", { val: "4472C4" }, [])]),
            elem("a:accent2", {}, [elem("a:srgbClr", { val: "ED7D31" }, [])]),
            elem("a:accent3", {}, [elem("a:srgbClr", { val: "A5A5A5" }, [])]),
            elem("a:accent4", {}, [elem("a:srgbClr", { val: "FFC000" }, [])]),
            elem("a:accent5", {}, [elem("a:srgbClr", { val: "5B9BD5" }, [])]),
            elem("a:accent6", {}, [elem("a:srgbClr", { val: "70AD47" }, [])]),
            elem("a:hlink", {}, [elem("a:srgbClr", { val: "0563C1" }, [])]),
            elem("a:folHlink", {}, [elem("a:srgbClr", { val: "954F72" }, [])]),
          ]),
          elem("a:fontScheme", { name: "Office" }, [
            elem("a:majorFont", {}, [
              elem("a:latin", { typeface: "Calibri Light" }, []),
              elem("a:ea", { typeface: "" }, []),
              elem("a:cs", { typeface: "" }, []),
            ]),
            elem("a:minorFont", {}, [
              elem("a:latin", { typeface: "Calibri" }, []),
              elem("a:ea", { typeface: "" }, []),
              elem("a:cs", { typeface: "" }, []),
            ]),
          ]),
        ]),
      ]),
    ],
  };

  // XmlDocument containing p:sldMaster (master file structure)
  const master = {
    children: [
      elem("p:sldMaster", {}, [
        elem("p:clrMap", {
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
        }, []),
      ]),
    ],
  };

  // XmlDocument containing p:sld (slide file structure)
  const content = {
    children: [elem("p:sld", {}, [])],
  };

  // XmlDocument containing p:sldLayout (layout file structure)
  const layout = {
    children: [elem("p:sldLayout", {}, [])],
  };

  return {
    number: 1,
    filename: "slide1",
    content: content as XmlDocument,
    master: master as XmlDocument,
    layout: layout as XmlDocument,
    theme: theme as XmlDocument,
    relationships: mockResourceMap(),
    layoutRelationships: mockResourceMap(),
    masterRelationships: mockResourceMap(),
    themeRelationships: mockResourceMap(),
    layoutTables: mockIndexTables(),
    masterTables: mockIndexTables(),
    masterTextStyles: undefined,
    diagram: null,
    diagramRelationships: mockResourceMap(),
    timing: undefined,
    renderHTML: () => "<div></div>",
    renderSVG: () => "<svg></svg>",
  };
}

/**
 * Create empty ZipFile for testing
 */
function createMockZip(): ZipFile {
  return {
    file: () => null,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createSlideRenderContextFromApiSlide", () => {
  it("should create SlideRenderContext from API slide", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();

    const ctx = createSlideRenderContextFromApiSlide(apiSlide, zip);

    expect(ctx).toBeDefined();
    expect(ctx.master).toBeDefined();
    expect(ctx.presentation).toBeDefined();
    expect(ctx.presentation.theme).toBeDefined();
  });

  it("should parse theme color scheme correctly", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();

    const ctx = createSlideRenderContextFromApiSlide(apiSlide, zip);
    const colorScheme = ctx.presentation.theme.colorScheme;

    // Verify color scheme has expected colors
    expect(colorScheme.dk1).toBeDefined();
    expect(colorScheme.lt1).toBeDefined();
    expect(colorScheme.accent1).toBe("4472C4");
    expect(colorScheme.accent2).toBe("ED7D31");
  });

  it("should parse master color map correctly", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();

    const ctx = createSlideRenderContextFromApiSlide(apiSlide, zip);
    const colorMap = ctx.master.colorMap;

    // Verify color map mappings
    expect(colorMap.tx1).toBe("dk1");
    expect(colorMap.bg1).toBe("lt1");
    expect(colorMap.accent1).toBe("accent1");
  });
});

describe("createRenderContextFromApiSlide", () => {
  it("should create HtmlRenderContext with color context", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);

    expect(ctx).toBeDefined();
    expect(ctx.colorContext).toBeDefined();
    expect(ctx.colorContext.colorScheme).toBeDefined();
    expect(ctx.colorContext.colorMap).toBeDefined();
  });

  it("should be usable with renderSlideSvg for domain slide rendering", async () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);

    // Import renderSlideSvg dynamically
    const { renderSlideSvg } = await import("../render/svg/renderer");

    // Create a simple domain slide with a shape using scheme color
    const domainSlide = {
      shapes: [],
    };

    // This should not throw
    const result = renderSlideSvg(domainSlide, ctx);

    expect(result.svg).toBeDefined();
    expect(result.svg).toContain("<svg");
  });

  it("should resolve scheme colors via resolveColor", async () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);
    const colorContext = ctx.colorContext;


    // Create Color objects with spec structure
    // Color = { spec: SchemeColor { type: "scheme", value: "..." } }
    const tx1Color = { spec: { type: "scheme" as const, value: "tx1" as const } };
    const accent1Color = { spec: { type: "scheme" as const, value: "accent1" as const } };
    const bg1Color = { spec: { type: "scheme" as const, value: "bg1" as const } };

    // Test tx1 resolution: tx1 -> dk1 -> 000000
    const tx1Result = resolveColor(tx1Color, colorContext);
    expect(tx1Result).toBe("000000");

    // Test accent1 resolution: accent1 -> accent1 -> 4472C4
    const accent1Result = resolveColor(accent1Color, colorContext);
    expect(accent1Result).toBe("4472C4");

    // Test bg1 resolution: bg1 -> lt1 -> FFFFFF
    const bg1Result = resolveColor(bg1Color, colorContext);
    expect(bg1Result).toBe("FFFFFF");
  });

  it("should include theme colors in colorScheme", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);
    const { colorScheme } = ctx.colorContext;

    // Theme colors should be populated
    expect(colorScheme.accent1).toBe("4472C4");
    expect(colorScheme.accent2).toBe("ED7D31");
    expect(colorScheme.dk1).toBeDefined();
    expect(colorScheme.lt1).toBeDefined();
  });

  it("should include color map in colorContext", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);
    const { colorMap } = ctx.colorContext;

    // Color map should have proper mappings
    expect(colorMap.tx1).toBe("dk1");
    expect(colorMap.bg1).toBe("lt1");
    expect(colorMap.accent1).toBe("accent1");
  });

  it("should include font scheme", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);

    expect(ctx.fontScheme).toBeDefined();
    expect(ctx.fontScheme?.majorFont.latin).toBe("Calibri Light");
    expect(ctx.fontScheme?.minorFont.latin).toBe("Calibri");
  });

  it("should have resource resolver", () => {
    const apiSlide = createMockApiSlide();
    const zip = createMockZip();
    const slideSize = { width: px(960), height: px(540) };

    const ctx = createRenderContextFromApiSlide(apiSlide, zip, slideSize);

    expect(ctx.resources).toBeDefined();
    expect(typeof ctx.resources.resolve).toBe("function");
  });
});
