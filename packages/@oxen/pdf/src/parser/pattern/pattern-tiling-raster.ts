/**
 * @file src/pdf/parser/pattern-tiling-raster.ts
 *
 * Rasterize PatternType 1 (tiling patterns) fills into `PdfImage`.
 *
 * Supported subset:
 * - PaintType 1 (colored tiling patterns)
 * - PaintType 2 (uncolored tiling patterns) with base color via `cs[/Pattern ...]` + `scn`
 * - Cell content: paths-only (fill/fillStroke), DeviceGray/RGB/CMYK/ICCBased colors
 * - Deterministic, non-AA coverage
 *
 * Not supported:
 * - Images/text in pattern cells
 * - Cell clipping, transparency groups, blend modes
 */

import type { PdfBBox, PdfColor, PdfGraphicsState, PdfImage, PdfMatrix, PdfPathOp, PdfPoint, PdfSoftMask } from "../../domain";
import {
  clamp01,
  cmykToRgb,
  createDefaultGraphicsState,
  grayToRgb,
  invertMatrix,
  multiplyMatrices,
  toByte,
  transformPoint,
} from "../../domain";
import { tokenizeContentStream } from "../../domain/content-stream";
import type { ParsedPath } from "../operator/types";
import type { PdfTilingPattern } from "./pattern.types";

function sampleSoftMaskAlphaInMaskSpace(mask: PdfSoftMask, x: number, y: number): number {
  const [llx, lly, urx, ury] = mask.bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return 0;}

  const nx = (x - llx) / bw;
  const ny = (ury - y) / bh; // top-down mapping
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {return 0;}
  if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) {return 0;}

  const col = Math.min(mask.width - 1, Math.max(0, Math.floor(nx * mask.width)));
  const row = Math.min(mask.height - 1, Math.max(0, Math.floor(ny * mask.height)));
  return mask.alpha[row * mask.width + col] ?? 0;
}

function colorToRgbBytes(color: PdfColor): readonly [number, number, number] {
  switch (color.colorSpace) {
    case "DeviceGray": {
      const [r, g, b] = grayToRgb(color.components[0] ?? 0);
      return [r, g, b];
    }
    case "DeviceRGB":
      return [toByte(color.components[0] ?? 0), toByte(color.components[1] ?? 0), toByte(color.components[2] ?? 0)];
    case "DeviceCMYK": {
      const [r, g, b] = cmykToRgb(
        color.components[0] ?? 0,
        color.components[1] ?? 0,
        color.components[2] ?? 0,
        color.components[3] ?? 0,
      );
      return [r, g, b];
    }
    case "ICCBased": {
      const alt = color.alternateColorSpace;
      if (alt === "DeviceGray") {
        const [r, g, b] = grayToRgb(color.components[0] ?? 0);
        return [r, g, b];
      }
      if (alt === "DeviceRGB") {
        return [toByte(color.components[0] ?? 0), toByte(color.components[1] ?? 0), toByte(color.components[2] ?? 0)];
      }
      if (alt === "DeviceCMYK") {
        const [r, g, b] = cmykToRgb(
          color.components[0] ?? 0,
          color.components[1] ?? 0,
          color.components[2] ?? 0,
          color.components[3] ?? 0,
        );
        return [r, g, b];
      }
      return [0, 0, 0];
    }
    case "Pattern":
    default:
      return [0, 0, 0];
  }
}

type Poly = readonly PdfPoint[];
type FlattenedSubpath = Readonly<{ readonly points: Poly; readonly closed: boolean }>;

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

function flattenSubpaths(ops: ParsedPath["operations"], ctm: PdfMatrix): readonly FlattenedSubpath[] {
  const subpaths: Array<{ points: PdfPoint[]; closed: boolean }> = [];

  let current: PdfPoint = { x: 0, y: 0 };
  let currentSubpath: { points: PdfPoint[]; closed: boolean } | null = null;

  const finish = (closed: boolean): void => {
    if (!currentSubpath || currentSubpath.points.length === 0) {return;}
    subpaths.push({ points: currentSubpath.points, closed });
    currentSubpath = null;
  };

  const startNew = (p: PdfPoint): void => {
    finish(false);
    currentSubpath = { points: [transformPoint(p, ctm)], closed: false };
    current = p;
  };

  const lineTo = (p: PdfPoint): void => {
    if (!currentSubpath) {
      startNew(current);
    }
    currentSubpath!.points.push(transformPoint(p, ctm));
    current = p;
  };

  const flattenCubic = (cp1: PdfPoint, cp2: PdfPoint, end: PdfPoint): void => {
    const p0 = current;
    const steps = 20;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      lineTo({
        x: cubicAt(p0.x, cp1.x, cp2.x, end.x, t),
        y: cubicAt(p0.y, cp1.y, cp2.y, end.y, t),
      });
    }
    current = end;
  };

  for (const op of ops) {
    switch (op.type) {
      case "moveTo":
        startNew(op.point);
        break;
      case "lineTo":
        lineTo(op.point);
        break;
      case "curveTo":
        flattenCubic(op.cp1, op.cp2, op.end);
        break;
      case "curveToV":
        flattenCubic(current, op.cp2, op.end);
        break;
      case "curveToY":
        flattenCubic(op.cp1, op.end, op.end);
        break;
      case "rect": {
        const p1 = { x: op.x, y: op.y };
        const p2 = { x: op.x + op.width, y: op.y };
        const p3 = { x: op.x + op.width, y: op.y + op.height };
        const p4 = { x: op.x, y: op.y + op.height };
        startNew(p1);
        lineTo(p2);
        lineTo(p3);
        lineTo(p4);
        finish(true);
        break;
      }
      case "closePath":
        finish(true);
        break;
    }
  }
  finish(false);

  return subpaths.map((s) => ({ points: s.points, closed: s.closed }));
}

function pointInPolyEvenOdd(x: number, y: number, poly: Poly): boolean {
  if (poly.length < 2) {return false;}
  let inside = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const pi = poly[i]!;
    const pj = poly[j]!;

    const xi = pi.x;
    const yi = pi.y;
    const xj = pj.x;
    const yj = pj.y;

    if ((yi > y) === (yj > y)) {
      continue;
    }
    const dy = yj - yi;
    if (dy === 0) {
      continue;
    }
    const t = (y - yi) / dy;
    const xInt = xi + (xj - xi) * t;
    if (x < xInt) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInSubpathsEvenOdd(x: number, y: number, subpaths: readonly FlattenedSubpath[]): boolean {
  let inside = false;
  for (const s of subpaths) {
    if (pointInPolyEvenOdd(x, y, s.points)) {
      inside = !inside;
    }
  }
  return inside;
}

function isLeft(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (px - ax) * (by - ay);
}

function windingNumber(x: number, y: number, poly: Poly): number {
  if (poly.length < 2) {return 0;}
  let winding = 0;

  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;

    if (a.y <= y) {
      if (b.y > y && isLeft(a.x, a.y, b.x, b.y, x, y) > 0) {
        winding += 1;
      }
    } else {
      if (b.y <= y && isLeft(a.x, a.y, b.x, b.y, x, y) < 0) {
        winding -= 1;
      }
    }
  }

  return winding;
}

function pointInSubpathsNonZero(x: number, y: number, subpaths: readonly FlattenedSubpath[]): boolean {
  let winding = 0;
  for (const s of subpaths) {
    winding += windingNumber(x, y, s.points);
  }
  return winding !== 0;
}

function pointInSubpaths(x: number, y: number, subpaths: readonly FlattenedSubpath[], fillRule: ParsedPath["fillRule"]): boolean {
  if (fillRule === "evenodd") {
    return pointInSubpathsEvenOdd(x, y, subpaths);
  }
  return pointInSubpathsNonZero(x, y, subpaths);
}

function computeBoundsFromSubpaths(subpaths: readonly FlattenedSubpath[]): PdfBBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of subpaths) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {return null;}
  if (maxX <= minX || maxY <= minY) {return null;}
  return [minX, minY, maxX, maxY];
}

function intersectBBoxes(a: PdfBBox, b: PdfBBox): PdfBBox | null {
  const aMinX = Math.min(a[0], a[2]);
  const aMinY = Math.min(a[1], a[3]);
  const aMaxX = Math.max(a[0], a[2]);
  const aMaxY = Math.max(a[1], a[3]);
  const bMinX = Math.min(b[0], b[2]);
  const bMinY = Math.min(b[1], b[3]);
  const bMaxX = Math.max(b[0], b[2]);
  const bMaxY = Math.max(b[1], b[3]);
  const minX = Math.max(aMinX, bMinX);
  const minY = Math.max(aMinY, bMinY);
  const maxX = Math.min(aMaxX, bMaxX);
  const maxY = Math.min(aMaxY, bMaxY);
  if (maxX <= minX || maxY <= minY) {return null;}
  return [minX, minY, maxX, maxY];
}

function computeGridSize(bbox: PdfBBox, maxSize: number): { readonly width: number; readonly height: number } | null {
  if (!Number.isFinite(maxSize) || maxSize <= 0) {return null;}
  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}
  const maxDim = Math.max(bw, bh);
  const scale = maxSize / maxDim;
  const width = Math.max(1, Math.round(bw * scale));
  const height = Math.max(1, Math.round(bh * scale));
  return { width, height };
}

type CellShape = Readonly<{
  readonly subpaths: readonly FlattenedSubpath[];
  readonly fillRule: "nonzero" | "evenodd";
  readonly rgb: readonly [number, number, number];
  readonly alphaByte: number;
  readonly bounds: PdfBBox;
}>;

function parsePatternCellShapes(pattern: PdfTilingPattern): readonly CellShape[] | null {
  const out: CellShape[] = [];
  const tokens = tokenizeContentStream(pattern.content);
  type Operand = number | string | readonly (number | string)[];
  let operandStack: Operand[] = [];
  let currentPath: PdfPathOp[] = [];

  const gsStack: PdfGraphicsState[] = [];
  let gs: PdfGraphicsState = createDefaultGraphicsState();

  const popNumberOperand = (): number | null => {
    const v = operandStack.length > 0 ? operandStack[operandStack.length - 1] : undefined;
    operandStack = operandStack.slice(0, -1);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const setFillGray = (g: number): void => {
    gs = { ...gs, fillColor: { colorSpace: "DeviceGray", components: [g] } };
  };
  const setFillRgb = (r: number, g: number, b: number): void => {
    gs = { ...gs, fillColor: { colorSpace: "DeviceRGB", components: [r, g, b] } };
  };
  const setFillCmyk = (c: number, m: number, y: number, k: number): void => {
    gs = { ...gs, fillColor: { colorSpace: "DeviceCMYK", components: [c, m, y, k] } };
  };

  const emitFill = (fillRule: "nonzero" | "evenodd"): void => {
    if (currentPath.length === 0) {
      operandStack = [];
      return;
    }
    const subpaths = flattenSubpaths(currentPath, gs.ctm);
    currentPath = [];
    operandStack = [];
    if (subpaths.length === 0) {return;}
    const bounds = computeBoundsFromSubpaths(subpaths);
    if (!bounds) {return;}
    const rgb = colorToRgbBytes(gs.fillColor);
    const alphaByte = Math.round(255 * clamp01(gs.fillAlpha));
    out.push({ subpaths, fillRule, rgb, alphaByte, bounds });
  };

  for (const t of tokens) {
    if (t.type === "number") {
      operandStack = [...operandStack, t.value];
      continue;
    }
    if (t.type === "name" || t.type === "string") {
      operandStack = [...operandStack, String(t.value)];
      continue;
    }
    if (t.type === "array_start" || t.type === "array_end" || t.type === "dict_start" || t.type === "dict_end") {
      // Not supported in the minimal pattern-cell parser.
      return null;
    }
    if (t.type !== "operator") {
      return null;
    }

    switch (t.value) {
      case "q": {
        gsStack.push(gs);
        operandStack = [];
        break;
      }
      case "Q": {
        const prev = gsStack.pop();
        if (prev) {gs = prev;}
        operandStack = [];
        break;
      }
      case "cm": {
        const f = popNumberOperand();
        const e = popNumberOperand();
        const d = popNumberOperand();
        const c = popNumberOperand();
        const b = popNumberOperand();
        const a = popNumberOperand();
        if (a == null || b == null || c == null || d == null || e == null || f == null) {return null;}
        const m: PdfMatrix = [a, b, c, d, e, f];
        gs = { ...gs, ctm: multiplyMatrices(m, gs.ctm) };
        operandStack = [];
        break;
      }
      case "g": {
        const g = popNumberOperand();
        if (g == null) {return null;}
        setFillGray(g);
        operandStack = [];
        break;
      }
      case "rg": {
        const b = popNumberOperand();
        const g = popNumberOperand();
        const r = popNumberOperand();
        if (r == null || g == null || b == null) {return null;}
        setFillRgb(r, g, b);
        operandStack = [];
        break;
      }
      case "k": {
        const k = popNumberOperand();
        const y = popNumberOperand();
        const m = popNumberOperand();
        const c = popNumberOperand();
        if (c == null || m == null || y == null || k == null) {return null;}
        setFillCmyk(c, m, y, k);
        operandStack = [];
        break;
      }
      case "m": {
        const y = popNumberOperand();
        const x = popNumberOperand();
        if (x == null || y == null) {return null;}
        currentPath = [...currentPath, { type: "moveTo", point: { x, y } }];
        operandStack = [];
        break;
      }
      case "l": {
        const y = popNumberOperand();
        const x = popNumberOperand();
        if (x == null || y == null) {return null;}
        currentPath = [...currentPath, { type: "lineTo", point: { x, y } }];
        operandStack = [];
        break;
      }
      case "c": {
        const y3 = popNumberOperand();
        const x3 = popNumberOperand();
        const y2 = popNumberOperand();
        const x2 = popNumberOperand();
        const y1 = popNumberOperand();
        const x1 = popNumberOperand();
        if (x1 == null || y1 == null || x2 == null || y2 == null || x3 == null || y3 == null) {return null;}
        currentPath = [
          ...currentPath,
          { type: "curveTo", cp1: { x: x1, y: y1 }, cp2: { x: x2, y: y2 }, end: { x: x3, y: y3 } },
        ];
        operandStack = [];
        break;
      }
      case "v": {
        const y3 = popNumberOperand();
        const x3 = popNumberOperand();
        const y2 = popNumberOperand();
        const x2 = popNumberOperand();
        if (x2 == null || y2 == null || x3 == null || y3 == null) {return null;}
        currentPath = [...currentPath, { type: "curveToV", cp2: { x: x2, y: y2 }, end: { x: x3, y: y3 } }];
        operandStack = [];
        break;
      }
      case "y": {
        const y3 = popNumberOperand();
        const x3 = popNumberOperand();
        const y1 = popNumberOperand();
        const x1 = popNumberOperand();
        if (x1 == null || y1 == null || x3 == null || y3 == null) {return null;}
        currentPath = [...currentPath, { type: "curveToY", cp1: { x: x1, y: y1 }, end: { x: x3, y: y3 } }];
        operandStack = [];
        break;
      }
      case "h": {
        currentPath = [...currentPath, { type: "closePath" }];
        operandStack = [];
        break;
      }
      case "re": {
        const h = popNumberOperand();
        const w = popNumberOperand();
        const y = popNumberOperand();
        const x = popNumberOperand();
        if (x == null || y == null || w == null || h == null) {return null;}
        currentPath = [...currentPath, { type: "rect", x, y, width: w, height: h }];
        operandStack = [];
        break;
      }
      case "f":
      case "F":
      case "B":
      case "b":
        emitFill("nonzero");
        break;
      case "f*":
      case "B*":
      case "b*":
        emitFill("evenodd");
        break;
      case "S":
      case "s":
      case "n":
        currentPath = [];
        operandStack = [];
        break;
      default:
        // Unsupported operator inside the current tiling-pattern subset.
        return null;
    }
  }

  return out;
}

export function rasterizeTilingPatternFillPath(
  parsed: ParsedPath,
  pattern: PdfTilingPattern,
  options: Readonly<{ readonly shadingMaxSize: number; readonly pageBBox: PdfBBox }>,
): PdfImage | null {
  if (!parsed) {throw new Error("parsed is required");}
  if (!pattern) {throw new Error("pattern is required");}
  if (!options) {throw new Error("options is required");}

  if (pattern.paintType !== 1 && pattern.paintType !== 2) {return null;}
  if (parsed.paintOp !== "fill" && parsed.paintOp !== "fillStroke") {return null;}

  if (!Number.isFinite(options.shadingMaxSize) || options.shadingMaxSize < 0) {
    throw new Error(`shadingMaxSize must be >= 0 (got ${options.shadingMaxSize})`);
  }
  if (options.shadingMaxSize === 0) {return null;}

  const outerGs = parsed.graphicsState;
  const outerFillRule = parsed.fillRule ?? "nonzero";

  const outerSubpaths = flattenSubpaths(parsed.operations, outerGs.ctm);
  if (outerSubpaths.length === 0) {return null;}
  const outerBounds = computeBoundsFromSubpaths(outerSubpaths);
  if (!outerBounds) {return null;}

  const paintBBox = outerGs.clipBBox ? intersectBBoxes(outerBounds, outerGs.clipBBox) : outerBounds;
  if (!paintBBox) {return null;}

  const size = computeGridSize(paintBBox, options.shadingMaxSize);
  if (!size) {return null;}
  const { width, height } = size;

  const shapes = parsePatternCellShapes(pattern);
  if (shapes === null) {return null;}

  const [llx, lly, urx, ury] = paintBBox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const patternToPage = multiplyMatrices(outerGs.ctm, pattern.matrix);
  const pageToPattern = invertMatrix(patternToPage);
  if (!pageToPattern) {return null;}

  const fillMul = clamp01(outerGs.fillAlpha) * clamp01(outerGs.softMaskAlpha ?? 1);
  const baseRgb = pattern.paintType === 2 && outerGs.fillPatternColor ? colorToRgbBytes(outerGs.fillPatternColor) : ([0, 0, 0] as const);
  const softMask = outerGs.softMask;
  const pageToMask = (() => {
    if (!softMask) {return null;}
    const maskToPage = multiplyMatrices(outerGs.ctm, softMask.matrix);
    return invertMatrix(maskToPage);
  })();

  const pixelCount = width * height;
  const data = new Uint8Array(pixelCount * 3);
  const alpha = new Uint8Array(pixelCount);

  const [bx0, by0, bx1, by1] = pattern.bbox;
  const xStep = pattern.xStep;
  const yStep = pattern.yStep;

  for (let row = 0; row < height; row += 1) {
    const pageY = ury - ((row + 0.5) / height) * bh;
    for (let col = 0; col < width; col += 1) {
      const pageX = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;

      if (!pointInSubpaths(pageX, pageY, outerSubpaths, outerFillRule)) {
        alpha[idx] = 0;
        continue;
      }

      const pat = transformPoint({ x: pageX, y: pageY }, pageToPattern);
      const kx = Math.floor((pat.x - bx0) / xStep);
      const ky = Math.floor((pat.y - by0) / yStep);
      const localX = pat.x - kx * xStep;
      const localY = pat.y - ky * yStep;

      if (localX < bx0 || localX > bx1 || localY < by0 || localY > by1) {
        alpha[idx] = 0;
        continue;
      }

      let hit: CellShape | null = null;
      for (const shape of shapes) {
        const b = shape.bounds;
        if (localX < b[0] || localX > b[2] || localY < b[1] || localY > b[3]) {
          continue;
        }
        if (pointInSubpaths(localX, localY, shape.subpaths, shape.fillRule)) {
          hit = shape;
        }
      }

      if (!hit) {
        alpha[idx] = 0;
        continue;
      }

      const rgb = pattern.paintType === 2 ? baseRgb : hit.rgb;
      const o = idx * 3;
      data[o] = rgb[0];
      data[o + 1] = rgb[1];
      data[o + 2] = rgb[2];

      let a = Math.round((hit.alphaByte * Math.round(255 * fillMul)) / 255);
      if (softMask && pageToMask) {
        const maskPoint = transformPoint({ x: pageX, y: pageY }, pageToMask);
        const m = sampleSoftMaskAlphaInMaskSpace(softMask, maskPoint.x, maskPoint.y);
        a = Math.round((a * m) / 255);
      }
      alpha[idx] = a;
    }
  }

  const placementInPage: PdfMatrix = [bw, 0, 0, bh, llx, lly];
  const imageGs: PdfGraphicsState = {
    ...outerGs,
    ctm: placementInPage,
    softMaskAlpha: 1,
    softMask: undefined,
    fillPatternName: undefined,
    strokePatternName: undefined,
    fillPatternUnderlyingColorSpace: undefined,
    strokePatternUnderlyingColorSpace: undefined,
    fillPatternColor: undefined,
    strokePatternColor: undefined,
    clipBBox: undefined,
  };

  return {
    type: "image",
    data,
    alpha,
    width,
    height,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: imageGs,
  };
}
