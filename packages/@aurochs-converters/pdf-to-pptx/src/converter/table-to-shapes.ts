/**
 * @file GroupedText (table-like) → GraphicFrame table converter
 */

import type { PdfPath, PdfPathOp, PdfText } from "@aurochs/pdf/domain";
import type { GraphicFrame } from "@aurochs-office/pptx/domain/shape";
import type { Table, TableCell, TableRow } from "@aurochs-office/pptx/domain/table/types";
import type { Paragraph, TextBody, TextRun } from "@aurochs-office/pptx/domain/text";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { deg, pt, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Fill, Line } from "@aurochs-office/pptx/domain/color/types";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, convertPoint, convertSize } from "./transform-converter";
import type { GroupedText } from "./text-grouping/types";
import type { InferredTable } from "./table-inference";
import { inferTableFromGroupedText } from "./table-inference";
import { createPptxTextRunFromPdfText } from "./text-to-shapes";
import { convertGraphicsStateToStyle, noFill } from "./color-converter";
import { rgbToHex } from "@aurochs/pdf/domain/color";
import { EMU_PER_PIXEL } from "@aurochs-office/pptx/domain/defaults";

export type TableConversionOptions = {
  readonly minRows?: number;
  readonly minCols?: number;
};

type BBox = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

export type TableDecorationAnalysis = {
  /** Page path indices that are replaced by table borders/fills. */
  readonly consumedPathIndices: readonly number[];
  /** Vertical boundary styles (length = colCount + 1) */
  readonly verticalBorders: readonly (Line | undefined)[];
  /** Horizontal boundary styles (length = rowCount + 1) */
  readonly horizontalBorders: readonly (Line | undefined)[];
  /** Explicit cell fills keyed by `${rowIdx},${colIdx}` */
  readonly cellFills: ReadonlyMap<string, Fill>;
};

function computeCellBorders(
  decoration: TableDecorationAnalysis | null | undefined,
  ri: number,
  ci: number,
  rowSpan: number,
  colSpan: number,
  rowCount: number,
  colCount: number,
): { top?: Line; left?: Line; right?: Line; bottom?: Line } | undefined {
  if (!decoration) {
    return undefined;
  }
  const v = decoration.verticalBorders;
  const h = decoration.horizontalBorders;
  const top = ri === 0 ? h[0] : undefined;
  const left = ci === 0 ? v[0] : undefined;
  const right = v[Math.min(colCount, ci + colSpan)];
  const bottom = h[Math.min(rowCount, ri + rowSpan)];

  const out = {
    ...(top ? { top } : {}),
    ...(left ? { left } : {}),
    ...(right ? { right } : {}),
    ...(bottom ? { bottom } : {}),
  };
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeBBox(b: BBox): BBox {
  return {
    x0: Math.min(b.x0, b.x1),
    y0: Math.min(b.y0, b.y1),
    x1: Math.max(b.x0, b.x1),
    y1: Math.max(b.y0, b.y1),
  };
}

function intersects(a: BBox, b: BBox): boolean {
  return a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
}

function overlap1D({ a0, a1, b0, b1 }: { a0: number; a1: number; b0: number; b1: number }): number {
  const lo = Math.max(Math.min(a0, a1), Math.min(b0, b1));
  const hi = Math.min(Math.max(a0, a1), Math.max(b0, b1));
  return Math.max(0, hi - lo);
}

function area(b: BBox): number {
  return Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
}

function splitPathIntoSubpaths(ops: readonly PdfPathOp[]): PdfPathOp[][] {
  const out: PdfPathOp[][] = [];
  // eslint-disable-next-line no-restricted-syntax
  let cur: PdfPathOp[] = [];

  const flush = (): void => {
    if (cur.length > 0) {
      out.push(cur);
    }
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
    if (cur.length === 0) {
      cur = [op];
    } else {
      cur.push(op);
    }
  }

  flush();
  return out;
}

function bboxOfSubpath(sub: readonly PdfPathOp[]): BBox | null {
  // eslint-disable-next-line no-restricted-syntax
  let minX = Infinity;
  // eslint-disable-next-line no-restricted-syntax
  let minY = Infinity;
  // eslint-disable-next-line no-restricted-syntax
  let maxX = -Infinity;
  // eslint-disable-next-line no-restricted-syntax
  let maxY = -Infinity;

  const add = (x: number, y: number): void => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const op of sub) {
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

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null;
  }
  return normalizeBBox({ x0: minX, y0: minY, x1: maxX, y1: maxY });
}

function bboxOfAxisAlignedRectFromLineOps(sub: readonly PdfPathOp[]): BBox | null {
  type Pt = { readonly x: number; readonly y: number };
  const points: Pt[] = [];
  for (const op of sub) {
    if (op.type === "moveTo" || op.type === "lineTo") {
      points.push(op.point);
      continue;
    }
    if (op.type === "closePath") {
      continue;
    }
    // Curves or explicit rect ops are handled elsewhere.
    return null;
  }

  if (points.length < 4) {
    return null;
  }

  const uniqWithTol = (values: readonly number[], tol: number): number[] => {
    const out: number[] = [];
    for (const v of values) {
      if (!out.some((x) => Math.abs(x - v) <= tol)) {
        out.push(v);
      }
    }
    out.sort((a, b) => a - b);
    return out;
  };

  const tol = 1e-3;
  const xs = uniqWithTol(
    points.map((p) => p.x),
    tol,
  );
  const ys = uniqWithTol(
    points.map((p) => p.y),
    tol,
  );
  if (xs.length !== 2 || ys.length !== 2) {
    return null;
  }

  return normalizeBBox({ x0: xs[0]!, y0: ys[0]!, x1: xs[1]!, y1: ys[1]! });
}

function getTableXBoundaries(inferred: InferredTable): number[] {
  if (inferred.columns.length === 0) {
    return [];
  }
  return [inferred.columns[0]!.x0, ...inferred.columns.map((c) => c.x1)];
}

function getTableYBoundaries(inferred: InferredTable): number[] {
  if (inferred.rows.length === 0) {
    return [];
  }
  const top = inferred.rows[0]!.y1;
  const bottoms = inferred.rows.map((r) => r.y0);
  const last = bottoms[bottoms.length - 1];
  const expectedBottom = inferred.bounds.y;
  const out = [top, ...bottoms];
  if (last === undefined || Math.abs(last - expectedBottom) > 0.001) {
    out.push(expectedBottom);
  }
  return out;
}

function nearestIndex(xs: readonly number[], value: number): { index: number; dist: number } {
  // eslint-disable-next-line no-restricted-syntax
  let bestIdx = 0;
  // eslint-disable-next-line no-restricted-syntax
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i]! - value);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { index: bestIdx, dist: bestDist };
}

function isNearWhiteFill(fill: Fill): boolean {
  if (fill.type !== "solidFill") {
    return false;
  }
  const spec = fill.color.spec;
  if (spec.type !== "srgb") {
    return false;
  }
  const v = spec.value.toUpperCase();
  return v === "FFFFFF" || v === rgbToHex(255, 255, 255);
}

function lineFromFill(fill: Fill, thicknessPdf: number, context: ConversionContext): Line {
  const widthScale = Math.min(context.scaleX, context.scaleY);
  const rawPx = thicknessPdf * widthScale;
  return {
    fill,
    width: px(rawPx),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    dash: "solid",
    join: "miter",
  };
}

/**
 * Analyze page paths intersecting the inferred table bounds and map them to:
 * - table boundary borders (row/col rules)
 * - table cell fills (e.g. header shading)
 *
 * When this returns `null`, the caller should fall back to emitting the PDF paths
 * as regular shapes (no coupling between table edits and grid visuals).
 */
export function analyzeTableDecorationFromPaths(
  inferred: InferredTable,
  pagePaths: readonly PdfPath[],
  context: ConversionContext,
): TableDecorationAnalysis | null {
  const xBounds = getTableXBoundaries(inferred);
  const yBounds = getTableYBoundaries(inferred);
  if (xBounds.length < 2 || yBounds.length < 2) {
    return null;
  }

  const colCount = xBounds.length - 1;
  const rowCount = yBounds.length - 1;

  const pad = Math.max(2, inferred.fontSize * 0.9);
  const region: BBox = {
    x0: inferred.bounds.x - pad,
    y0: inferred.bounds.y - pad,
    x1: inferred.bounds.x + inferred.bounds.width + pad,
    y1: inferred.bounds.y + inferred.bounds.height + pad,
  };

  const horizontalBorders: Array<Line | undefined> = Array.from({ length: rowCount + 1 }, () => undefined);
  const verticalBorders: Array<Line | undefined> = Array.from({ length: colCount + 1 }, () => undefined);

  type PathStats = { matched: number; matchedArea: number; total: number; totalArea: number };
  const pathStats = new Map<number, PathStats>();

  const cellFills = new Map<string, Fill>();
  const cellFillScore = new Map<string, number>();

  // Allow thick rules (e.g. double borders between adjacent tables), but still
  // avoid misclassifying cell background rectangles as rules.
  // We rely on an aspect ratio split:
  // - rules: very elongated (aspect >= 12)
  // - fills: not very elongated (aspect < 12)
  const maxRuleThickness = Math.max(1.2, inferred.fontSize * 0.9);
  // Dense spec tables often draw header-tier rules as short segments.
  // Keep this low enough to capture them, but still scale with table size.
  const minRuleSpan = Math.max(inferred.fontSize * 1.6, Math.min(inferred.bounds.width, inferred.bounds.height) * 0.08);
  // Boundary matching tolerance needs to allow for double-rule tables, where the visual
  // boundary is represented as two parallel thin filled rectangles with a gap.
  // (k-namingrule-dl.pdf uses this for the center divider.)
  const boundaryTol = Math.max(1.2, inferred.fontSize * 0.65);
  // PDF "hairline" strokes often render as a device-pixel wide line regardless of declared width.
  // When converting to PPTX, extremely thin borders become barely visible and cause large visual diffs,
  // especially for dense grids. Clamp border widths to a minimum in slide pixels.
  const minBorderPx = 0.35;

  const normalizeBorderLine = (ln: Line): Line => {
    const w = ln.width as number;
    if (!Number.isFinite(w) || w <= 0) {
      return { ...ln, width: px(minBorderPx) };
    }
    if (w < minBorderPx) {
      return { ...ln, width: px(minBorderPx) };
    }
    return ln;
  };

  for (let pi = 0; pi < pagePaths.length; pi++) {
    const p = pagePaths[pi]!;
    if (p.paintOp === "none" || p.paintOp === "clip") {
      continue;
    }
    if (p.operations.length === 0) {
      continue;
    }

    const subs = splitPathIntoSubpaths(p.operations);
    // eslint-disable-next-line no-restricted-syntax
    let totalSub = 0;
    // eslint-disable-next-line no-restricted-syntax
    let matchedSub = 0;
    // eslint-disable-next-line no-restricted-syntax
    let totalArea = 0;
    // eslint-disable-next-line no-restricted-syntax
    let matchedArea = 0;

    const extractAxisAlignedSegments = (sub: readonly PdfPathOp[], lineWidthPdf: number): BBox[] => {
      const half = Math.max(0.05, lineWidthPdf / 2);
      const axisEps = Math.max(0.02, inferred.fontSize * 0.01, lineWidthPdf * 0.35);
      // eslint-disable-next-line no-restricted-syntax
      let cur: { x: number; y: number } | null = null;
      const out: BBox[] = [];

      for (const op of sub) {
        if (op.type === "moveTo") {
          cur = { x: op.point.x, y: op.point.y };
          continue;
        }
        if (op.type === "lineTo") {
          if (!cur) {
            cur = { x: op.point.x, y: op.point.y };
            continue;
          }

          const dx = op.point.x - cur.x;
          const dy = op.point.y - cur.y;
          const x0 = Math.min(cur.x, op.point.x);
          const x1 = Math.max(cur.x, op.point.x);
          const y0 = Math.min(cur.y, op.point.y);
          const y1 = Math.max(cur.y, op.point.y);

          // Many PDFs encode "axis-aligned" table rules with tiny float drift.
          // Treat near-axis-aligned segments as rules by allowing a small epsilon.
          if (Math.abs(dx) <= axisEps && Math.abs(dy) > axisEps) {
            out.push(normalizeBBox({ x0: cur.x - half, y0, x1: cur.x + half, y1 }));
          } else if (Math.abs(dy) <= axisEps && Math.abs(dx) > axisEps) {
            out.push(normalizeBBox({ x0, y0: cur.y - half, x1, y1: cur.y + half }));
          }

          cur = { x: op.point.x, y: op.point.y };
          continue;
        }
        if (cur) {
          if (op.type === "curveTo") {
            cur = { x: op.end.x, y: op.end.y };
          } else if (op.type === "curveToV") {
            cur = { x: op.end.x, y: op.end.y };
          } else if (op.type === "curveToY") {
            cur = { x: op.end.x, y: op.end.y };
          } else if (op.type === "closePath") {
            /* no-op */
          }
        }
      }

      return out;
    };

    for (const sub of subs) {
      const bb = bboxOfSubpath(sub);
      if (!bb) {
        continue;
      }
      if (!intersects(bb, region)) {
        continue;
      }
      totalSub++;
      const a = area(bb);
      totalArea += a;

      const w = bb.x1 - bb.x0;
      const h = bb.y1 - bb.y0;
      const thickness = Math.min(w, h);
      const span = Math.max(w, h);
      const aspect = span / Math.max(0.1, thickness);
      const isHRule0 = aspect >= 12 && h <= maxRuleThickness && w >= minRuleSpan;
      const isVRule0 = aspect >= 12 && w <= maxRuleThickness && h >= minRuleSpan;

      const { fill, line } = convertGraphicsStateToStyle(
        p.graphicsState,
        p.paintOp as "stroke" | "fill" | "fillStroke",
        {
          lineWidthScale: Math.min(context.scaleX, context.scaleY),
        },
      );

      // eslint-disable-next-line no-restricted-syntax
      let matchedThisSub = false;
      const markMatched = (): void => {
        if (matchedThisSub) {
          return;
        }
        matchedThisSub = true;
        matchedSub++;
        matchedArea += a;
      };

      const lineWidthPdf = Math.max(0.1, p.graphicsState.lineWidth || 1);

      // If this subpath is a rectangle, its bbox isn't elongated, but its edges represent borders.
      // Treat stroked rect edges as boundary rules.
      const rectBBox = (() => {
        if (sub.length === 1 && sub[0]?.type === "rect") {
          return bb;
        }
        return bboxOfAxisAlignedRectFromLineOps(sub);
      })();

      if (rectBBox && line) {
        const rectLine = normalizeBorderLine(line);
        const left = nearestIndex(xBounds, rectBBox.x0);
        if (left.dist <= boundaryTol) {
          const prev = verticalBorders[left.index];
          if (!prev || (prev.width as number) < (rectLine.width as number)) {
            verticalBorders[left.index] = rectLine;
          }
          markMatched();
        }
        const right = nearestIndex(xBounds, rectBBox.x1);
        if (right.dist <= boundaryTol) {
          const prev = verticalBorders[right.index];
          if (!prev || (prev.width as number) < (rectLine.width as number)) {
            verticalBorders[right.index] = rectLine;
          }
          markMatched();
        }
        const bottom = nearestIndex(yBounds, rectBBox.y0);
        if (bottom.dist <= boundaryTol) {
          const prev = horizontalBorders[bottom.index];
          if (!prev || (prev.width as number) < (rectLine.width as number)) {
            horizontalBorders[bottom.index] = rectLine;
          }
          markMatched();
        }
        const top = nearestIndex(yBounds, rectBBox.y1);
        if (top.dist <= boundaryTol) {
          const prev = horizontalBorders[top.index];
          if (!prev || (prev.width as number) < (rectLine.width as number)) {
            horizontalBorders[top.index] = rectLine;
          }
          markMatched();
        }
      }

      // Border rule candidates:
      // - Filled rectangles: handled by bbox heuristics (isHRule0/isVRule0) and `lineFromFill`.
      // - Stroked polylines: a single subpath can contain many individual rules; its bbox is not
      //   necessarily elongated. Always attempt per-segment matching for stroked polylines.
      const segmentBoxes = (() => {
        if (!sub.some((op) => op.type === "lineTo")) {
          return [] as BBox[];
        }
        return extractAxisAlignedSegments(sub, lineWidthPdf);
      })();

      const ruleLineForSegments = (() => {
        if (line) {
          return normalizeBorderLine(line);
        }
        // For fill-based rule rectangles, synthesize a stroke-like line style.
        if (fill && (isHRule0 || isVRule0)) {
          return normalizeBorderLine(lineFromFill(fill, thickness, context));
        }
        return undefined;
      })();

      if (segmentBoxes.length > 0 && ruleLineForSegments) {
        for (const sb of segmentBoxes) {
          const sw = sb.x1 - sb.x0;
          const sh = sb.y1 - sb.y0;
          const sThickness = Math.min(sw, sh);
          const sSpan = Math.max(sw, sh);
          const sAspect = sSpan / Math.max(0.1, sThickness);
          const isHRule = sAspect >= 12 && sh <= maxRuleThickness && sw >= minRuleSpan;
          const isVRule = sAspect >= 12 && sw <= maxRuleThickness && sh >= minRuleSpan;
          if (!isHRule && !isVRule) {
            continue;
          }

          if (isHRule) {
            const yCenter = (sb.y0 + sb.y1) / 2;
            const { index, dist } = nearestIndex(yBounds, yCenter);
            if (dist <= boundaryTol) {
              const prev = horizontalBorders[index];
              if (!prev || (prev.width as number) < (ruleLineForSegments.width as number)) {
                horizontalBorders[index] = ruleLineForSegments;
              }
              markMatched();
            }
          } else if (isVRule) {
            const xCenter = (sb.x0 + sb.x1) / 2;
            const { index, dist } = nearestIndex(xBounds, xCenter);
            if (dist <= boundaryTol) {
              const prev = verticalBorders[index];
              if (!prev || (prev.width as number) < (ruleLineForSegments.width as number)) {
                verticalBorders[index] = ruleLineForSegments;
              }
              markMatched();
            }
          }
        }
      } else if (isHRule0 || isVRule0) {
        const ruleLine = line
          ? normalizeBorderLine(line)
          : fill
            ? normalizeBorderLine(lineFromFill(fill, thickness, context))
            : undefined;
        if (!ruleLine) {
          continue;
        }

        if (isHRule0) {
          const yCenter = (bb.y0 + bb.y1) / 2;
          const { index, dist } = nearestIndex(yBounds, yCenter);
          if (dist <= boundaryTol) {
            const prev = horizontalBorders[index];
            if (!prev || (prev.width as number) < (ruleLine.width as number)) {
              horizontalBorders[index] = ruleLine;
            }
            markMatched();
          }
        }
        if (isVRule0) {
          const xCenter = (bb.x0 + bb.x1) / 2;
          const { index, dist } = nearestIndex(xBounds, xCenter);
          if (dist <= boundaryTol) {
            const prev = verticalBorders[index];
            if (!prev || (prev.width as number) < (ruleLine.width as number)) {
              verticalBorders[index] = ruleLine;
            }
            markMatched();
          }
        }
      }

      // Cell fill candidates: non-rule filled rectangles aligned to cell bands.
      if (fill && (p.paintOp === "fill" || p.paintOp === "fillStroke") && !isNearWhiteFill(fill)) {
        // Some PDFs draw header band shading as a single long rectangle spanning many columns.
        // Even though it's elongated (high aspect), it is *not* a rule because its thickness is much larger
        // than `maxRuleThickness`. Allow those to be considered as fills.
        const isReasonableRect =
          a >= Math.max(6, inferred.fontSize * inferred.fontSize * 0.5) &&
          (aspect < 12 || thickness > maxRuleThickness * 1.2);
        if (!isReasonableRect) {
          continue;
        }

        // eslint-disable-next-line no-restricted-syntax
        let assigned = false;
        // Map this fill to overlapping cells; keep the best overlap ratio per cell.
        for (let r = 0; r < rowCount; r++) {
          const yTop = yBounds[r]!;
          const yBottom = yBounds[r + 1]!;
          const rowOv = overlap1D({ a0: yBottom, a1: yTop, b0: bb.y0, b1: bb.y1 });
          const rowH = Math.max(1e-6, yTop - yBottom);
          if (rowOv / rowH < 0.65) {
            continue;
          }

          for (let c = 0; c < colCount; c++) {
            const x0 = xBounds[c]!;
            const x1 = xBounds[c + 1]!;
            const colOv = overlap1D({ a0: x0, a1: x1, b0: bb.x0, b1: bb.x1 });
            const colW = Math.max(1e-6, x1 - x0);
            if (colOv / colW < 0.65) {
              continue;
            }

            const cellArea = colW * rowH;
            const ovArea = rowOv * colOv;
            const ratio = ovArea / Math.max(1e-6, cellArea);
            if (ratio < 0.55) {
              continue;
            }

            const key = `${r},${c}`;
            const prevScore = cellFillScore.get(key) ?? -Infinity;
            if (ratio > prevScore) {
              cellFillScore.set(key, ratio);
              cellFills.set(key, fill);
              assigned = true;
            }
          }
        }
        if (assigned) {
          markMatched();
        }
      }
    }

    if (totalSub > 0) {
      pathStats.set(pi, { matched: matchedSub, matchedArea, total: totalSub, totalArea });
    }
  }

  // Require sufficient boundary coverage before consuming paths (avoid dropping unmatched grid lines).
  const foundHoriz = horizontalBorders.filter(Boolean).length;
  const foundVert = verticalBorders.filter(Boolean).length;
  const horizCoverage = foundHoriz / horizontalBorders.length;
  const vertCoverage = foundVert / verticalBorders.length;

  const consumedPathIndices: number[] = [];
  for (const [pi, st] of pathStats.entries()) {
    if (st.matched === 0) {
      continue;
    }
    const matchRatio = st.matched / st.total;
    const areaRatio = st.totalArea > 0 ? st.matchedArea / st.totalArea : 1;
    if (matchRatio >= 0.6 && areaRatio >= 0.6) {
      consumedPathIndices.push(pi);
    }
  }
  consumedPathIndices.sort((a, b) => a - b);

  const cellFillRatio = cellFills.size / Math.max(1, rowCount * colCount);
  const hasOuterBorders =
    !!horizontalBorders[0] &&
    !!horizontalBorders[horizontalBorders.length - 1] &&
    !!verticalBorders[0] &&
    !!verticalBorders[verticalBorders.length - 1];

  // Default: require high border coverage so we don't incorrectly consume grid paths.
  //
  // Relaxation: allow tables where border matching is incomplete but there is clear evidence
  // of table styling (cell fills + outer borders). This helps for PDFs that draw shaded table
  // bands but split/approximate borders in ways that don't align perfectly with inferred
  // boundaries (e.g. small 2-column tables with header shading).
  if (horizCoverage < 0.75 || vertCoverage < 0.75) {
    const allowPartial = consumedPathIndices.length > 0 && hasOuterBorders && cellFillRatio >= 0.08;
    if (!allowPartial) {
      return null;
    }
  }

  return {
    consumedPathIndices,
    verticalBorders,
    horizontalBorders,
    cellFills,
  };
}

function convertBoundsToTransform(
  bounds: { x: number; y: number; width: number; height: number },
  context: ConversionContext,
): { x: Pixels; y: Pixels; width: Pixels; height: Pixels } {
  return convertBBox([bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height], context);
}

type BuildCellTextBodyFromLinesArgs = {
  readonly runsByLine: readonly (readonly PdfText[])[];
  readonly baselineYsByLine: readonly number[];
  readonly alignment: "left" | "center" | "right";
  readonly context: ConversionContext;
};

function buildCellTextBodyFromLines({
  runsByLine,
  baselineYsByLine,
  alignment,
  context,
}: BuildCellTextBodyFromLinesArgs): TextBody | undefined {
  const containsCjk = (s: string): boolean => /[\u3040-\u30FF\u3400-\u9FFF]/.test(s);

  const isAsciiToken = (s: string): boolean => {
    if (s.length === 0) {
      return false;
    }
    for (let i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) > 0x7f) {
        return false;
      }
    }
    return true;
  };

  const startsWithWordish = (s: string): boolean => /^[A-Za-z0-9]/.test(s);
  const endsWithWordish = (s: string): boolean => /[A-Za-z0-9]$/.test(s);

  const pairs = runsByLine
    .map((line, idx) => ({ line, baselineY: baselineYsByLine[idx] }))
    .map(({ line, baselineY }) => ({ line: line.filter((r) => r.text.length > 0), baselineY }))
    .filter((p) => p.line.length > 0);
  if (pairs.length === 0) {
    return undefined;
  }

  const median = (xs: readonly number[]): number => {
    if (xs.length === 0) {
      return 0;
    }
    const arr = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 1 ? arr[mid]! : (arr[mid - 1]! + arr[mid]!) / 2;
  };

  const estimateCharWidth = (t: PdfText): number => {
    const len = Math.max(1, t.text.length);
    return t.width / len;
  };

  const buildRunsWithInferredSpaces = (lineRuns: readonly PdfText[]): TextRun[] => {
    const sorted = [...lineRuns].sort((a, b) => a.x - b.x);
    const usable = sorted.filter((r) => r.text.length > 0);
    if (usable.length === 0) {
      return [];
    }

    const fontSize = median(usable.map((r) => r.fontSize).filter((x) => Number.isFinite(x) && x > 0)) || 10;
    const charW = median(usable.map(estimateCharWidth).filter((x) => Number.isFinite(x) && x > 0)) || fontSize * 0.6;

    // Insert a regular space for moderate gaps to preserve visual layout within a line.
    // We keep this conservative so Japanese text doesn't get spurious spaces.
    const spaceGapTh = Math.max(fontSize * 0.28, charW * 0.95);
    const hasCjk = usable.some((r) => containsCjk(r.text));

    const out: TextRun[] = [];
    for (let i = 0; i < usable.length; i++) {
      const cur = usable[i]!;
      if (i > 0) {
        const prev = usable[i - 1]!;
        const gap = cur.x - (prev.x + prev.width);
        const prevEndsSpace = /\s$/.test(prev.text);
        const curStartsSpace = /^\s/.test(cur.text);
        const allowByScript =
          !hasCjk ||
          (isAsciiToken(prev.text) &&
            isAsciiToken(cur.text) &&
            endsWithWordish(prev.text) &&
            startsWithWordish(cur.text));
        if (allowByScript && Number.isFinite(gap) && gap >= spaceGapTh && !prevEndsSpace && !curStartsSpace) {
          const ref: PdfText = { ...prev, text: " ", width: 0 };
          out.push(createPptxTextRunFromPdfText(ref, context));
        }
      }
      out.push(createPptxTextRunFromPdfText(cur, context));
    }
    return out;
  };

  const lineSpacing = (() => {
    if (pairs.length < 2) {
      return undefined;
    }
    const gaps: number[] = [];
    for (let i = 0; i < pairs.length - 1; i++) {
      const a = pairs[i]!.baselineY;
      const b = pairs[i + 1]!.baselineY;
      const gap = Math.abs(a - b);
      if (Number.isFinite(gap) && gap > 0.1) {
        gaps.push(gap);
      }
    }
    if (gaps.length === 0) {
      return undefined;
    }
    const medianGapPdf = median(gaps);
    const gapPptxPt = medianGapPdf * context.fontSizeScale;
    if (!Number.isFinite(gapPptxPt) || gapPptxPt <= 0) {
      return undefined;
    }
    return { type: "points" as const, value: pt(gapPptxPt) };
  })();

  const paragraphs: Paragraph[] = [];

  // Table cells: prefer a single paragraph with explicit line breaks.
  // This keeps text shaping deterministic and reduces visual drift vs PDF baselines,
  // while still allowing word wrapping within each line when needed.
  const runs: TextRun[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const line = [...pairs[i]!.line].sort((a, b) => a.x - b.x).filter((r) => r.text.trim().length > 0);
    runs.push(...buildRunsWithInferredSpaces(line));
    if (i < pairs.length - 1) {
      runs.push({ type: "break" });
    }
  }

  paragraphs.push({
    properties: {
      alignment,
      ...(lineSpacing ? { lineSpacing } : {}),
      // Table cell paragraphs should not add default before/after spacing.
      spaceBefore: { type: "points", value: pt(0) },
      spaceAfter: { type: "points", value: pt(0) },
    },
    runs: mergeRuns(runs),
    endProperties: {},
  });

  return {
    bodyProperties: {
      // PDF-derived line breaks are explicit; avoid viewer-specific reflow by disabling wrapping.
      wrapping: "none",
      autoFit: { type: "none" },
      anchor: "top",
      anchorCenter: false,
      forceAntiAlias: true,
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
  if (a === undefined || b === undefined) {
    return a === b;
  }
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

function buildTableFromInference(
  inferred: InferredTable,
  context: ConversionContext,
  decoration: TableDecorationAnalysis | null,
): Table {
  const colWidthsPdf: number[] = inferred.columns.map((c) => c.x1 - c.x0);
  const rowHeightsPdf: number[] = inferred.rows.map((r) => r.y1 - r.y0);

  const tableBoxPx = convertBBox(
    [
      inferred.bounds.x,
      inferred.bounds.y,
      inferred.bounds.x + inferred.bounds.width,
      inferred.bounds.y + inferred.bounds.height,
    ],
    context,
  );

  const frameWidthPx = tableBoxPx.width as number;
  const frameHeightPx = tableBoxPx.height as number;

  // Convert PDF grid boundaries into table-local EMU boundaries to keep grid lines aligned
  // after rounding (important for dense tables like k-resource-dl.pdf).
  const computeSizesFromBoundaries = (boundaryPxs: readonly number[], targetTotalPx: number): number[] => {
    if (boundaryPxs.length < 2) {
      return [];
    }
    const targetEmu = Math.max(1, Math.round(targetTotalPx * EMU_PER_PIXEL));
    const emuBounds = boundaryPxs.map((v) => Math.round(v * EMU_PER_PIXEL));
    // Normalize: start at 0, end at targetTotal.
    const start = emuBounds[0]!;
    for (let i = 0; i < emuBounds.length; i++) {
      emuBounds[i] = emuBounds[i]! - start;
    }
    emuBounds[0] = 0;
    emuBounds[emuBounds.length - 1] = targetEmu;

    // Enforce strictly increasing boundaries (avoid zero-width columns/rows).
    for (let i = 1; i < emuBounds.length; i++) {
      if (emuBounds[i]! <= emuBounds[i - 1]!) {
        emuBounds[i] = emuBounds[i - 1]! + 1;
      }
    }
    // If we pushed the last boundary, pull earlier ones back to keep the total.
    const overshoot = emuBounds[emuBounds.length - 1]! - targetEmu;
    if (overshoot > 0) {
      for (let i = emuBounds.length - 2; i >= 1 && emuBounds[emuBounds.length - 1]! > targetEmu; i--) {
        const slack = emuBounds[i]! - emuBounds[i - 1]!;
        if (slack <= 1) {
          continue;
        }
        const take = Math.min(slack - 1, emuBounds[emuBounds.length - 1]! - targetEmu);
        for (let j = i; j < emuBounds.length; j++) {
          emuBounds[j] = emuBounds[j]! - take;
        }
      }
    }
    emuBounds[emuBounds.length - 1] = targetEmu;

    const sizes: number[] = [];
    for (let i = 0; i < emuBounds.length - 1; i++) {
      const w = Math.max(1, emuBounds[i + 1]! - emuBounds[i]!);
      sizes.push(w / EMU_PER_PIXEL);
    }
    return sizes;
  };

  const xBoundsPdf = getTableXBoundaries(inferred);
  const yBoundsPdf = getTableYBoundaries(inferred);

  const tableLeftPxAbs = tableBoxPx.x as number;
  const tableTopPxAbs = tableBoxPx.y as number;

  const xBoundsPxLocal = xBoundsPdf.map((x) => (convertPoint({ x, y: 0 }, context).x as number) - tableLeftPxAbs);
  const yBoundsPxLocal = yBoundsPdf.map((y) => (convertPoint({ x: 0, y }, context).y as number) - tableTopPxAbs);

  // Fallback to width/height based conversion if we can't compute stable boundaries.
  const fallbackColWidthsPx = inferred.columns.map(
    (_, i) => convertSize(colWidthsPdf[i] ?? 0, 0, context).width as number,
  );
  const fallbackRowHeightsPx = inferred.rows.map(
    (_, i) => convertSize(0, rowHeightsPdf[i] ?? 0, context).height as number,
  );

  const hasStableColBounds = xBoundsPxLocal.length === inferred.columns.length + 1;
  const colWidthsPx = hasStableColBounds
    ? computeSizesFromBoundaries(xBoundsPxLocal, frameWidthPx)
    : fallbackColWidthsPx;

  const hasStableRowBounds = yBoundsPxLocal.length === inferred.rows.length + 1;
  const rowHeightsPx = hasStableRowBounds
    ? computeSizesFromBoundaries(yBoundsPxLocal, frameHeightPx)
    : fallbackRowHeightsPx;

  const columns = inferred.columns.map((_, i) => ({
    width: px(colWidthsPx[i] ?? 0),
  }));

  const rowCount = inferred.rows.length;
  const colCount = inferred.columns.length;

  type SpanOwner = {
    readonly startRow: number;
    readonly startCol: number;
    readonly rowSpan: number;
    readonly colSpan: number;
  };
  const owner: Array<Array<SpanOwner | null>> = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => null),
  );
  for (let ri = 0; ri < rowCount; ri++) {
    const r = inferred.rows[ri]!;
    for (const cell of r.cells) {
      const rs = Math.max(1, cell.rowSpan ?? 1);
      const cs = Math.max(1, cell.colSpan ?? 1);
      for (let rr = ri; rr < Math.min(rowCount, ri + rs); rr++) {
        for (let cc = cell.colStart; cc < Math.min(colCount, cell.colStart + cs); cc++) {
          owner[rr]![cc] = { startRow: ri, startCol: cell.colStart, rowSpan: rs, colSpan: cs };
        }
      }
    }
  }

  const resolveMergedCellFill = ({
    ri,
    ci,
    rowSpan,
    colSpan,
  }: {
    ri: number;
    ci: number;
    rowSpan: number;
    colSpan: number;
  }): Fill => {
    if (!decoration) {
      return noFill();
    }
    const direct = decoration.cellFills.get(`${ri},${ci}`);
    if (direct && !isNearWhiteFill(direct)) {
      return direct;
    }

    for (let rr = ri; rr < Math.min(rowCount, ri + rowSpan); rr++) {
      for (let cc = ci; cc < Math.min(colCount, ci + colSpan); cc++) {
        const fill = decoration.cellFills.get(`${rr},${cc}`);
        if (fill && !isNearWhiteFill(fill)) {
          return fill;
        }
      }
    }
    return direct ?? noFill();
  };

  const rows: TableRow[] = inferred.rows.map((r, ri) => {
    const heightPx = px(rowHeightsPx[ri] ?? 0);
    const cells: TableCell[] = [];

    const byStart = new Map<number, (typeof r.cells)[number]>();
    for (const c of r.cells) {
      byStart.set(c.colStart, c);
    }

    for (let ci = 0; ci < inferred.columns.length; ci++) {
      const seg = byStart.get(ci);

      const own = owner[ri]?.[ci];
      const isTopLeft = own?.startRow === ri && own?.startCol === ci;

      // Continuation of a merged cell (horizontal and/or vertical)
      if (own && !isTopLeft) {
        cells.push({
          properties: {
            ...(own.startCol < ci ? { horizontalMerge: true } : {}),
            ...(own.startRow < ri ? { verticalMerge: true } : {}),
            fill: noFill(),
            anchor: "center",
            anchorCenter: false,
            horzOverflow: "clip",
            margins: { left: px(0), right: px(0), top: px(0), bottom: px(0) },
          },
        });
        continue;
      }

      const rowSpan = Math.max(1, seg?.rowSpan ?? 1);
      const colSpan = Math.max(1, seg?.colSpan ?? 1);

      const borders = computeCellBorders(decoration, ri, ci, rowSpan, colSpan, rowCount, colCount);

      const fill: Fill = seg
        ? resolveMergedCellFill({ ri, ci, rowSpan, colSpan })
        : (decoration?.cellFills.get(`${ri},${ci}`) ?? noFill());

      if (!seg) {
        cells.push({
          properties: {
            ...(borders ? { borders } : {}),
            fill,
            anchor: "center",
            anchorCenter: false,
            horzOverflow: "clip",
            margins: { left: px(0), right: px(0), top: px(0), bottom: px(0) },
          },
        });
        continue;
      }

      const col = inferred.columns[ci]!;
      const leftSlackPdf = Math.max(0, seg.x0 - col.x0);
      const rightSlackPdf = Math.max(0, col.x1 - seg.x1);

      // Use explicit margins so rendering doesn't depend on viewer defaults.
      const colWidthPdf = colWidthsPdf[ci] ?? 0;
      const maxSidePdf = Math.max(0, Math.min(colWidthPdf * 0.45, inferred.fontSize * 2.0));
      const leftPdf = seg.alignment === "left" ? Math.min(leftSlackPdf, maxSidePdf) : 0;
      const rightPdf = seg.alignment === "right" ? Math.min(rightSlackPdf, maxSidePdf) : 0;
      const left = leftPdf > 0 ? convertSize(leftPdf, 0, context).width : px(0);
      const right = rightPdf > 0 ? convertSize(rightPdf, 0, context).width : px(0);

      const rowHeightPdf = rowHeightsPdf[ri] ?? 0;
      const maxVertPdf = Math.max(0, Math.min(inferred.fontSize * 1.2, rowHeightPdf * 0.45));

      // eslint-disable-next-line no-restricted-syntax
      let topSlackPdf = 0;
      // eslint-disable-next-line no-restricted-syntax
      let bottomSlackPdf = 0;
      if (seg.runsByLine.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        let minY = Infinity;
        // eslint-disable-next-line no-restricted-syntax
        let maxY = -Infinity;
        for (const line of seg.runsByLine) {
          for (const run of line) {
            if (run.text.trim().length === 0) {
              continue;
            }
            minY = Math.min(minY, run.y);
            maxY = Math.max(maxY, run.y + run.height);
          }
        }
        if (Number.isFinite(minY) && Number.isFinite(maxY)) {
          topSlackPdf = Math.max(0, r.y1 - maxY);
          bottomSlackPdf = Math.max(0, minY - r.y0);
        }
      }

      const topPdf = Math.min(topSlackPdf, maxVertPdf);
      const bottomPdf = Math.min(bottomSlackPdf, maxVertPdf);
      const top = topPdf > 0 ? convertSize(0, topPdf, context).height : px(0);
      const bottom = bottomPdf > 0 ? convertSize(0, bottomPdf, context).height : px(0);

      const margins = { left, right, top, bottom };

      // eslint-disable-next-line no-restricted-syntax
      let textBody: TextBody | undefined;
      if (seg.runsByLine.length > 0) {
        textBody = buildCellTextBodyFromLines({
          runsByLine: seg.runsByLine,
          baselineYsByLine: seg.baselineYsByLine,
          alignment: seg.alignment,
          context,
        });
      }

      const properties: TableCell["properties"] = {
        ...(colSpan > 1 ? { colSpan } : {}),
        ...(rowSpan > 1 ? { rowSpan } : {}),
        ...(borders ? { borders } : {}),
        fill,
        anchor: seg.runsByLine.length > 1 ? "top" : "center",
        anchorCenter: false,
        horzOverflow: "clip",
        margins,
      };

      cells.push(textBody ? { properties, textBody } : { properties });
    }

    return { height: heightPx, cells };
  });

  return {
    properties: {},
    grid: { columns },
    rows,
  };
}

export type ConvertGroupedTextToTableShapeArgs = {
  readonly group: GroupedText;
  readonly pagePaths: readonly PdfPath[];
  readonly context: ConversionContext;
  readonly shapeId: string;
  readonly options?: TableConversionOptions;
};

export function convertGroupedTextToTableShape({
  group,
  pagePaths,
  context,
  shapeId,
  options = {},
}: ConvertGroupedTextToTableShapeArgs): GraphicFrame | null {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const minRows = options.minRows ?? 6;
  const minCols = options.minCols ?? 3;

  const inferred = inferTableFromGroupedText(group, { minRows, minCols, paths: pagePaths });
  if (!inferred) {
    return null;
  }

  const decoration = analyzeTableDecorationFromPaths(inferred, pagePaths, context);
  return convertInferredTableToShape({ inferred, decoration, context, shapeId });
}

export type ConvertInferredTableToShapeArgs = {
  readonly inferred: InferredTable;
  readonly decoration: TableDecorationAnalysis | null;
  readonly context: ConversionContext;
  readonly shapeId: string;
};

export function convertInferredTableToShape({
  inferred,
  decoration,
  context,
  shapeId,
}: ConvertInferredTableToShapeArgs): GraphicFrame {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const xfrm = convertBoundsToTransform(inferred.bounds, context);
  const table = buildTableFromInference(inferred, context, decoration);

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
