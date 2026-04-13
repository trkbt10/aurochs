/**
 * @file Integration tests for GraphicFrame conversion (table, chart, diagram)
 *
 * Verifies that GraphicFrame content types produce non-empty
 * Fig child nodes through the pptx-to-fig conversion pipeline.
 */

import { describe, it, expect, vi } from "vitest";
import { convert as pptxToFig } from "@aurochs-converters/pptx-to-fig";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app/presentation-document";
import type { Shape, GraphicFrame } from "@aurochs-office/pptx/domain/shape";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Table } from "@aurochs-office/pptx/domain/table/types";
import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";

function createPptxDoc(shapes: readonly Shape[]): PresentationDocument {
  const slide: Slide = { shapes };
  const slideWithId: SlideWithId = { id: "slide-1", slide };
  return {
    presentation: {
      slideSize: { width: px(960) as Pixels, height: px(540) as Pixels },
    },
    slides: [slideWithId],
    slideWidth: px(960) as Pixels,
    slideHeight: px(540) as Pixels,
    colorContext: {
      colorScheme: {
        dk1: "000000", lt1: "FFFFFF", accent1: "4F81BD",
        accent2: "C0504D", accent3: "9BBB59", accent4: "8064A2",
        accent5: "4BACC6", accent6: "F79646",
        dk2: "1F497D", lt2: "EEECE1",
        hlink: "0000FF", folHlink: "800080",
      },
      colorMap: {},
    },
    fontScheme: EMPTY_FONT_SCHEME,
    resourceStore: createResourceStore(),
  };
}

function makeTransform(x: number, y: number, w: number, h: number) {
  return {
    x: px(x) as Pixels, y: px(y) as Pixels,
    width: px(w) as Pixels, height: px(h) as Pixels,
    rotation: deg(0) as Degrees, flipH: false, flipV: false,
  };
}

// =============================================================================
// Table conversion
// =============================================================================

describe("GraphicFrame table → Fig nodes", () => {
  it("decomposes a 2x2 table into cell FRAME nodes with TEXT children", async () => {
    const table: Table = {
      properties: {},
      grid: {
        columns: [
          { width: px(200) as Pixels },
          { width: px(200) as Pixels },
        ],
      },
      rows: [
        {
          height: px(40) as Pixels,
          cells: [
            {
              properties: {},
              textBody: {
                bodyProperties: {},
                paragraphs: [{
                  properties: {},
                  runs: [{ type: "text", text: "A1" }],
                }],
              },
            },
            {
              properties: {},
              textBody: {
                bodyProperties: {},
                paragraphs: [{
                  properties: {},
                  runs: [{ type: "text", text: "B1" }],
                }],
              },
            },
          ],
        },
        {
          height: px(40) as Pixels,
          cells: [
            {
              properties: {},
              textBody: {
                bodyProperties: {},
                paragraphs: [{
                  properties: {},
                  runs: [{ type: "text", text: "A2" }],
                }],
              },
            },
            {
              properties: {},
              textBody: {
                bodyProperties: {},
                paragraphs: [{
                  properties: {},
                  runs: [{ type: "text", text: "B2" }],
                }],
              },
            },
          ],
        },
      ],
    };

    const graphicFrame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "10", name: "Table" },
      transform: makeTransform(50, 50, 400, 80),
      content: { type: "table", data: { table } },
    };

    const doc = createPptxDoc([graphicFrame]);
    const result = await pptxToFig(doc);

    const page = result.data.pages[0];
    expect(page.children).toHaveLength(1); // The FRAME

    const frame = page.children[0];
    expect(frame.type).toBe("FRAME");
    expect(frame.children).toBeDefined();
    // 4 cells → 4 FRAME children
    expect(frame.children!.length).toBe(4);

    // Each cell FRAME has a TEXT child
    for (const cellFrame of frame.children!) {
      expect(cellFrame.type).toBe("FRAME");
      expect(cellFrame.children).toBeDefined();
      expect(cellFrame.children!.length).toBe(1);
      expect(cellFrame.children![0].type).toBe("TEXT");
      expect(cellFrame.children![0].textData).toBeDefined();
    }

    // Verify text content
    const texts = frame.children!.map((c) => c.children![0].textData!.characters);
    expect(texts).toEqual(["A1", "B1", "A2", "B2"]);
  });
});

// =============================================================================
// Chart conversion
// =============================================================================

describe("GraphicFrame chart → Fig nodes", () => {
  it("warns when chart has no parsed data in ResourceStore", async () => {
    const graphicFrame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "20", name: "Chart" },
      transform: makeTransform(100, 100, 400, 300),
      content: { type: "chart", data: { resourceId: "rId-chart-1" } },
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const doc = createPptxDoc([graphicFrame]);
    const result = await pptxToFig(doc);

    const frame = result.data.pages[0].children[0];
    expect(frame.type).toBe("FRAME");
    // No children since chart data is not in ResourceStore
    expect(frame.children).toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Chart"),
    );

    warnSpy.mockRestore();
  });

  it("produces Fig children when chart data is in ResourceStore", async () => {
    const doc = createPptxDoc([{
      type: "graphicFrame",
      nonVisual: { id: "21", name: "Bar Chart" },
      transform: makeTransform(50, 50, 400, 300),
      content: { type: "chart", data: { resourceId: "rId-chart-2" } },
    } as GraphicFrame]);

    // Register a minimal chart in the ResourceStore
    doc.resourceStore.set("rId-chart-2", {
      kind: "chart",
      source: "parsed",
      data: new ArrayBuffer(0),
      parsed: {
        plotArea: {
          charts: [{
            type: "barChart",
            barDir: "col",
            grouping: "clustered",
            series: [{
              index: 0,
              order: 0,
              categories: {
                type: "string",
                values: ["Q1", "Q2", "Q3"],
              },
              values: {
                type: "numeric",
                values: [10, 20, 30],
              },
            }],
          }],
          axes: [],
        },
      },
    });

    const result = await pptxToFig(doc);
    const frame = result.data.pages[0].children[0];
    expect(frame.type).toBe("FRAME");
    // Chart produces at least one child (the chart FRAME with SVG in _raw)
    expect(frame.children).toBeDefined();
    expect(frame.children!.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Diagram conversion
// =============================================================================

describe("GraphicFrame diagram → Fig nodes", () => {
  it("warns when diagram has no pre-generated shapes", async () => {
    const graphicFrame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "30", name: "SmartArt" },
      transform: makeTransform(100, 100, 300, 200),
      content: {
        type: "diagram",
        data: { dataResourceId: "rId-diagram-1" },
      },
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const doc = createPptxDoc([graphicFrame]);
    const result = await pptxToFig(doc);

    const frame = result.data.pages[0].children[0];
    expect(frame.type).toBe("FRAME");
    expect(frame.children).toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Diagram"),
    );

    warnSpy.mockRestore();
  });
});
