/**
 * @file Table inference from grouped PDF text.
 *
 * Detects table-like structures from PDF text runs using geometric heuristics:
 * - Cluster paragraphs by baseline into rows
 * - Segment each row into "cell segments" by large horizontal gaps
 * - Cluster segment x positions into columns
 *
 * This is intentionally heuristic-based: PDFs are instruction streams, not
 * structured documents.
 */

import type { PdfPath, PdfPathOp, PdfText } from "@oxen/pdf/domain";
import type { GroupedText } from "./text-grouping/types";

export type InferredTableCell = {
  readonly colStart: number;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly baselineY: number;
  /** Cell content split into visual lines (top-to-bottom) */
  readonly runsByLine: readonly (readonly PdfText[])[];
  /**
   * Baseline Y (PDF coords) for each line in `runsByLine`, in the same order.
   *
   * Used to approximate PDF line spacing when emitting PPTX table cell text.
   */
  readonly baselineYsByLine: readonly number[];
  /** Suggested paragraph alignment for this cell */
  readonly alignment: "left" | "center" | "right";
  readonly x0: number;
  readonly x1: number;
};

export type InferredTableRow = {
  readonly baselineY: number;
  readonly y0: number;
  readonly y1: number;
  readonly cells: readonly InferredTableCell[];
};

export type InferredTableColumn = {
  readonly index: number;
  readonly x0: number;
  readonly x1: number;
  readonly xCenter: number;
};

export type InferredTable = {
  readonly bounds: { x: number; y: number; width: number; height: number };
  readonly fontSize: number;
  readonly columns: readonly InferredTableColumn[];
  readonly rows: readonly InferredTableRow[];
};

export type TableInferenceOptions = {
  readonly minRows?: number;
  readonly minCols?: number;
  readonly maxCols?: number;
  readonly minRowCoverage?: number;
  readonly minColumnSupport?: number;
  /**
   * Optional page paths to improve table grid inference.
   *
   * When provided, we try to infer row bands from horizontal rules and
   * column boundaries from vertical rules. This helps merge multi-baseline
   * header cells (e.g. header + parenthetical line) into a single table row.
   */
  readonly paths?: readonly PdfPath[];
};

const DEFAULT_OPTS: Required<TableInferenceOptions> = {
  minRows: 6,
  minCols: 3,
  maxCols: 12,
  minRowCoverage: 0.6,
  minColumnSupport: 0.55,
  paths: [],
};

function median(xs: readonly number[]): number {
  if (xs.length === 0) {return 0;}
  const arr = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) {return arr[mid]!;}
  return (arr[mid - 1]! + arr[mid]!) / 2;
}

function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) {return 0;}
  const arr = [...xs].sort((a, b) => a - b);
  const qq = Math.max(0, Math.min(1, q));
  const pos = (arr.length - 1) * qq;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = arr[base]!;
  const b = arr[base + 1];
  if (b === undefined) {return a;}
  return a + rest * (b - a);
}

function isMeaningfulText(t: string): boolean {
  return t.trim().length > 0;
}

function sortRunsLeftToRight(runs: readonly PdfText[]): PdfText[] {
  return [...runs].sort((a, b) => a.x - b.x);
}

function segmentRunsIntoCells(runs: readonly PdfText[], fontSize: number): PdfText[][] {
  const usable = runs.filter((r) => isMeaningfulText(r.text));
  if (usable.length === 0) {return [];}

  const sorted = sortRunsLeftToRight(usable);

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const prevEnd = prev.x + prev.width;
    const gap = Math.max(0, cur.x - prevEnd);
    gaps.push(gap);
  }

  const q50 = quantile(gaps, 0.5);
  const q90 = quantile(gaps, 0.9);
  const th = (() => {
    const minTh = Math.max(2, fontSize * 0.9);
    if (gaps.length < 4) {return Math.max(4, fontSize * 1.6);}

    // If we have many small (near-zero) intra-token gaps and a few large gaps,
    // treat it as a 2-cluster split and cut in the middle.
    if (q90 > q50 * 3) {return Math.max(minTh, q90 * 0.5);}

    // Otherwise, be more conservative but still allow splitting typical table gaps.
    return Math.max(minTh, fontSize * 1.4, q90 * 0.85);
  })();

  const segments: PdfText[][] = [];
  let curSeg: PdfText[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const gap = cur.x - (prev.x + prev.width);
    if (gap >= th) {
      segments.push(curSeg);
      curSeg = [cur];
      continue;
    }
    curSeg.push(cur);
  }
  segments.push(curSeg);
  return segments;
}

function computeRowBandBounds(rowBaselines: readonly number[], bounds: InferredTable["bounds"]): { y0: number; y1: number }[] {
  if (rowBaselines.length === 0) {return [];}
  const top = bounds.y + bounds.height;
  const bottom = bounds.y;

  // IMPORTANT: `rowBaselines` must be in top-to-bottom order (descending Y in PDF coords).
  // We keep this stable so computed bands match the associated row objects.
  const ys = [...rowBaselines];
  const bands: { y0: number; y1: number }[] = [];

  for (let i = 0; i < ys.length; i++) {
    const y = ys[i]!;
    const prev = ys[i - 1];
    const next = ys[i + 1];
    const yTop = prev !== undefined ? (prev + y) / 2 : top;
    const yBottom = next !== undefined ? (y + next) / 2 : bottom;
    bands.push({
      y0: Math.min(yBottom, yTop),
      y1: Math.max(yBottom, yTop),
    });
  }

  return bands;
}

function assignSegmentToColumn(
  seg: { x0: number; x1: number },
  columns: readonly InferredTableColumn[],
): number {
  const center = (seg.x0 + seg.x1) / 2;
  for (const col of columns) {
    if (col.x0 <= center && center < col.x1) {return col.index;}
  }
  // Fallback: nearest center
  let best = 0;
  let bestD = Infinity;
  for (const col of columns) {
    const d = Math.abs(center - col.xCenter);
    if (d < bestD) {bestD = d; best = col.index;}
  }
  return best;
}

type BBox = { x0: number; y0: number; x1: number; y1: number };

function splitPathIntoSubpaths(ops: readonly PdfPathOp[]): PdfPathOp[][] {
  const out: PdfPathOp[][] = [];
  let cur: PdfPathOp[] = [];
  for (const op of ops) {
    if (op.type === "moveTo") {
      if (cur.length > 0) {out.push(cur);}
      cur = [op];
      continue;
    }
    if (cur.length === 0) {cur = [op];}
    else {cur.push(op);}
  }
  if (cur.length > 0) {out.push(cur);}
  return out;
}

function bboxOfSubpath(sub: readonly PdfPathOp[]): BBox | null {
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

  if (!Number.isFinite(minX)) {return null;}
  return { x0: minX, y0: minY, x1: maxX, y1: maxY };
}

function intersects(a: BBox, b: BBox): boolean {
  return a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
}

function cluster1D(values: readonly number[], eps: number): number[] {
  if (values.length === 0) {return [];}
  const xs = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  let cur: number[] = [];
  for (const x of xs) {
    if (cur.length === 0) {
      cur = [x];
      continue;
    }
    if (Math.abs(x - cur[cur.length - 1]!) <= eps) {
      cur.push(x);
      continue;
    }
    out.push(cur.reduce((s, v) => s + v, 0) / cur.length);
    cur = [x];
  }
  if (cur.length > 0) {out.push(cur.reduce((s, v) => s + v, 0) / cur.length);}
  return out;
}

type TableGridFromPaths = {
  readonly bounds: InferredTable["bounds"];
  /** Column boundaries left-to-right (length = colCount + 1) */
  readonly xBoundaries: readonly number[];
  /** Row boundaries top-to-bottom (length = rowCount + 1, descending) */
  readonly yBoundaries: readonly number[];
};

type TableRuleSegments = {
  readonly hSegs: readonly { y: number; x0: number; x1: number }[];
  readonly vSegs: readonly { x: number; y0: number; y1: number }[];
};

function unionCoverage1DGlobal(
  segments: readonly { x0: number; x1: number }[],
  range0: number,
  range1: number,
): number {
  const xs = segments
    .map((s) => ({ x0: Math.max(range0, Math.min(range1, s.x0)), x1: Math.max(range0, Math.min(range1, s.x1)) }))
    .filter((s) => s.x1 > s.x0)
    .sort((a, b) => a.x0 - b.x0);
  if (xs.length === 0) {return 0;}
  let covered = 0;
  let cur0 = xs[0]!.x0;
  let cur1 = xs[0]!.x1;
  for (let i = 1; i < xs.length; i++) {
    const s = xs[i]!;
    if (s.x0 <= cur1) {
      cur1 = Math.max(cur1, s.x1);
      continue;
    }
    covered += Math.max(0, cur1 - cur0);
    cur0 = s.x0;
    cur1 = s.x1;
  }
  covered += Math.max(0, cur1 - cur0);
  return covered;
}

function collectAxisAlignedRuleSegments(
  paths: readonly PdfPath[],
  approxBounds: InferredTable["bounds"],
  fontSize: number,
): TableRuleSegments {
  const pad = Math.max(2, fontSize * 0.9);
  const region: BBox = {
    x0: approxBounds.x - pad,
    y0: approxBounds.y - pad,
    x1: approxBounds.x + approxBounds.width + pad,
    y1: approxBounds.y + approxBounds.height + pad,
  };

  const horizMaxH = Math.max(0.6, fontSize * 0.18);
  const vertMaxW = Math.max(0.6, fontSize * 0.18);
  // Allow shorter per-cell rules: dense tables may draw separators as short segments,
  // especially inside multi-tier headers.
  const minSegW = Math.max(fontSize * 1.3, approxBounds.width * 0.02, 5);
  const minSegH = Math.max(fontSize * 1.3, approxBounds.height * 0.02, 5);

  type HSeg = { readonly y: number; readonly x0: number; readonly x1: number };
  type VSeg = { readonly x: number; readonly y0: number; readonly y1: number };
  const hSegs: HSeg[] = [];
  const vSegs: VSeg[] = [];

  for (const p of paths) {
    if (p.paintOp === "none" || p.paintOp === "clip") {continue;}
    for (const sub of splitPathIntoSubpaths(p.operations)) {
      const bb = bboxOfSubpath(sub);
      if (!bb) {continue;}
      if (!intersects(bb, region)) {continue;}

      const w = bb.x1 - bb.x0;
      const h = bb.y1 - bb.y0;
      const thickness = Math.min(w, h);
      const span = Math.max(w, h);
      const aspect = span / Math.max(0.1, thickness);
      if (aspect < 12) {continue;}

      if (h <= horizMaxH && w >= minSegW) {
        hSegs.push({ y: (bb.y0 + bb.y1) / 2, x0: bb.x0, x1: bb.x1 });
        continue;
      }
      if (w <= vertMaxW && h >= minSegH) {
        vSegs.push({ x: (bb.x0 + bb.x1) / 2, y0: bb.y0, y1: bb.y1 });
        continue;
      }
    }
  }

  return { hSegs, vSegs };
}

function inferGridFromPaths(
  ...args: [paths: readonly PdfPath[], approxBounds: InferredTable["bounds"], fontSize: number, targetCols: number]
): TableGridFromPaths | null {
  const [paths, approxBounds, fontSize, targetCols] = args;
  if (paths.length === 0) {return null;}

  const pad = Math.max(2, fontSize * 0.9);
  const region: BBox = {
    x0: approxBounds.x - pad,
    y0: approxBounds.y - pad,
    x1: approxBounds.x + approxBounds.width + pad,
    y1: approxBounds.y + approxBounds.height + pad,
  };

  const subBBoxes: BBox[] = [];
  for (const p of paths) {
    if (p.paintOp === "none" || p.paintOp === "clip") {continue;}
    for (const sub of splitPathIntoSubpaths(p.operations)) {
      const bb = bboxOfSubpath(sub);
      if (!bb) {continue;}
      if (!intersects(bb, region)) {continue;}
      subBBoxes.push(bb);
    }
  }
  // We need at least top/bottom borders + one internal rule to infer row bands.
  // Keep this independent from column count so small tables (header + 1 row) still work.
  const minRuleCount = 3;
  const minSubpaths = Math.max(8, (targetCols + 1) * 2);
  if (subBBoxes.length < minSubpaths) {return null;}

  // Estimate table bounds from subpaths intersecting the region.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of subBBoxes) {
    minX = Math.min(minX, b.x0);
    minY = Math.min(minY, b.y0);
    maxX = Math.max(maxX, b.x1);
    maxY = Math.max(maxY, b.y1);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {return null;}

  const approxTableBounds: InferredTable["bounds"] = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

  const horizMaxH = Math.max(0.6, fontSize * 0.18);
  const vertMaxW = Math.max(0.6, fontSize * 0.18);
  const minSpan = Math.max(fontSize * 2.0, Math.min(approxTableBounds.width, approxTableBounds.height) * 0.55);

  type HSeg = { readonly y: number; readonly x0: number; readonly x1: number };
  type VSeg = { readonly x: number; readonly y0: number; readonly y1: number };
  const hSegs: HSeg[] = [];
  const vSegs: VSeg[] = [];

  // Some PDFs draw row/column separators as many short segments (per-cell edges) instead of
  // one long rule. Collect candidate segments with a loose minimum span, then filter by
  // coverage after clustering.
  // Allow narrower per-cell rules (common in dense spec tables) by lowering the minimum
  // segment span threshold.
  const minSegW = Math.max(fontSize * 1.3, approxTableBounds.width * 0.02, 5);
  const minSegH = Math.max(fontSize * 1.3, approxTableBounds.height * 0.02, 5);

  for (const b of subBBoxes) {
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const thickness = Math.min(w, h);
    const span = Math.max(w, h);
    const aspect = span / Math.max(0.1, thickness);
    if (aspect < 12) {continue;}

    if (h <= horizMaxH && w >= minSegW) {
      hSegs.push({ y: (b.y0 + b.y1) / 2, x0: b.x0, x1: b.x1 });
      continue;
    }
    if (w <= vertMaxW && h >= minSegH) {
      vSegs.push({ x: (b.x0 + b.x1) / 2, y0: b.y0, y1: b.y1 });
      continue;
    }
  }

  const unionCoverage1D = (segments: readonly { x0: number; x1: number }[], range0: number, range1: number): number => {
    const xs = segments
      .map((s) => ({ x0: Math.max(range0, Math.min(range1, s.x0)), x1: Math.max(range0, Math.min(range1, s.x1)) }))
      .filter((s) => s.x1 > s.x0)
      .sort((a, b) => a.x0 - b.x0);
    if (xs.length === 0) {return 0;}
    let covered = 0;
    let cur0 = xs[0]!.x0;
    let cur1 = xs[0]!.x1;
    for (let i = 1; i < xs.length; i++) {
      const s = xs[i]!;
      if (s.x0 <= cur1) {
        cur1 = Math.max(cur1, s.x1);
        continue;
      }
      covered += Math.max(0, cur1 - cur0);
      cur0 = s.x0;
      cur1 = s.x1;
    }
    covered += Math.max(0, cur1 - cur0);
    return covered;
  };

  const clusterTol = Math.max(0.5, fontSize * 0.12);
  const coverageH = Math.max(1, approxTableBounds.height);
  const coverageRatioTh = 0.55;

  const horizontalCenters = hSegs.map((s) => s.y);
  const verticalCenters = vSegs.map((s) => s.x);

  const xLinesBySegments = (() => {
    // Require enough vertical segments to stand a chance at finding boundaries.
    if (verticalCenters.length < targetCols + 1) {return [] as number[];}
    const centers = cluster1D(verticalCenters, Math.max(0.8, fontSize * 0.85)).sort((a, b) => a - b);
    const accepted: number[] = [];
    for (const xc of centers) {
      const segs = vSegs.filter((s) => Math.abs(s.x - xc) <= Math.max(0.8, fontSize * 0.85) * 1.2);
      const cov = unionCoverage1D(
        segs.map((s) => ({ x0: s.y0, x1: s.y1 })),
        approxTableBounds.y,
        approxTableBounds.y + approxTableBounds.height,
      );
      if (cov / coverageH >= 0.45) {
        accepted.push(xc);
      }
    }
    return accepted.sort((a, b) => a - b);
  })();

  const targetBoundaryCount = targetCols + 1;
  const baseEps = Math.max(0.35, fontSize * 0.12);

  const verticalCentersForRules: number[] = [];
  if (xLinesBySegments.length >= targetCols + 1) {
    verticalCentersForRules.push(...xLinesBySegments);
  } else {
    for (const b of subBBoxes) {
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      if (w <= vertMaxW && h >= minSpan) {
        verticalCentersForRules.push((b.x0 + b.x1) / 2);
      }
    }
  }

  const xBoundariesForCoverage = (() => {
    if (verticalCentersForRules.length < targetBoundaryCount) {return null;}
    const candidates = [approxTableBounds.x, ...verticalCentersForRules, approxTableBounds.x + approxTableBounds.width];
    let merged = cluster1D(candidates, baseEps).sort((a, b) => a - b);
    if (merged.length > targetBoundaryCount) {
      const factors = [1.25, 1.6, 2.0, 2.6, 3.2];
      for (const f of factors) {
        merged = cluster1D(candidates, baseEps * f).sort((a, b) => a - b);
        if (merged.length <= targetBoundaryCount) {break;}
      }
    }
      return merged.length === targetBoundaryCount ? merged : null;
  })();

  const acceptHorizontalRule = (yc: number): boolean => {
    const segs = hSegs.filter((s) => Math.abs(s.y - yc) <= clusterTol * 1.2);
    if (segs.length === 0) {return false;}

    const x0 = xBoundariesForCoverage?.[0] ?? approxTableBounds.x;
    const x1 = xBoundariesForCoverage?.[xBoundariesForCoverage.length - 1] ?? (approxTableBounds.x + approxTableBounds.width);
    const cov = unionCoverage1D(segs, x0, x1);
    if (cov / Math.max(1, x1 - x0) >= coverageRatioTh) {return true;}

    // Partial-width rules (e.g. multi-tier headers) are common: accept when the rule spans
    // multiple adjacent columns (not just a single cell underline).
    if (!xBoundariesForCoverage) {return false;}

    const present: boolean[] = [];
    for (let i = 0; i < xBoundariesForCoverage.length - 1; i++) {
      const s0 = xBoundariesForCoverage[i]!;
      const s1 = xBoundariesForCoverage[i + 1]!;
      const segW = Math.max(1e-6, s1 - s0);
      const segCov = unionCoverage1D(segs, s0, s1);
      present.push(segCov / segW >= 0.55);
    }

    let bestRunLen = 0;
    let bestRunWidth = 0;
    let curLen = 0;
    let curWidth = 0;
    for (let i = 0; i < present.length; i++) {
      if (present[i]!) {
        curLen += 1;
        curWidth += xBoundariesForCoverage[i + 1]! - xBoundariesForCoverage[i]!;
      } else {
        if (curLen > bestRunLen) {
          bestRunLen = curLen;
          bestRunWidth = curWidth;
        }
        curLen = 0;
        curWidth = 0;
      }
    }
    if (curLen > bestRunLen) {
      bestRunLen = curLen;
      bestRunWidth = curWidth;
    }

    const tableW = Math.max(1e-6, x1 - x0);
    // Accept shorter partial rules when they span several adjacent columns.
    // (E.g. "Web-API" sub-header separators that only exist above ver1..ver4.)
    return bestRunLen >= Math.max(3, Math.floor(targetCols * 0.2)) && (bestRunWidth / tableW) >= 0.08;
  };

  const yLinesBySegments = (() => {
    if (horizontalCenters.length < minRuleCount) {return [] as number[];}
    const centers = cluster1D(horizontalCenters, clusterTol).sort((a, b) => b - a);
    const accepted: number[] = [];
    for (const yc of centers) {
      if (acceptHorizontalRule(yc)) {
        accepted.push(yc);
      }
    }
    return accepted.sort((a, b) => b - a);
  })();

  const horizontalCentersForRules: number[] = [];
  if (yLinesBySegments.length >= minRuleCount) {
    horizontalCentersForRules.push(...yLinesBySegments);
  } else {
    // Fallback to long-span rules (previous behavior).
    for (const b of subBBoxes) {
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      if (h <= horizMaxH && w >= minSpan) {
        horizontalCentersForRules.push((b.y0 + b.y1) / 2);
      }
    }
  }

  // Need enough horizontal rules to infer row bands (allow small tables).
  if (horizontalCentersForRules.length < minRuleCount) {return null;}

  const yLines = cluster1D(horizontalCentersForRules, clusterTol).sort((a, b) => b - a);
  if (yLines.length < minRuleCount) {return null;}

  const yDiffs0 = yLines.slice(1).map((y, i) => yLines[i]! - y);
  const typicalRowGap0 = median(yDiffs0.filter((d) => d > 0)) || fontSize * 1.4;
  if (!(typicalRowGap0 > 0)) {return null;}

  // Merge near-duplicate rule centers (double rules, or thick rules represented as multiple close subpaths).
  // These can create spurious ultra-thin rows in the inferred grid (e.g. k-resource tables).
  const mergeCloseLines = (lines: readonly number[], minGap: number): number[] => {
    const sorted = [...lines].sort((a, b) => b - a);
    if (sorted.length === 0) {return [];}
    const out: number[] = [sorted[0]!];
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i]!;
      const prev = out[out.length - 1]!;
      const gap = prev - cur;
      if (gap >= 0 && gap < minGap) {
        // Replace the previous boundary with an averaged one (keeps list length stable).
        out[out.length - 1] = (prev + cur) / 2;
        continue;
      }
      out.push(cur);
    }
    return out;
  };

  // Merge "double rules" / thick rules that appear as multiple close subpaths, but avoid
  // collapsing legitimately short header rows (common in dense spec tables).
  const minGap = Math.max(fontSize * 0.35, typicalRowGap0 * 0.12);
  const yLinesMerged = mergeCloseLines(yLines, minGap);
  const yDiffs = yLinesMerged.slice(1).map((y, i) => yLinesMerged[i]! - y);
  const typicalRowGap = median(yDiffs.filter((d) => d > 0)) || typicalRowGap0;
  if (!(typicalRowGap > 0)) {return null;}

  // Prefer using rule centers as boundaries. Using subpath bbox edges causes
  // systematic half-thickness shifts when the grid is drawn as filled rectangles.
  let yBoundaries = [...yLinesMerged].sort((a, b) => b - a);
  // Fallback to approximate bounds if outer borders were not detected as rule centers.
  const approxTop = approxTableBounds.y + approxTableBounds.height;
  const approxBottom = approxTableBounds.y;
  if (yBoundaries.length >= 2) {
    const top = yBoundaries[0]!;
    const bottom = yBoundaries[yBoundaries.length - 1]!;
    const edgeTol = typicalRowGap * 0.35;
    if (Math.abs(approxTop - top) > edgeTol) {yBoundaries = [approxTop, ...yBoundaries].sort((a, b) => b - a);}
    if (Math.abs(bottom - approxBottom) > edgeTol) {yBoundaries = [...yBoundaries, approxBottom].sort((a, b) => b - a);}
  }

  // Column boundaries: prefer rule centers; only fall back to approximate bounds when the
  // detected vertical rules are insufficient to infer the expected grid.
  let xCandidates = [...verticalCentersForRules];

  // Vertical rules can be drawn as double-lines (two close rules). The initial clustering can
  // leave those as separate boundaries, causing xMerged.length > targetCols+1. When that happens,
  // progressively relax the clustering epsilon to merge near-duplicates.
  let xMerged = cluster1D(xCandidates, baseEps).sort((a, b) => a - b);
  if (xMerged.length > targetBoundaryCount) {
    const factors = [1.25, 1.6, 2.0, 2.6, 3.2];
    for (const f of factors) {
      xMerged = cluster1D(xCandidates, baseEps * f).sort((a, b) => a - b);
      if (xMerged.length <= targetBoundaryCount) {break;}
    }
  }

  if (xMerged.length !== targetBoundaryCount) {
    xCandidates = [approxTableBounds.x, ...verticalCentersForRules, approxTableBounds.x + approxTableBounds.width];
    xMerged = cluster1D(xCandidates, baseEps).sort((a, b) => a - b);
    if (xMerged.length > targetBoundaryCount) {
      const factors = [1.25, 1.6, 2.0, 2.6, 3.2];
      for (const f of factors) {
        xMerged = cluster1D(xCandidates, baseEps * f).sort((a, b) => a - b);
        if (xMerged.length <= targetBoundaryCount) {break;}
      }
    }
  }

  // We expect exactly targetCols+1 boundaries for a proper grid; otherwise fall back.
  if (xMerged.length !== targetBoundaryCount) {return null;}

  const tableLeft = xMerged[0]!;
  const tableRight = xMerged[xMerged.length - 1]!;
  const tableTop = yBoundaries[0]!;
  const tableBottom = yBoundaries[yBoundaries.length - 1]!;
  const bounds: InferredTable["bounds"] = {
    x: tableLeft,
    y: Math.min(tableBottom, tableTop),
    width: Math.abs(tableRight - tableLeft),
    height: Math.abs(tableTop - tableBottom),
  };

  return { bounds, xBoundaries: xMerged, yBoundaries };
}

function resolveCellAlignment(
  seg: { x0: number; x1: number },
  col: InferredTableColumn,
  fontSize: number,
): "left" | "center" | "right" {
  const left = Math.max(0, seg.x0 - col.x0);
  const right = Math.max(0, col.x1 - seg.x1);

  // Strong signal for centering: both sides have similar slack.
  const minSlack = Math.min(left, right);
  const maxSlack = Math.max(left, right);
  if (minSlack > fontSize * 0.15 && maxSlack > 0 && minSlack / maxSlack >= 0.75) {
    return "center";
  }

  if (left <= fontSize * 0.2 && right > left * 1.5) {return "left";}
  if (right <= fontSize * 0.2 && left > right * 1.5) {return "right";}
  return "left";
}











export function inferTableFromGroupedText(group: GroupedText, options: TableInferenceOptions = {}): InferredTable | null {
  const opts: Required<Omit<TableInferenceOptions, "paths">> & Pick<TableInferenceOptions, "paths"> = {
    ...DEFAULT_OPTS,
    ...options,
  };

  if (group.paragraphs.length < opts.minRows) {return null;}

  // NOTE: GroupedText.paragraphs are physical lines (or line fragments). For tables,
  // a single visual row can contain multiple baselines (e.g. romaji + kanji). We must
  // not concatenate multiple baselines into a single run list before horizontal
  // segmentation, otherwise multi-line cell content gets misinterpreted as extra columns.
  const paragraphs = group.paragraphs.filter((p) => p.runs.some((r) => isMeaningfulText(r.text)));
  if (paragraphs.length < opts.minRows) {return null;}

  const allRuns = paragraphs.flatMap((p) => p.runs);
  const fontSize = median(allRuns.map((r) => r.fontSize ?? 0).filter((x) => x > 0)) || 12;
  let grid: TableGridFromPaths | null = null;
  let effectiveBounds: InferredTable["bounds"] = group.bounds;
  let boundsX0 = effectiveBounds.x;
  let boundsX1 = effectiveBounds.x + effectiveBounds.width;
  let predefinedBoundaries: number[] | null = null;

  type Segment = { runs: PdfText[]; x0: number; x1: number };
  type LineSeg = { paragraph: (typeof paragraphs)[number]; segments: Segment[] };

  const lineSegs: LineSeg[] = paragraphs.map((p) => {
    const segments = segmentRunsIntoCells(p.runs, fontSize).map((segRuns) => ({
      runs: sortRunsLeftToRight(segRuns),
      x0: Math.min(...segRuns.map((x) => x.x)),
      x1: Math.max(...segRuns.map((x) => x.x + x.width)),
    })).sort((a, b) => a.x0 - b.x0);
    return { paragraph: p, segments };
  });

  // Determine column count from the most "complete" header-like line. Data rows often have
  // empty columns (e.g. reference column), so mode(segmentCount) is not reliable.
  const candidateCounts = lineSegs
    .map((l) => l.segments.length)
    .filter((n) => n >= opts.minCols);
  let targetCols: number | null = null;

  // Fallback: when every physical line belongs to a single column (row spans or aggressive grouping),
  // we might never observe a line with >= minCols segments. In that case, try to infer the grid
  // (and therefore the column count) from page paths.
  if (candidateCounts.length === 0) {
    if (opts.paths && opts.paths.length > 0) {
      // Try to infer column count from grid lines when text segmentation is too sparse
      // (common for multi-level headers / merged cells).
      //
      // Keep an upper cap for safety, but allow larger tables (k-resource) to work.
      const maxTry = Math.min(opts.maxCols, 20);
      for (let cols = opts.minCols; cols <= maxTry; cols++) {
        const g = inferGridFromPaths(opts.paths, group.bounds, fontSize, cols);
        if (g) {
          grid = g;
          targetCols = cols;
          break;
        }
      }
    }
    // If no grid is detected, fall back to a global x-gap split for simple 2-column tables.
    if (targetCols == null && opts.minCols === 2) {
      const centers = lineSegs
        .flatMap((l) => l.segments.map((s) => (s.x0 + s.x1) / 2))
        .filter((x) => Number.isFinite(x))
        .sort((a, b) => a - b);
      if (centers.length >= Math.max(6, opts.minRows * 2)) {
        let bestGap = -Infinity;
        let bestIdx = -1;
        for (let i = 1; i < centers.length; i++) {
          const gap = centers[i]! - centers[i - 1]!;
          if (gap > bestGap) {
            bestGap = gap;
            bestIdx = i;
          }
        }

        // Require a clear separation between the two x-clusters.
        if (bestIdx > 0 && bestGap >= fontSize * 4.0) {
          const leftCount = bestIdx;
          const rightCount = centers.length - bestIdx;
          const minSide = Math.max(4, Math.floor(centers.length * 0.08));
          if (leftCount >= minSide && rightCount >= minSide) {
            targetCols = 2;
            const boundary = (centers[bestIdx - 1]! + centers[bestIdx]!) / 2;
            predefinedBoundaries = [boundsX0, boundary, boundsX1];
          }
        }
      }
    }
    if (targetCols == null) {return null;}
  } else {
    targetCols = Math.min(opts.maxCols, Math.max(...candidateCounts));
  }

  if (targetCols < opts.minCols) {return null;}

  // Now that we know the expected column count, try to infer a grid from page paths.
  grid = grid ?? (opts.paths ? inferGridFromPaths(opts.paths, group.bounds, fontSize, targetCols) : null);
  effectiveBounds = grid?.bounds ?? group.bounds;
  boundsX0 = effectiveBounds.x;
  boundsX1 = effectiveBounds.x + effectiveBounds.width;
  if (predefinedBoundaries) {
    predefinedBoundaries = [boundsX0, predefinedBoundaries[1]!, boundsX1];
  }

  // Prefer header-like lines when inferring boundaries. Data rows can accidentally hit the same
  // segment count due to intra-cell splits (e.g. "zenkoku" + "全国" inside a single name cell).
  const sortedLines = [...lineSegs].sort((a, b) => b.paragraph.baselineY - a.paragraph.baselineY);
  const isHeaderish = (l: LineSeg): boolean => {
    // Heuristic: header lines often contain Japanese labels like "都道府県" or "参考" (参/考).
    return l.paragraph.runs.some((r) => r.text === "参" || r.text === "考" || r.text === "都");
  };

  const headerishLines = sortedLines.filter(isHeaderish).filter((l) => l.segments.length === targetCols);

  const topWindow = Math.max(1, Math.floor(sortedLines.length * 0.25));
  let trainingLines = sortedLines.slice(0, topWindow).filter((l) => l.segments.length === targetCols);
  if (headerishLines.length > 0) {
    trainingLines = headerishLines;
  }

  if (trainingLines.length === 0) {trainingLines = lineSegs.filter((l) => l.segments.length === targetCols);}
  // If we have grid-inferred x-boundaries, we can continue without training lines.
  if (
    trainingLines.length === 0 &&
    !predefinedBoundaries &&
    !(grid?.xBoundaries && grid.xBoundaries.length === targetCols + 1)
  ) {return null;}

  const computeGapCenter = (a: Segment, b: Segment): number => (a.x1 + b.x0) / 2;

  // Column boundary inference:
  // - Generic: boundary[i] = median gap center between segment i and i+1 in header-like lines.
  // - Special-case: 3 columns × 2 blocks (6 columns total) with empty "reference" columns in data rows
  //   (k-namingrule-dl.pdf): infer the block gutter first, then fit code/name/ref boundaries per block.
  const boundaries: number[] = (() => {
    if (predefinedBoundaries) {
      return [...predefinedBoundaries];
    }
    if (grid?.xBoundaries && grid.xBoundaries.length === targetCols + 1) {
      return [...grid.xBoundaries];
    }
    if (targetCols !== 6) {
      const boundarySamples: number[][] = Array.from({ length: Math.max(0, targetCols - 1) }, () => []);
      for (const line of trainingLines) {
        const segs = line.segments;
        for (let i = 1; i < segs.length; i++) {
          boundarySamples[i - 1]!.push(computeGapCenter(segs[i - 1]!, segs[i]!));
        }
      }

      const out: number[] = [boundsX0];
      for (let i = 0; i < boundarySamples.length; i++) {
        const xs = boundarySamples[i]!;
        out.push(xs.length > 0 ? median(xs) : out[out.length - 1]! + 0.01);
      }
      out.push(boundsX1);
      return out;
    }

    // 6-col special-case: detect the largest, consistent gap = center gutter between 2 blocks.
    const gutterCenters: number[] = [];
    const gutterIdxCounts = new Map<number, number>();
    for (const line of trainingLines) {
      const segs = line.segments;
      let bestIdx = 0;
      let bestGap = -Infinity;
      for (let i = 0; i < segs.length - 1; i++) {
        const gap = segs[i + 1]!.x0 - segs[i]!.x1;
        if (gap > bestGap) {bestGap = gap; bestIdx = i;}
      }
      gutterIdxCounts.set(bestIdx, (gutterIdxCounts.get(bestIdx) ?? 0) + 1);
      gutterCenters.push(computeGapCenter(segs[bestIdx]!, segs[bestIdx + 1]!));
    }

    // If the split isn't stable, fall back to generic boundaries.
    const bestGutterIdx = [...gutterIdxCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2;
    const stableSplit = (gutterIdxCounts.get(bestGutterIdx) ?? 0) / Math.max(1, trainingLines.length) >= 0.6;
    if (!stableSplit) {
      const boundarySamples: number[][] = Array.from({ length: 5 }, () => []);
      for (const line of trainingLines) {
        const segs = line.segments;
        for (let i = 1; i < segs.length; i++) {
          boundarySamples[i - 1]!.push(computeGapCenter(segs[i - 1]!, segs[i]!));
        }
      }
      const out = [boundsX0, ...boundarySamples.map((xs) => (xs.length > 0 ? median(xs) : boundsX0)), boundsX1];
      return out;
    }

    const blockSplitX = median(gutterCenters);

    const refCenterLeft = median(trainingLines.map((l) => {
      const s = l.segments[2]!;
      return (s.x0 + s.x1) / 2;
    }));
    const refCenterRight = median(trainingLines.map((l) => {
      const s = l.segments[5]!;
      return (s.x0 + s.x1) / 2;
    }));

    // code/name boundary per block: gap between the first and second segments in that block
    const leftCodeName: number[] = [];
    const rightCodeName: number[] = [];

    // name right edge per block when "reference" column is empty (2 segments only in that block)
    const leftNameRight: number[] = [];
    const rightNameRight: number[] = [];

    for (const line of lineSegs) {
      const segs = line.segments;
      const left = segs.filter((s) => s.x0 < blockSplitX).sort((a, b) => a.x0 - b.x0);
      const right = segs.filter((s) => s.x0 >= blockSplitX).sort((a, b) => a.x0 - b.x0);

      if (left.length >= 2) {
        leftCodeName.push(computeGapCenter(left[0]!, left[1]!));
      }
      if (right.length >= 2) {
        rightCodeName.push(computeGapCenter(right[0]!, right[1]!));
      }

      // When the reference column is empty, the last visible segment in the block is the name cell.
      // This can be either 2 segments (code + name/romaji) or 1 segment (name/kanji line only).
      if (left.length === 1 || left.length === 2) {
        leftNameRight.push(left[left.length - 1]!.x1);
      } else if (left.length === 3) {
        // Some rows split a single "name" cell into 2 segments (e.g. romaji + kanji on the same baseline).
        // Distinguish it from an actual reference column by comparing against the reference header center.
        const last = left[2]!;
        const c = (last.x0 + last.x1) / 2;
        if (c < refCenterLeft - fontSize * 0.25) {
          leftNameRight.push(last.x1);
        }
      }

      if (right.length === 1 || right.length === 2) {
        rightNameRight.push(right[right.length - 1]!.x1);
      } else if (right.length === 3) {
        const last = right[2]!;
        const c = (last.x0 + last.x1) / 2;
        if (c < refCenterRight - fontSize * 0.25) {
          rightNameRight.push(last.x1);
        }
      }
    }

    const leftCodeNameBoundary = leftCodeName.length > 0 ? median(leftCodeName) : boundsX0 + (blockSplitX - boundsX0) * 0.3;
    const rightCodeNameBoundary = rightCodeName.length > 0 ? median(rightCodeName) : blockSplitX + (boundsX1 - blockSplitX) * 0.3;

    // name/ref boundary per block: use header gap but ensure it stays right of actual name extents in data rows.
    const leftNameRefSamples: number[] = [];
    const rightNameRefSamples: number[] = [];
    for (const line of trainingLines) {
      const segs = line.segments;
      leftNameRefSamples.push(computeGapCenter(segs[1]!, segs[2]!));
      rightNameRefSamples.push(computeGapCenter(segs[4]!, segs[5]!));
    }

    let leftNameRefFromHeader = leftCodeNameBoundary + (blockSplitX - leftCodeNameBoundary) * 0.8;
    if (leftNameRefSamples.length > 0) {
      leftNameRefFromHeader = median(leftNameRefSamples);
    }

    let rightNameRefFromHeader = rightCodeNameBoundary + (boundsX1 - rightCodeNameBoundary) * 0.8;
    if (rightNameRefSamples.length > 0) {
      rightNameRefFromHeader = median(rightNameRefSamples);
    }

    const leftNameRightQ90 = leftNameRight.length > 0 ? quantile(leftNameRight, 0.9) : leftNameRefFromHeader;
    const rightNameRightQ90 = rightNameRight.length > 0 ? quantile(rightNameRight, 0.9) : rightNameRefFromHeader;

    const leftNameRefBoundary = Math.min(
      blockSplitX - fontSize * 0.2,
      Math.max(leftNameRefFromHeader, leftNameRightQ90 + fontSize * 0.2),
    );

    const rightNameRefBoundary = Math.min(
      boundsX1 - fontSize * 0.2,
      Math.max(rightNameRefFromHeader, rightNameRightQ90 + fontSize * 0.2),
    );

    return [
      boundsX0,
      leftCodeNameBoundary,
      leftNameRefBoundary,
      blockSplitX,
      rightCodeNameBoundary,
      rightNameRefBoundary,
      boundsX1,
    ];
  })();

  // Ensure monotonic boundaries
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i]! <= boundaries[i - 1]! + 0.01) {
      boundaries[i] = boundaries[i - 1]! + 0.01;
    }
  }

  // Prefer grid-inferred x-boundaries when available and compatible.
  if (grid?.xBoundaries && grid.xBoundaries.length === targetCols + 1) {
    boundaries.length = 0;
    for (const x of grid.xBoundaries) {boundaries.push(x);}
  }

  const columns: InferredTableColumn[] = [];
  for (let i = 0; i < targetCols; i++) {
    const x0 = Math.max(boundsX0, Math.min(boundsX1, boundaries[i]!));
    const x1 = Math.max(boundsX0, Math.min(boundsX1, boundaries[i + 1]!));
    columns.push({
      index: i,
      x0,
      x1,
      xCenter: (x0 + x1) / 2,
    });
  }

  // Grid-based row inference (when we have horizontal rules)
  if (grid?.yBoundaries && grid.yBoundaries.length >= 3) {
    const yBounds0 = [...grid.yBoundaries].sort((a, b) => b - a);
    const baselineEps = Math.max(0.5, fontSize * 0.25);

    // Some tables have multi-tier headers where a narrow region (e.g. "Web-API") sits above
    // per-column labels without a full-width horizontal rule. When the PDF draws that separator
    // only across a subset of columns, the path-based grid can miss it and collapse tiers into
    // a single row. Refine the top row bands using text baselines as a secondary signal.
    const refineRowBoundsByBaselines = (bounds: readonly number[]): number[] => {
      const out = [...bounds].sort((a, b) => b - a);
      const maxInserts = 2;
      let inserted = 0;

      const minColsStrong = Math.max(3, Math.round(targetCols * 0.25));

      const clusterBandBaselines = (ys: readonly number[]): number[] => {
        const sorted = [...ys].sort((a, b) => b - a);
        const centers: number[] = [];
        let cur: number[] = [];
        const flush = () => {
          if (cur.length === 0) {return;}
          centers.push(median(cur));
          cur = [];
        };
        for (const y of sorted) {
          if (cur.length === 0) {
            cur.push(y);
            continue;
          }
          const ref = cur[0]!;
          if (Math.abs(y - ref) <= baselineEps) {
            cur.push(y);
            continue;
          }
          flush();
          cur.push(y);
        }
        flush();
        return centers.sort((a, b) => b - a);
      };

      for (let ri = 0; ri < out.length - 1 && inserted < maxInserts; ri++) {
        const yTop = out[ri]!;
        const yBottom = out[ri + 1]!;
        const bandH = yTop - yBottom;
        if (!(bandH > fontSize * 1.6)) {continue;}

        const bandParas = paragraphs.filter((p) => p.baselineY <= yTop && p.baselineY >= yBottom);
        if (bandParas.length < 3) {continue;}

        const centers = clusterBandBaselines(bandParas.map((p) => p.baselineY));
        if (centers.length !== 2) {continue;}

        const [c0, c1] = centers;
        const gap = c0! - c1!;
        if (!(gap > fontSize * 0.85)) {continue;}

        const colsForCenter = (center: number): number => {
          const used = new Set<number>();
          for (const p of bandParas) {
            if (Math.abs(p.baselineY - center) > baselineEps) {continue;}
            for (const run of p.runs) {
              if (!isMeaningfulText(run.text)) {continue;}
              const x0 = run.x;
              const x1 = run.x + run.width;
              const colStart = assignSegmentToColumn({ x0, x1 }, columns);
              used.add(colStart);
            }
          }
          return used.size;
        };

        const strong0 = colsForCenter(c0!) >= minColsStrong;
        const strong1 = colsForCenter(c1!) >= minColsStrong;
        if (!strong0 || !strong1) {continue;}

        const splitY = (c0! + c1!) / 2;
        const margin = Math.max(0.5, fontSize * 0.35);
        if (!(yTop - splitY > margin && splitY - yBottom > margin)) {continue;}

        out.splice(ri + 1, 0, splitY);
        inserted += 1;
        ri -= 1; // re-check the newly created bands
      }

      return out.sort((a, b) => b - a);
    };

    const yBounds = refineRowBoundsByBaselines(yBounds0);
    const rowCount = yBounds.length - 1;

    type CellAcc = {
      byBaseline: Map<number, PdfText[]>;
      x0: number;
      x1: number;
    };

    const findOrCreateBaselineKey = (mp: Map<number, PdfText[]>, baselineY: number): number => {
      for (const k of mp.keys()) {
        if (Math.abs(k - baselineY) <= baselineEps) {return k;}
      }
      mp.set(baselineY, []);
      return baselineY;
    };

    const rowsAcc: Array<Map<number, CellAcc>> = Array.from({ length: rowCount }, () => new Map());
    const rowBaselines: number[] = new Array(rowCount).fill(0);

    const findRowIndex = (baselineY: number): number | null => {
      // Prefer strict containment first to avoid mis-assigning baselines that sit just below
      // a horizontal rule (common in small tables).
      for (let i = 0; i < rowCount; i++) {
        const yTop = yBounds[i]!;
        const yBottom = yBounds[i + 1]!;
        if (baselineY <= yTop && baselineY >= yBottom) {return i;}
      }
      let best: { idx: number; dist: number } | null = null;
      for (let i = 0; i < rowCount; i++) {
        const yTop = yBounds[i]!;
        const yBottom = yBounds[i + 1]!;
        if (baselineY > yTop + baselineEps) {continue;}
        if (baselineY < yBottom - baselineEps) {continue;}
        const center = (yTop + yBottom) / 2;
        const dist = Math.abs(baselineY - center);
        if (!best || dist < best.dist) {best = { idx: i, dist };}
      }
      if (best) {return best.idx;}
      return null;
    };

    for (const p of paragraphs) {
      const ri = findRowIndex(p.baselineY);
      if (ri == null) {continue;}
      rowBaselines[ri] = Math.max(rowBaselines[ri] ?? 0, p.baselineY);

      // When we have a grid, prefer assigning runs directly by column boundaries rather than
      // relying on gap-based segmentation. Header labels can sit close and get merged into one
      // segment even though a vertical rule separates the columns.
      for (const run of p.runs) {
        if (!isMeaningfulText(run.text)) {continue;}
        const x0 = run.x;
        const x1 = run.x + run.width;
        const colStart = assignSegmentToColumn({ x0, x1 }, columns);
        const rowMap = rowsAcc[ri]!;
        const prev = rowMap.get(colStart);
        const acc = prev ?? { byBaseline: new Map<number, PdfText[]>(), x0, x1 };

        const key = findOrCreateBaselineKey(acc.byBaseline, p.baselineY);
        const arr = acc.byBaseline.get(key)!;
        arr.push(run);
        acc.x0 = Math.min(acc.x0, x0);
        acc.x1 = Math.max(acc.x1, x1);
        rowMap.set(colStart, acc);
      }
    }

    const colHasText: boolean[][] = Array.from({ length: rowCount }, () => Array.from({ length: targetCols }, () => false));
    for (let ri = 0; ri < rowCount; ri++) {
      const rowMap = rowsAcc[ri]!;
      for (const [ci, acc] of rowMap.entries()) {
        let has = false;
        for (const runs of acc.byBaseline.values()) {
          if (runs.some((r) => isMeaningfulText(r.text))) {
            has = true;
            break;
          }
        }
        if (has && ci >= 0 && ci < targetCols) {
          colHasText[ri]![ci] = true;
        }
      }
    }
    const rowFilledCount = colHasText.map((row) => row.filter(Boolean).length);

    // Infer merged cells (rowSpan/colSpan) from missing grid rules in specific row/col bands.
    // This is crucial for multi-level headers (e.g. k-resource tables).
    const xBounds = columns.length > 0 ? [columns[0]!.x0, ...columns.map((c) => c.x1)] : [];
    if (xBounds.length !== targetCols + 1) {
      const rows: InferredTableRow[] = [];
      for (let ri = 0; ri < rowCount; ri++) {
        const yTop = yBounds[ri]!;
        const yBottom = yBounds[ri + 1]!;
        const rowMap = rowsAcc[ri]!;
        const cells: InferredTableCell[] = [...rowMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([colStart, acc]) => {
            const col = columns[colStart]!;
            const alignment = resolveCellAlignment({ x0: acc.x0, x1: acc.x1 }, col, fontSize);
            const baselines = [...acc.byBaseline.keys()].sort((a, b) => b - a);
            const runsByLine = baselines.map((by) => sortRunsLeftToRight(acc.byBaseline.get(by)!));
            return {
              colStart,
              colSpan: 1,
              rowSpan: 1,
              baselineY: rowBaselines[ri] ?? (yTop + yBottom) / 2,
              runsByLine,
              baselineYsByLine: baselines,
              alignment,
              x0: acc.x0,
              x1: acc.x1,
            };
          });
        rows.push({ baselineY: rowBaselines[ri] ?? (yTop + yBottom) / 2, y0: yBottom, y1: yTop, cells });
      }
      return { bounds: effectiveBounds, fontSize, columns, rows };
    }

    const { hSegs, vSegs } = collectAxisAlignedRuleSegments(opts.paths ?? [], grid.bounds, fontSize);
    const tol = Math.max(0.8, fontSize * 0.85) * 1.2;

    const nearestIndexLocal = (xs: readonly number[], value: number): { index: number; dist: number } => {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < xs.length; i++) {
        const d = Math.abs(xs[i]! - value);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      return { index: bestIdx, dist: bestDist };
    };

    const vBuckets: Array<Array<(typeof vSegs)[number]>> = Array.from({ length: xBounds.length }, () => []);
    for (const s of vSegs) {
      const { index, dist } = nearestIndexLocal(xBounds, s.x);
      if (dist <= tol) {vBuckets[index]!.push(s);}
    }

    const hBuckets: Array<Array<(typeof hSegs)[number]>> = Array.from({ length: yBounds.length }, () => []);
    for (const s of hSegs) {
      const { index, dist } = nearestIndexLocal(yBounds, s.y);
      if (dist <= tol) {hBuckets[index]!.push(s);}
    }

    const vBoundaryPresent: boolean[][] = Array.from({ length: rowCount }, () => Array.from({ length: targetCols + 1 }, () => false));
    for (let ri = 0; ri < rowCount; ri++) {
      vBoundaryPresent[ri]![0] = true;
      vBoundaryPresent[ri]![targetCols] = true;
      const yTop = yBounds[ri]!;
      const yBottom = yBounds[ri + 1]!;
      // The grid bounds use rule *centers* as boundaries. Vertical rules usually terminate
      // at the *edges* of the horizontal rules, so measuring coverage across the full band
      // underestimates presence (especially for short header tiers). Use a slightly inset
      // interior band for coverage checks.
      const bandH0 = Math.max(1e-6, yTop - yBottom);
      const inset = Math.min(fontSize * 0.35, bandH0 * 0.18);
      const bandY0 = yBottom + inset;
      const bandY1 = yTop - inset;
      const bandH = Math.max(1e-6, bandY1 - bandY0);
      for (let bi = 1; bi < targetCols; bi++) {
        const segs = vBuckets[bi] ?? [];
        if (segs.length === 0) {
          // No evidence of a boundary at all: treat it as present to avoid accidental over-merging.
          vBoundaryPresent[ri]![bi] = true;
          continue;
        }
        const cov = unionCoverage1DGlobal(
          segs.map((x) => ({ x0: x.y0, x1: x.y1 })),
          bandY0,
          bandY1,
        );
        // Be conservative: treat a boundary as present unless it's clearly missing.
        // Short header tiers often have slightly shortened rules that would otherwise be
        // misread as "missing" and cause incorrect horizontal merges (e.g. ver1..ver4).
        vBoundaryPresent[ri]![bi] = cov / bandH >= 0.30;
      }
    }
    // Data rows should not use inferred colSpan merging; missing boundary evidence there is usually
    // due to sparse path extraction, and merging would destroy the table layout.
    for (let ri = 0; ri < rowCount; ri++) {
      if (rowFilledCount[ri]! >= targetCols * 0.85) {
        for (let bi = 1; bi < targetCols; bi++) {
          vBoundaryPresent[ri]![bi] = true;
        }
      }
    }

    // Horizontal boundary presence per (row boundary below row, column)
    const hBoundaryPresentBelow: boolean[][] = Array.from({ length: Math.max(0, rowCount - 1) }, () => Array.from({ length: targetCols }, () => true));
    for (let ri = 0; ri < rowCount - 1; ri++) {
      const segs = hBuckets[ri + 1] ?? [];
      if (segs.length === 0) {
        // No evidence of this boundary: assume it exists to avoid aggressive rowSpan merging.
        continue;
      }
      for (let ci = 0; ci < targetCols; ci++) {
        const x0 = xBounds[ci]!;
        const x1 = xBounds[ci + 1]!;
        const bandW = Math.max(1e-6, x1 - x0);
        const cov = unionCoverage1DGlobal(segs, x0, x1);
        hBoundaryPresentBelow[ri]![ci] = cov / bandW >= 0.60;
      }
    }

    const coveredByRowSpan: boolean[][] = Array.from({ length: rowCount }, () => Array.from({ length: targetCols }, () => false));

    const mergeAccForRegion = (...args: [r0: number, r1Exclusive: number, c0: number, c1Exclusive: number]): CellAcc => {
      const [r0, r1Exclusive, c0, c1Exclusive] = args;
      const merged: CellAcc = { byBaseline: new Map<number, PdfText[]>(), x0: Infinity, x1: -Infinity };
      for (let rr = r0; rr < r1Exclusive; rr++) {
        const rowMap = rowsAcc[rr]!;
        for (let cc = c0; cc < c1Exclusive; cc++) {
          const acc = rowMap.get(cc);
          if (!acc) {continue;}
          for (const [by, runs] of acc.byBaseline.entries()) {
            const dst = merged.byBaseline.get(by) ?? [];
            dst.push(...runs);
            merged.byBaseline.set(by, dst);
          }
          merged.x0 = Math.min(merged.x0, acc.x0);
          merged.x1 = Math.max(merged.x1, acc.x1);
        }
      }
      if (!Number.isFinite(merged.x0) || !Number.isFinite(merged.x1)) {
        // Empty region: fall back to the cell bounds.
        merged.x0 = xBounds[c0]!;
        merged.x1 = xBounds[c1Exclusive]!;
      }
      return merged;
    };

    const rows: InferredTableRow[] = [];
    const maxRowSpanScanRows = Math.min(3, rowCount);

    for (let ri = 0; ri < rowCount; ri++) {
      const yTop = yBounds[ri]!;
      const yBottom = yBounds[ri + 1]!;
      const baselineY = rowBaselines[ri] ?? (yTop + yBottom) / 2;

      const cells: InferredTableCell[] = [];
      let ci = 0;
      while (ci < targetCols) {
        if (coveredByRowSpan[ri]![ci]) {
          ci += 1;
          continue;
        }

        let colEnd = ci + 1;
        while (colEnd < targetCols) {
          if (coveredByRowSpan[ri]![colEnd]) {break;}
          if (vBoundaryPresent[ri]![colEnd]) {break;}
          colEnd += 1;
        }

        let rowSpan = 1;
        if (ri < maxRowSpanScanRows - 1) {
          const maxSpan = Math.min(4, rowCount - ri);
          while (rowSpan < maxSpan) {
            const nextRow = ri + rowSpan;
            const boundaryRow = ri + rowSpan - 1;
            if (boundaryRow >= hBoundaryPresentBelow.length) {break;}

            let canExtend = true;
            for (let c = ci; c < colEnd; c++) {
              if (coveredByRowSpan[nextRow]![c]) {canExtend = false; break;}
              if (hBoundaryPresentBelow[boundaryRow]![c]) {canExtend = false; break;}
            }
            if (!canExtend) {break;}

            const curHasAny = rowFilledCount[ri]! > 0 && colHasText[ri]!.slice(ci, colEnd).some(Boolean);
            const nextHasAny = rowFilledCount[nextRow]! > 0 && colHasText[nextRow]!.slice(ci, colEnd).some(Boolean);
            // If both rows have content in the same area, it's usually not a vertical merge.
            // However, for header tiers split by baseline clustering (not by an actual horizontal rule),
            // we want to re-join multi-line header labels into a single cell.
            //
            // Keep this conservative:
            // - only for single-column cells (so we don't break group headers like "Web-API" spanning ver1..ver4)
            // - only within the first couple of rows we scan (header region)
            if (curHasAny && nextHasAny) {
              const isSingleCol = (colEnd - ci) === 1;
              const allowHeaderJoin = isSingleCol && ri < 2;
              if (!allowHeaderJoin) {break;}
            }

            for (let b = ci + 1; b < colEnd; b++) {
              if (vBoundaryPresent[nextRow]![b]) {canExtend = false; break;}
            }
            if (!canExtend) {break;}

            rowSpan += 1;
          }
        }

        for (let rr = ri + 1; rr < ri + rowSpan; rr++) {
          for (let c = ci; c < colEnd; c++) {
            coveredByRowSpan[rr]![c] = true;
          }
        }

        const acc = mergeAccForRegion(ri, ri + rowSpan, ci, colEnd);
        const col = {
          index: ci,
          x0: xBounds[ci]!,
          x1: xBounds[colEnd]!,
          xCenter: (xBounds[ci]! + xBounds[colEnd]!) / 2,
        };
        const alignment = resolveCellAlignment({ x0: acc.x0, x1: acc.x1 }, col, fontSize);
        const baselines = [...acc.byBaseline.keys()].sort((a, b) => b - a);
        const runsByLine = baselines.map((by) => sortRunsLeftToRight(acc.byBaseline.get(by)!));

        cells.push({
          colStart: ci,
          colSpan: colEnd - ci,
          rowSpan,
          baselineY,
          runsByLine,
          baselineYsByLine: baselines,
          alignment,
          x0: acc.x0,
          x1: acc.x1,
        });

        ci = colEnd;
      }

      rows.push({ baselineY, y0: yBottom, y1: yTop, cells });
    }

    return { bounds: effectiveBounds, fontSize, columns, rows };
  }

  // Cluster into row-bands:
  // 1) Bucket by baseline (strict) to avoid merging distinct rows.
  // 2) Merge adjacent buckets only when their columns are complementary (header cells often split across baselines).
  type BaselineBucket = {
    readonly baselineY: number;
    readonly paragraphs: readonly (typeof paragraphs)[number][];
  };

  const baselineEps = Math.max(0.5, fontSize * 0.25);
  const sortedParas = [...paragraphs].sort((a, b) => b.baselineY - a.baselineY);
  const buckets: BaselineBucket[] = [];
  let curBucket: { baselineY: number; paragraphs: (typeof paragraphs)[number][] } | null = null;
  for (const p of sortedParas) {
    if (!curBucket) {
      curBucket = { baselineY: p.baselineY, paragraphs: [p] };
      continue;
    }
    if (Math.abs(p.baselineY - curBucket.baselineY) <= baselineEps) {
      curBucket.paragraphs.push(p);
      continue;
    }
    buckets.push(curBucket);
    curBucket = { baselineY: p.baselineY, paragraphs: [p] };
  }
  if (curBucket) {buckets.push(curBucket);}

  const getBucketCenters = (b: BaselineBucket): number[] => {
    const centers: number[] = [];
    for (const p of b.paragraphs) {
      const ls = lineSegs.find((x) => x.paragraph === p);
      if (!ls) {continue;}
      for (const seg of ls.segments) {
        centers.push((seg.x0 + seg.x1) / 2);
      }
    }
    centers.sort((a, b) => a - b);
    return centers;
  };

  const countCenterMatches = (a: readonly number[], b: readonly number[], tol: number): number => {
    let i = 0;
    let j = 0;
    let matches = 0;
    while (i < a.length && j < b.length) {
      const da = a[i]!;
      const db = b[j]!;
      const d = da - db;
      if (Math.abs(d) <= tol) {
        matches++;
        i++;
        j++;
        continue;
      }
      if (d < 0) {i++;} else {j++;}
    }
    return matches;
  };

  const canMergeBuckets = (a: RowBand, b: BaselineBucket): boolean => {
    const dy = a.topBaselineY - b.baselineY;
    if (dy <= 0) {return false;}
    if (dy > fontSize * 0.75) {return false;}

    const tol = Math.max(1, fontSize * 0.7);
    const bCenters = getBucketCenters(b);
    const matches = countCenterMatches(a.centers, bCenters, tol);
    const overlapRatio = bCenters.length > 0 ? (matches / bCenters.length) : 0;

    // Merge only if b doesn't substantially overlap existing columns (i.e. it adds missing columns).
    if (overlapRatio > 0.35) {return false;}

    // Guard: don't create a row with more unique columns than inferred.
    const unionApprox = a.centers.length + bCenters.length - matches;
    if (unionApprox > targetCols) {return false;}

    return true;
  };

  type RowBand = {
    baselineY: number; // bottom-most baseline within the band
    topBaselineY: number;
    paragraphs: (typeof paragraphs)[number][];
    centers: number[];
  };

  const rowBands: RowBand[] = [];
  let curBand: RowBand | null = null;

  for (const b of buckets) {
    if (!curBand) {
      const centers = getBucketCenters(b);
      curBand = {
        baselineY: b.baselineY,
        topBaselineY: b.baselineY,
        paragraphs: [...b.paragraphs],
        centers,
      };
      continue;
    }

    if (canMergeBuckets(curBand, b)) {
      curBand.paragraphs.push(...b.paragraphs);
      curBand.baselineY = Math.min(curBand.baselineY, b.baselineY);
      curBand.topBaselineY = Math.max(curBand.topBaselineY, b.baselineY);
      const bCenters = getBucketCenters(b);
      curBand.centers = [...curBand.centers, ...bCenters].sort((x, y) => x - y);
      continue;
    }

    rowBands.push(curBand);
    const centers = getBucketCenters(b);
    curBand = {
      baselineY: b.baselineY,
      topBaselineY: b.baselineY,
      paragraphs: [...b.paragraphs],
      centers,
    };
  }
  if (curBand) {rowBands.push(curBand);}

  if (rowBands.length < opts.minRows) {return null;}

  // Ensure stable top-to-bottom ordering before computing row bands.
  // Without this, bounds can be assigned to the wrong row, causing severe cell clipping.
  rowBands.sort((a, b) => b.baselineY - a.baselineY);
  const rowBandBounds = computeRowBandBounds(rowBands.map((r) => r.baselineY), effectiveBounds);

  const rows: InferredTableRow[] = rowBands.map((band, idx) => {
    const bandBounds = rowBandBounds[idx] ?? { y0: effectiveBounds.y, y1: effectiveBounds.y + effectiveBounds.height };
    const cellsByStart = new Map<number, { byBaseline: Map<number, PdfText[]>; x0: number; x1: number }>();
    const baselineEps = Math.max(0.5, fontSize * 0.25);

    for (const p of band.paragraphs) {
      const line = lineSegs.find((ls) => ls.paragraph === p);
      if (!line) {continue;}
      for (const seg of line.segments) {
        const colStart = assignSegmentToColumn({ x0: seg.x0, x1: seg.x1 }, columns);
        const existing = cellsByStart.get(colStart);
        if (!existing) {
          const byBaseline = new Map<number, PdfText[]>();
          byBaseline.set(p.baselineY, [...seg.runs]);
          cellsByStart.set(colStart, { byBaseline, x0: seg.x0, x1: seg.x1 });
        } else {
          let key: number | null = null;
          for (const k of existing.byBaseline.keys()) {
            if (Math.abs(k - p.baselineY) <= baselineEps) {key = k; break;}
          }
          if (key == null) {key = p.baselineY; existing.byBaseline.set(key, []);}
          existing.byBaseline.get(key)!.push(...seg.runs);
          existing.x0 = Math.min(existing.x0, seg.x0);
          existing.x1 = Math.max(existing.x1, seg.x1);
        }
      }
    }

    const cells: InferredTableCell[] = [...cellsByStart.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([colStart, v]) => {
        const col = columns[colStart]!;
        const alignment = resolveCellAlignment({ x0: v.x0, x1: v.x1 }, col, fontSize);
        const baselines = [...v.byBaseline.keys()].sort((a, b) => b - a);
        const runsByLine = baselines.map((by) => sortRunsLeftToRight(v.byBaseline.get(by)!));
        return {
          colStart,
          colSpan: 1,
          rowSpan: 1,
          baselineY: band.baselineY,
          runsByLine,
          baselineYsByLine: baselines,
          alignment,
          x0: v.x0,
          x1: v.x1,
        };
      });

    return { baselineY: band.baselineY, y0: bandBounds.y0, y1: bandBounds.y1, cells };
  });

  return { bounds: effectiveBounds, fontSize, columns, rows };
}
