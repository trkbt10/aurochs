/**
 * @file GroupedText (table-like) → GraphicFrame table converter
 */

import type { PdfPath, PdfText } from "../domain";
import type { GraphicFrame } from "../../pptx/domain/shape";
import type { Table, TableCell, TableRow } from "../../pptx/domain/table/types";
import type { Paragraph, TextBody, TextRun } from "../../pptx/domain/text";
import type { Pixels } from "../../ooxml/domain/units";
import { deg, px } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertPoint, convertSize } from "./transform-converter";
import type { GroupedText } from "./text-grouping/types";
import type { InferredTable } from "./table-inference";
import { inferTableFromGroupedText } from "./table-inference";
import { createPptxTextRunFromPdfText } from "./text-to-shapes";

export type TableConversionOptions = {
  readonly minRows?: number;
  readonly minCols?: number;
};

function convertBoundsToTransform(
  bounds: { x: number; y: number; width: number; height: number },
  context: ConversionContext,
): { x: Pixels; y: Pixels; width: Pixels; height: Pixels } {
  const size = convertSize(bounds.width, bounds.height, context);
  const converted = convertPoint({ x: bounds.x, y: bounds.y }, context);
  return {
    x: converted.x,
    y: px((converted.y as number) - (size.height as number)),
    width: size.width,
    height: size.height,
  };
}

function buildCellTextBodyFromLines(
  runsByLine: readonly (readonly PdfText[])[],
  alignment: "left" | "center" | "right",
  context: ConversionContext,
): TextBody | undefined {
  const lines = runsByLine
    .map((line) => line.filter((r) => r.text.trim().length > 0))
    .filter((line) => line.length > 0);
  if (lines.length === 0) {return undefined;}

  const paragraphs: Paragraph[] = lines.map((line) => ({
    properties: { alignment },
    runs: mergeRuns(line.map((r) => createPptxTextRunFromPdfText(r, context))),
    endProperties: {},
  }));

  return {
    bodyProperties: {
      wrapping: "none",
      autoFit: { type: "none" },
      anchor: "center",
      anchorCenter: false,
      insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
      overflow: "clip",
      verticalOverflow: "clip",
    },
    paragraphs,
  };
}

function mergeRuns(runs: readonly TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    const prev = out[out.length - 1];
    if (!prev || prev.type !== "text" || run.type !== "text") {
      out.push(run);
      continue;
    }

    if (!areRunPropsEquivalent(prev.properties, run.properties)) {
      out.push(run);
      continue;
    }

    out[out.length - 1] = {
      ...prev,
      text: prev.text + run.text,
    };
  }
  return out;
}

function areRunPropsEquivalent(a: TextRun["properties"] | undefined, b: TextRun["properties"] | undefined): boolean {
  if (a === undefined || b === undefined) {return a === b;}
  return (
    a.fontSize === b.fontSize &&
    a.fontFamily === b.fontFamily &&
    a.fontFamilyEastAsian === b.fontFamilyEastAsian &&
    a.fontFamilyComplexScript === b.fontFamilyComplexScript &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.spacing === b.spacing &&
    JSON.stringify(a.fill) === JSON.stringify(b.fill)
  );
}

function buildTableFromInference(inferred: InferredTable, context: ConversionContext): Table {
  const colWidthsPdf: number[] = inferred.columns.map((c) => c.x1 - c.x0);
  const rowHeightsPdf: number[] = inferred.rows.map((r) => r.y1 - r.y0);

  const tableWidth = colWidthsPdf.reduce((s, v) => s + v, 0);
  const tableHeight = rowHeightsPdf.reduce((s, v) => s + v, 0);

  // Avoid zero-size table dimensions (would break render/export)
  const safeTableWidth = tableWidth > 0 ? tableWidth : inferred.bounds.width;
  const safeTableHeight = tableHeight > 0 ? tableHeight : inferred.bounds.height;

  const scaleWidth = (inferred.bounds.width > 0 && safeTableWidth !== inferred.bounds.width)
    ? (inferred.bounds.width / safeTableWidth)
    : 1;
  const scaleHeight = (inferred.bounds.height > 0 && safeTableHeight !== inferred.bounds.height)
    ? (inferred.bounds.height / safeTableHeight)
    : 1;

  const columns = inferred.columns.map((_, i) => {
    const w = colWidthsPdf[i] ?? 0;
    const scaled = w * scaleWidth;
    return { width: convertSize(scaled, 0, context).width };
  });

  const rows: TableRow[] = inferred.rows.map((r, ri) => {
    const h = (rowHeightsPdf[ri] ?? 0) * scaleHeight;
    const heightPx = convertSize(0, h, context).height;
    const cells: TableCell[] = [];

    const byStart = new Map<number, (typeof r.cells)[number]>();
    for (const c of r.cells) {byStart.set(c.colStart, c);}

    for (let ci = 0; ci < inferred.columns.length; ci++) {
      const seg = byStart.get(ci);

      // Continuation of a merged cell
      const isMergeContinuation = r.cells.some((c) => c.colStart < ci && ci < c.colStart + c.colSpan);
      if (isMergeContinuation) {
        cells.push({
          properties: {
            horizontalMerge: true,
            // Avoid renderer fallback borders/fills; PDF path shapes draw the grid/background.
            borders: {},
            fill: { type: "noFill" },
            margins: { left: px(0), right: px(0), top: px(0), bottom: px(0) },
            anchor: "center",
            anchorCenter: false,
            horzOverflow: "clip",
          },
        });
        continue;
      }

      if (!seg) {
        cells.push({
          properties: {
            // Avoid renderer fallback borders/fills; PDF path shapes draw the grid/background.
            borders: {},
            fill: { type: "noFill" },
            margins: { left: px(0), right: px(0), top: px(0), bottom: px(0) },
            anchor: "center",
            anchorCenter: false,
            horzOverflow: "clip",
          },
        });
        continue;
      }

      const col = inferred.columns[ci]!;
      const leftSlackPdf = Math.max(0, seg.x0 - col.x0);
      const rightSlackPdf = Math.max(0, col.x1 - seg.x1);

      const margins = (() => {
        if (seg.alignment === "left") {
          return {
            left: convertSize(leftSlackPdf, 0, context).width,
            right: px(0),
            top: px(0),
            bottom: px(0),
          };
        }
        if (seg.alignment === "right") {
          return {
            left: px(0),
            right: convertSize(rightSlackPdf, 0, context).width,
            top: px(0),
            bottom: px(0),
          };
        }
        return { left: px(0), right: px(0), top: px(0), bottom: px(0) };
      })();

      cells.push({
        properties: {
          ...(seg.colSpan > 1 ? { colSpan: seg.colSpan } : {}),
          // Avoid renderer fallback borders/fills; PDF path shapes draw the grid/background.
          borders: {},
          fill: { type: "noFill" },
          margins,
          anchor: "center",
          anchorCenter: false,
          horzOverflow: "clip",
        },
        ...(seg.runsByLine.length > 0
          ? { textBody: buildCellTextBodyFromLines(seg.runsByLine, seg.alignment, context) }
          : {}),
      });
    }

    return { height: heightPx, cells };
  });

  return {
    properties: {},
    grid: { columns },
    rows,
  };
}

export function convertGroupedTextToTableShape(
  group: GroupedText,
  pagePaths: readonly PdfPath[],
  context: ConversionContext,
  shapeId: string,
  options: TableConversionOptions = {},
): GraphicFrame | null {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const minRows = options.minRows ?? 6;
  const minCols = options.minCols ?? 3;

  const inferred = inferTableFromGroupedText(group, { minRows, minCols, paths: pagePaths });
  if (!inferred) {return null;}

  const xfrm = convertBoundsToTransform(inferred.bounds, context);
  const table = buildTableFromInference(inferred, context);

  return {
    type: "graphicFrame",
    nonVisual: {
      id: shapeId,
      name: `Table ${shapeId}`,
    },
    transform: {
      x: xfrm.x,
      y: xfrm.y,
      width: xfrm.width,
      height: xfrm.height,
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "table",
      data: { table },
    },
  };
}
