/**
 * @file Table region detection from PDF paths (grid/ruling lines).
 *
 * Some PDFs draw tables as many thin filled rectangles (rules) rather than a single container.
 * In that case, text grouping may split per-cell and table inference cannot see the whole grid.
 *
 * This module detects table-like regions by clustering "rule-like" path bounding boxes.
 */

import type { PdfPath } from "@oxen/pdf/domain";

export type TableRegion = {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly ruleCount: number;
  /**
   * Optional hint for grid column count derived from vertical rule clustering.
   * This is used to force table inference to respect the drawn grid.
   */
  readonly colCountHint: number | null;
  /** Optional hint for grid row count derived from horizontal rule clustering. */
  readonly rowCountHint: number | null;
};

function median(xs: readonly number[]): number {
  if (xs.length === 0) {return 0;}
  const arr = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) {return arr[mid]!;}
  return (arr[mid - 1]! + arr[mid]!) / 2;
}

type BBox = { x0: number; y0: number; x1: number; y1: number };

function expandBox(b: BBox, pad: number): BBox {
  return { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad };
}

function intersects(a: BBox, b: BBox): boolean {
  return a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
}

function union(a: BBox, b: BBox): BBox {
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
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

function computeRegionMeta(
  ...args: readonly [
    boxIndices: readonly number[],
    boxes: readonly BBox[],
    spanMin: number,
    thicknessMax: number,
  ]
): { bbox: BBox; ruleCount: number; xLines: number[]; yLines: number[]; colCountHint: number | null; rowCountHint: number | null } | null {
  const [boxIndices, boxes, spanMin, thicknessMax] = args;
  if (boxIndices.length === 0) {return null;}
  let bb = boxes[boxIndices[0]!]!;
  const vertCenters: number[] = [];
  const horizCenters: number[] = [];

  for (const idx of boxIndices) {
    const b = boxes[idx]!;
    bb = union(bb, b);
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    if (w <= thicknessMax * 1.2 && h >= spanMin) {
      vertCenters.push((b.x0 + b.x1) / 2);
    }
    if (h <= thicknessMax * 1.2 && w >= spanMin) {
      horizCenters.push((b.y0 + b.y1) / 2);
    }
  }

  const xLines = cluster1D(vertCenters, thicknessMax * 2.0).sort((a, b) => a - b);
  const yLines = cluster1D(horizCenters, thicknessMax * 2.0).sort((a, b) => b - a);
  const colCountHint = xLines.length >= 3 ? Math.max(2, xLines.length - 1) : null;
  const rowCountHint = yLines.length >= 3 ? Math.max(2, yLines.length - 1) : null;

  return { bbox: bb, ruleCount: boxIndices.length, xLines, yLines, colCountHint, rowCountHint };
}

function splitByVerticalWhitespace(
  meta: { bbox: BBox; xLines: readonly number[] },
  boxIndices: readonly number[],
  boxes: readonly BBox[],
): { left: number[]; right: number[] } | null {
  const xs = meta.xLines;
  if (xs.length < 6) {return null;}
  const gaps: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    gaps.push(xs[i]! - xs[i - 1]!);
  }
  if (gaps.length < 4) {return null;}

  const typicalGap = median(gaps) || 0;
  const maxGap = Math.max(...gaps);
  if (!(typicalGap > 0 && maxGap >= typicalGap * 3.2)) {return null;}

  const gapIdx = gaps.findIndex((g) => g === maxGap);
  if (gapIdx < 0) {return null;}

  const splitX = (xs[gapIdx]! + xs[gapIdx + 1]!) / 2;
  const width = meta.bbox.x1 - meta.bbox.x0;
  if (!(width > 0)) {return null;}

  // Avoid splitting near the edges; only consider a split in the central 60% band.
  const rel = (splitX - meta.bbox.x0) / width;
  if (rel < 0.2 || rel > 0.8) {return null;}

  const left: number[] = [];
  const right: number[] = [];
  for (const idx of boxIndices) {
    const b = boxes[idx]!;
    const cx = (b.x0 + b.x1) / 2;
    if (cx < splitX) {left.push(idx);} else {right.push(idx);}
  }
  if (left.length < 6 || right.length < 6) {return null;}
  return { left, right };
}

function splitByHorizontalWhitespace(
  meta: { bbox: BBox; yLines: readonly number[] },
  boxIndices: readonly number[],
  boxes: readonly BBox[],
): { top: number[]; bottom: number[] } | null {
  const ys = meta.yLines;
  if (ys.length < 6) {return null;}
  const gaps: number[] = [];
  for (let i = 1; i < ys.length; i++) {
    gaps.push(ys[i - 1]! - ys[i]!);
  }
  if (gaps.length < 4) {return null;}

  const typicalGap = median(gaps) || 0;
  const maxGap = Math.max(...gaps);
  if (!(typicalGap > 0 && maxGap >= typicalGap * 3.2)) {return null;}

  const gapIdx = gaps.findIndex((g) => g === maxGap);
  if (gapIdx < 0) {return null;}

  const splitY = (ys[gapIdx]! + ys[gapIdx + 1]!) / 2;
  const height = meta.bbox.y1 - meta.bbox.y0;
  if (!(height > 0)) {return null;}

  // Avoid splitting near edges; only consider a split in the central 60% band.
  const rel = (splitY - meta.bbox.y0) / height;
  if (rel < 0.2 || rel > 0.8) {return null;}

  const top: number[] = [];
  const bottom: number[] = [];
  for (const idx of boxIndices) {
    const b = boxes[idx]!;
    const cy = (b.y0 + b.y1) / 2;
    if (cy > splitY) {top.push(idx);} else {bottom.push(idx);}
  }
  if (top.length < 6 || bottom.length < 6) {return null;}
  return { top, bottom };
}






export function detectTableRegionsFromPaths(
  paths: readonly PdfPath[],
  page: { readonly width: number; readonly height: number },
): TableRegion[] {
  const spanMin = Math.max(12, Math.min(page.width, page.height) * 0.035);

  const boxes0: Array<{ bbox: BBox; thickness: number; span: number }> = [];
  for (const path of paths) {
    if (path.paintOp === "none" || path.paintOp === "clip") {continue;}

    // Many PDFs draw the entire table grid as one long stroked path. A bbox over the
    // whole path is not "rule-like" and would undercount rules (breaking region clustering).
    // Instead, extract per-segment (axis-aligned) rule boxes.
    const lineWidth = Math.max(0.1, path.graphicsState.lineWidth || 1);
    const half = lineWidth / 2;

    let cur: { x: number; y: number } | null = null;
    const pushRect = (...args: readonly [x0: number, y0: number, x1: number, y1: number, thickness: number, span: number]): void => {
      const [x0, y0, x1, y1, thickness, span] = args;
      if (span < spanMin) {return;}
      const aspect = span / Math.max(0.1, thickness);
      if (aspect < 10) {return;}
      boxes0.push({ bbox: { x0, y0, x1, y1 }, thickness, span });
    };

    for (const op of path.operations) {
      if (op.type === "moveTo") {
        cur = { x: op.point.x, y: op.point.y };
        continue;
      }
      if (op.type === "lineTo") {
        if (!cur) {
          cur = { x: op.point.x, y: op.point.y };
          continue;
        }

        const x0 = Math.min(cur.x, op.point.x);
        const x1 = Math.max(cur.x, op.point.x);
        const y0 = Math.min(cur.y, op.point.y);
        const y1 = Math.max(cur.y, op.point.y);

        // Only axis-aligned rules are relevant for table regions.
        if (x0 === x1 && y0 !== y1) {
          const span = y1 - y0;
          pushRect(x0 - half, y0, x1 + half, y1, lineWidth, span);
        } else if (y0 === y1 && x0 !== x1) {
          const span = x1 - x0;
          pushRect(x0, y0 - half, x1, y1 + half, lineWidth, span);
        }

        cur = { x: op.point.x, y: op.point.y };
        continue;
      }
      if (op.type === "rect") {
        const x0 = op.x;
        const y0 = op.y;
        const x1 = op.x + op.width;
        const y1 = op.y + op.height;
        const w = Math.abs(op.width);
        const h = Math.abs(op.height);
        if (!(w > 0 && h > 0)) {continue;}
        const thickness = Math.min(w, h);
        const span = Math.max(w, h);
        pushRect(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), thickness, span);
        continue;
      }

      // Keep tracking current point for curves so subsequent lineTo segments are anchored.
      if (cur) {
        if (op.type === "curveTo") {cur = { x: op.end.x, y: op.end.y };}
        else if (op.type === "curveToV") {cur = { x: op.end.x, y: op.end.y };}
        else if (op.type === "curveToY") {cur = { x: op.end.x, y: op.end.y };}
        else if (op.type === "closePath") {/* no-op */}
      }
    }
  }

  const thicknessSamples = boxes0.map((b) => b.thickness).filter((t) => t > 0 && t <= 8);
  if (thicknessSamples.length === 0) {return [];}

  const typicalThickness = median(thicknessSamples) || 1;
  const thicknessMax = Math.min(8, Math.max(0.8, typicalThickness * 3.0));
  const pad = Math.max(1, thicknessMax * 1.5);

  const boxes = boxes0
    .filter((b) => b.thickness <= thicknessMax)
    .map((b) => b.bbox);
  if (boxes.length === 0) {return [];}

  const visited = new Array<boolean>(boxes.length).fill(false);
  const regions: TableRegion[] = [];

  for (let i = 0; i < boxes.length; i++) {
    if (visited[i]) {continue;}
    visited[i] = true;
    const queue: number[] = [i];
    let bb = boxes[i]!;
    let count = 0;
    const indices: number[] = [];

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const cur = boxes[idx]!;
      indices.push(idx);
      bb = union(bb, cur);
      count += 1;

      const curExpanded = expandBox(cur, pad);
      for (let j = 0; j < boxes.length; j++) {
        if (visited[j]) {continue;}
        const other = boxes[j]!;
        if (!intersects(curExpanded, other)) {continue;}
        visited[j] = true;
        queue.push(j);
      }
    }

    const width = bb.x1 - bb.x0;
    const height = bb.y1 - bb.y0;
    if (count < 6) {continue;}
    if (width < page.width * 0.08) {continue;}
    if (height < page.height * 0.03) {continue;}

    // Some PDFs draw adjacent tables as two independent grids separated by a wide whitespace band,
    // but the central divider rules can still connect the path clusters, making the region appear
    // as one component. Split such regions into multiple candidates using vertical whitespace.
    const meta0 = computeRegionMeta(indices, boxes, spanMin, thicknessMax);
    if (!meta0) {continue;}

    const splitV = splitByVerticalWhitespace(meta0, indices, boxes);
    if (splitV) {
      const metaL = computeRegionMeta(splitV.left, boxes, spanMin, thicknessMax);
      const metaR = computeRegionMeta(splitV.right, boxes, spanMin, thicknessMax);
      if (metaL && metaR) {
        regions.push({
          ...metaL.bbox,
          ruleCount: metaL.ruleCount,
          colCountHint: metaL.colCountHint,
          rowCountHint: metaL.rowCountHint,
        });
        regions.push({
          ...metaR.bbox,
          ruleCount: metaR.ruleCount,
          colCountHint: metaR.colCountHint,
          rowCountHint: metaR.rowCountHint,
        });
        continue;
      }
    }

    const splitH = splitByHorizontalWhitespace(meta0, indices, boxes);
    if (splitH) {
      const metaT = computeRegionMeta(splitH.top, boxes, spanMin, thicknessMax);
      const metaB = computeRegionMeta(splitH.bottom, boxes, spanMin, thicknessMax);
      if (metaT && metaB) {
        regions.push({
          ...metaT.bbox,
          ruleCount: metaT.ruleCount,
          colCountHint: metaT.colCountHint,
          rowCountHint: metaT.rowCountHint,
        });
        regions.push({
          ...metaB.bbox,
          ruleCount: metaB.ruleCount,
          colCountHint: metaB.colCountHint,
          rowCountHint: metaB.rowCountHint,
        });
        continue;
      }
    }

    regions.push({
      ...meta0.bbox,
      ruleCount: meta0.ruleCount,
      colCountHint: meta0.colCountHint,
      rowCountHint: meta0.rowCountHint,
    });
  }

  // Prefer larger/denser regions.
  regions.sort((a, b) => (b.ruleCount - a.ruleCount) || ((b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0)));

  // Deduplicate nearly-identical regions.
  const out: TableRegion[] = [];
  for (const r of regions) {
    const isDup = out.some((e) => {
      const dx0 = Math.abs(e.x0 - r.x0);
      const dx1 = Math.abs(e.x1 - r.x1);
      const dy0 = Math.abs(e.y0 - r.y0);
      const dy1 = Math.abs(e.y1 - r.y1);
      return dx0 <= pad && dx1 <= pad && dy0 <= pad && dy1 <= pad;
    });
    if (!isDup) {out.push(r);}
    if (out.length >= 6) {break;}
  }

  return out;
}
