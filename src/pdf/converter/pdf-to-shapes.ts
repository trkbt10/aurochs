/**
 * @file src/pdf/converter/pdf-to-shapes.ts
 */

import type { PdfDocument, PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { decomposeMatrix } from "../domain";
import type { Shape, SpShape } from "../../pptx/domain/shape";
import type { Slide } from "../../pptx/domain/slide/types";
import type { Pixels } from "../../ooxml/domain/units";
import { deg } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, createFitContext } from "./transform-converter";
import {
  convertPathToGeometry,
  convertToPresetEllipse,
  convertToPresetRect,
  convertToPresetRoundRect,
  isApproximateEllipse,
  isRoundedRectangle,
  isSimpleRectangle,
} from "./path-to-geometry";
import { convertGraphicsStateToStyle } from "./color-converter";
import { convertGroupedTextToShape } from "./text-to-shapes";
import { convertImageToShape } from "./image-to-shapes";
import { computePathBBox } from "../parser/path/path-builder";
import type { BlockingZone, GroupingContext, TextGroupingFn } from "./text-grouping/types";
import { spatialGrouping } from "./text-grouping/spatial-grouping";
import { convertGroupedTextToTableShape } from "./table-to-shapes";
import type { GroupedText } from "./text-grouping/types";
import { inferTableFromGroupedText } from "./table-inference";

export type ConversionOptions = {
  /** ターゲットスライド幅 */
  readonly slideWidth: Pixels;
  /** ターゲットスライド高さ */
  readonly slideHeight: Pixels;
  /** フィットモード */
  readonly fit?: "contain" | "cover" | "stretch";
  /** 最小パス複雑度（これより単純なパスは無視） */
  readonly minPathComplexity?: number;
  /**
   * Function for grouping PDF text elements into PPTX TextBoxes.
   * Default: spatialGrouping (groups adjacent texts into single TextBoxes)
   */
  readonly textGroupingFn?: TextGroupingFn;
};

/**
 * PdfPageの全要素をShapeに変換
 */
export function convertPageToShapes(page: PdfPage, options: ConversionOptions): Shape[] {
  const context = createFitContext(
    page.width,
    page.height,
    options.slideWidth,
    options.slideHeight,
    options.fit ?? "contain"
  );

  const shapes: Shape[] = [];
  const shapeIdCounter = { value: 1 };

  const generateId = (): string => {
    const id = String(shapeIdCounter.value);
    shapeIdCounter.value += 1;
    return id;
  };

  const paths: PdfPath[] = [];
  const texts: PdfText[] = [];
  const images: PdfImage[] = [];

  for (const elem of page.elements) {
    switch (elem.type) {
      case "path":
        paths.push(elem);
        break;
      case "text":
        texts.push(elem);
        break;
      case "image":
        images.push(elem);
        break;
    }
  }

  const minPathComplexity = options.minPathComplexity ?? 0;
  if (!Number.isFinite(minPathComplexity) || minPathComplexity < 0) {
    throw new Error(`Invalid minPathComplexity: ${minPathComplexity}`);
  }

  for (const path of paths) {
    if (path.operations.length < minPathComplexity) {
      continue;
    }

    const shape = convertPath(path, context, generateId());
    if (shape) {
      shapes.push(shape);
    }
  }

  // Create blocking zones from paths and images to prevent text grouping across shapes
  const blockingZones: BlockingZone[] = [];

  // Add paths as blocking zones (using bounding boxes)
  // PdfBBox is [x1, y1, x2, y2] where (x1,y1) is bottom-left and (x2,y2) is top-right
  //
  // Strategy for blocking zones:
  // - Stroke paths (lines/borders) are prioritized as visual separators
  // - Fill-only paths are treated more carefully:
  //   - Thin fill areas (likely dividers) are included
  //   - Large filled areas are likely containers (table cells, backgrounds) and excluded
  for (const path of paths) {
    if (path.paintOp === "none" || path.paintOp === "clip") {
      continue; // Skip invisible paths
    }

    const bbox = computePathBBox(path);
    const [x1, y1, x2, y2] = bbox;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    // Skip very small paths (likely rendering artifacts)
    if (width < 0.5 && height < 0.5) {
      continue;
    }

    // Determine if this path should be a blocking zone based on paint operation
    const isBlockingZone = (() => {
      if (path.paintOp === "stroke" || path.paintOp === "fillStroke") {
        // Stroked paths (lines, borders) are always blocking zones
        // They represent visual separators like table borders, divider lines
        return true;
      }
      if (path.paintOp === "fill") {
        // Fill-only paths need careful consideration:
        // - Thin fills (divider lines drawn as filled rectangles) should block
        // - Large filled areas (backgrounds, table cells) should NOT block

        // Threshold for "thin" fill: less than 3 points in either dimension
        const thinThreshold = 3;
        const isThinFill = width < thinThreshold || height < thinThreshold;

        // Aspect ratio check: very elongated shapes are likely dividers
        const aspectRatio = Math.max(width, height) / Math.max(Math.min(width, height), 0.1);
        const isElongated = aspectRatio > 20;

        // Include thin or elongated fills as blocking zones (they're visual separators)
        return isThinFill || isElongated;
      }
      return false;
    })();

    if (isBlockingZone) {
      blockingZones.push({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width,
        height,
      });
    }
  }

  // Add images as blocking zones (compute bounding box from CTM)
  // PDF images use unit square [0,0]-[1,1] transformed by CTM
  for (const image of images) {
    const ctm = image.graphicsState.ctm;
    const [a, b, c, d, e, f] = ctm;
    // Transform unit square corners:
    // (0,0) -> (e, f)
    // (1,0) -> (a+e, b+f)
    // (0,1) -> (c+e, d+f)
    // (1,1) -> (a+c+e, b+d+f)
    const corners = [
      { x: e, y: f },
      { x: a + e, y: b + f },
      { x: c + e, y: d + f },
      { x: a + c + e, y: b + d + f },
    ];
    const minX = Math.min(...corners.map((c) => c.x));
    const maxX = Math.max(...corners.map((c) => c.x));
    const minY = Math.min(...corners.map((c) => c.y));
    const maxY = Math.max(...corners.map((c) => c.y));
    blockingZones.push({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }

  const groupingContext: GroupingContext = {
    blockingZones: blockingZones.length > 0 ? blockingZones : undefined,
    pageWidth: page.width,
    pageHeight: page.height,
  };

  // Apply text grouping function (default: spatial grouping for better PPTX editability)
  const groupTexts = options.textGroupingFn ?? spatialGrouping;
  const groups = groupTexts(texts, groupingContext);

  // Convert each group to either a Table (graphicFrame) or a TextBox (sp).
  // For tables, we try to absorb "header" groups that sit immediately above
  // the table body so the table columns match the original document.
  const groupArray = [...groups];
  const consumed = new Set<number>();

  const overlap1D = (a0: number, a1: number, b0: number, b1: number): number => {
    const lo = Math.max(Math.min(a0, a1), Math.min(b0, b1));
    const hi = Math.min(Math.max(a0, a1), Math.max(b0, b1));
    return Math.max(0, hi - lo);
  };

  const mergeGroups = (indices: readonly number[]): { merged: GroupedText; mergedIndices: readonly number[] } => {
    const picked = indices.map((i) => groupArray[i]!).filter(Boolean);
    if (picked.length === 0) {throw new Error("mergeGroups: no groups");}

    const x0 = Math.min(...picked.map((g) => g.bounds.x));
    const y0 = Math.min(...picked.map((g) => g.bounds.y));
    const x1 = Math.max(...picked.map((g) => g.bounds.x + g.bounds.width));
    const y1 = Math.max(...picked.map((g) => g.bounds.y + g.bounds.height));

    return {
      merged: {
        bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
        paragraphs: picked.flatMap((g) => g.paragraphs),
      },
      mergedIndices: indices,
    };
  };

  type TableCandidate = {
    readonly index: number;
    readonly bounds: { x: number; y: number; width: number; height: number };
    readonly fontSize: number;
    readonly area: number;
  };

  const tableCandidates: TableCandidate[] = groupArray
    .map((g, index) => {
      const inferred = inferTableFromGroupedText(g, { paths });
      if (!inferred) {return null;}
      const b = inferred.bounds;
      return { index, bounds: b, fontSize: inferred.fontSize, area: b.width * b.height };
    })
    .filter((v): v is TableCandidate => v !== null);

  // Group index -> table group index it should be absorbed into
  const absorbedBy = new Map<number, number>();
  const recordAbsorb = (groupIndex: number, tableIndex: number, tableArea: number): void => {
    if (groupIndex === tableIndex) {return;}
    const existing = absorbedBy.get(groupIndex);
    if (existing === undefined) {
      absorbedBy.set(groupIndex, tableIndex);
      return;
    }
    const existingArea = tableCandidates.find((t) => t.index === existing)?.area ?? Infinity;
    if (tableArea < existingArea) {
      absorbedBy.set(groupIndex, tableIndex);
    }
  };

  // Pre-pass: mark small groups that belong to a table (header labels, etc.) so they
  // don't get emitted as standalone text boxes before the table is processed.
  for (const table of tableCandidates) {
    const pad = table.fontSize * 0.6;
    const x0 = table.bounds.x - pad;
    const x1 = table.bounds.x + table.bounds.width + pad;
    const y0 = table.bounds.y - pad;
    const y1 = table.bounds.y + table.bounds.height + pad;
    const tableTop = table.bounds.y + table.bounds.height;
    const headerWindow = table.fontSize * 3;

    for (let j = 0; j < groupArray.length; j++) {
      if (j === table.index) {continue;}
      const other = groupArray[j]!;
      if (other.paragraphs.length > 6) {continue;}

      const cx = other.bounds.x + other.bounds.width / 2;
      const cy = other.bounds.y + other.bounds.height / 2;
      const inside = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      if (inside) {
        recordAbsorb(j, table.index, table.area);
        continue;
      }

      // Header labels can sit slightly above the table body group's top due to
      // bbox/baseline differences. Absorb those too when they align horizontally,
      // but only when the candidate looks like a short label (avoid swallowing
      // surrounding paragraphs like section titles).
      const otherBottom = other.bounds.y;
      if (otherBottom < tableTop - table.fontSize * 1.0) {continue;}
      if (otherBottom > tableTop + headerWindow) {continue;}

      const otherTop = other.bounds.y + other.bounds.height;
      if (otherTop > tableTop + table.fontSize * 1.2) {continue;}
      if (other.bounds.height > table.fontSize * 1.8) {continue;}

      const ov = overlap1D(x0, x1, other.bounds.x, other.bounds.x + other.bounds.width);
      const denom = Math.max(1e-6, Math.min(x1 - x0, other.bounds.width));
      const ovRatio = ov / denom;
      if (ovRatio < 0.2) {continue;}

      recordAbsorb(j, table.index, table.area);
    }
  }

  for (let i = 0; i < groupArray.length; i++) {
    if (consumed.has(i)) {continue;}
    const absorbTarget = absorbedBy.get(i);
    if (absorbTarget !== undefined && absorbTarget !== i) {
      // This group will be merged into a table later.
      continue;
    }
    const group = groupArray[i]!;

    const inferred = inferTableFromGroupedText(group, { paths });
    if (!inferred) {
      const shapeId = generateId();
      shapes.push(convertGroupedTextToShape(group, context, shapeId));
      continue;
    }

    const absorbedIndices = [...absorbedBy.entries()]
      .filter(([, t]) => t === i)
      .map(([idx]) => idx);

    const mergedIndices = [i, ...absorbedIndices].sort((a, b) => a - b);
    const { merged, mergedIndices: usedIndices } = mergeGroups(mergedIndices);

    for (const idx of usedIndices) {consumed.add(idx);}

    const shapeId = generateId();
    const table = convertGroupedTextToTableShape(merged, paths, context, shapeId);
    shapes.push(table ?? convertGroupedTextToShape(merged, context, shapeId));
  }

  for (const image of images) {
    const shape = convertImageToShape(image, context, generateId());
    if (shape) {
      shapes.push(shape);
    }
  }

  return shapes;
}

/**
 * PdfDocument全体をSlide配列に変換
 */
export type DocumentConversionResult = {
  readonly slides: readonly Slide[];
};











/** Convert a parsed `PdfDocument` into PPTX slides (shapes only). */
export function convertDocumentToSlides(
  doc: PdfDocument,
  options: ConversionOptions
): DocumentConversionResult {
  const slides: Slide[] = doc.pages.map((page) => ({
    shapes: convertPageToShapes(page, options),
  }));

  return { slides };
}

/**
 * PdfPathをSpShapeに変換
 *
 * Transform complexity from CTM is analyzed to determine:
 * - If CTM has shear (skew), preset geometry optimizations are skipped
 * - Path coordinates are already transformed by CTM in path-builder
 */
function convertPath(path: PdfPath, context: ConversionContext, shapeId: string): SpShape | null {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  if (path.paintOp === "none" || path.paintOp === "clip") {
    return null;
  }

  if (path.operations.length === 0) {
    return null;
  }

  // Decompose CTM to detect transform complexity
  // Path coordinates are already transformed, but we check CTM complexity
  // to determine if preset geometry optimizations should be applied
  const ctmDecomposition = decomposeMatrix(path.graphicsState.ctm);

  // Skip preset geometry optimization if CTM has shear
  // When CTM has shear, the original shape is warped and preset geometries
  // (like rect, ellipse) won't represent the actual shape correctly
  const usePresetOptimization = ctmDecomposition.isSimple;

  const geometry = selectPathGeometry(path, context, usePresetOptimization);

  const { fill, line } = convertGraphicsStateToStyle(path.graphicsState, path.paintOp, {
    lineWidthScale: Math.min(context.scaleX, context.scaleY),
  });

  const bbox = computePathBBox(path);
  const converted = convertBBox(bbox, context);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `Shape ${shapeId}`,
    },
    properties: {
      transform: {
        x: converted.x,
        y: converted.y,
        width: converted.width,
        height: converted.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry,
      fill,
      line,
    },
  };
}

function selectPathGeometry(
  path: PdfPath,
  context: ConversionContext,
  usePresetOptimization: boolean,
): SpShape["properties"]["geometry"] {
  if (usePresetOptimization && isSimpleRectangle(path)) {
    return convertToPresetRect(path);
  }
  if (usePresetOptimization && isApproximateEllipse(path)) {
    return convertToPresetEllipse(path);
  }
  if (usePresetOptimization && isRoundedRectangle(path)) {
    return convertToPresetRoundRect(path);
  }
  return convertPathToGeometry(path, context);
}
