/**
 * @file Determinism regression for PDF -> shape conversion.
 */

import { readFileSync } from "node:fs";
import type { PdfPage, PdfPath, PdfText } from "@aurochs/pdf/domain";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { getBlockSegmentationFixturePath, getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { normalizePageElementsForDisplay } from "@aurochs/pdf/services/block-segmentation/visualization/page-coordinate-normalization";
import { PT_TO_PX } from "@aurochs/pdf/domain/constants";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { convertPageToShapes, type ConversionOptions, type ConversionTraceEvent } from "./pdf-to-shapes";

type DeterminismCase = {
  readonly name: string;
  readonly pdfPath: string;
  readonly pageNumber: number;
};

const CASES: readonly DeterminismCase[] = [
  {
    name: "mlit-001059436",
    pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
    pageNumber: 1,
  },
  {
    name: "panel2",
    pdfPath: getSampleFixturePath("panel2.pdf"),
    pageNumber: 2,
  },
  {
    name: "k-resource-dl",
    pdfPath: getSampleFixturePath("k-resource-dl.pdf"),
    pageNumber: 1,
  },
] as const;

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(6)) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = canonicalize(record[key]);
    }
    return normalized;
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

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

describe("pdf-to-shapes determinism", () => {
  for (const testCase of CASES) {
    it(`${testCase.name} page ${testCase.pageNumber}: layout/style output is stable across repeated runs`, async () => {
      const page = await loadNormalizedPage({
        pdfPath: testCase.pdfPath,
        pageNumber: testCase.pageNumber,
      });

      const run1 = convertWithTrace(page);
      const run2 = convertWithTrace(page);
      const run3 = convertWithTrace(page);

      const shapes1 = stableJson(run1.shapes);
      const shapes2 = stableJson(run2.shapes);
      const shapes3 = stableJson(run3.shapes);
      expect(shapes2).toBe(shapes1);
      expect(shapes3).toBe(shapes1);

      const traces1 = stableJson(run1.traces);
      const traces2 = stableJson(run2.traces);
      const traces3 = stableJson(run3.traces);
      expect(traces2).toBe(traces1);
      expect(traces3).toBe(traces1);
    });
  }
});
