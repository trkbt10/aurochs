/**
 * @file Element-level trace regression for mlit-001059436 page 1.
 */

import { readFileSync } from "node:fs";
import type { PdfPage, PdfPath, PdfText } from "@aurochs/pdf/domain";
import { PT_TO_PX } from "@aurochs/pdf/domain/constants";
import { getBlockSegmentationFixturePath, getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { normalizePageElementsForDisplay } from "@aurochs/pdf/services/block-segmentation/visualization/page-coordinate-normalization";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import type { TextRun } from "@aurochs-office/pptx/domain/text";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { computePathBBox } from "@aurochs/pdf/parser/path/path-builder";
import { convertColor } from "./color-converter";
import { convertPageToShapes, type ConversionTraceEvent, type ConversionOptions } from "./pdf-to-shapes";

function normalizeHex(value: string): string {
  return value.trim().toUpperCase();
}

function pathAreaRatio(path: PdfPath, page: PdfPage): number {
  const bbox = computePathBBox(path);
  const x0 = Math.min(bbox[0], bbox[2]);
  const y0 = Math.min(bbox[1], bbox[3]);
  const x1 = Math.max(bbox[0], bbox[2]);
  const y1 = Math.max(bbox[1], bbox[3]);
  const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const pageArea = Math.max(1, page.width * page.height);
  return area / pageArea;
}

function computeTextOverlapStats(path: PdfPath, texts: readonly PdfText[]): { overlapRatio: number; overlapCount: number } {
  const bbox = computePathBBox(path);
  const x0 = Math.min(bbox[0], bbox[2]);
  const y0 = Math.min(bbox[1], bbox[3]);
  const x1 = Math.max(bbox[0], bbox[2]);
  const y1 = Math.max(bbox[1], bbox[3]);
  const pathArea = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  if (!(pathArea > 0)) {
    return { overlapRatio: 0, overlapCount: 0 };
  }

  const counter = { overlapCount: 0 };
  const overlapArea = texts.reduce((sum, text) => {
    const ox0 = Math.max(x0, text.x);
    const oy0 = Math.max(y0, text.y);
    const ox1 = Math.min(x1, text.x + text.width);
    const oy1 = Math.min(y1, text.y + text.height);
    if (ox1 > ox0 && oy1 > oy0) {
      counter.overlapCount += 1;
      return sum + (ox1 - ox0) * (oy1 - oy0);
    }
    return sum;
  }, 0);
  return { overlapRatio: overlapArea / pathArea, overlapCount: counter.overlapCount };
}

function computeTextOverlapRatio(path: PdfPath, texts: readonly PdfText[]): number {
  return computeTextOverlapStats(path, texts).overlapRatio;
}

function isNearBlackPath(path: PdfPath): boolean {
  if (path.graphicsState.fillColor.colorSpace !== "DeviceRGB") {
    return false;
  }
  const [r = 1, g = 1, b = 1] = path.graphicsState.fillColor.components;
  return r <= 0.02 && g <= 0.02 && b <= 0.02;
}

function toColorKeyFromPdfText(text: PdfText): string {
  const converted = convertColor(text.graphicsState.fillColor);
  const spec = converted.spec;
  if (spec.type !== "srgb") {
    return spec.type;
  }
  return normalizeHex(spec.value);
}

function toColorKeyFromRun(run: TextRun): string {
  if (run.type !== "text") {
    return "NON_TEXT_RUN";
  }
  const fill = run.properties?.fill;
  if (!fill || fill.type !== "solidFill") {
    return "NO_FILL";
  }
  const spec = fill.color.spec;
  if (spec.type !== "srgb") {
    return spec.type;
  }
  return normalizeHex(spec.value);
}

function countSourceTextByColor(page: PdfPage): Map<string, number> {
  const counts = new Map<string, number>();
  const texts = page.elements.filter((element): element is PdfText => element.type === "text" && element.text.trim().length > 0);
  for (const text of texts) {
    const key = toColorKeyFromPdfText(text);
    const weight = [...text.text].filter((char) => !/\s/u.test(char)).length;
    counts.set(key, (counts.get(key) ?? 0) + Math.max(1, weight));
  }
  return counts;
}

function walkShapeRuns(shape: Shape): TextRun[] {
  if (shape.type === "sp") {
    return (shape.textBody?.paragraphs ?? []).flatMap((paragraph) => paragraph.runs ?? []);
  }
  if (shape.type === "graphicFrame" && shape.content.type === "table") {
    return shape.content.data.table.rows.flatMap((row) =>
      row.cells.flatMap((cell) => (cell.textBody?.paragraphs ?? []).flatMap((paragraph) => paragraph.runs ?? [])),
    );
  }
  if (shape.type === "grpSp") {
    return shape.children.flatMap((child) => walkShapeRuns(child));
  }
  return [];
}

function countOutputTextByColor(shapes: readonly Shape[]): Map<string, number> {
  const counts = new Map<string, number>();
  const runs = shapes.flatMap((shape) => walkShapeRuns(shape));
  for (const run of runs) {
    if (run.type !== "text" || run.text.trim().length === 0) {
      continue;
    }
    const key = toColorKeyFromRun(run);
    const weight = [...run.text].filter((char) => !/\s/u.test(char)).length;
    counts.set(key, (counts.get(key) ?? 0) + Math.max(1, weight));
  }
  return counts;
}

type TraceCase = {
  readonly name: string;
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly largeFillThresholdRatio: number;
};

const TRACE_CASES: readonly TraceCase[] = [
  {
    name: "mlit-001059436",
    pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
    pageNumber: 1,
    largeFillThresholdRatio: 0.01,
  },
  {
    name: "panel2",
    pdfPath: getSampleFixturePath("panel2.pdf"),
    pageNumber: 2,
    largeFillThresholdRatio: 0.01,
  },
  {
    name: "k-resource-dl",
    pdfPath: getSampleFixturePath("k-resource-dl.pdf"),
    pageNumber: 1,
    largeFillThresholdRatio: 0.01,
  },
] as const;

async function loadNormalizedPage(args: { readonly pdfPath: string; readonly pageNumber: number }): Promise<PdfPage> {
  const { pdfPath, pageNumber } = args;
  const pdfBytes = readFileSync(pdfPath);
  const parsed = await parsePdf(pdfBytes, { pages: [pageNumber] });
  const rawPage = parsed.pages[0];
  if (!rawPage) {
    throw new Error(`Expected page ${pageNumber}`);
  }

  const texts = rawPage.elements.filter((element): element is PdfText => element.type === "text");
  const paths = rawPage.elements.filter((element): element is PdfPath => element.type === "path");
  const images = rawPage.elements.filter((element) => element.type === "image");
  const normalized = await normalizePageElementsForDisplay({
    pdfBytes,
    pageNumber,
    pageWidth: rawPage.width,
    pageHeight: rawPage.height,
    texts,
    paths,
    images,
  });
  if (!normalized.applied) {
    return rawPage;
  }

  // eslint-disable-next-line no-restricted-syntax -- mutable cursors keep index mapping explicit
  let textIndex = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable cursors keep index mapping explicit
  let pathIndex = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable cursors keep index mapping explicit
  let imageIndex = 0;
  return {
    ...rawPage,
    elements: rawPage.elements.map((element) => {
      if (element.type === "text") {
        const next = normalized.texts[textIndex];
        textIndex += 1;
        if (!next) {
          throw new Error("normalized.texts index overflow");
        }
        return next;
      }
      if (element.type === "path") {
        const next = normalized.paths[pathIndex];
        pathIndex += 1;
        if (!next) {
          throw new Error("normalized.paths index overflow");
        }
        return next;
      }
      if (element.type === "image") {
        const next = normalized.images[imageIndex];
        imageIndex += 1;
        if (!next) {
          throw new Error("normalized.images index overflow");
        }
        return next;
      }
      return element;
    }),
  };
}

function convertWithTrace(page: PdfPage): { shapes: readonly Shape[]; traces: readonly ConversionTraceEvent[] } {
  const traces: ConversionTraceEvent[] = [];
  const options: ConversionOptions = {
    slideWidth: px(Math.round(page.width * PT_TO_PX)),
    slideHeight: px(Math.round(page.height * PT_TO_PX)),
    fit: "contain",
    grouping: { preset: "auto" },
    trace: (event) => traces.push(event),
  };
  const shapes = convertPageToShapes(page, options);
  return { shapes, traces };
}

describe("pdf-to-shapes trace (mlit-001059436 page1)", () => {
  for (const testCase of TRACE_CASES) {
    it(`${testCase.name} page ${testCase.pageNumber}: large fill paths are not lost/suppressed`, async () => {
      const page = await loadNormalizedPage({ pdfPath: testCase.pdfPath, pageNumber: testCase.pageNumber });
      const { traces } = convertWithTrace(page);

      const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
      const largeFillPathIndices = pagePaths
        .map((path, index) => ({ path, index }))
        .filter((entry) => entry.path.paintOp === "fill")
        .filter((entry) => pathAreaRatio(entry.path, page) >= testCase.largeFillThresholdRatio)
        .map((entry) => entry.index);

      const emitted = new Set(
        traces
          .filter((event): event is Extract<ConversionTraceEvent, { kind: "path-emitted" }> => event.kind === "path-emitted")
          .map((event) => event.pathIndex),
      );
      const consumed = new Set(
        traces
          .filter(
            (event): event is Extract<ConversionTraceEvent, { kind: "path-consumed-by-table" }> =>
              event.kind === "path-consumed-by-table",
          )
          .map((event) => event.pathIndex),
      );
      const suppressed = new Set(
        traces
          .filter(
            (event): event is Extract<ConversionTraceEvent, { kind: "path-suppressed-text-outline" }> =>
              event.kind === "path-suppressed-text-outline",
          )
          .map((event) => event.pathIndex),
      );
      const macroSuppressed = new Set(
        traces
          .filter(
            (event): event is Extract<ConversionTraceEvent, { kind: "path-suppressed-text-outline" }> =>
              event.kind === "path-suppressed-text-outline",
          )
          .filter((event) => event.rule === "macro")
          .map((event) => event.pathIndex),
      );
      const dropped = new Set(
        traces
          .filter(
            (event): event is Extract<ConversionTraceEvent, { kind: "path-dropped-convert-null" }> =>
              event.kind === "path-dropped-convert-null",
          )
          .map((event) => event.pathIndex),
      );

      for (const pathIndex of largeFillPathIndices) {
        if (macroSuppressed.has(pathIndex)) {
          expect(dropped.has(pathIndex)).toBe(false);
          expect(emitted.has(pathIndex) || consumed.has(pathIndex)).toBe(false);
          continue;
        }
        expect(suppressed.has(pathIndex)).toBe(false);
        expect(dropped.has(pathIndex)).toBe(false);
        expect(emitted.has(pathIndex) || consumed.has(pathIndex)).toBe(true);
      }
    });
  }

  it("mlit-001059436 page1: suppresses text-outline paths without touching large fills", async () => {
    const page = await loadNormalizedPage({
      pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
      pageNumber: 1,
    });
    const { traces } = convertWithTrace(page);
    const suppressed = traces.filter(
      (event): event is Extract<ConversionTraceEvent, { kind: "path-suppressed-text-outline" }> =>
        event.kind === "path-suppressed-text-outline",
    );
    expect(suppressed.length).toBeGreaterThan(0);
    const largeSuppressed = suppressed.filter((event) => event.pathAreaRatio > 0.0062);
    expect(largeSuppressed.length).toBeGreaterThan(0);
    for (const event of largeSuppressed) {
      expect(event.rule).toBe("macro");
      expect(event.overlapTextCount).toBeGreaterThanOrEqual(1);
      expect(event.overlapRatio).toBeGreaterThanOrEqual(0.28);
      expect(event.operationsCount).toBeGreaterThanOrEqual(16);
      expect(event.pathAreaRatio).toBeLessThanOrEqual(0.08);
    }

    const macroLowTextCountSuppressed = suppressed.filter(
      (event) =>
        event.rule === "macro" &&
        event.overlapTextCount <= 4 &&
        event.overlapRatio >= 0.3 &&
        event.operationsCount >= 16,
    );
    expect(macroLowTextCountSuppressed.length).toBeGreaterThan(0);

    const mediumSuppressed = suppressed.filter((event) => event.pathAreaRatio > 0.0032);
    for (const event of mediumSuppressed) {
      if (event.rule === "macro") {
        continue;
      }
      expect(event.overlapRatio).toBeGreaterThanOrEqual(0.22);
      expect(event.operationsCount).toBeGreaterThanOrEqual(30);
    }
  });

  it("mlit-001059436 page1: medium black text-outline candidates are not emitted as shapes", async () => {
    const page = await loadNormalizedPage({
      pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
      pageNumber: 1,
    });
    const { traces } = convertWithTrace(page);
    const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
    const pageTexts = page.elements.filter((element): element is PdfText => element.type === "text" && element.text.trim().length > 0);

    const emitted = new Set(
      traces
        .filter((event): event is Extract<ConversionTraceEvent, { kind: "path-emitted" }> => event.kind === "path-emitted")
        .map((event) => event.pathIndex),
    );

    const mediumBlackTextOutlineCandidates = pagePaths
      .map((path, index) => ({ path, index }))
      .filter((entry) => entry.path.paintOp === "fill")
      .filter((entry) => (entry.path.graphicsState.fillAlpha ?? 1) >= 0.95)
      .filter((entry) => entry.path.graphicsState.fillColor.colorSpace === "DeviceRGB")
      .filter((entry) => {
        const [r = 1, g = 1, b = 1] = entry.path.graphicsState.fillColor.components;
        return r <= 0.02 && g <= 0.02 && b <= 0.02;
      })
      .filter((entry) => entry.path.operations.length >= 12)
      .filter((entry) => {
        const ratio = pathAreaRatio(entry.path, page);
        return ratio > 0.0032 && ratio <= 0.0062;
      })
      .filter((entry) => computeTextOverlapRatio(entry.path, pageTexts) >= 0.22)
      .map((entry) => entry.index);

    for (const pathIndex of mediumBlackTextOutlineCandidates) {
      expect(emitted.has(pathIndex)).toBe(false);
    }
  });

  it("mlit-001059436 page1: suppresses dense non-black text-outline paths but keeps logo-like red fills", async () => {
    const page = await loadNormalizedPage({
      pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
      pageNumber: 1,
    });
    const { traces } = convertWithTrace(page);
    const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
    const pageTexts = page.elements.filter((element): element is PdfText => element.type === "text" && element.text.trim().length > 0);

    const macroSuppressed = new Set(
      traces
        .filter(
          (event): event is Extract<ConversionTraceEvent, { kind: "path-suppressed-text-outline" }> =>
            event.kind === "path-suppressed-text-outline",
        )
        .filter((event) => event.rule === "macro")
        .map((event) => event.pathIndex),
    );
    const emitted = new Set(
      traces
        .filter((event): event is Extract<ConversionTraceEvent, { kind: "path-emitted" }> => event.kind === "path-emitted")
        .map((event) => event.pathIndex),
    );

    const denseNonBlackTextOutlines = pagePaths
      .map((path, index) => ({ path, index }))
      .filter((entry) => entry.path.paintOp === "fill")
      .filter((entry) => (entry.path.graphicsState.fillAlpha ?? 1) >= 0.95)
      .filter((entry) => !isNearBlackPath(entry.path))
      .filter((entry) => entry.path.operations.length >= 30)
      .filter((entry) => {
        const ratio = pathAreaRatio(entry.path, page);
        return ratio >= 0.006 && ratio <= 0.08;
      })
      .filter((entry) => {
        const overlap = computeTextOverlapStats(entry.path, pageTexts);
        return overlap.overlapCount >= 4 && overlap.overlapRatio >= 0.25;
      })
      .map((entry) => entry.index);
    for (const pathIndex of denseNonBlackTextOutlines) {
      expect(macroSuppressed.has(pathIndex)).toBe(true);
      expect(emitted.has(pathIndex)).toBe(false);
    }

    const redLogoLikeFills = pagePaths
      .map((path, index) => ({ path, index }))
      .filter((entry) => entry.path.paintOp === "fill")
      .filter((entry) => (entry.path.graphicsState.fillAlpha ?? 1) >= 0.95)
      .filter((entry) => entry.path.graphicsState.fillColor.colorSpace === "DeviceRGB")
      .filter((entry) => {
        const [r = 0, g = 0, b = 0] = entry.path.graphicsState.fillColor.components;
        return r >= 0.98 && g <= 0.02 && b <= 0.02;
      })
      .filter((entry) => entry.path.operations.length >= 16)
      .filter((entry) => pathAreaRatio(entry.path, page) >= 0.01)
      .filter((entry) => {
        const overlap = computeTextOverlapStats(entry.path, pageTexts);
        return overlap.overlapCount <= 1 && overlap.overlapRatio <= 0.3;
      })
      .map((entry) => entry.index);
    expect(redLogoLikeFills.length).toBeGreaterThan(0);
    for (const pathIndex of redLogoLikeFills) {
      expect(macroSuppressed.has(pathIndex)).toBe(false);
      expect(emitted.has(pathIndex)).toBe(true);
    }
  });

  it("mlit-001059436 page1: keeps mixed text-color distribution (not forced to single red style)", async () => {
    const page = await loadNormalizedPage({
      pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
      pageNumber: 1,
    });
    const { shapes } = convertWithTrace(page);
    const sourceCounts = countSourceTextByColor(page);
    const outputCounts = countOutputTextByColor(shapes);

    const sourceTotal = [...sourceCounts.values()].reduce((sum, count) => sum + count, 0);
    const outputTotal = [...outputCounts.values()].reduce((sum, count) => sum + count, 0);
    const sourceRed = sourceCounts.get("FF0000") ?? 0;
    const outputRed = outputCounts.get("FF0000") ?? 0;
    const sourceNonRed = sourceTotal - sourceRed;
    const outputNonRed = outputTotal - outputRed;

    expect(sourceRed).toBeGreaterThan(0);
    expect(sourceNonRed).toBeGreaterThan(0);
    expect(outputRed).toBeGreaterThan(0);
    expect(outputNonRed).toBeGreaterThan(0);

    const sourceRedRatio = sourceRed / Math.max(1, sourceTotal);
    const outputRedRatio = outputRed / Math.max(1, outputTotal);
    expect(Math.abs(outputRedRatio - sourceRedRatio)).toBeLessThan(0.35);
    expect(outputNonRed / Math.max(1, outputTotal)).toBeGreaterThan(0.1);
  });

  it("panel2 page2: preserves multi-color text distribution", async () => {
    const page = await loadNormalizedPage({ pdfPath: getSampleFixturePath("panel2.pdf"), pageNumber: 2 });
    const { shapes } = convertWithTrace(page);
    const sourceCounts = countSourceTextByColor(page);
    const outputCounts = countOutputTextByColor(shapes);

    const sourceKeys = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key);
    const outputKeys = new Set(outputCounts.keys());
    for (const key of sourceKeys) {
      expect(outputKeys.has(key)).toBe(true);
    }
  });
});
