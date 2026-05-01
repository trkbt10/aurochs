/**
 * @file Reconstruct a stroke centerline from Figma's pre-expanded strokeGeometry.
 *
 * When a vector node has only `strokeGeometry` (no `fillGeometry`/`vectorPaths`),
 * Figma's exporter has already expanded the stroke into an outline that we
 * normally fill with the stroke colour. For thin (≈1px) center-aligned strokes
 * the expanded outline rasterizes with subtly different antialiasing than a
 * direct stroke applied to the centerline. Figma's SVG export, in contrast,
 * emits `<path stroke="…"/>` on the centerline directly.
 *
 * To match the export pixel-for-pixel we detect the strokeGeometry pattern of
 * a thin stroke and reconstruct the centerline. The pattern Figma uses for a
 * straight 1-segment stroke from A to B with width w is a closed 6-vertex
 * contour:
 *
 *   M A, L A+p, L B+p, L B, L B-p, L A-p, L A
 *
 * where p is the perpendicular offset of magnitude w/2 (right-hand side of
 * the AB direction). Caps appear as small standalone closed contours (≈4
 * vertices). Connected polylines share endpoints across segments.
 */

import type { PathCommand } from "../types";
import type { DecodedContour } from "./path";

const EPS = 1e-3;

type Point = { readonly x: number; readonly y: number };

type Segment = {
  readonly a: Point;
  readonly b: Point;
};

function dist(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function near(p: Point, q: Point, eps = EPS): boolean {
  return Math.abs(p.x - q.x) <= eps && Math.abs(p.y - q.y) <= eps;
}

/**
 * Split a flat command stream into subpaths, one per `M`. Each subpath is a
 * sequence of points; only `M` and `L` commands are accepted (Bezier curves
 * cannot represent the rectangular outline of a thin stroke).
 */
function commandsToSubpaths(commands: readonly PathCommand[]): Point[][] | undefined {
  const subpaths: Point[][] = [];
  let current: Point[] | undefined;
  for (const cmd of commands) {
    if (cmd.type === "M") {
      current = [{ x: cmd.x, y: cmd.y }];
      subpaths.push(current);
      continue;
    }
    if (cmd.type === "L") {
      if (!current) { return undefined; }
      current.push({ x: cmd.x, y: cmd.y });
      continue;
    }
    if (cmd.type === "Z") {
      continue;
    }
    return undefined;
  }
  return subpaths;
}

/**
 * Try to interpret a closed 6-vertex contour as a single rectangular stroke
 * segment of width `expectedWidth`. Returns the centerline {a, b} or undefined.
 */
function tryDetectSegment(verts: readonly Point[], expectedWidth: number): Segment | undefined {
  if (verts.length !== 7) {
    return undefined;
  }
  if (!near(verts[0], verts[6])) {
    return undefined;
  }

  const a = verts[0];
  const b = verts[3];

  const apPlus = verts[1];
  const bpPlus = verts[2];
  const bpMinus = verts[4];
  const apMinus = verts[5];

  const halfW = expectedWidth / 2;

  const dAplus = dist(a, apPlus);
  const dAminus = dist(a, apMinus);
  const dBplus = dist(b, bpPlus);
  const dBminus = dist(b, bpMinus);

  const widthEps = Math.max(0.05, expectedWidth * 0.1);
  if (Math.abs(dAplus - halfW) > widthEps) { return undefined; }
  if (Math.abs(dAminus - halfW) > widthEps) { return undefined; }
  if (Math.abs(dBplus - halfW) > widthEps) { return undefined; }
  if (Math.abs(dBminus - halfW) > widthEps) { return undefined; }

  const ab = { x: b.x - a.x, y: b.y - a.y };
  const len = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  if (len < EPS) { return undefined; }
  const ux = ab.x / len;
  const uy = ab.y / len;

  const expectedPlus = { x: -uy * halfW, y: ux * halfW };
  const expectedMinus = { x: uy * halfW, y: -ux * halfW };

  const obsAplus = { x: apPlus.x - a.x, y: apPlus.y - a.y };
  const obsAminus = { x: apMinus.x - a.x, y: apMinus.y - a.y };
  const obsBplus = { x: bpPlus.x - b.x, y: bpPlus.y - b.y };
  const obsBminus = { x: bpMinus.x - b.x, y: bpMinus.y - b.y };

  const nearVec = (p: Point, q: Point) => Math.abs(p.x - q.x) <= widthEps && Math.abs(p.y - q.y) <= widthEps;

  // The 4 corners must lie on the two perpendicular sides of the centerline.
  // Either A+p / B+p / B-p / A-p with p = +n*halfW (A-side and B-side share a
  // sign) or with the signs flipped — but +/- must be consistent across A and
  // B. Otherwise this isn't a rectangular stroke segment.
  const orientationOne =
    nearVec(obsAplus, expectedPlus) &&
    nearVec(obsAminus, expectedMinus) &&
    nearVec(obsBplus, expectedPlus) &&
    nearVec(obsBminus, expectedMinus);
  const orientationTwo =
    nearVec(obsAplus, expectedMinus) &&
    nearVec(obsAminus, expectedPlus) &&
    nearVec(obsBplus, expectedMinus) &&
    nearVec(obsBminus, expectedPlus);

  if (!orientationOne && !orientationTwo) {
    return undefined;
  }

  return { a, b };
}

/**
 * Detect that a closed contour represents a stroke cap as Figma generates it:
 * 5 path entries (4 distinct vertices + closing repeat of the first), all 4
 * vertices equidistant (≈ strokeWidth/2) from their centroid, forming a
 * regular square/diamond. Anything that isn't unmistakably a cap rejects.
 */
function isCapContour(verts: readonly Point[], expectedWidth: number): boolean {
  if (verts.length !== 5) { return false; }
  if (!near(verts[0], verts[4])) { return false; }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < 4; i++) {
    cx += verts[i].x;
    cy += verts[i].y;
  }
  cx /= 4;
  cy /= 4;

  const halfW = expectedWidth / 2;
  const tol = Math.max(0.05, expectedWidth * 0.15);
  for (let i = 0; i < 4; i++) {
    const d = dist(verts[i], { x: cx, y: cy });
    if (Math.abs(d - halfW) > tol) { return false; }
  }
  return true;
}

/**
 * Chain segments that share endpoints into open polylines. Returns an array
 * of polylines, each as a sequence of points.
 */
function chainSegments(segments: readonly Segment[]): Point[][] {
  if (segments.length === 0) { return []; }

  const used = new Array<boolean>(segments.length).fill(false);
  const polylines: Point[][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) { continue; }
    used[i] = true;
    const poly: Point[] = [segments[i].a, segments[i].b];

    let extended = true;
    while (extended) {
      extended = false;
      for (let j = 0; j < segments.length; j++) {
        if (used[j]) { continue; }
        const seg = segments[j];
        const head = poly[0];
        const tail = poly[poly.length - 1];
        if (near(seg.a, tail)) {
          poly.push(seg.b);
          used[j] = true;
          extended = true;
        } else if (near(seg.b, tail)) {
          poly.push(seg.a);
          used[j] = true;
          extended = true;
        } else if (near(seg.a, head)) {
          poly.unshift(seg.b);
          used[j] = true;
          extended = true;
        } else if (near(seg.b, head)) {
          poly.unshift(seg.a);
          used[j] = true;
          extended = true;
        }
      }
    }
    polylines.push(poly);
  }

  return polylines;
}

/**
 * Try reconstructing a centerline from `contours` (decoded strokeGeometry).
 * Returns the centerline contours when every body contour matches the thin
 * stroke pattern; otherwise returns undefined so the caller can fall back to
 * filling the original strokeGeometry.
 */
export function reconstructStrokeCenterline(
  contours: readonly DecodedContour[],
  strokeWeight: number,
): DecodedContour[] | undefined {
  if (contours.length === 0 || strokeWeight <= 0) { return undefined; }

  const segments: Segment[] = [];
  for (const c of contours) {
    const subpaths = commandsToSubpaths(c.commands);
    if (!subpaths) { return undefined; }
    for (const verts of subpaths) {
      if (verts.length === 0) { continue; }

      if (isCapContour(verts, strokeWeight)) {
        continue;
      }
      const seg = tryDetectSegment(verts, strokeWeight);
      if (!seg) { return undefined; }
      segments.push(seg);
    }
  }

  if (segments.length === 0) { return undefined; }

  const polylines = chainSegments(segments);

  return polylines.map<DecodedContour>((poly) => {
    const commands: PathCommand[] = [];
    commands.push({ type: "M", x: poly[0].x, y: poly[0].y });
    for (let k = 1; k < poly.length; k++) {
      commands.push({ type: "L", x: poly[k].x, y: poly[k].y });
    }
    return {
      commands,
      windingRule: "nonzero",
    };
  });
}
