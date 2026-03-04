/**
 * @file Quality metrics for adaptive grouping selection.
 */

import type { GraphicFrame, Shape } from "@aurochs-office/pptx/domain/shape";
import type { Table } from "@aurochs-office/pptx/domain/table/types";
import type { ConversionContext } from "../transform-converter";
import { convertBBox } from "../transform-converter";
import type { TableRegion } from "../table-detection";
import type { AutoGroupingCandidateShapes, AutoGroupingQualitySignals } from "./types";

type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function toRectArea(rect: Rect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function overlapRatioBySmaller(a: Rect, b: Rect): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const denom = Math.max(1e-6, Math.min(toRectArea(a), toRectArea(b)));
  return overlap / denom;
}

function isTableFrame(shape: Shape): shape is TableGraphicFrame {
  return shape.type === "graphicFrame" && shape.content.type === "table";
}

function extractTableFrames(shapes: readonly Shape[]): readonly TableGraphicFrame[] {
  return shapes.filter(isTableFrame);
}

function countTextShapes(shapes: readonly Shape[]): number {
  const countShape = (shape: Shape): number => {
    if (shape.type === "sp" && shape.textBody) {
      return 1;
    }
    if (shape.type === "grpSp") {
      return shape.children.reduce((sum, child) => sum + countShape(child), 0);
    }
    return 0;
  };
  return shapes.reduce((sum, shape) => sum + countShape(shape), 0);
}

function tableCellCount(frame: TableGraphicFrame): number {
  const rows = frame.content.data.table.rows;
  return rows.reduce((sum: number, row) => sum + row.cells.length, 0);
}

function toRegionRects(regions: readonly TableRegion[], context: ConversionContext): readonly Rect[] {
  return regions.map((region) => {
    const converted = convertBBox([region.x0, region.y0, region.x1, region.y1], context);
    return {
      x: converted.x as number,
      y: converted.y as number,
      width: converted.width as number,
      height: converted.height as number,
    };
  });
}

function toTableRects(frames: readonly TableGraphicFrame[]): readonly Rect[] {
  return frames.map((frame) => ({
    x: frame.transform.x as number,
    y: frame.transform.y as number,
    width: frame.transform.width as number,
    height: frame.transform.height as number,
  }));
}

function regionCoverageScore(tableRects: readonly Rect[], regionRects: readonly Rect[]): number {
  if (regionRects.length === 0) {
    return tableRects.length > 0 ? 0.35 : 0;
  }
  const coveredRegions = regionRects.filter((regionRect) => {
    const best = tableRects.reduce((max, tableRect) => Math.max(max, overlapRatioBySmaller(regionRect, tableRect)), 0);
    return best >= 0.45;
  }).length;
  return clamp01(coveredRegions / regionRects.length);
}

function regionOverlapScore(tableRects: readonly Rect[], regionRects: readonly Rect[]): number {
  if (tableRects.length === 0) {
    return 0;
  }
  if (regionRects.length === 0) {
    return 0.35;
  }
  const meanBestOverlap = tableRects.reduce((sum, tableRect) => {
    const best = regionRects.reduce((max, regionRect) => Math.max(max, overlapRatioBySmaller(tableRect, regionRect)), 0);
    return sum + best;
  }, 0) / tableRects.length;
  return clamp01(meanBestOverlap);
}

/**
 * Build structural + geometric quality signals for adaptive full/text selection.
 */
export function measureAutoGroupingQuality(args: {
  readonly candidates: AutoGroupingCandidateShapes;
  readonly tableRegions: readonly TableRegion[];
  readonly context: ConversionContext;
}): AutoGroupingQualitySignals {
  const fullShapes = args.candidates.full;
  const textShapes = args.candidates.text;

  const fullTables = extractTableFrames(fullShapes);
  const textTables = extractTableFrames(textShapes);

  const fullTableCellCount = fullTables.reduce((sum, table) => sum + tableCellCount(table), 0);
  const textTableCellCount = textTables.reduce((sum, table) => sum + tableCellCount(table), 0);
  const fullTextShapeCount = countTextShapes(fullShapes);
  const textTextShapeCount = countTextShapes(textShapes);

  const fullShapeCount = fullShapes.length;
  const textShapeCount = textShapes.length;
  const overheadRatio = fullShapeCount / Math.max(1, textShapeCount);

  const regionRects = toRegionRects(args.tableRegions, args.context);
  const tableRects = toTableRects(fullTables);

  const coverage = regionCoverageScore(tableRects, regionRects);
  const overlap = regionOverlapScore(tableRects, regionRects);
  const visualScore = clamp01((coverage + overlap) / 2);

  const tableRegionCount = args.tableRegions.length;
  const tablePresence = tableRegionCount > 0 ? clamp01(fullTables.length / tableRegionCount) : clamp01(fullTables.length / 2);
  const cellRichness = clamp01(fullTableCellCount / 24);
  const tableAdvantage = clamp01((fullTables.length - textTables.length) / Math.max(1, fullTables.length));
  const cellAdvantage = clamp01((fullTableCellCount - textTableCellCount) / Math.max(1, fullTableCellCount));
  const structureScore = clamp01(tablePresence * 0.45 + cellRichness * 0.2 + tableAdvantage * 0.2 + cellAdvantage * 0.15);

  const overheadPenalty = clamp01((Math.max(1, overheadRatio) - 1) / 1.5);
  const qualityScore = clamp01(structureScore * 0.58 + visualScore * 0.42 - overheadPenalty * 0.2);

  return {
    tableRegionCount,
    fullTableCount: fullTables.length,
    textTableCount: textTables.length,
    fullTableCellCount,
    textTableCellCount,
    fullTextShapeCount,
    textTextShapeCount,
    fullShapeCount,
    textShapeCount,
    overheadRatio,
    regionCoverageScore: coverage,
    regionOverlapScore: overlap,
    structureScore,
    visualScore,
    qualityScore,
  };
}
type TableGraphicFrame = GraphicFrame & {
  readonly content: {
    readonly type: "table";
    readonly data: { readonly table: Table };
  };
};
