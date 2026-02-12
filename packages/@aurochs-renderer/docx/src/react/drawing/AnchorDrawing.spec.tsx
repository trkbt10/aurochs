/**
 * @file AnchorDrawing Component Tests
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnchorDrawing } from "./AnchorDrawing";
import type { DocxAnchorDrawing } from "@aurochs-office/docx/domain/drawing";
import type { DocxResourceResolver } from "../context";
import { emu } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockDrawing(overrides?: Partial<DocxAnchorDrawing>): DocxAnchorDrawing {
  return {
    type: "anchor",
    distT: 0,
    distB: 0,
    distL: 0,
    distR: 0,
    extent: {
      cx: emu(914400), // 1 inch = 914400 EMU = 96 px
      cy: emu(914400),
    },
    docPr: {
      id: 1,
      name: "Picture 1",
    },
    behindDoc: false,
    relativeHeight: 0,
    positionH: {
      relativeFrom: "column",
      posOffset: 0,
    },
    positionV: {
      relativeFrom: "paragraph",
      posOffset: 0,
    },
    ...overrides,
  };
}

function createMockResolver(resolveResult?: string): DocxResourceResolver {
  return {
    resolve: () => resolveResult,
    getMimeType: () => "image/png",
    getTarget: () => "media/image1.png",
  };
}

function renderAnchorDrawing(props: {
  drawing?: DocxAnchorDrawing;
  x?: number;
  y?: number;
  resources?: DocxResourceResolver;
  idPrefix?: string;
}): string {
  const element = createElement(AnchorDrawing, {
    drawing: props.drawing ?? createMockDrawing(),
    x: props.x ?? 0,
    y: props.y ?? 0,
    resources: props.resources ?? createMockResolver(),
    idPrefix: props.idPrefix,
  });
  return renderToStaticMarkup(element);
}

// =============================================================================
// Tests
// =============================================================================

describe("AnchorDrawing", () => {
  describe("basic rendering", () => {
    it("returns null for empty drawing (no pic, wsp, or chart)", () => {
      const drawing = createMockDrawing();
      const html = renderAnchorDrawing({ drawing });
      expect(html).toBe("");
    });

    it("renders with transform for position", () => {
      const drawing = createMockDrawing({
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        x: 100,
        y: 200,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('transform="translate(100, 200)"');
    });

    it("adds data-element-type attribute", () => {
      const drawing = createMockDrawing({
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('data-element-type="anchor-drawing"');
    });

    it("adds docPr attributes", () => {
      const drawing = createMockDrawing({
        docPr: { id: 42, name: "Test Picture" },
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('data-doc-pr-id="42"');
      expect(html).toContain('data-doc-pr-name="Test Picture"');
    });

    it("adds z-ordering attributes", () => {
      const drawing = createMockDrawing({
        behindDoc: true,
        relativeHeight: 251658240,
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('data-behind-doc="true"');
      expect(html).toContain('data-relative-height="251658240"');
    });
  });

  describe("picture rendering", () => {
    it("renders picture with resolved image URL", () => {
      const drawing = createMockDrawing({
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,imagedata"),
      });

      expect(html).toContain("<image");
      expect(html).toContain('href="data:image/png;base64,imagedata"');
    });

    it("converts EMU extent to pixels", () => {
      const drawing = createMockDrawing({
        extent: {
          cx: emu(914400), // 1 inch = 96 px
          cy: emu(457200), // 0.5 inch = 48 px
        },
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('width="96"');
      expect(html).toContain('height="48"');
    });

    it("generates clip ID from idPrefix and docPr.id", () => {
      const drawing = createMockDrawing({
        docPr: { id: 5, name: "Picture 5" },
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
            srcRect: { l: 10000, t: 10000, r: 10000, b: 10000 },
          },
          spPr: {},
        },
      });
      const html = renderAnchorDrawing({
        drawing,
        idPrefix: "anchor-clip",
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('id="anchor-clip-5"');
    });
  });

  describe("WordprocessingShape rendering", () => {
    it("renders WordprocessingShape for wsp", () => {
      const drawing = createMockDrawing({
        wsp: {} as never,
      });
      const html = renderAnchorDrawing({ drawing });

      expect(html).toContain("<path");
      expect(html).toContain('data-element-type="wordprocessing-shape"');
    });
  });

  describe("ChartPlaceholder rendering", () => {
    it("renders ChartPlaceholder for chart", () => {
      const drawing = createMockDrawing({
        chart: {} as never,
      });
      const html = renderAnchorDrawing({ drawing });

      expect(html).toContain("<rect");
      expect(html).toContain('data-element-type="chart-placeholder"');
      expect(html).toContain(">Chart</text>");
    });
  });
});
