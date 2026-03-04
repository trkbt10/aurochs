/**
 * @file Element-route regression across shared PDF fixtures.
 *
 * Purpose:
 * - each PDF text element is preserved as editable PPTX text (character count)
 * - each drawable PDF path is accounted for (emitted / table-consumed / outline-suppressed)
 * - large fill paths are never dropped as text-outline noise
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { PdfPage, PdfPath, PdfText } from "@aurochs/pdf/domain";
import { PT_TO_PX } from "@aurochs/pdf/domain/constants";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { computePathBBox } from "@aurochs/pdf/parser/path/path-builder";
import { getBlockSegmentationFixturePath, getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { normalizePageElementsForDisplay } from "@aurochs/pdf/services/block-segmentation/visualization/page-coordinate-normalization";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import type { TextRun } from "@aurochs-office/pptx/domain/text";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { convertColor } from "./color-converter";
import { convertPageToShapes, type ConversionOptions, type ConversionTraceEvent } from "./pdf-to-shapes";

type RouteCase = {
  readonly name: string;
  readonly pdfPath: string;
  readonly pages: readonly number[];
  readonly normalizeWithPdftocairo?: boolean;
};

const CASES: readonly RouteCase[] = [
  { name: "panel2", pdfPath: getSampleFixturePath("panel2.pdf"), pages: [1, 2] },
  { name: "k-namingrule-dl", pdfPath: getSampleFixturePath("k-namingrule-dl.pdf"), pages: [1, 2] },
  { name: "k-resource-dl", pdfPath: getSampleFixturePath("k-resource-dl.pdf"), pages: [1, 2, 3, 4, 5] },
  { name: "block-table-with-rules", pdfPath: getBlockSegmentationFixturePath("table-with-rules.pdf"), pages: [1] },
  { name: "block-vertical-two-columns", pdfPath: getBlockSegmentationFixturePath("vertical-two-columns.pdf"), pages: [1] },
  {
    name: "block-20241224jokenhenko",
    pdfPath: getBlockSegmentationFixturePath("20241224jokenhenko.pdf"),
    pages: [1],
    normalizeWithPdftocairo: true,
  },
  { name: "block-20260219c000320001", pdfPath: getBlockSegmentationFixturePath("20260219c000320001.pdf"), pages: [1] },
  { name: "block-20260219g000350002", pdfPath: getBlockSegmentationFixturePath("20260219g000350002.pdf"), pages: [1] },
  { name: "block-20260219h016500001", pdfPath: getBlockSegmentationFixturePath("20260219h016500001.pdf"), pages: [1] },
  { name: "block-courts-hanrei-87071", pdfPath: getBlockSegmentationFixturePath("courts-hanrei-87071.pdf"), pages: [1] },
  { name: "block-grib2-manual", pdfPath: getBlockSegmentationFixturePath("grib2_manual.pdf"), pages: [1] },
  {
    name: "block-horizontal-long-single",
    pdfPath: getBlockSegmentationFixturePath("horizontal-long-single.pdf"),
    pages: [1],
  },
  {
    name: "block-horizontal-long-two-column",
    pdfPath: getBlockSegmentationFixturePath("horizontal-long-two-column.pdf"),
    pages: [1],
  },
  {
    name: "block-jp-public-doc-merged-cells",
    pdfPath: getBlockSegmentationFixturePath("jp-public-doc-merged-cells.pdf"),
    pages: [1],
  },
  { name: "block-mlit-001059436", pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"), pages: [1] },
  {
    name: "block-mlit-hakusho-r07-np101100",
    pdfPath: getBlockSegmentationFixturePath("mlit-hakusho-r07-np101100.pdf"),
    pages: [1],
  },
  {
    name: "block-paper-cover-abstract-two-column",
    pdfPath: getBlockSegmentationFixturePath("paper-cover-abstract-two-column.pdf"),
    pages: [1],
  },
  { name: "block-rtl-arabic-pdfjs", pdfPath: getBlockSegmentationFixturePath("rtl-arabic-pdfjs.pdf"), pages: [1] },
  { name: "block-vertical-long-single", pdfPath: getBlockSegmentationFixturePath("vertical-long-single.pdf"), pages: [1] },
  { name: "block-vertical-three-columns", pdfPath: getBlockSegmentationFixturePath("vertical-three-columns.pdf"), pages: [1] },
] as const;

type ParsedKeyCounts = Map<string, number>;

function hasPdftocairo(): boolean {
  try {
    execFileSync("pdftocairo", ["-v"], { stdio: "ignore" });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
}

function normalizePdfByPdftocairo(args: { readonly caseName: string; readonly pdfPath: string }): string {
  const outDir = path.join(os.tmpdir(), "web-pptx-normalized-pdf");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${args.caseName}.pdf`);
  if (!existsSync(outPath)) {
    execFileSync("pdftocairo", ["-pdf", args.pdfPath, outPath], { stdio: "ignore" });
  }
  return outPath;
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

function normalizeHex(value: string): string {
  return value.trim().toUpperCase();
}

function toColorKeyFromPdfText(text: PdfText): string {
  const converted = convertColor(text.graphicsState.fillColor);
  const spec = converted.spec;
  if (spec.type !== "srgb") {
    return spec.type;
  }
  return normalizeHex(spec.value);
}

function toColorKeyFromTextRun(run: TextRun): string {
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

function countNonWhitespaceChars(text: string): number {
  return [...text].filter((char) => !/\s/u.test(char)).length;
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

function countSourceTextByColor(page: PdfPage): ParsedKeyCounts {
  const counts = new Map<string, number>();
  const texts = page.elements.filter((element): element is PdfText => element.type === "text" && element.text.trim().length > 0);
  for (const text of texts) {
    const key = toColorKeyFromPdfText(text);
    const weight = countNonWhitespaceChars(text.text);
    counts.set(key, (counts.get(key) ?? 0) + Math.max(1, weight));
  }
  return counts;
}

function countOutputTextByColor(shapes: readonly Shape[]): ParsedKeyCounts {
  const counts = new Map<string, number>();
  const runs = shapes.flatMap((shape) => walkShapeRuns(shape));
  for (const run of runs) {
    if (run.type !== "text" || run.text.trim().length === 0) {
      continue;
    }
    const key = toColorKeyFromTextRun(run);
    const weight = countNonWhitespaceChars(run.text);
    counts.set(key, (counts.get(key) ?? 0) + Math.max(1, weight));
  }
  return counts;
}

async function loadNormalizedPage(args: {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly normalizeWithPdftocairo?: boolean;
  readonly caseName: string;
}): Promise<PdfPage | null> {
  const { pageNumber, caseName } = args;
  const effectivePath = args.normalizeWithPdftocairo ? normalizePdfByPdftocairo({ caseName, pdfPath: args.pdfPath }) : args.pdfPath;
  const pdfBytes = readFileSync(effectivePath);
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

  // eslint-disable-next-line no-restricted-syntax -- mutable cursors keep source-order mapping explicit
  let textIndex = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable cursors keep source-order mapping explicit
  let pathIndex = 0;
  // eslint-disable-next-line no-restricted-syntax -- mutable cursors keep source-order mapping explicit
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

function convertWithTrace(page: PdfPage): { readonly shapes: readonly Shape[]; readonly traces: readonly ConversionTraceEvent[] } {
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

describe("pdf-to-shapes element routing", () => {
  const pdftocairoInstalled = hasPdftocairo();

  for (const testCase of CASES) {
    for (const pageNumber of testCase.pages) {
      it(`${testCase.name} page ${pageNumber}: preserves text chars and routes all drawable paths`, async () => {
        if (testCase.normalizeWithPdftocairo && !pdftocairoInstalled) {
          console.warn(`SKIPPED: pdftocairo not found (${testCase.name})`);
          return;
        }

        const page = await loadNormalizedPage({
          pdfPath: testCase.pdfPath,
          pageNumber,
          normalizeWithPdftocairo: testCase.normalizeWithPdftocairo,
          caseName: `${testCase.name}-p${pageNumber}`,
        });
        if (!page) {
          throw new Error(`Failed to load page: ${testCase.name} page ${pageNumber}`);
        }

        const { shapes, traces } = convertWithTrace(page);

        const sourceTextChars = page.elements
          .filter((element): element is PdfText => element.type === "text")
          .reduce((sum, text) => sum + countNonWhitespaceChars(text.text), 0);
        const outputTextChars = shapes
          .flatMap((shape) => walkShapeRuns(shape))
          .filter((run) => run.type === "text")
          .reduce((sum, run) => sum + countNonWhitespaceChars(run.text), 0);
        expect(outputTextChars).toBe(sourceTextChars);

        const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
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
        const skipped = new Set(
          traces
            .filter(
              (event): event is Extract<ConversionTraceEvent, { kind: "path-skipped-text-outline" }> =>
                event.kind === "path-skipped-text-outline",
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
        const dropped = traces.filter(
          (event): event is Extract<ConversionTraceEvent, { kind: "path-dropped-convert-null" }> =>
            event.kind === "path-dropped-convert-null",
        );
        expect(dropped).toHaveLength(0);

        const accountedPathIndices = new Set<number>([
          ...emitted.values(),
          ...consumed.values(),
          ...skipped.values(),
          ...dropped.map((event) => event.pathIndex),
        ]);
        const drawablePathIndices = pagePaths
          .map((path, index) => ({ path, index }))
          .filter((entry) => entry.path.paintOp !== "none" && entry.path.paintOp !== "clip")
          .filter((entry) => entry.path.operations.length > 0)
          .map((entry) => entry.index);
        const unresolved = drawablePathIndices.filter((index) => !accountedPathIndices.has(index));
        expect(unresolved).toEqual([]);

        const largeFillIndices = pagePaths
          .map((path, index) => ({ path, index }))
          .filter((entry) => entry.path.paintOp === "fill")
          .filter((entry) => pathAreaRatio(entry.path, page) >= 0.008)
          .map((entry) => entry.index);
        for (const index of largeFillIndices) {
          if (macroSuppressed.has(index)) {
            expect(skipped.has(index)).toBe(true);
            expect(emitted.has(index) || consumed.has(index)).toBe(false);
            continue;
          }
          expect(skipped.has(index)).toBe(false);
          expect(emitted.has(index) || consumed.has(index)).toBe(true);
        }

        const sourceColorCounts = countSourceTextByColor(page);
        const outputColorCounts = countOutputTextByColor(shapes);
        const sourceTotal = [...sourceColorCounts.values()].reduce((sum, count) => sum + count, 0);
        if (sourceTotal > 0) {
          const representativeSourceColors = [...sourceColorCounts.entries()]
            .filter((entry) => entry[1] / sourceTotal >= 0.03)
            .map((entry) => entry[0]);
          for (const sourceColor of representativeSourceColors) {
            expect(outputColorCounts.get(sourceColor) ?? 0).toBeGreaterThan(0);
          }
        }
      }, 30_000);
    }
  }
});
