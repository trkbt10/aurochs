/**
 * @file Real PPTX fixture conversion tests
 *
 * Loads actual PPTX files containing tables, charts, and diagrams,
 * parses them into PresentationDocument, and verifies that pptx-to-fig
 * conversion produces correct Fig nodes.
 */


import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { convert as pptxToFig } from "@aurochs-converters/pptx-to-fig";
import { loadPptxBundleFromBuffer } from "@aurochs-office/pptx/app/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx/app";
import { convertToPresentationDocument } from "@aurochs-office/pptx/app/presentation-converter";
import type { PresentationDocument } from "@aurochs-office/pptx/app/presentation-document";
import type { FigDesignDocument, FigDesignNode } from "@aurochs/fig/domain";
import type { Shape } from "@aurochs-office/pptx/domain/shape";

// =============================================================================
// Helpers
// =============================================================================

/** Resolve path relative to repo root */
function fixturePathOf(relativePath: string): string {
  // import.meta.url is available in both bun and vitest (ESM)
  const thisFile = new URL(import.meta.url).pathname;
  const repoRoot = resolve(thisFile, "../../../../..");
  return resolve(repoRoot, relativePath);
}

async function loadFixture(relativePath: string): Promise<PresentationDocument> {
  const fullPath = fixturePathOf(relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Fixture not found: ${fullPath}`);
  }
  const buffer = readFileSync(fullPath);
  const bundle = await loadPptxBundleFromBuffer(buffer);
  const presentation = openPresentation(bundle.presentationFile);
  return convertToPresentationDocument({ presentation, presentationFile: bundle.presentationFile });
}

/** Count all nodes recursively (including nested children) */
function _countNodes(nodes: readonly FigDesignNode[]): number {
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for recursive tree count
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) {
      count += _countNodes(node.children);
    }
  }
  return count;
}

/** Find all nodes of a given type recursively */
function findNodesByType(nodes: readonly FigDesignNode[], type: string): FigDesignNode[] {
  const result: FigDesignNode[] = [];
  for (const node of nodes) {
    if (node.type === type) {result.push(node);}
    if (node.children) {result.push(...findNodesByType(node.children, type));}
  }
  return result;
}

/** Count shapes by type in a PPTX slide */
function _countShapesByType(shapes: readonly Shape[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const shape of shapes) {
    const type = shape.type;
    counts[type] = (counts[type] ?? 0) + 1;
    if (shape.type === "grpSp") {
      const childCounts = _countShapesByType(shape.children);
      for (const [k, v] of Object.entries(childCounts)) {
        counts[k] = (counts[k] ?? 0) + v;
      }
    }
  }
  return counts;
}

// =============================================================================
// Table Fixture Tests
// =============================================================================

describe("Table conversion (table_test.pptx)", () => {
  const FIXTURE = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variables initialized in beforeAll
  let presDoc: PresentationDocument;
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let figDoc: FigDesignDocument;

  beforeAll(async () => {
    const fullPath = fixturePathOf(FIXTURE);
    if (!existsSync(fullPath)) {return;}
    presDoc = await loadFixture(FIXTURE);
    figDoc = (await pptxToFig(presDoc)).data;
  });

  it("fixture file exists", () => {
    expect(existsSync(fixturePathOf(FIXTURE))).toBe(true);
  });

  it("produces at least one page", () => {
    expect(figDoc.pages.length).toBeGreaterThanOrEqual(1);
  });

  it("PPTX has a graphicFrame with table content", () => {
    const slide = presDoc.slides[0].slide;
    const graphicFrames = slide.shapes.filter((s) => s.type === "graphicFrame");
    expect(graphicFrames.length).toBeGreaterThanOrEqual(1);

    const tableFrame = graphicFrames.find(
      (gf) => gf.type === "graphicFrame" && gf.content.type === "table",
    );
    expect(tableFrame).toBeDefined();
  });

  it("table is decomposed into FRAME cell nodes", () => {
    const page = figDoc.pages[0];
    // Find FRAME nodes (table cells are FRAME)
    const frames = findNodesByType(page.children, "FRAME");
    expect(frames.length).toBeGreaterThanOrEqual(1);

    // The table FRAME should have child FRAME cells
    // (table_test.pptx has 6 rows × 3 columns = 18 cells)
    const tableFrame = frames.find((f) => f.children && f.children.length > 1);
    expect(tableFrame).toBeDefined();

    if (tableFrame?.children) {
      // Each child is a cell FRAME
      for (const cellFrame of tableFrame.children) {
        expect(cellFrame.type).toBe("FRAME");
      }

      // Cell count matches row × column structure
      const slide = presDoc.slides[0].slide;
      const tableGraphicFrame = slide.shapes.find(
        (s) => s.type === "graphicFrame" && s.content.type === "table",
      );
      if (tableGraphicFrame?.type === "graphicFrame" && tableGraphicFrame.content.type === "table") {
        const table = tableGraphicFrame.content.data.table;
        const expectedCells = table.rows.reduce((sum, row) => sum + row.cells.length, 0);
        // Some cells may be merge placeholders (filtered out), so <=
        expect(tableFrame.children.length).toBeLessThanOrEqual(expectedCells);
        expect(tableFrame.children.length).toBeGreaterThan(0);
      }
    }
  });

  it("no shapes are silently dropped (PPTX shape count matches Fig node count at top level)", () => {
    const slide = presDoc.slides[0].slide;
    const pptxTopLevel = slide.shapes.length;
    const figTopLevel = figDoc.pages[0].children.length;

    // Each PPTX shape should produce at least one Fig node
    expect(figTopLevel).toBe(pptxTopLevel);
  });
});

// =============================================================================
// Chart Fixture Tests
// =============================================================================

describe("Chart conversion (bar-chart.pptx)", () => {
  const FIXTURE = "fixtures/poi-test-data/test-data/slideshow/bar-chart.pptx";
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let presDoc: PresentationDocument;
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let figDoc: FigDesignDocument;
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let warnMessages: string[];

  beforeAll(async () => {
    const fullPath = fixturePathOf(FIXTURE);
    if (!existsSync(fullPath)) {return;}

    warnMessages = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args.map(String).join(" "));
    };

    presDoc = await loadFixture(FIXTURE);
    figDoc = (await pptxToFig(presDoc)).data;

    console.warn = originalWarn;
  });

  it("fixture file exists", () => {
    expect(existsSync(fixturePathOf(FIXTURE))).toBe(true);
  });

  it("PPTX has a graphicFrame with chart content", () => {
    for (const slideWithId of presDoc.slides) {
      const chartFrames = slideWithId.slide.shapes.filter(
        (s) => s.type === "graphicFrame" && s.content.type === "chart",
      );
      if (chartFrames.length > 0) {
        expect(chartFrames.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    // If we get here, no chart found across all slides
    expect.fail("No chart GraphicFrame found in any slide");
  });

  it("chart is either converted or warned about", () => {
    // Check if chart produced children or if a warning was emitted.
    // Chart conversion now produces a RECTANGLE child with an IMAGE fill
    // referencing the rendered chart SVG (stored as image/svg+xml in
    // FigDesignDocument.images via the "chart:" prefix).
    const chartConverted = figDoc.pages.some((page) => {
      const frames = findNodesByType(page.children, "FRAME");
      return frames.some((frame) => {
        if (!frame.children || frame.children.length === 0) {return false;}
        return frame.children.some((c) => {
          if (c.type !== "RECTANGLE") {return false;}
          return c.fills.some((f) => {
            const typeName = typeof f.type === "string" ? f.type : f.type.name;
            return typeName === "IMAGE" && typeof (f as { imageRef?: string }).imageRef === "string" && (f as { imageRef: string }).imageRef.startsWith("chart:");
          });
        });
      });
    });

    if (!chartConverted) {
      // Should have warned
      const chartWarns = warnMessages.filter((m) => m.includes("chart") || m.includes("Chart"));
      expect(chartWarns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("no top-level shapes are silently dropped", () => {
    for (let i = 0; i < presDoc.slides.length; i++) {
      const pptxCount = presDoc.slides[i].slide.shapes.length;
      const figCount = figDoc.pages[i].children.length;
      expect(figCount).toBe(pptxCount);
    }
  });
});

// =============================================================================
// SmartArt/Diagram Fixture Tests
// =============================================================================

describe("Diagram conversion (smartart-simple.pptx)", () => {
  const FIXTURE = "fixtures/poi-test-data/test-data/slideshow/smartart-simple.pptx";
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let presDoc: PresentationDocument;
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let figDoc: FigDesignDocument;
  // eslint-disable-next-line no-restricted-syntax -- mutable test-suite variable initialized in beforeAll
  let warnMessages: string[];

  beforeAll(async () => {
    const fullPath = fixturePathOf(FIXTURE);
    if (!existsSync(fullPath)) {return;}

    warnMessages = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnMessages.push(args.map(String).join(" "));
    };

    presDoc = await loadFixture(FIXTURE);
    figDoc = (await pptxToFig(presDoc)).data;

    console.warn = originalWarn;
  });

  it("fixture file exists", () => {
    expect(existsSync(fixturePathOf(FIXTURE))).toBe(true);
  });

  it("PPTX has a graphicFrame with diagram content", () => {
    for (const slideWithId of presDoc.slides) {
      const diagramFrames = slideWithId.slide.shapes.filter(
        (s) => s.type === "graphicFrame" && s.content.type === "diagram",
      );
      if (diagramFrames.length > 0) {
        expect(diagramFrames.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    expect.fail("No diagram GraphicFrame found in any slide");
  });

  it("diagram is either converted or warned about", () => {
    const diagramConverted = figDoc.pages.some((page) => {
      const frames = findNodesByType(page.children, "FRAME");
      // Multiple children in a FRAME could be diagram shapes
      return frames.some((frame) => frame.children && frame.children.length > 1);
    });

    if (!diagramConverted) {
      const diagramWarns = warnMessages.filter(
        (m) => m.includes("Diagram") || m.includes("diagram"),
      );
      expect(diagramWarns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("no top-level shapes are silently dropped", () => {
    for (let i = 0; i < presDoc.slides.length; i++) {
      const pptxCount = presDoc.slides[i].slide.shapes.length;
      const figCount = figDoc.pages[i].children.length;
      expect(figCount).toBe(pptxCount);
    }
  });
});

// =============================================================================
// General Shape Preservation Tests
// =============================================================================

describe("General shape preservation across all fixture types", () => {
  const FIXTURES = [
    "fixtures/poi-test-data/test-data/slideshow/table_test.pptx",
    "fixtures/poi-test-data/test-data/slideshow/bar-chart.pptx",
    "fixtures/poi-test-data/test-data/slideshow/smartart-simple.pptx",
  ];

  for (const fixture of FIXTURES) {
    const name = fixture.split("/").pop()!;

    it(`${name}: slide count is preserved`, async () => {
      const fullPath = fixturePathOf(fixture);
      if (!existsSync(fullPath)) {return;}

      const originalWarn = console.warn;
      console.warn = () => {};
      const presDoc = await loadFixture(fixture);
      const figDoc = (await pptxToFig(presDoc)).data;
      console.warn = originalWarn;

      expect(figDoc.pages.length).toBe(presDoc.slides.length);
    });

    it(`${name}: no shapes produce null/undefined (no silent drops)`, async () => {
      const fullPath = fixturePathOf(fixture);
      if (!existsSync(fullPath)) {return;}

      const originalWarn2 = console.warn;
      console.warn = () => {};
      const presDoc = await loadFixture(fixture);
      const figDoc = (await pptxToFig(presDoc)).data;
      console.warn = originalWarn2;

      for (const page of figDoc.pages) {
        for (const node of page.children) {
          expect(node).toBeDefined();
          expect(node.id).toBeDefined();
          expect(node.type).toBeDefined();
        }
      }
    });
  }
});
