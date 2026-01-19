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

import type { PdfPath, PdfPathOp, PdfText } from "../domain";
import type { GroupedText } from "./text-grouping/types";

export type InferredTableCell = {
  readonly colStart: number;
  readonly colSpan: number;
  readonly baselineY: number;
  /** Cell content split into visual lines (top-to-bottom) */
  readonly runsByLine: readonly (readonly PdfText[])[];
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

  const ys = [...rowBaselines].sort((a, b) => b - a);
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

function inferGridFromPaths(
  paths: readonly PdfPath[],
  approxBounds: InferredTable["bounds"],
  fontSize: number,
  targetCols: number,
): TableGridFromPaths | null {
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
  if (subBBoxes.length < 20) {return null;}

  // Estimate table bounds from subpaths intersecting the region.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of subBBoxes) {
    minX = Math.min(minX, b.x0);
    minY = Math.min(minY, b.y0);
    maxX = Math.max(maxX, b.x1);
    maxY = Math.max(maxY, b.y1);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {return null;}

  const tableBounds: InferredTable["bounds"] = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

  const horizMaxH = Math.max(0.6, fontSize * 0.18);
  const vertMaxW = Math.max(0.6, fontSize * 0.18);
  const minSpan = Math.max(20, fontSize * 3);

  const horizontalCenters: number[] = [];
  const verticalCenters: number[] = [];

  for (const b of subBBoxes) {
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    if (h <= horizMaxH && w >= minSpan) {
      horizontalCenters.push((b.y0 + b.y1) / 2);
    } else if (w <= vertMaxW && h >= minSpan) {
      verticalCenters.push((b.x0 + b.x1) / 2);
    }
  }

  // Need enough horizontal rules to infer row bands.
  if (horizontalCenters.length < 10) {return null;}

  const yLines = cluster1D(horizontalCenters, Math.max(0.5, fontSize * 0.12)).sort((a, b) => b - a);
  if (yLines.length < 10) {return null;}

  const yDiffs = yLines.slice(1).map((y, i) => yLines[i]! - y);
  const typicalRowGap = median(yDiffs.filter((d) => d > 0)) || fontSize * 1.4;
  if (!(typicalRowGap > 0)) {return null;}

  const tableTop = tableBounds.y + tableBounds.height;
  const tableBottom = tableBounds.y;

  // Horizontal rules can include the outer borders. Avoid creating a thin empty row band
  // by dropping rules that are too close to the table edge.
  const edgeDropTh = typicalRowGap * 0.45;
  let yInternal = [...yLines];
  if (yInternal.length > 0 && tableTop - yInternal[0]! <= edgeDropTh) {
    yInternal = yInternal.slice(1);
  }
  if (yInternal.length > 0 && yInternal[yInternal.length - 1]! - tableBottom <= edgeDropTh) {
    yInternal = yInternal.slice(0, -1);
  }

  const yBoundaries = [tableTop, ...yInternal, tableBottom].sort((a, b) => b - a);

  // Column boundaries: include outer bounds and merge close lines (double rules).
  const xCandidates = [tableBounds.x, ...verticalCenters, tableBounds.x + tableBounds.width];
  const xMerged = cluster1D(xCandidates, Math.max(0.8, fontSize * 0.85)).sort((a, b) => a - b);

  // We expect exactly targetCols+1 boundaries for a proper grid; otherwise fall back.
  if (xMerged.length !== targetCols + 1) {return null;}

  return { bounds: tableBounds, xBoundaries: xMerged, yBoundaries };
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
  if (candidateCounts.length === 0) {return null;}

  const targetCols = Math.min(opts.maxCols, Math.max(...candidateCounts));
  if (targetCols < opts.minCols) {return null;}

  // Now that we know the expected column count, try to infer a grid from page paths.
  grid = opts.paths ? inferGridFromPaths(opts.paths, group.bounds, fontSize, targetCols) : null;
  effectiveBounds = grid?.bounds ?? group.bounds;
  boundsX0 = effectiveBounds.x;
  boundsX1 = effectiveBounds.x + effectiveBounds.width;

  // Prefer header-like lines when inferring boundaries. Data rows can accidentally hit the same
  // segment count due to intra-cell splits (e.g. "zenkoku" + "全国" inside a single name cell).
  const sortedLines = [...lineSegs].sort((a, b) => b.paragraph.baselineY - a.paragraph.baselineY);
  const isHeaderish = (l: LineSeg): boolean => {
    // Heuristic: header lines often contain Japanese labels like "都道府県" or "参考" (参/考).
    return l.paragraph.runs.some((r) => r.text === "参" || r.text === "考" || r.text === "都");
  };

  const headerishLines = sortedLines.filter(isHeaderish).filter((l) => l.segments.length === targetCols);

  const topWindow = Math.max(1, Math.floor(sortedLines.length * 0.25));
  let trainingLines =
    headerishLines.length > 0
      ? headerishLines
      : sortedLines.slice(0, topWindow).filter((l) => l.segments.length === targetCols);

  if (trainingLines.length === 0) {trainingLines = lineSegs.filter((l) => l.segments.length === targetCols);}
  if (trainingLines.length === 0) {return null;}

  const computeGapCenter = (a: Segment, b: Segment): number => (a.x1 + b.x0) / 2;

  // Column boundary inference:
  // - Generic: boundary[i] = median gap center between segment i and i+1 in header-like lines.
  // - Special-case: 3 columns × 2 blocks (6 columns total) with empty "reference" columns in data rows
  //   (k-namingrule-dl.pdf): infer the block gutter first, then fit code/name/ref boundaries per block.
  const boundaries: number[] = (() => {
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

    const leftNameRefFromHeader = leftNameRefSamples.length > 0 ? median(leftNameRefSamples) : leftCodeNameBoundary + (blockSplitX - leftCodeNameBoundary) * 0.8;
    const rightNameRefFromHeader = rightNameRefSamples.length > 0 ? median(rightNameRefSamples) : rightCodeNameBoundary + (boundsX1 - rightCodeNameBoundary) * 0.8;

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
    const yBounds = [...grid.yBoundaries].sort((a, b) => b - a);
    const rowCount = yBounds.length - 1;

    type CellAcc = {
      byBaseline: Map<number, PdfText[]>;
      x0: number;
      x1: number;
    };

    const baselineEps = Math.max(0.5, fontSize * 0.25);
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
      for (let i = 0; i < rowCount; i++) {
        const yTop = yBounds[i]!;
        const yBottom = yBounds[i + 1]!;
        if (baselineY <= yTop + baselineEps && baselineY >= yBottom - baselineEps) {return i;}
      }
      return null;
    };

    for (const p of paragraphs) {
      const ri = findRowIndex(p.baselineY);
      if (ri == null) {continue;}
      rowBaselines[ri] = Math.max(rowBaselines[ri] ?? 0, p.baselineY);

      const line = lineSegs.find((ls) => ls.paragraph === p);
      if (!line) {continue;}

      for (const seg of line.segments) {
        const colStart = assignSegmentToColumn({ x0: seg.x0, x1: seg.x1 }, columns);
        const rowMap = rowsAcc[ri]!;
        const prev = rowMap.get(colStart);
        const acc = prev ?? { byBaseline: new Map<number, PdfText[]>(), x0: seg.x0, x1: seg.x1 };

        const key = findOrCreateBaselineKey(acc.byBaseline, p.baselineY);
        const arr = acc.byBaseline.get(key)!;
        arr.push(...seg.runs);
        acc.x0 = Math.min(acc.x0, seg.x0);
        acc.x1 = Math.max(acc.x1, seg.x1);
        rowMap.set(colStart, acc);
      }
    }

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
            baselineY: rowBaselines[ri] ?? (yTop + yBottom) / 2,
            runsByLine,
            alignment,
            x0: acc.x0,
            x1: acc.x1,
          };
        });

      rows.push({ baselineY: rowBaselines[ri] ?? (yTop + yBottom) / 2, y0: yBottom, y1: yTop, cells });
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
          baselineY: band.baselineY,
          runsByLine,
          alignment,
          x0: v.x0,
          x1: v.x1,
        };
      });

    return { baselineY: band.baselineY, y0: bandBounds.y0, y1: bandBounds.y1, cells };
  });

  return { bounds: effectiveBounds, fontSize, columns, rows };
}
