/**
 * @file src/pdf/parser/soft-mask-text-raster.native.ts
 *
 * Rasterizes a limited subset of soft-masked text into a `PdfImage`.
 *
 * Motivation:
 * - PPTX text runs cannot express arbitrary per-pixel alpha masks.
 * - To preserve visual output under ExtGState `/SMask` (per-pixel), we rasterize.
 *
 * Current supported subset (deterministic, bbox-based):
 * - `ParsedText` with `graphicsState.softMask` present
 * - text paint modes: fill/stroke/fillStroke derived from `Tr` (rendering mode)
 * - coverage is approximated as the union of axis-aligned text-run bounding boxes
 *
 * Known limitations:
 * - Does not rasterize glyph outlines; only bounding boxes (can over-paint).
 * - Ignores text rotation/shear and per-glyph geometry.
 */

import type { PdfBBox, PdfColor, PdfImage, PdfMatrix, PdfSoftMask } from "../../domain";
import { DEFAULT_FONT_METRICS, getMatrixScale, multiplyMatrices, transformPoint } from "../../domain";
import { clamp01, cmykToRgb, grayToRgb, toByte } from "../../domain/color";
import type { FontMappings } from "../../domain/font";
import type { ParsedText, TextRun } from "../operator";
import { calculateTextDisplacement } from "../operator";

type TextPaintOp = "fill" | "stroke" | "fillStroke" | "none";

function getTextPaintOp(textRenderingMode: number): TextPaintOp {
  // PDF Reference 9.3, Table 106.
  // 4..6 include clipping but still paint; 7 is clip-only (no paint).
  switch (textRenderingMode) {
    case 0:
    case 4:
      return "fill";
    case 1:
    case 5:
      return "stroke";
    case 2:
    case 6:
      return "fillStroke";
    case 3:
    case 7:
    default:
      return "none";
  }
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

function buildSolidRgbData(width: number, height: number, rgb: readonly [number, number, number]): Uint8Array {
  const pixelCount = width * height;
  const data = new Uint8Array(pixelCount * 3);
  const [r, g, b] = rgb;
  for (let i = 0; i < pixelCount; i += 1) {
    const o = i * 3;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
  }
  return data;
}

function bboxIntersects(a: PdfBBox, b: PdfBBox): boolean {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

type OrientedBox = Readonly<{
  readonly origin: Readonly<{ x: number; y: number }>;
  /** Unit vector along the baseline (start → end). */
  readonly u: Readonly<{ x: number; y: number }>;
  /** Unit vector orthogonal to baseline (perpendicular). */
  readonly n: Readonly<{ x: number; y: number }>;
  /** Baseline length in page space. */
  readonly length: number;
  /** Lower/upper extent along `n` relative to `origin` (page units). */
  readonly minN: number;
  readonly maxN: number;
  /** Axis-aligned bounds for clip culling. */
  readonly aabb: PdfBBox;
}>;

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

function pointInOrientedBox(p: Readonly<{ x: number; y: number }>, box: OrientedBox, pad: number): boolean {
  const dx = p.x - box.origin.x;
  const dy = p.y - box.origin.y;
  const t = dot(dx, dy, box.u.x, box.u.y);
  const s = dot(dx, dy, box.n.x, box.n.y);
  return (
    t >= -pad &&
    t <= box.length + pad &&
    s >= box.minN - pad &&
    s <= box.maxN + pad
  );
}

function computeOrientedBoxForRun(run: TextRun, fontMappings: FontMappings): OrientedBox | null {
  const fontKey = run.baseFont ?? run.fontName;
  const fontInfo = getFontInfo(fontKey, fontMappings);
  const metrics = fontInfo?.metrics ?? DEFAULT_FONT_METRICS;
  const codeByteWidth = fontInfo?.codeByteWidth ?? 1;

  const [tmA, tmB, tmC, tmD, tmE, tmF] = run.textMatrix;
  const textSpaceY = tmF + run.textRise;

  const displacement = calculateTextDisplacement(
    run.text,
    run.fontSize,
    run.charSpacing,
    run.wordSpacing,
    run.horizontalScaling,
    metrics,
    codeByteWidth,
    0,
  );

  const start = transformPoint({ x: tmE, y: textSpaceY }, run.graphicsState.ctm);
  const end = transformPoint({ x: tmE + displacement, y: textSpaceY }, run.graphicsState.ctm);

  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const length = Math.sqrt(vx * vx + vy * vy);
  const ux = length > 1e-6 ? vx / length : 1;
  const uy = length > 1e-6 ? vy / length : 0;
  const nx = -uy;
  const ny = ux;

  const ascender = metrics.ascender ?? 800;
  const descender = metrics.descender ?? -200;
  const size = run.effectiveFontSize;
  if (!Number.isFinite(size) || size <= 0) {return null;}

  const minN = (descender * size) / 1000;
  const maxN = (ascender * size) / 1000;

  const corners = [
    { x: start.x + nx * minN, y: start.y + ny * minN },
    { x: end.x + nx * minN, y: end.y + ny * minN },
    { x: end.x + nx * maxN, y: end.y + ny * maxN },
    { x: start.x + nx * maxN, y: start.y + ny * maxN },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {return null;}

  return {
    origin: start,
    u: { x: ux, y: uy },
    n: { x: nx, y: ny },
    length: Math.max(length, 0),
    minN,
    maxN,
    aabb: [minX, minY, maxX, maxY],
  };
}

function getFontInfo(fontKey: string, fontMappings: FontMappings) {
  const cleanName = fontKey.startsWith("/") ? fontKey.slice(1) : fontKey;
  const direct = fontMappings.get(cleanName);
  if (direct) {return direct;}

  const plusIndex = cleanName.indexOf("+");
  if (plusIndex > 0) {
    const withoutSubset = fontMappings.get(cleanName.slice(plusIndex + 1));
    if (withoutSubset) {return withoutSubset;}
  }

  for (const [key, value] of fontMappings.entries()) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return value;
    }
  }

  return undefined;
}

export function rasterizeSoftMaskedText(parsed: ParsedText, fontMappings: FontMappings): PdfImage | null {
  if (!fontMappings) {throw new Error("fontMappings is required");}

  const gs = parsed.graphicsState;
  const softMask: PdfSoftMask | undefined = gs.softMask;
  if (!softMask) {return null;}

  const paintOp = getTextPaintOp(gs.textRenderingMode);
  if (paintOp === "none") {return null;}
  if (parsed.runs.length === 0) {return null;}

  const [llx, lly, urx, ury] = softMask.bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const pixelCount = softMask.width * softMask.height;
  if (softMask.width <= 0 || softMask.height <= 0) {return null;}
  if (softMask.alpha.length !== pixelCount) {return null;}

  const clipBBox = gs.clipBBox;
  const runBoxes: OrientedBox[] = [];
  for (const run of parsed.runs) {
    const box = computeOrientedBoxForRun(run, fontMappings);
    if (!box) {continue;}
    if (clipBBox) {
      if (!bboxIntersects(box.aabb, clipBBox)) {continue;}
    }
    runBoxes.push(box);
  }

  if (runBoxes.length === 0) {
    // Match the existing bbox-only behavior: no visible output.
    return null;
  }

  const maskToPage = multiplyMatrices(gs.ctm, softMask.matrix);

  const fillRgb = colorToRgbBytes(gs.fillColor);
  const strokeRgb = colorToRgbBytes(gs.strokeColor);
  const baseRgb = paintOp === "stroke" ? strokeRgb : fillRgb;
  const data = buildSolidRgbData(softMask.width, softMask.height, baseRgb);
  const alpha = new Uint8Array(pixelCount);

  const softMaskAlpha = clamp01(gs.softMaskAlpha ?? 1);
  const fillAlpha = clamp01(gs.fillAlpha);
  const strokeAlpha = clamp01(gs.strokeAlpha);
  const fillMul = softMaskAlpha * fillAlpha;
  const strokeMul = softMaskAlpha * strokeAlpha;

  const scale = getMatrixScale(gs.ctm);
  const lineWidth = gs.lineWidth * ((scale.scaleX + scale.scaleY) / 2);
  const halfW = lineWidth / 2;

  const needsStroke = paintOp === "stroke" || paintOp === "fillStroke";

  for (let row = 0; row < softMask.height; row += 1) {
    for (let col = 0; col < softMask.width; col += 1) {
      const idx = row * softMask.width + col;
      const maskX = llx + ((col + 0.5) / softMask.width) * bw;
      const maskY = ury - ((row + 0.5) / softMask.height) * bh;
      const pagePoint = transformPoint({ x: maskX, y: maskY }, maskToPage);

      const maskByte = softMask.alpha[idx] ?? 0;
      if (maskByte === 0) {
        alpha[idx] = 0;
        continue;
      }

      const fillCov = paintOp === "fill" || paintOp === "fillStroke"
        ? runBoxes.some((b) => pointInOrientedBox(pagePoint, b, 0))
        : false;

      const strokeCov = needsStroke
        ? runBoxes.some((b) => pointInOrientedBox(pagePoint, b, halfW))
        : false;

      const fillA = fillCov ? Math.round(maskByte * fillMul) : 0;
      const strokeA = strokeCov ? Math.round(maskByte * strokeMul) : 0;

      if (fillA === 0 && strokeA === 0) {
        alpha[idx] = 0;
        continue;
      }

      const dst = idx * 3;
      if (strokeA === 0) {
        data[dst] = fillRgb[0];
        data[dst + 1] = fillRgb[1];
        data[dst + 2] = fillRgb[2];
        alpha[idx] = fillA;
        continue;
      }
      if (fillA === 0) {
        data[dst] = strokeRgb[0];
        data[dst + 1] = strokeRgb[1];
        data[dst + 2] = strokeRgb[2];
        alpha[idx] = strokeA;
        continue;
      }

      // Composite: stroke over fill (straight alpha).
      const outA = strokeA + Math.round((fillA * (255 - strokeA)) / 255);
      const premFillScale = (255 - strokeA) / 255;
      const premR = strokeRgb[0] * strokeA + Math.round(fillRgb[0] * fillA * premFillScale);
      const premG = strokeRgb[1] * strokeA + Math.round(fillRgb[1] * fillA * premFillScale);
      const premB = strokeRgb[2] * strokeA + Math.round(fillRgb[2] * fillA * premFillScale);

      data[dst] = Math.round(premR / outA);
      data[dst + 1] = Math.round(premG / outA);
      data[dst + 2] = Math.round(premB / outA);
      alpha[idx] = outA;
    }
  }

  const placementInMaskSpace: PdfMatrix = [bw, 0, 0, bh, llx, lly];
  const imageCtm = multiplyMatrices(maskToPage, placementInMaskSpace);
  const imageGs = {
    ...gs,
    ctm: imageCtm,
    softMaskAlpha: 1,
    softMask: undefined,
  };

  return {
    type: "image",
    data,
    alpha,
    width: softMask.width,
    height: softMask.height,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: imageGs,
  };
}
