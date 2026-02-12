/**
 * @file InlineDrawing Component Tests
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineDrawing } from "./InlineDrawing";
import type { DocxInlineDrawing } from "@aurochs-office/docx/domain/drawing";
import type { DocxResourceResolver } from "../context";
import { emu } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockDrawing(overrides?: Partial<DocxInlineDrawing>): DocxInlineDrawing {
  return {
    type: "inline",
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

function renderInlineDrawing(props: {
  drawing?: DocxInlineDrawing;
  x?: number;
  y?: number;
  resources?: DocxResourceResolver;
  idPrefix?: string;
}): string {
  const element = createElement(InlineDrawing, {
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

describe("InlineDrawing", () => {
  describe("basic rendering", () => {
    it("returns null for empty drawing (no pic, wsp, or chart)", () => {
      const drawing = createMockDrawing();
      const html = renderInlineDrawing({ drawing });
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
      const html = renderInlineDrawing({
        drawing,
        x: 50,
        y: 100,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('transform="translate(50, 100)"');
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
      const html = renderInlineDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('data-element-type="inline-drawing"');
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
      const html = renderInlineDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('data-doc-pr-id="42"');
      expect(html).toContain('data-doc-pr-name="Test Picture"');
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
      const html = renderInlineDrawing({
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
      const html = renderInlineDrawing({
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
      const html = renderInlineDrawing({
        drawing,
        idPrefix: "myprefix",
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('id="myprefix-5"');
    });

    it("uses default idPrefix when not provided", () => {
      const drawing = createMockDrawing({
        docPr: { id: 7, name: "Picture 7" },
        pic: {
          blipFill: {
            blip: { rEmbed: "rId1" as never },
            stretch: true,
            srcRect: { l: 10000, t: 10000, r: 10000, b: 10000 },
          },
          spPr: {},
        },
      });
      const html = renderInlineDrawing({
        drawing,
        resources: createMockResolver("data:image/png;base64,test"),
      });

      expect(html).toContain('id="inline-7"');
    });
  });

  describe("WordprocessingShape rendering", () => {
    it("renders WordprocessingShape for wsp", () => {
      const drawing = createMockDrawing({
        wsp: {} as never,
      });
      const html = renderInlineDrawing({ drawing });

      expect(html).toContain("<path");
      expect(html).toContain('data-element-type="wordprocessing-shape"');
    });
  });

  describe("ChartPlaceholder rendering", () => {
    it("renders ChartPlaceholder for chart", () => {
      const drawing = createMockDrawing({
        chart: {} as never,
      });
      const html = renderInlineDrawing({ drawing });

      expect(html).toContain("<rect");
      expect(html).toContain('data-element-type="chart-placeholder"');
      expect(html).toContain(">Chart</text>");
    });
  });
});
