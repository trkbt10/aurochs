/**
 * @file src/pdf/converter/pdf-to-shapes.ts
 */

import type { PdfDocument, PdfImage, PdfPage, PdfPath, PdfPathOp, PdfText } from "../domain";
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
import { createSpatialGrouping, spatialGrouping } from "./text-grouping/spatial-grouping";
import type { TableDecorationAnalysis } from "./table-to-shapes";
import { analyzeTableDecorationFromPaths, convertInferredTableToShape } from "./table-to-shapes";
import type { GroupedText } from "./text-grouping/types";
import type { InferredTable } from "./table-inference";
import { inferTableFromGroupedText } from "./table-inference";
import { detectTableRegionsFromPaths } from "./table-detection";
import type { TableRegion } from "./table-detection";

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

  const buildBaselineGroupedText = (runs: readonly PdfText[]): GroupedText | null => {
    const usable = runs.filter((t) => t.text.trim().length > 0);
    if (usable.length === 0) {return null;}

    const baselines = usable.map((t) => {
      const descender = t.fontMetrics?.descender ?? -200;
      return t.y - (descender * t.fontSize) / 1000;
    });
    const fontSizes = usable
      .map((t) => t.fontSize)
      .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0)
      .sort((a, b) => a - b);
    const medianFont = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)]! : 10;
    const eps = Math.max(0.5, medianFont * 0.22);

    const items = usable
      .map((t, i) => ({ t, baseline: baselines[i]! }))
      .sort((a, b) => b.baseline - a.baseline);

    const paragraphs: Array<{ runs: PdfText[]; baselineY: number }> = [];
    let cur: { runs: PdfText[]; baselines: number[]; baselineY: number } | null = null;

    for (const it of items) {
      if (!cur) {
        cur = { runs: [it.t], baselines: [it.baseline], baselineY: it.baseline };
        continue;
      }
      if (Math.abs(it.baseline - cur.baselineY) <= eps) {
        cur.runs.push(it.t);
        cur.baselines.push(it.baseline);
        const sum = cur.baselines.reduce((s, v) => s + v, 0);
        cur.baselineY = sum / cur.baselines.length;
        continue;
      }
      paragraphs.push({ runs: cur.runs.sort((a, b) => a.x - b.x), baselineY: cur.baselineY });
      cur = { runs: [it.t], baselines: [it.baseline], baselineY: it.baseline };
    }
    if (cur) {
      paragraphs.push({ runs: cur.runs.sort((a, b) => a.x - b.x), baselineY: cur.baselineY });
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const t of usable) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.width);
      maxY = Math.max(maxY, t.y + t.height);
    }

    return {
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      paragraphs: paragraphs.map((p) => ({ runs: p.runs, baselineY: p.baselineY })),
    };
  };

  // Table-first segmentation (paths -> regions -> table) to keep table geometry and ruling
  // lines coupled. This avoids emitting grid rules as independent shapes that don't follow
  // table edits.
  const filterNestedTableRegions = (regions: readonly TableRegion[]): TableRegion[] => {
    const area = (r: { x0: number; y0: number; x1: number; y1: number }): number =>
      Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
    const overlap1D = (a0: number, a1: number, b0: number, b1: number): number =>
      Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
    const overlapArea = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }): number =>
      overlap1D(a.x0, a.x1, b.x0, b.x1) * overlap1D(a.y0, a.y1, b.y0, b.y1);

    // Sort big-to-small and drop regions that are mostly contained in a larger one.
    const sorted = [...regions].sort((a, b) => area(b) - area(a));
    const kept: TableRegion[] = [];
    const tol = 2;
    for (const r of sorted) {
      const a = area(r);
      if (!(a > 0)) {continue;}
      let nested = false;
      for (const k of kept) {
        const ov = overlapArea(r, k);
        const ratio = ov / a;
        const contains =
          r.x0 >= k.x0 - tol &&
          r.x1 <= k.x1 + tol &&
          r.y0 >= k.y0 - tol &&
          r.y1 <= k.y1 + tol;
        if (contains && ratio >= 0.92) {
          nested = true;
          break;
        }
      }
      if (!nested) {
        kept.push(r);
      }
    }

    // Keep deterministic ordering (top-to-bottom, left-to-right).
    return kept.sort((a, b) => (b.y1 - a.y1) || (a.x0 - b.x0));
  };

  const tableRegions = detectTableRegionsFromPaths(paths, { width: page.width, height: page.height });
  const filteredTableRegions = filterNestedTableRegions(tableRegions);
  if (filteredTableRegions.length > 0) {
    type Planned =
      | { readonly kind: "text"; readonly group: GroupedText }
      | { readonly kind: "table"; readonly inferred: InferredTable; readonly decoration: TableDecorationAnalysis; readonly group: GroupedText };

    const planned: Planned[] = [];
    const consumedTextIndices = new Set<number>();
    const consumedPathIndices = new Set<number>();

    const regionPad = Math.max(2, Math.min(page.width, page.height) * 0.004);

    const collectUsedTexts = (inferred: InferredTable): Set<PdfText> => {
      const used = new Set<PdfText>();
      for (const row of inferred.rows) {
        for (const cell of row.cells) {
          for (const line of cell.runsByLine) {
            for (const run of line) {
              used.add(run);
            }
          }
        }
      }
      return used;
    };

    for (const r of filteredTableRegions) {
      const regionTextsWithIndex = texts
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => {
          const x0 = t.x;
          const x1 = t.x + t.width;
          const y0 = t.y;
          const y1 = t.y + t.height;
          return x1 > r.x0 - regionPad && x0 < r.x1 + regionPad && y1 > r.y0 - regionPad && y0 < r.y1 + regionPad;
        });

      const regionGroup0 = buildBaselineGroupedText(regionTextsWithIndex.map(({ t }) => t));
      const regionGroup = regionGroup0 && {
        ...regionGroup0,
        bounds: { x: r.x0, y: r.y0, width: r.x1 - r.x0, height: r.y1 - r.y0 },
      };
      if (!regionGroup) {continue;}

      const inferred = (() => {
        const tryStrict = (cols: number): InferredTable | null =>
          inferTableFromGroupedText(regionGroup, { paths, minRows: 2, minCols: cols, maxCols: cols });

        const hint = r.colCountHint;
        if (hint && hint >= 2) {
          // Heuristic: table region detection can over-count columns when vertical rules
          // are drawn as double lines. Try +/-1 before giving up.
          const attempts = [hint, hint - 1, hint + 1].filter((n) => n >= 2);
          for (const cols of attempts) {
            const strict = tryStrict(cols);
            if (strict) {return strict;}
          }
        }

        return inferTableFromGroupedText(regionGroup, { paths, minRows: 2, minCols: 2 });
      })();
      if (!inferred) {continue;}

      const decoration = analyzeTableDecorationFromPaths(inferred, paths, context);
      if (!decoration) {continue;}

      for (const pi of decoration.consumedPathIndices) {consumedPathIndices.add(pi);}
      // Only consume texts that are actually represented in the inferred table.
      // Region detection can include captions/labels and other nearby texts; consuming them
      // would drop content if table inference doesn't place them into cells.
      const usedTexts = collectUsedTexts(inferred);
      for (const { t, idx } of regionTextsWithIndex) {
        if (usedTexts.has(t)) {
          consumedTextIndices.add(idx);
        }
      }

      planned.push({ kind: "table", inferred, decoration, group: regionGroup });
    }

    if (planned.length > 0) {
      const remainingTexts = texts.filter((_, idx) => !consumedTextIndices.has(idx));
      const groupTexts = options.textGroupingFn ?? createSpatialGrouping({ enableColumnSeparation: false, enablePageColumnDetection: false });
      const groups = groupTexts(remainingTexts, groupingContext);

      for (const g of groups) {
        planned.push({ kind: "text", group: g });
      }

      // Emit paths first (background lines/fills), excluding any that are mapped to table borders/fills.
      for (let pi = 0; pi < paths.length; pi++) {
        if (consumedPathIndices.has(pi)) {continue;}
        const path = paths[pi]!;
        if (path.operations.length < minPathComplexity) {continue;}
        const shape = convertPath(path, context, generateId());
        if (shape) {shapes.push(shape);}
      }

      // Emit grouped texts / tables
      for (const p of planned) {
        const shapeId = generateId();
        if (p.kind === "text") {
          shapes.push(convertGroupedTextToShape(p.group, context, shapeId));
          continue;
        }
        shapes.push(convertInferredTableToShape(p.inferred, p.decoration, context, shapeId));
      }

      for (const image of images) {
        const shape = convertImageToShape(image, context, generateId());
        if (shape) {shapes.push(shape);}
      }

      return shapes;
    }
  }

  // Apply text grouping function (default: spatial grouping for better PPTX editability)
  const groupTexts = options.textGroupingFn ?? spatialGrouping;
  const groups = groupTexts(texts, groupingContext);

  const cellText = (cell: { readonly runsByLine: readonly (readonly PdfText[])[] } | undefined): string => {
    if (!cell) {return "";}
    return cell.runsByLine.map((line) => line.map((r) => r.text).join("")).join("\n");
  };

  const normalizeHeader = (s: string): string => s.replaceAll(/\s+/g, "").trim();

  const shouldSplitIntoRepeated3ColTables = (inferred: InferredTable): boolean => {
    if (inferred.columns.length !== 6) {return false;}
    const header = inferred.rows[0];
    if (!header) {return false;}
    const byStart = new Map(header.cells.map((c) => [c.colStart, c] as const));
    const pairs: Array<[number, number]> = [
      [0, 3],
      [1, 4],
      [2, 5],
    ];
    let matchCount = 0;
    for (const [a, b] of pairs) {
      const ta = normalizeHeader(cellText(byStart.get(a)));
      const tb = normalizeHeader(cellText(byStart.get(b)));
      if (ta.length === 0 || tb.length === 0) {continue;}
      if (ta === tb) {matchCount++;}
    }
    return matchCount >= 2;
  };

  const splitInferredTableByColumn = (inferred: InferredTable, splitAt: number): InferredTable[] => {
    if (!(splitAt > 0 && splitAt < inferred.columns.length)) {return [inferred];}
    const leftCols = inferred.columns.slice(0, splitAt);
    const rightCols = inferred.columns.slice(splitAt);
    if (leftCols.length === 0 || rightCols.length === 0) {return [inferred];}

    const findVerticalDividerRegion = (): { x0: number; x1: number } | null => {
      // Look for vertical rule subpaths near the split boundary (often double rules with a gap).
      const splitX = inferred.columns[splitAt - 1]!.x1;
      const pad = Math.max(2, inferred.fontSize * 0.9);
      const region = {
        x0: inferred.bounds.x - pad,
        y0: inferred.bounds.y - pad,
        x1: inferred.bounds.x + inferred.bounds.width + pad,
        y1: inferred.bounds.y + inferred.bounds.height + pad,
      };

      const minSpan = Math.max(inferred.fontSize * 3.5, inferred.bounds.height * 0.2);
      const tol = Math.max(1.2, inferred.fontSize * 0.65);

      type BBox = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
      const normalize = (bb: BBox): BBox => ({
        x0: Math.min(bb.x0, bb.x1),
        y0: Math.min(bb.y0, bb.y1),
        x1: Math.max(bb.x0, bb.x1),
        y1: Math.max(bb.y0, bb.y1),
      });

      const bboxOfOps = (ops: readonly PdfPathOp[]): BBox | null => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const add = (x: number, y: number): void => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        };
        for (const op of ops) {
          switch (op.type) {
            case "moveTo":
            case "lineTo":
              add(op.point.x, op.point.y);
              break;
            case "curveTo":
              add(op.cp1.x, op.cp1.y);
              add(op.cp2.x, op.cp2.y);
              add(op.end.x, op.end.y);
              break;
            case "curveToV":
              add(op.cp2.x, op.cp2.y);
              add(op.end.x, op.end.y);
              break;
            case "curveToY":
              add(op.cp1.x, op.cp1.y);
              add(op.end.x, op.end.y);
              break;
            case "rect":
              add(op.x, op.y);
              add(op.x + op.width, op.y + op.height);
              break;
            case "closePath":
              break;
          }
        }
        if (!Number.isFinite(minX) || !Number.isFinite(minY)) {return null;}
        return normalize({ x0: minX, y0: minY, x1: maxX, y1: maxY });
      };

      const splitSubpaths = (ops: readonly PdfPathOp[]): PdfPathOp[][] => {
        const out: PdfPathOp[][] = [];
        let cur: PdfPathOp[] = [];
        const flush = (): void => {
          if (cur.length > 0) {out.push(cur);}
          cur = [];
        };
        for (const op of ops) {
          if (op.type === "moveTo") {
            flush();
            cur = [op];
            continue;
          }
          if (op.type === "rect") {
            flush();
            out.push([op]);
            continue;
          }
          if (cur.length === 0) {cur = [op];}
          else {cur.push(op);}
        }
        flush();
        return out;
      };

      const candidates: Array<{ x0: number; x1: number }> = [];

      for (const p of paths) {
        if (p.paintOp === "none" || p.paintOp === "clip") {continue;}
        for (const sub of splitSubpaths(p.operations)) {
          const bb = bboxOfOps(sub);
          if (!bb) {continue;}
          const intersects =
            bb.x1 > region.x0 && bb.x0 < region.x1 && bb.y1 > region.y0 && bb.y0 < region.y1;
          if (!intersects) {continue;}

          const w = bb.x1 - bb.x0;
          const h = bb.y1 - bb.y0;
          const thickness = Math.min(w, h);
          const span = Math.max(w, h);
          const aspect = span / Math.max(0.1, thickness);
          const isVertRule = aspect >= 12 && h >= minSpan;
          if (!isVertRule) {continue;}

          const xCenter = (bb.x0 + bb.x1) / 2;
          if (Math.abs(xCenter - splitX) > tol) {continue;}
          candidates.push({ x0: bb.x0, x1: bb.x1 });
        }
      }

      if (candidates.length === 0) {return null;}
      return {
        x0: Math.min(...candidates.map((c) => c.x0)),
        x1: Math.max(...candidates.map((c) => c.x1)),
      };
    };

    const divider = findVerticalDividerRegion();

    const build = (cols: typeof inferred.columns, colOffset: number): InferredTable => {
      const x0Base = cols[0]!.x0;
      const x1Base = cols[cols.length - 1]!.x1;

      // Default: use the sub-table's own outer bounds so we preserve whitespace between
      // adjacent tables (e.g. two 3-column tables side-by-side).
      let x0 = x0Base;
      let x1 = x1Base;

      // If a divider rule is present (often double lines), clamp the adjacent edges to the
      // divider so the split preserves the drawn separation precisely.
      if (divider) {
        if (colOffset === 0) {
          x1 = Math.min(x1, divider.x0);
        } else {
          x0 = Math.max(x0, divider.x1);
        }
      }

      const normalizedCols = cols.map((c, i) => ({ index: i, x0: c.x0, x1: c.x1, xCenter: c.xCenter }));
      if (divider) {
        if (colOffset === 0) {
          // left table: clamp the right edge to divider left edge
          const last = normalizedCols[normalizedCols.length - 1]!;
          if (divider.x0 > last.x0) {
            normalizedCols[normalizedCols.length - 1] = { ...last, x1: divider.x0, xCenter: (last.x0 + divider.x0) / 2 };
          }
        } else {
          // right table: clamp the left edge to divider right edge
          const first = normalizedCols[0]!;
          if (divider.x1 < first.x1) {
            normalizedCols[0] = { ...first, x0: divider.x1, xCenter: (divider.x1 + first.x1) / 2 };
          }
        }
      }

      const rows = inferred.rows.map((r) => ({
        ...r,
        cells: r.cells
          .filter((c) => c.colStart >= colOffset && c.colStart < colOffset + cols.length)
          .map((c) => ({ ...c, colStart: c.colStart - colOffset })),
      }));
      return {
        bounds: { x: x0, y: inferred.bounds.y, width: x1 - x0, height: inferred.bounds.height },
        fontSize: inferred.fontSize,
        columns: normalizedCols,
        rows,
      };
    };

    const left = build(leftCols, 0);
    const right = build(rightCols, splitAt);
    return [left, right].sort((a, b) => a.bounds.x - b.bounds.x);
  };

  // Plan group conversions first so we can:
  // - detect tables (including absorbed header labels),
  // - map table grid line paths to table borders/fills,
  // - skip emitting those paths as independent shapes.
  const groupArray = [...groups];
  const consumedGroupIndices = new Set<number>();

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

  const isMeaningfulTableDecoration = (decoration: TableDecorationAnalysis | null): decoration is TableDecorationAnalysis => {
    if (!decoration) {return false;}
    if (decoration.consumedPathIndices.length > 0) {return true;}
    if (decoration.cellFills.size > 0) {return true;}
    if (decoration.verticalBorders.some(Boolean)) {return true;}
    if (decoration.horizontalBorders.some(Boolean)) {return true;}
    return false;
  };

  const isSafeUncoupledTable = (inferred: InferredTable): boolean => {
    // If we cannot reliably map PDF paths to table borders/fills, only emit a table when the
    // page doesn't have many overlapping shapes in the same region. Otherwise we'd create a
    // table plus independent grid/box shapes that won't follow table edits (bad UX, and can
    // over-tableize form-like layouts such as receipts).
    const pad = Math.max(2, inferred.fontSize * 0.9);
    const r = {
      x0: inferred.bounds.x - pad,
      y0: inferred.bounds.y - pad,
      x1: inferred.bounds.x + inferred.bounds.width + pad,
      y1: inferred.bounds.y + inferred.bounds.height + pad,
    };

    let intersecting = 0;
    for (const p of paths) {
      if (p.paintOp === "none" || p.paintOp === "clip") {continue;}
      const bb = computePathBBox(p);
      const b = {
        x0: Math.min(bb[0], bb[2]),
        y0: Math.min(bb[1], bb[3]),
        x1: Math.max(bb[0], bb[2]),
        y1: Math.max(bb[1], bb[3]),
      };
      if (b.x1 > r.x0 && b.x0 < r.x1 && b.y1 > r.y0 && b.y0 < r.y1) {
        intersecting++;
        if (intersecting > 6) {return false;}
      }
    }
    return true;
  };

  const tableCandidates: TableCandidate[] = groupArray
    .map((g, index) => {
      const inferred = inferTableFromGroupedText(g, { paths });
      if (!inferred) {return null;}
      const decoration = analyzeTableDecorationFromPaths(inferred, paths, context);
      if (!isMeaningfulTableDecoration(decoration) && !isSafeUncoupledTable(inferred)) {
        return null;
      }
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

  type PlannedGroup =
    | {
        readonly kind: "tables";
        readonly group: GroupedText;
        readonly tables: readonly {
          readonly inferred: InferredTable;
          readonly decoration: TableDecorationAnalysis | null;
        }[];
      }
    | {
        readonly kind: "text";
        readonly group: GroupedText;
      };

  const plannedGroups: PlannedGroup[] = [];
  const consumedPathIndices = new Set<number>();

  for (let i = 0; i < groupArray.length; i++) {
    if (consumedGroupIndices.has(i)) {continue;}
    const absorbTarget = absorbedBy.get(i);
    if (absorbTarget !== undefined && absorbTarget !== i) {
      // This group will be merged into a table later.
      continue;
    }
    const group = groupArray[i]!;

    const absorbedIndices = [...absorbedBy.entries()]
      .filter(([, t]) => t === i)
      .map(([idx]) => idx);

    const mergedIndices = [i, ...absorbedIndices].sort((a, b) => a - b);
    const { merged, mergedIndices: usedIndices } = mergeGroups(mergedIndices);

    for (const idx of usedIndices) {consumedGroupIndices.add(idx);}

    const inferred0 = inferTableFromGroupedText(merged, { paths });
    if (!inferred0) {
      plannedGroups.push({ kind: "text", group: merged });
      continue;
    }

    const inferredTables = shouldSplitIntoRepeated3ColTables(inferred0)
      ? splitInferredTableByColumn(inferred0, 3)
      : [inferred0];

    const tables: Array<{ readonly inferred: InferredTable; readonly decoration: TableDecorationAnalysis | null }> = [];
    for (const inferred of inferredTables) {
      const decoration = analyzeTableDecorationFromPaths(inferred, paths, context);
      if (isMeaningfulTableDecoration(decoration)) {
        for (const pi of decoration.consumedPathIndices) {consumedPathIndices.add(pi);}
        tables.push({ inferred, decoration });
        continue;
      }
      if (isSafeUncoupledTable(inferred)) {
        tables.push({ inferred, decoration: null });
      }
    }

    if (tables.length === 0) {
      plannedGroups.push({ kind: "text", group: merged });
      continue;
    }

    plannedGroups.push({ kind: "tables", group: merged, tables });
  }

  const hasPlannedTables = plannedGroups.some((p) => p.kind === "tables" && p.tables.length > 0);

  // Fallback: some PDFs draw tables using filled rectangles and split text runs aggressively
  // (e.g. page 1 in k-namingrule-dl.pdf). In that case we may not have any single GroupedText
  // that contains enough rows/columns to infer a table. If no tables were planned, try to:
  // 1) find dense regions from path bboxes,
  // 2) collect groups inside those regions,
  // 3) split by large vertical gaps,
  // 4) infer 2-column tables from merged bands.
  if (!hasPlannedTables) {
    plannedGroups.length = 0;
    consumedGroupIndices.clear();
    consumedPathIndices.clear();

    type Region = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly score: number };

    const regions: Region[] = (() => {
      const scored: Region[] = [];
      for (const p of paths) {
        if (p.paintOp === "none" || p.paintOp === "clip") {continue;}
        const bb = computePathBBox(p);
        const x0 = Math.min(bb[0], bb[2]);
        const x1 = Math.max(bb[0], bb[2]);
        const y0 = Math.min(bb[1], bb[3]);
        const y1 = Math.max(bb[1], bb[3]);
        const w = x1 - x0;
        const h = y1 - y0;
        if (w < page.width * 0.35) {continue;}
        if (h < page.height * 0.08) {continue;}

        const inside = texts.reduce((cnt, t) => {
          const cx = t.x + t.width / 2;
          const cy = t.y + t.height / 2;
          return cnt + (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 ? 1 : 0);
        }, 0);

        if (inside < 60) {continue;}
        scored.push({ x0, y0, x1, y1, score: inside });
      }

      // Merge nearly-identical regions (some PDFs duplicate the same container in multiple fill paths).
      scored.sort((a, b) => b.score - a.score);
      const out: Region[] = [];
      for (const r of scored) {
        const isDup = out.some((e) => {
          const dx0 = Math.abs(e.x0 - r.x0);
          const dx1 = Math.abs(e.x1 - r.x1);
          const dy0 = Math.abs(e.y0 - r.y0);
          const dy1 = Math.abs(e.y1 - r.y1);
          return dx0 <= 1 && dx1 <= 1 && dy0 <= 1 && dy1 <= 1;
        });
        if (!isDup) {out.push(r);}
      }
      return out.slice(0, 3);
    })();

    const splitIntoVerticalBands = (indices: readonly number[]): number[][] => {
      const items = indices.map((idx) => {
        const g = groupArray[idx]!;
        return { idx, top: g.bounds.y + g.bounds.height, bottom: g.bounds.y };
      }).sort((a, b) => b.top - a.top);

      if (items.length === 0) {return [];}

      const fontSizes = indices
        .flatMap((idx) => groupArray[idx]!.paragraphs.flatMap((p) => p.runs.map((r) => r.fontSize)))
        .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0);
      fontSizes.sort((a, b) => a - b);
      const medianFont = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)]! : 10;

      const gaps: number[] = [];
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1]!;
        const cur = items[i]!;
        const gap = prev.bottom - cur.top;
        if (gap > 0) {gaps.push(gap);}
      }
      gaps.sort((a, b) => a - b);
      const typicalGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)]! : (medianFont * 0.8);
      const splitGap = Math.max(medianFont * 2.0, typicalGap * 2.5);

      const bands: number[][] = [];
      let curBand: number[] = [items[0]!.idx];
      let curBottom = items[0]!.bottom;

      for (let i = 1; i < items.length; i++) {
        const it = items[i]!;
        const gap = curBottom - it.top;
        if (gap > splitGap) {
          bands.push(curBand);
          curBand = [it.idx];
          curBottom = it.bottom;
          continue;
        }
        curBand.push(it.idx);
        curBottom = Math.min(curBottom, it.bottom);
      }
      bands.push(curBand);
      return bands.filter((b) => b.length >= 2);
    };

    const buildBaselineGroupedText = (runs: readonly PdfText[]): GroupedText | null => {
      const usable = runs.filter((t) => t.text.trim().length > 0);
      if (usable.length === 0) {return null;}

      const baselines = usable.map((t) => {
        const descender = t.fontMetrics?.descender ?? -200;
        return t.y - (descender * t.fontSize) / 1000;
      });
      const fontSizes = usable
        .map((t) => t.fontSize)
        .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0)
        .sort((a, b) => a - b);
      const medianFont = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)]! : 10;
      // In table regions, baselines are usually stable; use a tighter epsilon so
      // stacked header labels (e.g., "都道府県コード" + "（半角数字）") don't get merged.
      const eps = Math.max(0.5, medianFont * 0.22);

      const items = usable
        .map((t, i) => ({ t, baseline: baselines[i]! }))
        .sort((a, b) => b.baseline - a.baseline);

      const paragraphs: Array<{ runs: PdfText[]; baselineY: number }> = [];
      let cur: { runs: PdfText[]; baselines: number[]; baselineY: number } | null = null;

      for (const it of items) {
        if (!cur) {
          cur = { runs: [it.t], baselines: [it.baseline], baselineY: it.baseline };
          continue;
        }
        if (Math.abs(it.baseline - cur.baselineY) <= eps) {
          cur.runs.push(it.t);
          cur.baselines.push(it.baseline);
          const sum = cur.baselines.reduce((s, v) => s + v, 0);
          cur.baselineY = sum / cur.baselines.length;
          continue;
        }
        paragraphs.push({ runs: cur.runs.sort((a, b) => a.x - b.x), baselineY: cur.baselineY });
        cur = { runs: [it.t], baselines: [it.baseline], baselineY: it.baseline };
      }
      if (cur) {
        paragraphs.push({ runs: cur.runs.sort((a, b) => a.x - b.x), baselineY: cur.baselineY });
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const t of usable) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + t.width);
        maxY = Math.max(maxY, t.y + t.height);
      }

      return {
        bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        paragraphs: paragraphs.map((p) => ({ runs: p.runs, baselineY: p.baselineY })),
      };
    };

    // 0) Table region detection from ruling lines (paths). Some PDFs draw tables only with
    // thin filled rectangles/lines, which can split text grouping per-cell. Detect the table
    // region first, then build a baseline-grouped text view for table inference.
    const tableRegions0 = detectTableRegionsFromPaths(paths, { width: page.width, height: page.height });
    const tableRegions = filterNestedTableRegions(tableRegions0);
    for (const r of tableRegions) {
      const regionPad = Math.max(2, Math.min(page.width, page.height) * 0.004);
      const insideIndices = groupArray
        .map((g, idx) => {
          const cx = g.bounds.x + g.bounds.width / 2;
          const cy = g.bounds.y + g.bounds.height / 2;
          return cx >= r.x0 - regionPad && cx <= r.x1 + regionPad && cy >= r.y0 - regionPad && cy <= r.y1 + regionPad ? idx : null;
        })
        .filter((x): x is number => x !== null);

      for (const idx of insideIndices) {consumedGroupIndices.add(idx);}

      const regionTexts = texts.filter((t) => {
        const x0 = t.x;
        const x1 = t.x + t.width;
        const y0 = t.y;
        const y1 = t.y + t.height;
        return x1 > r.x0 - regionPad && x0 < r.x1 + regionPad && y1 > r.y0 - regionPad && y0 < r.y1 + regionPad;
      });

      const regionGroup0 = buildBaselineGroupedText(regionTexts);
      const regionGroup = regionGroup0 && {
        ...regionGroup0,
        bounds: { x: r.x0, y: r.y0, width: r.x1 - r.x0, height: r.y1 - r.y0 },
      };
      if (!regionGroup) {continue;}

      const inferred0 = (() => {
        const tryStrict = (cols: number): InferredTable | null =>
          inferTableFromGroupedText(regionGroup, { paths, minRows: 2, minCols: cols, maxCols: cols });

        const hint = r.colCountHint;
        if (hint && hint >= 2) {
          const attempts = [hint, hint - 1, hint + 1].filter((n) => n >= 2);
          for (const cols of attempts) {
            const strict = tryStrict(cols);
            if (strict) {return strict;}
          }
        }

        return inferTableFromGroupedText(regionGroup, { paths, minRows: 2, minCols: 2 });
      })();
      if (!inferred0) {continue;}

      const inferredTables = shouldSplitIntoRepeated3ColTables(inferred0)
        ? splitInferredTableByColumn(inferred0, 3)
        : [inferred0];

      const tables: Array<{ readonly inferred: InferredTable; readonly decoration: TableDecorationAnalysis | null }> = [];
      for (const inferred of inferredTables) {
        const decoration = analyzeTableDecorationFromPaths(inferred, paths, context);
        if (isMeaningfulTableDecoration(decoration)) {
          for (const pi of decoration.consumedPathIndices) {consumedPathIndices.add(pi);}
          tables.push({ inferred, decoration });
          continue;
        }
        if (isSafeUncoupledTable(inferred)) {
          tables.push({ inferred, decoration: null });
        }
      }

      if (tables.length === 0) {continue;}
      plannedGroups.push({ kind: "tables", group: regionGroup, tables });
    }

    const hasRegionTables = plannedGroups.some((p) => p.kind === "tables" && p.tables.length > 0);

    for (const r of regions) {
      if (hasRegionTables) {break;}
      const insideIndices = groupArray
        .map((g, idx) => {
          const cx = g.bounds.x + g.bounds.width / 2;
          const cy = g.bounds.y + g.bounds.height / 2;
          return cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1 ? idx : null;
        })
        .filter((x): x is number => x !== null);

      const bands = splitIntoVerticalBands(insideIndices);
      for (const band of bands) {
        for (const idx of band) {consumedGroupIndices.add(idx);}

        const yTop = Math.max(...band.map((idx) => groupArray[idx]!.bounds.y + groupArray[idx]!.bounds.height));
        const yBottom = Math.min(...band.map((idx) => groupArray[idx]!.bounds.y));

        const bandTexts = texts.filter((t) => {
          const cx = t.x + t.width / 2;
          const cy = t.y + t.height / 2;
          return cx >= r.x0 && cx <= r.x1 && cy >= yBottom && cy <= yTop;
        });

        const bandGroup0 = buildBaselineGroupedText(bandTexts);
        const bandGroup = bandGroup0 && {
          ...bandGroup0,
          bounds: {
            x: r.x0,
            y: yBottom,
            width: r.x1 - r.x0,
            height: yTop - yBottom,
          },
        };
        if (!bandGroup) {continue;}

        const inferred0 = inferTableFromGroupedText(bandGroup, { paths, minRows: 2, minCols: 2 });
        if (!inferred0) {continue;}

        const inferredTables = shouldSplitIntoRepeated3ColTables(inferred0)
          ? splitInferredTableByColumn(inferred0, 3)
          : [inferred0];

        const tables: Array<{ readonly inferred: InferredTable; readonly decoration: TableDecorationAnalysis | null }> = [];
        for (const inferred of inferredTables) {
          const decoration = analyzeTableDecorationFromPaths(inferred, paths, context);
          if (isMeaningfulTableDecoration(decoration)) {
            for (const pi of decoration.consumedPathIndices) {consumedPathIndices.add(pi);}
            tables.push({ inferred, decoration });
            continue;
          }
          if (isSafeUncoupledTable(inferred)) {
            tables.push({ inferred, decoration: null });
          }
        }

        if (tables.length === 0) {continue;}
        plannedGroups.push({ kind: "tables", group: bandGroup, tables });
      }
    }

    // Emit remaining groups as text.
    for (let i = 0; i < groupArray.length; i++) {
      if (consumedGroupIndices.has(i)) {continue;}
      plannedGroups.push({ kind: "text", group: groupArray[i]! });
    }
  }

  // Emit paths first (background lines/fills), excluding any that are mapped to table borders/fills.
  for (let pi = 0; pi < paths.length; pi++) {
    if (consumedPathIndices.has(pi)) {continue;}
    const path = paths[pi]!;
    if (path.operations.length < minPathComplexity) {continue;}
    const shape = convertPath(path, context, generateId());
    if (shape) {shapes.push(shape);}
  }

  // Emit grouped texts / tables
  for (const plan of plannedGroups) {
    if (plan.kind === "text") {
      const shapeId = generateId();
      shapes.push(convertGroupedTextToShape(plan.group, context, shapeId));
      continue;
    }

    for (const tbl of plan.tables) {
      const shapeId = generateId();
      shapes.push(convertInferredTableToShape(tbl.inferred, tbl.decoration, context, shapeId));
    }
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
