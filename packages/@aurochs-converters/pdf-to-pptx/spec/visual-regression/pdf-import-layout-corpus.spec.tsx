/**
 * @file Layout-focused visual regression corpus (PDF baseline + text-region mask + table placement).
 */

/**
 * @vitest-environment jsdom
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Slide } from "@aurochs-office/pptx/domain/slide/types";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import type { PdfPage, PdfPath, PdfText } from "@aurochs/pdf/domain";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { getBlockSegmentationFixturePath, getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { normalizePageElementsForDisplay } from "@aurochs/pdf/services/block-segmentation/visualization/page-coordinate-normalization";
import { importPdf } from "../../src/importer/pdf-importer";
import { convertBBox, convertPoint, convertSize, createFitContext } from "../../src/converter/transform-converter";
import { detectTableRegionsFromPaths } from "../../src/converter/table-detection";
import { render } from "@testing-library/react";
import { SlideRendererSvg } from "@aurochs-renderer/pptx/react";
import { compareSvgToPdfBaseline, compareTextRegionMasks, type MaskRect } from "./compare";

const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;

type LayoutThreshold = {
  readonly recall: number;
  readonly precision: number;
  readonly f1: number;
};

type LayoutCasePage = {
  readonly pageNumber: number;
  readonly pdfMaxDiffPercent: number;
  readonly textMask: LayoutThreshold;
};

type LayoutCase = {
  readonly name: string;
  readonly pdfPath: string;
  readonly pages: readonly LayoutCasePage[];
  readonly normalizeWithPdftocairo?: boolean;
  readonly skipErrorMessages?: readonly string[];
};

const CASES: readonly LayoutCase[] = [
  {
    name: "panel2",
    pdfPath: getSampleFixturePath("panel2.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 5, textMask: { recall: 0.98, precision: 0.8, f1: 0.88 } },
      { pageNumber: 2, pdfMaxDiffPercent: 7, textMask: { recall: 0.95, precision: 0.66, f1: 0.8 } },
    ],
  },
  {
    name: "k-namingrule-dl",
    pdfPath: getSampleFixturePath("k-namingrule-dl.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 4, textMask: { recall: 0.95, precision: 0.62, f1: 0.74 } },
      { pageNumber: 2, pdfMaxDiffPercent: 4, textMask: { recall: 0.95, precision: 0.62, f1: 0.74 } },
    ],
  },
  {
    name: "k-resource-dl",
    pdfPath: getSampleFixturePath("k-resource-dl.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 6, textMask: { recall: 0.85, precision: 0.39, f1: 0.54 } },
      { pageNumber: 2, pdfMaxDiffPercent: 4.5, textMask: { recall: 0.94, precision: 0.5, f1: 0.64 } },
      { pageNumber: 3, pdfMaxDiffPercent: 6, textMask: { recall: 0.9, precision: 0.45, f1: 0.58 } },
      { pageNumber: 4, pdfMaxDiffPercent: 4.5, textMask: { recall: 0.93, precision: 0.5, f1: 0.64 } },
      { pageNumber: 5, pdfMaxDiffPercent: 8.5, textMask: { recall: 0.9, precision: 0.45, f1: 0.58 } },
    ],
  },
  {
    name: "block-corpus-table-with-rules",
    pdfPath: getBlockSegmentationFixturePath("table-with-rules.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 2.5, textMask: { recall: 0.9, precision: 0.65, f1: 0.75 } },
    ],
  },
  {
    name: "block-corpus-vertical-two-columns",
    pdfPath: getBlockSegmentationFixturePath("vertical-two-columns.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 1.5, textMask: { recall: 0.9, precision: 0.65, f1: 0.75 } },
    ],
  },
  {
    name: "block-corpus-20241224jokenhenko",
    pdfPath: getBlockSegmentationFixturePath("20241224jokenhenko.pdf"),
    normalizeWithPdftocairo: true,
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 20, textMask: { recall: 0.5, precision: 0.5, f1: 0.5 } },
    ],
  },
  {
    name: "block-corpus-20260219c000320001",
    pdfPath: getBlockSegmentationFixturePath("20260219c000320001.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 16, textMask: { recall: 0.55, precision: 0.84, f1: 0.67 } },
    ],
  },
  {
    name: "block-corpus-20260219g000350002",
    pdfPath: getBlockSegmentationFixturePath("20260219g000350002.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 5.5, textMask: { recall: 0.98, precision: 0.85, f1: 0.9 } },
    ],
  },
  {
    name: "block-corpus-20260219h016500001",
    pdfPath: getBlockSegmentationFixturePath("20260219h016500001.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 5.5, textMask: { recall: 0.98, precision: 0.54, f1: 0.7 } },
    ],
  },
  {
    name: "block-corpus-courts-hanrei-87071",
    pdfPath: getBlockSegmentationFixturePath("courts-hanrei-87071.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 3.5, textMask: { recall: 0.98, precision: 0.95, f1: 0.96 } },
    ],
  },
  {
    name: "block-corpus-grib2-manual",
    pdfPath: getBlockSegmentationFixturePath("grib2_manual.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 3.5, textMask: { recall: 0.95, precision: 0.85, f1: 0.9 } },
    ],
  },
  {
    name: "block-corpus-horizontal-long-single",
    pdfPath: getBlockSegmentationFixturePath("horizontal-long-single.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 2, textMask: { recall: 0.98, precision: 0.95, f1: 0.96 } },
    ],
  },
  {
    name: "block-corpus-horizontal-long-two-column",
    pdfPath: getBlockSegmentationFixturePath("horizontal-long-two-column.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 2, textMask: { recall: 0.98, precision: 0.95, f1: 0.96 } },
    ],
  },
  {
    name: "block-corpus-jp-public-doc-merged-cells",
    pdfPath: getBlockSegmentationFixturePath("jp-public-doc-merged-cells.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 1.5, textMask: { recall: 0.98, precision: 0.95, f1: 0.96 } },
    ],
  },
  {
    name: "block-corpus-mlit-001059436",
    pdfPath: getBlockSegmentationFixturePath("mlit-001059436.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 28, textMask: { recall: 0.94, precision: 0.65, f1: 0.79 } },
    ],
  },
  {
    name: "block-corpus-mlit-hakusho-r07-np101100",
    pdfPath: getBlockSegmentationFixturePath("mlit-hakusho-r07-np101100.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 12, textMask: { recall: 0.98, precision: 0.85, f1: 0.9 } },
    ],
  },
  {
    name: "block-corpus-paper-cover-abstract-two-column",
    pdfPath: getBlockSegmentationFixturePath("paper-cover-abstract-two-column.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 3, textMask: { recall: 0.98, precision: 0.9, f1: 0.94 } },
    ],
  },
  {
    name: "block-corpus-rtl-arabic-pdfjs",
    pdfPath: getBlockSegmentationFixturePath("rtl-arabic-pdfjs.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 1.5, textMask: { recall: 0.98, precision: 0.73, f1: 0.84 } },
    ],
  },
  {
    name: "block-corpus-vertical-long-single",
    pdfPath: getBlockSegmentationFixturePath("vertical-long-single.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 1, textMask: { recall: 0.98, precision: 0.7, f1: 0.82 } },
    ],
  },
  {
    name: "block-corpus-vertical-three-columns",
    pdfPath: getBlockSegmentationFixturePath("vertical-three-columns.pdf"),
    pages: [
      { pageNumber: 1, pdfMaxDiffPercent: 1, textMask: { recall: 0.98, precision: 0.65, f1: 0.78 } },
    ],
  },
] as const;

function hasPdftoppm(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
}

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

function normalizePdfByPdftocairo(args: {
  readonly caseName: string;
  readonly pdfPath: string;
}): string {
  const outDir = path.join(__dirname, "__output__", "__normalized_pdf__");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${args.caseName}.pdf`);
  if (!existsSync(outPath)) {
    execFileSync("pdftocairo", ["-pdf", args.pdfPath, outPath], { stdio: "ignore" });
  }
  return outPath;
}

function ensureSvgTextMeasurement(): void {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  svg.appendChild(text);
  document.body.appendChild(svg);
  const proto = Object.getPrototypeOf(text);
  if (!proto.getComputedTextLength) {
    proto.getComputedTextLength = function () {
      return (this.textContent?.length ?? 0) * 8;
    };
  }
  document.body.removeChild(svg);
}

const rectArea = (rect: MaskRect): number => Math.max(0, rect.width) * Math.max(0, rect.height);
const rectOverlapArea = (a: MaskRect, b: MaskRect): number => {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  if (!(x1 > x0) || !(y1 > y0)) {
    return 0;
  }
  return (x1 - x0) * (y1 - y0);
};
const rectIou = (a: MaskRect, b: MaskRect): number => {
  const overlap = rectOverlapArea(a, b);
  const union = rectArea(a) + rectArea(b) - overlap;
  return union > 0 ? overlap / union : 0;
};

function collectSlideTextRegionRects(slide: Slide): readonly MaskRect[] {
  const collectApproxTableTextRects = (shape: Extract<Shape, { type: "graphicFrame" }>): readonly MaskRect[] => {
    if (shape.content.type !== "table") {
      return [];
    }
    const table = shape.content.data.table;
    const columns = table.grid.columns.map((column) => Number(column.width)).filter((width) => width > 0);
    if (columns.length === 0) {
      return [];
    }

    let longParagraphCount = 0;
    for (const row of table.rows) {
      for (const cell of row.cells) {
        for (const paragraph of cell.textBody?.paragraphs ?? []) {
          const text = (paragraph.runs ?? [])
            .filter((run) => run.type === "text")
            .map((run) => run.text)
            .join("")
            .trim();
          if (text.length >= 70) {
            longParagraphCount += 1;
          }
        }
      }
    }

    // Complex data tables tend to produce noisy approximations. Keep table text masks only
    // for flow-like dense text sections (few columns + multiple long rows).
    const isFlowLikeDenseTable = columns.length <= 2 && table.rows.length >= 5 && longParagraphCount >= 2;
    if (!isFlowLikeDenseTable) {
      return [];
    }

    const isCjkHeavy = (text: string): boolean => {
      const chars = [...text];
      if (chars.length === 0) {
        return false;
      }
      const cjk = chars.filter((ch) => /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff]/u.test(ch)).length;
      return cjk / chars.length >= 0.4;
    };

    const toPxFontSize = (value: number | undefined): number => {
      const pt = typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 10;
      return pt * (96 / 72);
    };

    const rects: MaskRect[] = [];
    let yOffset = 0;
    for (const row of table.rows) {
      const rowHeight = Number(row.height ?? 0);
      let xOffset = 0;
      let colIndex = 0;
      for (const cell of row.cells) {
        const span = Math.max(1, cell.properties?.colSpan ?? 1);
        const cellWidth = columns.slice(colIndex, colIndex + span).reduce((sum, width) => sum + width, 0);
        const cellX = Number(shape.transform.x as number) + xOffset;
        const cellY = Number(shape.transform.y as number) + yOffset;
        const paragraphs = cell.textBody?.paragraphs ?? [];
        const textParagraphs = paragraphs
          .map((paragraph) => {
            const text = (paragraph.runs ?? [])
              .filter((run) => run.type === "text")
              .map((run) => run.text)
              .join("");
            if (text.trim().length === 0) {
              return null;
            }
            const fontSize = (paragraph.runs ?? [])
              .filter((run) => run.type === "text")
              .map((run) => run.properties?.fontSize as number | undefined)
              .find((size) => typeof size === "number" && Number.isFinite(size) && size > 0);
            return {
              text,
              alignment: paragraph.properties?.alignment ?? "left",
              fontPx: toPxFontSize(fontSize),
            };
          })
          .filter((item): item is { text: string; alignment: "left" | "center" | "right" | "justify"; fontPx: number } => item !== null);

        const insetX = Math.min(4, Math.max(1.5, cellWidth * 0.03));
        const insetY = Math.min(3, Math.max(1, rowHeight * 0.07));
        let lineCursorY = cellY + insetY;
        let verticalCursorX = cellX + insetX;
        for (const paragraph of textParagraphs) {
          const maxWidth = Math.max(1, cellWidth - insetX * 2);
          const maxHeight = Math.max(1, rowHeight - insetY * 2);
          const cjkHeavy = isCjkHeavy(paragraph.text);
          const lineHeight = Math.max(6, paragraph.fontPx * 1.18);
          const charAdvance = paragraph.fontPx * (cjkHeavy ? 0.95 : 0.55);
          const horizontalRawWidth = Math.max(paragraph.fontPx * 0.8, paragraph.text.length * charAdvance);
          const useVertical = cjkHeavy && rowHeight > cellWidth * 2.0 && paragraph.text.length <= 40;

          if (useVertical) {
            const width = Math.min(maxWidth, Math.max(paragraph.fontPx * 0.85, paragraph.fontPx * 1.1));
            const height = Math.min(maxHeight, Math.max(paragraph.fontPx, paragraph.text.length * paragraph.fontPx * 0.95));

            let x = verticalCursorX;
            if (paragraph.alignment === "center") {
              x = cellX + (cellWidth - width) / 2;
            } else if (paragraph.alignment === "right") {
              x = cellX + cellWidth - insetX - width;
            }
            const y = cellY + insetY;
            rects.push({ x, y, width, height });

            verticalCursorX += width + Math.max(0.5, paragraph.fontPx * 0.08);
            if (verticalCursorX >= cellX + cellWidth - insetX) {
              verticalCursorX = cellX + insetX;
            }
            continue;
          }

          const isDenseLongParagraph = paragraph.text.length >= 70 && maxHeight >= lineHeight * 3;
          if (isDenseLongParagraph) {
            rects.push({
              x: cellX,
              y: cellY,
              width: Math.max(1, cellWidth),
              height: Math.max(1, rowHeight),
            });
            lineCursorY = cellY + rowHeight;
            break;
          }

          const estimatedLineCount = Math.max(1, Math.ceil(horizontalRawWidth / maxWidth));
          const width = estimatedLineCount > 1 ? maxWidth : Math.min(maxWidth, horizontalRawWidth);
          let x = cellX + insetX;
          if (paragraph.alignment === "center") {
            x = cellX + (cellWidth - width) / 2;
          } else if (paragraph.alignment === "right") {
            x = cellX + cellWidth - insetX - width;
          }

          const remainingHeight = Math.max(0, cellY + rowHeight - insetY - lineCursorY);
          const occupiedHeight = Math.min(remainingHeight, Math.max(lineHeight, lineHeight * estimatedLineCount));
          if (occupiedHeight <= 0) {
            break;
          }

          rects.push({
            x,
            y: lineCursorY,
            width,
            height: Math.min(occupiedHeight, maxHeight),
          });
          lineCursorY += occupiedHeight + Math.max(0.5, paragraph.fontPx * 0.1);
          if (lineCursorY >= cellY + rowHeight - insetY) {
            break;
          }
        }

        xOffset += cellWidth;
        colIndex += span;
      }
      yOffset += rowHeight;
    }
    return rects;
  };

  const collectFromShape = (shape: Shape): readonly MaskRect[] => {
    if (shape.type === "sp" && shape.textBody && shape.properties.transform) {
      const tr = shape.properties.transform;
      return [{ x: tr.x as number, y: tr.y as number, width: tr.width as number, height: tr.height as number }];
    }
    if (shape.type === "graphicFrame") {
      return collectApproxTableTextRects(shape);
    }

    if (shape.type === "grpSp") {
      return shape.children.flatMap((child) => collectFromShape(child));
    }

    return [];
  };

  return slide.shapes.flatMap((shape) => collectFromShape(shape)).filter((rect) => rect.width > 0 && rect.height > 0);
}

function collectSlideTableRects(slide: Slide): readonly MaskRect[] {
  const collectFromShape = (shape: Shape): readonly MaskRect[] => {
    if (shape.type === "graphicFrame" && shape.content.type === "table") {
      const tr = shape.transform;
      return [{ x: tr.x as number, y: tr.y as number, width: tr.width as number, height: tr.height as number }];
    }
    if (shape.type === "grpSp") {
      return shape.children.flatMap((child) => collectFromShape(child));
    }
    return [];
  };
  return slide.shapes.flatMap((shape) => collectFromShape(shape)).filter((rect) => rect.width > 0 && rect.height > 0);
}

function collectPdfTableRects(page: PdfPage): readonly MaskRect[] {
  const paths = page.elements.filter((element): element is PdfPath => element.type === "path");
  const context = createFitContext({
    pdfWidth: page.width,
    pdfHeight: page.height,
    slideWidth: px(SLIDE_WIDTH),
    slideHeight: px(SLIDE_HEIGHT),
    fit: "contain",
  });

  return detectTableRegionsFromPaths(paths, { width: page.width, height: page.height }).map((region) => {
    const bbox = convertBBox([region.x0, region.y0, region.x1, region.y1], context);
    return {
      x: bbox.x as number,
      y: bbox.y as number,
      width: bbox.width as number,
      height: bbox.height as number,
    };
  });
}

function collectPdfTextRects(page: PdfPage, args?: { readonly excludeInside?: readonly MaskRect[] }): readonly MaskRect[] {
  const context = createFitContext({
    pdfWidth: page.width,
    pdfHeight: page.height,
    slideWidth: px(SLIDE_WIDTH),
    slideHeight: px(SLIDE_HEIGHT),
    fit: "contain",
  });

  return page.elements
    .filter((element): element is PdfText => element.type === "text")
    .map((text) => {
      const position = convertPoint({ x: text.x, y: text.y }, context);
      const size = convertSize(text.width, text.height, context);
      return {
        x: position.x as number,
        y: (position.y as number) - (size.height as number),
        width: size.width as number,
        height: size.height as number,
      };
    })
    .filter((rect) => {
      const excludeInside = args?.excludeInside;
      if (!excludeInside || excludeInside.length === 0) {
        return true;
      }
      const area = rectArea(rect);
      if (!(area > 0)) {
        return false;
      }
      const overlap = Math.max(...excludeInside.map((zone) => rectOverlapArea(rect, zone)), 0);
      return overlap / area < 0.25;
    })
    .filter((rect) => rect.width > 0 && rect.height > 0);
}

function assertTablePlacement(args: {
  readonly caseName: string;
  readonly pageNumber: number;
  readonly pdfPage: PdfPage;
  readonly slide: Slide;
}): void {
  const { caseName, pageNumber, pdfPage, slide } = args;
  const baselineTables = collectPdfTableRects(pdfPage);
  const actualTables = collectSlideTableRects(slide);
  if (baselineTables.length === 0 || actualTables.length === 0) {
    return;
  }
  for (const actual of actualTables) {
    const bestIou = Math.max(0, ...baselineTables.map((baseline) => rectIou(actual, baseline)));
    console.log(`tableIoU(case=${caseName},page=${pageNumber})=${bestIou.toFixed(3)}`);
    expect(bestIou).toBeGreaterThanOrEqual(0.6);
  }
}

function assertTextElementConversion(args: {
  readonly baselineTextRects: readonly MaskRect[];
  readonly actualTextRects: readonly MaskRect[];
}): void {
  if (args.baselineTextRects.length > 0) {
    expect(args.actualTextRects.length).toBeGreaterThan(0);
  }
}

async function renderImportedPdfPage(args: {
  readonly pdfPath: string;
  readonly pageNumber: number;
}): Promise<{ readonly svg: string; readonly slide: Slide; readonly pdfPage: PdfPage }> {
  const { pdfPath, pageNumber } = args;
  const pdfBytes = readFileSync(pdfPath);
  const parsed = await parsePdf(pdfBytes, { pages: [pageNumber] });
  const rawPdfPage = parsed.pages[0];
  if (!rawPdfPage) {
    throw new Error(`Expected parsed PDF page ${pageNumber}`);
  }
  const normalizedPage = await (async (): Promise<PdfPage> => {
    const texts = rawPdfPage.elements.filter((element): element is PdfText => element.type === "text");
    const paths = rawPdfPage.elements.filter((element): element is PdfPath => element.type === "path");
    const images = rawPdfPage.elements.filter((element) => element.type === "image");
    const normalized = await normalizePageElementsForDisplay({
      pdfBytes,
      pageNumber,
      pageWidth: rawPdfPage.width,
      pageHeight: rawPdfPage.height,
      texts,
      paths,
      images,
    });
    if (!normalized.applied) {
      return rawPdfPage;
    }

    let textIndex = 0;
    let pathIndex = 0;
    let imageIndex = 0;
    return {
      ...rawPdfPage,
      elements: rawPdfPage.elements.map((element) => {
        if (element.type === "text") {
          const next = normalized.texts[textIndex];
          textIndex += 1;
          if (!next) {
            throw new Error(`normalized.texts index overflow at page ${pageNumber}`);
          }
          return next;
        }
        if (element.type === "path") {
          const next = normalized.paths[pathIndex];
          pathIndex += 1;
          if (!next) {
            throw new Error(`normalized.paths index overflow at page ${pageNumber}`);
          }
          return next;
        }
        if (element.type === "image") {
          const next = normalized.images[imageIndex];
          imageIndex += 1;
          if (!next) {
            throw new Error(`normalized.images index overflow at page ${pageNumber}`);
          }
          return next;
        }
        return element;
      }),
    };
  })();

  const { document } = await importPdf(pdfBytes, {
    pages: [pageNumber],
    slideSize: { width: px(SLIDE_WIDTH), height: px(SLIDE_HEIGHT) },
    fit: "contain",
    setWhiteBackground: true,
    addPageNumbers: false,
    grouping: { preset: "auto" },
  });

  const slide = document.slides[0]?.slide;
  if (!slide) {
    throw new Error(`Expected imported slide for page ${pageNumber}`);
  }

  ensureSvgTextMeasurement();

  const { container } = render(
    <SlideRendererSvg
      slide={slide}
      slideSize={{ width: document.slideWidth, height: document.slideHeight }}
      colorContext={document.colorContext}
      resources={document.resources}
      embeddedFontCss={document.embeddedFontCss}
    />,
  );

  const svg = container.querySelector("svg");
  if (!svg) {
    throw new Error("Expected rendered <svg>");
  }
  return { svg: svg.outerHTML, slide, pdfPage: normalizedPage };
}

function resolveEffectivePdfPath(testCase: LayoutCase): string {
  if (!testCase.normalizeWithPdftocairo) {
    return testCase.pdfPath;
  }
  return normalizePdfByPdftocairo({ caseName: testCase.name, pdfPath: testCase.pdfPath });
}

describe("PDF import layout regression corpus", () => {
  for (const testCase of CASES) {
    for (const page of testCase.pages) {
      it(`${testCase.name} page ${page.pageNumber}: pdf baseline + text mask`, async () => {
        if (!hasPdftoppm()) {
          console.warn("SKIPPED: pdftoppm is not installed (install poppler).");
          return;
        }
        if (testCase.normalizeWithPdftocairo && !hasPdftocairo()) {
          console.warn(`SKIPPED: pdftocairo is required for case ${testCase.name}.`);
          return;
        }
        const effectivePdfPath = resolveEffectivePdfPath(testCase);

        try {
          const { svg, slide, pdfPage } = await renderImportedPdfPage({
            pdfPath: effectivePdfPath,
            pageNumber: page.pageNumber,
          });
          const result = compareSvgToPdfBaseline({
            svg,
            snapshotName: `pdf-import-layout-${testCase.name}`,
            slideNumber: page.pageNumber,
            baseline: {
              pdfPath: effectivePdfPath,
              pageNumber: page.pageNumber,
              dpi: 144,
              targetWidth: SLIDE_WIDTH,
              targetHeight: SLIDE_HEIGHT,
              renderScale: 2,
              fit: "contain",
              background: { r: 255, g: 255, b: 255, a: 255 },
            },
            options: { maxDiffPercent: page.pdfMaxDiffPercent, threshold: 0.1 },
          });

          if (!result.match) {
            console.log(`\n--- PDF baseline diff: ${testCase.name} page ${page.pageNumber} ---`);
            console.log(`Diff: ${result.diffPercent.toFixed(2)}% (max: ${page.pdfMaxDiffPercent}%)`);
            console.log(`Baseline: ${result.baselinePath}`);
            console.log(`Actual:   ${result.actualPath}`);
            if (result.diffImagePath) {
              console.log(`Diff:     ${result.diffImagePath}`);
            }
          }

          expect(result.match).toBe(true);
          const actualTableRects = collectSlideTableRects(slide);
          assertTablePlacement({ caseName: testCase.name, pageNumber: page.pageNumber, pdfPage, slide });
          const pdfTableRects = actualTableRects.length > 0 ? collectPdfTableRects(pdfPage) : [];
          const baselineTextRectsAll = collectPdfTextRects(pdfPage);
          const baselineTextRectsExcluded =
            pdfTableRects.length > 0 ? collectPdfTextRects(pdfPage, { excludeInside: pdfTableRects }) : baselineTextRectsAll;
          const baselineTextRects = baselineTextRectsExcluded.length === 0 ? baselineTextRectsAll : baselineTextRectsExcluded;
          const actualTextRects = collectSlideTextRegionRects(slide);
          assertTextElementConversion({ baselineTextRects, actualTextRects });

          const textRegion = compareTextRegionMasks({
            snapshotName: `pdf-import-layout-${testCase.name}-text-mask`,
            slideNumber: page.pageNumber,
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            baselineRects: baselineTextRects,
            actualRects: actualTextRects,
          });
          console.log(`\n--- Text region mask: ${testCase.name} page ${page.pageNumber} ---`);
          console.log(
            `precision=${textRegion.precision.toFixed(3)} recall=${textRegion.recall.toFixed(3)} f1=${textRegion.f1.toFixed(3)} iou=${textRegion.iou.toFixed(3)}`,
          );
          console.log(`baselineMask: ${textRegion.baselinePath}`);
          console.log(`actualMask:   ${textRegion.actualPath}`);
          console.log(`diffMask:     ${textRegion.diffPath}`);

          expect(textRegion.recall).toBeGreaterThanOrEqual(page.textMask.recall);
          expect(textRegion.precision).toBeGreaterThanOrEqual(page.textMask.precision);
          expect(textRegion.f1).toBeGreaterThanOrEqual(page.textMask.f1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if ((testCase.skipErrorMessages ?? []).some((pattern) => message.includes(pattern))) {
            console.warn(`SKIPPED: known unsupported case (${testCase.name}) reason="${message}"`);
            return;
          }
          throw error;
        }
      }, 30_000);
    }
  }
});
