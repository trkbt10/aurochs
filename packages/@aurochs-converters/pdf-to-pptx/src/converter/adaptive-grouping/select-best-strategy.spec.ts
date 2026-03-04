/**
 * @file Adaptive grouping strategy selector tests.
 */

import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import type { GraphicFrame, Shape, SpShape } from "@aurochs-office/pptx/domain/shape";
import type { TableRegion } from "../table-detection";
import { convertBBox, createFitContext } from "../transform-converter";
import { selectAutoGroupingCandidate } from "./select-best-strategy";

function createContext() {
  return createFitContext({
    pdfWidth: 600,
    pdfHeight: 800,
    slideWidth: px(600),
    slideHeight: px(800),
  });
}

function createUnknownFrame(id: string): GraphicFrame {
  return {
    type: "graphicFrame",
    nonVisual: { id, name: `Frame ${id}` },
    transform: {
      x: px(0),
      y: px(0),
      width: px(10),
      height: px(10),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: { type: "unknown", uri: "urn:test" },
  };
}

function createTableFrame(args: {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: number;
  readonly cols: number;
}): GraphicFrame {
  const columns = Array.from({ length: args.cols }, () => ({ width: px(args.width / args.cols) }));
  const rows = Array.from({ length: args.rows }, () => ({
    height: px(args.height / args.rows),
    cells: Array.from({ length: args.cols }, () => ({ properties: {} })),
  }));

  return {
    type: "graphicFrame",
    nonVisual: { id: args.id, name: `Table ${args.id}` },
    transform: {
      x: px(args.x),
      y: px(args.y),
      width: px(args.width),
      height: px(args.height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "table",
      data: {
        table: {
          properties: {},
          grid: { columns },
          rows,
        },
      },
    },
  };
}

function createTextShape(id: string): SpShape {
  return {
    type: "sp",
    nonVisual: { id, name: `Text ${id}`, textBox: true },
    properties: {
      transform: {
        x: px(0),
        y: px(0),
        width: px(10),
        height: px(10),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: { type: "preset", preset: "rect", adjustValues: [] },
      fill: { type: "noFill" },
    },
    textBody: {
      bodyProperties: {},
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "x" }],
        },
      ],
    },
  };
}

describe("selectAutoGroupingCandidate", () => {
  it("selects text when full candidate has no tables", () => {
    const context = createContext();
    const decision = selectAutoGroupingCandidate({
      candidates: {
        full: [createUnknownFrame("f0")],
        text: [createUnknownFrame("t0")],
      },
      tableRegions: [],
      context,
      qualityThreshold: 0.55,
      maxOverheadRatio: 1.2,
    });

    expect(decision.selected).toBe("text");
    expect(decision.reason).toBe("no-full-table");
  });

  it("selects text when overhead is too high", () => {
    const context = createContext();
    const region: TableRegion = {
      x0: 100,
      y0: 300,
      x1: 500,
      y1: 520,
      ruleCount: 18,
      colCountHint: 3,
      rowCountHint: 6,
    };

    const converted = convertBBox([region.x0, region.y0, region.x1, region.y1], context);

    const full: Shape[] = [
      createTableFrame({
        id: "table",
        x: converted.x as number,
        y: converted.y as number,
        width: converted.width as number,
        height: converted.height as number,
        rows: 6,
        cols: 3,
      }),
      ...Array.from({ length: 12 }, (_, i) => createUnknownFrame(`noise-${i}`)),
    ];

    const text: Shape[] = [createUnknownFrame("text-0")];

    const decision = selectAutoGroupingCandidate({
      candidates: { full, text },
      tableRegions: [region],
      context,
      qualityThreshold: 0.55,
      maxOverheadRatio: 1.2,
    });

    expect(decision.selected).toBe("text");
    expect(decision.reason).toBe("overhead-too-high");
  });

  it("selects full when table quality is strong", () => {
    const context = createContext();
    const region: TableRegion = {
      x0: 80,
      y0: 220,
      x1: 520,
      y1: 560,
      ruleCount: 26,
      colCountHint: 4,
      rowCountHint: 8,
    };
    const converted = convertBBox([region.x0, region.y0, region.x1, region.y1], context);

    const full: Shape[] = [
      createTableFrame({
        id: "table",
        x: converted.x as number,
        y: converted.y as number,
        width: converted.width as number,
        height: converted.height as number,
        rows: 8,
        cols: 4,
      }),
      createUnknownFrame("decoration"),
    ];

    const text: Shape[] = [createUnknownFrame("text-0"), createUnknownFrame("text-1"), createUnknownFrame("text-2")];

    const decision = selectAutoGroupingCandidate({
      candidates: { full, text },
      tableRegions: [region],
      context,
      qualityThreshold: 0.55,
      maxOverheadRatio: 1.2,
    });

    expect(decision.selected).toBe("full");
    expect(decision.reason).toBe("full-accepted");
    expect(decision.signals.qualityScore).toBeGreaterThanOrEqual(0.55);
  });

  it("selects text when full collapses all text boxes into tables on dense pages", () => {
    const context = createContext();
    const regions: TableRegion[] = [
      { x0: 80, y0: 220, x1: 520, y1: 560, ruleCount: 20, colCountHint: 4, rowCountHint: 8 },
      { x0: 90, y0: 240, x1: 510, y1: 540, ruleCount: 18, colCountHint: 4, rowCountHint: 7 },
      { x0: 60, y0: 200, x1: 540, y1: 580, ruleCount: 16, colCountHint: 3, rowCountHint: 6 },
      { x0: 100, y0: 260, x1: 500, y1: 520, ruleCount: 14, colCountHint: 3, rowCountHint: 5 },
    ];

    const r0 = convertBBox([regions[0]!.x0, regions[0]!.y0, regions[0]!.x1, regions[0]!.y1], context);
    const r1 = convertBBox([regions[1]!.x0, regions[1]!.y0, regions[1]!.x1, regions[1]!.y1], context);

    const full: Shape[] = [
      createTableFrame({
        id: "table-0",
        x: r0.x as number,
        y: r0.y as number,
        width: r0.width as number,
        height: r0.height as number,
        rows: 8,
        cols: 4,
      }),
      createTableFrame({
        id: "table-1",
        x: r1.x as number,
        y: r1.y as number,
        width: r1.width as number,
        height: r1.height as number,
        rows: 7,
        cols: 4,
      }),
      ...Array.from({ length: 58 }, (_, i) => createUnknownFrame(`decor-${i}`)),
    ];

    const text: Shape[] = Array.from({ length: 120 }, (_, i) => createTextShape(`text-${i}`));

    const decision = selectAutoGroupingCandidate({
      candidates: { full, text },
      tableRegions: regions,
      context,
      qualityThreshold: 0.1,
      maxOverheadRatio: 2.5,
    });

    expect(decision.selected).toBe("text");
    expect(decision.reason).toBe("quality-below-threshold");
    expect(decision.signals.fullTextShapeCount).toBe(0);
    expect(decision.signals.textTextShapeCount).toBe(120);
  });

  it("selects text when many table regions are detected but only one weak table is realized", () => {
    const context = createContext();
    const regions: TableRegion[] = [
      { x0: 40, y0: 110, x1: 250, y1: 220, ruleCount: 10, colCountHint: 2, rowCountHint: 4 },
      { x0: 300, y0: 110, x1: 560, y1: 220, ruleCount: 10, colCountHint: 2, rowCountHint: 4 },
      { x0: 40, y0: 260, x1: 250, y1: 370, ruleCount: 10, colCountHint: 2, rowCountHint: 4 },
      { x0: 300, y0: 260, x1: 560, y1: 370, ruleCount: 10, colCountHint: 2, rowCountHint: 4 },
      { x0: 40, y0: 410, x1: 250, y1: 520, ruleCount: 10, colCountHint: 2, rowCountHint: 4 },
      { x0: 300, y0: 410, x1: 560, y1: 520, ruleCount: 10, colCountHint: 2, rowCountHint: 4 },
    ];

    const r0 = convertBBox([regions[0]!.x0, regions[0]!.y0, regions[0]!.x1, regions[0]!.y1], context);
    const full: Shape[] = [
      createTableFrame({
        id: "table-only",
        x: r0.x as number,
        y: r0.y as number,
        width: r0.width as number,
        height: r0.height as number,
        rows: 4,
        cols: 2,
      }),
      ...Array.from({ length: 120 }, (_, i) => createTextShape(`full-text-${i}`)),
      ...Array.from({ length: 40 }, (_, i) => createUnknownFrame(`full-decor-${i}`)),
    ];
    const text: Shape[] = [
      ...Array.from({ length: 134 }, (_, i) => createTextShape(`text-${i}`)),
      ...Array.from({ length: 42 }, (_, i) => createUnknownFrame(`text-decor-${i}`)),
    ];

    const decision = selectAutoGroupingCandidate({
      candidates: { full, text },
      tableRegions: regions,
      context,
      qualityThreshold: 0.1,
      maxOverheadRatio: 2.5,
    });

    expect(decision.selected).toBe("text");
    expect(decision.reason).toBe("quality-below-threshold");
    expect(decision.signals.tableRegionCount).toBe(6);
    expect(decision.signals.fullTableCount).toBe(1);
    expect(decision.signals.fullTextShapeCount).toBe(120);
    expect(decision.signals.textTextShapeCount).toBe(134);
  });
});
