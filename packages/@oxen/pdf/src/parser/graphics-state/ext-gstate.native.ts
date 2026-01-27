/**
 * @file src/pdf/parser/ext-gstate.native.ts
 */

import type { NativePdfPage } from "../../native";
import type { PdfDict, PdfObject, PdfStream } from "../../native/core/types";
import { decodePdfStream } from "../../native/stream/stream";
import { tokenizeContentStream } from "../../domain/content-stream";
import type { PdfColor, PdfColorSpace, PdfMatrix, PdfSoftMask } from "../../domain";
import {
  DEFAULT_FONT_METRICS,
  createGraphicsStateStack,
  getMatrixScale,
  invertMatrix,
  transformPoint,
} from "../../domain";
import type { FontMappings } from "../../domain/font";
import { clamp01, cmykToRgb, grayToRgb, toByte } from "../../domain/color";
import { convertToRgba } from "../../converter/pixel-converter";
import {
  calculateTextDisplacement,
  createGfxOpsFromStack,
  createParser,
  type ParsedElement,
  type ParsedText,
  type TextRun,
} from "../operator";
import { rasterizeSoftMaskedFillPath } from "../soft-mask/soft-mask-raster.native";
import { extractFontMappingsFromResourcesNative } from "../font/font-decoder.native";
import { extractShadingFromResourcesNative } from "../shading/shading.native";
import { extractPatternsFromResourcesNative } from "../pattern/pattern.native";
import { extractColorSpacesFromResourcesNative } from "../color/color-space.native";
import { decodeImageXObjectStreamNative } from "../image/image-extractor.native";
import type { JpxDecodeFn } from "../jpeg2000/jpx-decoder";
import { applyGraphicsSoftMaskToPdfImage } from "../soft-mask/soft-mask-apply.native";

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}

function asName(obj: PdfObject | undefined): string | null {
  return obj?.type === "name" ? obj.value : null;
}

function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function asBool(obj: PdfObject | undefined): boolean | null {
  return obj?.type === "bool" ? obj.value : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

export type ExtGStateAlpha = Readonly<{ readonly fillAlpha?: number; readonly strokeAlpha?: number }>;

export type ExtGStateParams = Readonly<{
  readonly fillAlpha?: number;
  readonly strokeAlpha?: number;
  readonly blendMode?: string;
  readonly softMaskAlpha?: number;
  readonly softMask?: PdfSoftMask;
  readonly lineWidth?: number;
  readonly lineCap?: 0 | 1 | 2;
  readonly lineJoin?: 0 | 1 | 2;
  readonly miterLimit?: number;
  readonly dashArray?: readonly number[];
  readonly dashPhase?: number;
}>;

export type ExtGStateExtractOptions = Readonly<{
  /**
   * When > 0, enables rasterization for per-pixel `/SMask` groups that do not
   * contain images (i.e. paths-only masks).
   *
   * The value is the maximum of `{width,height}` for the generated mask grid.
   */
  readonly vectorSoftMaskMaxSize?: number;
  /**
   * Enables rasterization for `sh` (shading fill) inside per-pixel `/SMask` groups.
   *
   * The value is the maximum of `{width,height}` for any generated shading raster.
   * Set to `0` (or leave undefined) to keep shading rasterization disabled.
   */
  readonly shadingMaxSize?: number;
  /**
   * Optional decoder for `/JPXDecode` (JPEG2000) images encountered while
   * evaluating per-pixel ExtGState `/SMask` groups.
   */
  readonly jpxDecode?: JpxDecodeFn;
}>;

function asArray(obj: PdfObject | undefined): readonly PdfObject[] | null {
  return obj?.type === "array" ? obj.items : null;
}

function isValidCapOrJoin(v: number): v is 0 | 1 | 2 {
  return v === 0 || v === 1 || v === 2;
}

function parseDashPattern(obj: PdfObject | undefined): { dashArray: readonly number[]; dashPhase: number } | null {
  const arr = asArray(obj);
  if (!arr || arr.length < 2) {return null;}
  const patternArr = arr[0];
  const phaseObj = arr[1];
  if (!patternArr || patternArr.type !== "array") {return null;}
  if (!phaseObj || phaseObj.type !== "number" || !Number.isFinite(phaseObj.value)) {return null;}

  const dashArray = patternArr.items
    .filter((it): it is { type: "number"; value: number } => it?.type === "number")
    .map((n) => n.value)
    .filter((n) => Number.isFinite(n));

  return { dashArray, dashPhase: phaseObj.value };
}

function parseBlendMode(page: NativePdfPage, obj: PdfObject | undefined): string | null {
  const resolved = resolve(page, obj);
  if (!resolved) {return null;}
  if (resolved.type === "name") {return resolved.value;}
  if (resolved.type === "array") {
    for (const item of resolved.items) {
      const name = asName(resolve(page, item));
      if (name) {return name;}
    }
  }
  return null;
}

type BBox4 = readonly [number, number, number, number];

function parseBBox4(obj: PdfObject | undefined): BBox4 | null {
  if (!obj || obj.type !== "array" || obj.items.length !== 4) {return null;}
  const nums: number[] = [];
  for (const item of obj.items) {
    if (!item || item.type !== "number" || !Number.isFinite(item.value)) {return null;}
    nums.push(item.value);
  }
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 0];
}

function parseMatrix6(page: NativePdfPage, obj: PdfObject | undefined): PdfMatrix | null {
  const resolved = resolve(page, obj);
  if (!resolved || resolved.type !== "array" || resolved.items.length !== 6) {return null;}
  const nums: number[] = [];
  for (const item of resolved.items) {
    if (!item || item.type !== "number" || !Number.isFinite(item.value)) {return null;}
    nums.push(item.value);
  }
  return [nums[0] ?? 1, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1, nums[4] ?? 0, nums[5] ?? 0];
}

type SoftMaskKind = "Alpha" | "Luminosity";
const IDENTITY_MATRIX: PdfMatrix = [1, 0, 0, 1, 0, 0];

type SoftMaskParseResult =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; softMaskAlpha: number; softMask?: PdfSoftMask }>;

type OrientedBox = Readonly<{
  readonly origin: Readonly<{ x: number; y: number }>;
  /** Unit vector along the baseline (start → end). */
  readonly u: Readonly<{ x: number; y: number }>;
  /** Unit vector orthogonal to baseline (perpendicular). */
  readonly n: Readonly<{ x: number; y: number }>;
  /** Baseline length in user space. */
  readonly length: number;
  /** Lower/upper extent along `n` relative to `origin` (user units). */
  readonly minN: number;
  readonly maxN: number;
  /** Axis-aligned bounds for coarse culling. */
  readonly aabb: BBox4;
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

function bboxIntersects(a: BBox4, b: BBox4): boolean {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
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

function computeOrientedBoxForRun(run: TextRun, fontMappings: FontMappings): OrientedBox | null {
  const fontKey = run.baseFont ?? run.fontName;
  const fontInfo = getFontInfo(fontKey, fontMappings);
  const metrics = fontInfo?.metrics ?? DEFAULT_FONT_METRICS;
  const codeByteWidth = fontInfo?.codeByteWidth ?? 1;

  const [tmE, tmF] = [run.textMatrix[4], run.textMatrix[5]];
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

function isIdentityCtm(ctm: readonly number[]): boolean {
  return (
    ctm.length === 6 &&
    ctm[0] === 1 &&
    ctm[1] === 0 &&
    ctm[2] === 0 &&
    ctm[3] === 1 &&
    ctm[4] === 0 &&
    ctm[5] === 0
  );
}

function luminance01FromColor(color: PdfColor): number | null {
  switch (color.colorSpace) {
    case "DeviceGray": {
      const g = color.components[0] ?? 0;
      return Number.isFinite(g) ? clamp01(g) : null;
    }
    case "DeviceRGB": {
      const r = clamp01(color.components[0] ?? 0);
      const g = clamp01(color.components[1] ?? 0);
      const b = clamp01(color.components[2] ?? 0);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    case "DeviceCMYK": {
      const [r, g, b] = cmykToRgb(
        color.components[0] ?? 0,
        color.components[1] ?? 0,
        color.components[2] ?? 0,
        color.components[3] ?? 0,
      );
      return 0.299 * (r / 255) + 0.587 * (g / 255) + 0.114 * (b / 255);
    }
    case "ICCBased": {
      const alt = color.alternateColorSpace;
      if (alt === "DeviceGray") {
        const g = color.components[0] ?? 0;
        return Number.isFinite(g) ? clamp01(g) : null;
      }
      if (alt === "DeviceRGB") {
        const r = clamp01(color.components[0] ?? 0);
        const g = clamp01(color.components[1] ?? 0);
        const b = clamp01(color.components[2] ?? 0);
        return 0.299 * r + 0.587 * g + 0.114 * b;
      }
      if (alt === "DeviceCMYK") {
        const [r, g, b] = cmykToRgb(
          color.components[0] ?? 0,
          color.components[1] ?? 0,
          color.components[2] ?? 0,
          color.components[3] ?? 0,
        );
        return 0.299 * (r / 255) + 0.587 * (g / 255) + 0.114 * (b / 255);
      }
      // Unknown; fall back to component-count guesses.
      const n = color.components.length;
      if (n === 1) {return clamp01(color.components[0] ?? 0);}
      if (n === 3) {
        const r = clamp01(color.components[0] ?? 0);
        const g = clamp01(color.components[1] ?? 0);
        const b = clamp01(color.components[2] ?? 0);
        return 0.299 * r + 0.587 * g + 0.114 * b;
      }
      if (n === 4) {
        const [r, g, b] = cmykToRgb(color.components[0] ?? 0, color.components[1] ?? 0, color.components[2] ?? 0, color.components[3] ?? 0);
        return 0.299 * (r / 255) + 0.587 * (g / 255) + 0.114 * (b / 255);
      }
      return null;
    }
    case "Pattern":
    default:
      return null;
  }
}

function tryExtractConstantSoftMaskValueFromElements(
  elements: readonly ParsedElement[],
  bbox: BBox4,
  kind: SoftMaskKind,
): number | null {
  if (elements.length !== 1) {return null;}
  const only = elements[0];
  if (!only || only.type !== "path") {return null;}
  if (only.paintOp !== "fill" && only.paintOp !== "fillStroke") {return null;}
  if (!isIdentityCtm(only.graphicsState.ctm)) {return null;}
  if (only.operations.length !== 1) {return null;}
  const op = only.operations[0];
  if (!op || op.type !== "rect") {return null;}

  const [llx, lly, urx, ury] = bbox;
  const w = urx - llx;
  const h = ury - lly;
  if (op.x !== llx || op.y !== lly || op.width !== w || op.height !== h) {return null;}

  if (kind === "Alpha") {
    const a = only.graphicsState.fillAlpha;
    if (!Number.isFinite(a) || a < 0 || a > 1) {return null;}
    return a;
  }

  // Luminosity mask: use the fill color luminance, multiplied by the fill alpha.
  const lum = luminance01FromColor(only.graphicsState.fillColor);
  if (lum == null) {return null;}
  const a = clamp01(only.graphicsState.fillAlpha);
  return clamp01(lum * a);
}

function parseDeviceColorSpaceNameFromObject(page: NativePdfPage, obj: PdfObject | undefined): PdfColorSpace | null {
  const resolved = resolve(page, obj);
  const name = asName(resolved) ?? (() => {
    const items = asArray(resolved);
    const first = items?.[0];
    return first?.type === "name" ? first.value : null;
  })();
  if (name === "DeviceGray") {return "DeviceGray";}
  if (name === "DeviceRGB") {return "DeviceRGB";}
  if (name === "DeviceCMYK") {return "DeviceCMYK";}
  return null;
}

function parseSoftMaskBackdropRgb(
  page: NativePdfPage,
  softMaskDict: PdfDict,
  groupColorSpace: PdfColorSpace | null,
): readonly [number, number, number] | null {
  const bc = resolve(page, dictGet(softMaskDict, "BC"));
  const arr = asArray(bc);
  if (!arr || arr.length === 0) {return null;}

  const comps: number[] = [];
  for (const item of arr) {
    if (!item || item.type !== "number" || !Number.isFinite(item.value)) {return null;}
    comps.push(item.value);
  }

  const cs = groupColorSpace ?? (() => {
    if (comps.length === 1) {return "DeviceGray" as const;}
    if (comps.length === 3) {return "DeviceRGB" as const;}
    if (comps.length === 4) {return "DeviceCMYK" as const;}
    return null;
  })();
  if (!cs) {return null;}

  if (cs === "DeviceGray") {
    const g = clamp01(comps[0] ?? 0);
    return grayToRgb(g);
  }
  if (cs === "DeviceRGB") {
    const r = toByte(clamp01(comps[0] ?? 0));
    const g = toByte(clamp01(comps[1] ?? 0));
    const b = toByte(clamp01(comps[2] ?? 0));
    return [r, g, b];
  }
  if (cs === "DeviceCMYK") {
    return cmykToRgb(
      clamp01(comps[0] ?? 0),
      clamp01(comps[1] ?? 0),
      clamp01(comps[2] ?? 0),
      clamp01(comps[3] ?? 0),
    );
  }
  return null;
}

function getNumberValue(page: NativePdfPage, dict: PdfDict, key: string): number | null {
  const v = resolve(page, dictGet(dict, key));
  return v?.type === "number" && Number.isFinite(v.value) ? v.value : null;
}

function getXObjectsDict(page: NativePdfPage, resources: PdfDict | null): PdfDict | null {
  if (!resources) {return null;}
  return asDict(resolve(page, dictGet(resources, "XObject")));
}

function resolveXObjectStreamByName(page: NativePdfPage, xObjects: PdfDict, name: string): PdfStream | null {
  const clean = name.startsWith("/") ? name.slice(1) : name;
  return asStream(resolve(page, dictGet(xObjects, clean)));
}

function tryExtractPerPixelSoftMaskFromElements(
  page: NativePdfPage,
  elements: readonly ParsedElement[],
  bbox: BBox4,
  matrix: PdfMatrix,
  kind: SoftMaskKind,
  resources: PdfDict | null,
  fontMappings: FontMappings,
  options: ExtGStateExtractOptions,
  groupKnockout: boolean,
  groupIsolated: boolean,
  backdropRgb: readonly [number, number, number] | null,
): PdfSoftMask | null {
  type MaskLayer =
    | Readonly<{
      readonly kind: "image";
      readonly width: number;
      readonly height: number;
      readonly rgba: Uint8ClampedArray;
      readonly smaskAlpha: Uint8Array | null;
      readonly opacity: number;
      readonly imageMatrixInv: PdfMatrix;
    }>
    | Readonly<{
      readonly kind: "pdfImage";
      readonly width: number;
      readonly height: number;
      readonly data: Uint8Array;
      readonly alpha: Uint8Array | null;
      readonly opacity: number;
      readonly imageMatrixInv: PdfMatrix;
    }>
    | Readonly<{
      readonly kind: "raster";
      readonly width: number;
      readonly height: number;
      readonly data: Uint8Array;
      readonly alpha: Uint8Array;
    }>;

  type RasterLayer = Extract<MaskLayer, { readonly kind: "raster" }>;

  const hasOnlyImagesPathsOrText = elements.every((e) => e.type === "image" || e.type === "path" || e.type === "text" || e.type === "rasterImage");
  if (!hasOnlyImagesPathsOrText) {return null;}

  const imageElements = elements.filter((e): e is Extract<ParsedElement, { readonly type: "image" }> => e.type === "image");
  const pathElements = elements.filter((e): e is Extract<ParsedElement, { readonly type: "path" }> => e.type === "path");
  const textElements = elements.filter((e): e is Extract<ParsedElement, { readonly type: "text" }> => e.type === "text");
  const rasterImageElements = elements.filter((e): e is Extract<ParsedElement, { readonly type: "rasterImage" }> => e.type === "rasterImage");
  const hasXObjectImages = imageElements.length > 0;
  const hasRasterImages = rasterImageElements.length > 0;

  const rasterizeTextElementToGrid = (
    elem: ParsedText,
    width: number,
    height: number,
    bbox: BBox4,
    fontMappings: FontMappings,
  ): RasterLayer | null | undefined => {
    const gs = elem.graphicsState;
    if (gs.softMask) {return null;}

    const paintOp = getTextPaintOp(gs.textRenderingMode);
    if (paintOp === "none") {return undefined;}
    if (elem.runs.length === 0) {return undefined;}

    const clipBBox = gs.clipBBox;
    const runBoxes: OrientedBox[] = [];
    for (const run of elem.runs) {
      const box = computeOrientedBoxForRun(run, fontMappings);
      if (!box) {continue;}
      if (clipBBox) {
        if (!bboxIntersects(box.aabb, clipBBox)) {continue;}
      }
      runBoxes.push(box);
    }
    if (runBoxes.length === 0) {return undefined;}

    const pixelCount = width * height;
    const alpha = new Uint8Array(pixelCount);
    const data = new Uint8Array(pixelCount * 3);

    const softMaskAlpha = clamp01(gs.softMaskAlpha ?? 1);
    const fillMul = softMaskAlpha * clamp01(gs.fillAlpha);
    const strokeMul = softMaskAlpha * clamp01(gs.strokeAlpha);

    const fillRgb = colorToRgbBytes(gs.fillColor);
    const strokeRgb = colorToRgbBytes(gs.strokeColor);

    const scale = getMatrixScale(gs.ctm);
    const lineWidth = gs.lineWidth * ((scale.scaleX + scale.scaleY) / 2);
    const halfW = lineWidth / 2;

    // Restrict pixel loops to the union of run AABBs (expanded for stroke pad).
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of runBoxes) {
      minX = Math.min(minX, b.aabb[0]);
      minY = Math.min(minY, b.aabb[1]);
      maxX = Math.max(maxX, b.aabb[2]);
      maxY = Math.max(maxY, b.aabb[3]);
    }

    const [llx, lly, urx, ury] = bbox;
    const bw = urx - llx;
    const bh = ury - lly;
    if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

    const pad = paintOp === "stroke" || paintOp === "fillStroke" ? halfW : 0;
    const clipX1 = Math.max(llx, minX - pad);
    const clipX2 = Math.min(urx, maxX + pad);
    const clipY1 = Math.max(lly, minY - pad);
    const clipY2 = Math.min(ury, maxY + pad);
    if (clipX2 <= clipX1 || clipY2 <= clipY1) {return undefined;}

    const colStart = Math.max(0, Math.floor(((clipX1 - llx) / bw) * width));
    const colEnd = Math.min(width - 1, Math.ceil(((clipX2 - llx) / bw) * width));
    const rowStart = Math.max(0, Math.floor(((ury - clipY2) / bh) * height));
    const rowEnd = Math.min(height - 1, Math.ceil(((ury - clipY1) / bh) * height));

    const needsStroke = paintOp === "stroke" || paintOp === "fillStroke";

    for (let row = rowStart; row <= rowEnd; row += 1) {
      const maskY = ury - ((row + 0.5) / height) * bh;
      for (let col = colStart; col <= colEnd; col += 1) {
        const idx = row * width + col;
        const maskX = llx + ((col + 0.5) / width) * bw;

        const p = { x: maskX, y: maskY };
        const fillCov = (paintOp === "fill" || paintOp === "fillStroke") && runBoxes.some((b) => pointInOrientedBox(p, b, 0));
        const strokeCov = needsStroke && runBoxes.some((b) => pointInOrientedBox(p, b, halfW));

        const fillA = fillCov ? Math.round(255 * fillMul) : 0;
        const strokeA = strokeCov ? Math.round(255 * strokeMul) : 0;
        if (fillA === 0 && strokeA === 0) {continue;}

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

    return { kind: "raster", width, height, data, alpha };
  };

  if (!hasXObjectImages && !hasRasterImages) {
    const maxSize = options.vectorSoftMaskMaxSize;
    if (maxSize == null) {return null;}
    if (!Number.isFinite(maxSize) || maxSize <= 0) {throw new Error(`vectorSoftMaskMaxSize must be > 0 (got ${maxSize})`);}
    if (pathElements.length === 0 && textElements.length === 0) {return null;}

    const [llx, lly, urx, ury] = bbox;
    const bw = urx - llx;
    const bh = ury - lly;
    if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

    const maxDim = Math.max(bw, bh);
    const scale = maxSize / maxDim;
    const width = Math.max(1, Math.round(bw * scale));
    const height = Math.max(1, Math.round(bh * scale));

    const pixelCount = width * height;
    const opaqueMask = new Uint8Array(pixelCount);
    opaqueMask.fill(255);
    const renderGrid: PdfSoftMask = {
      kind: "Alpha",
      width,
      height,
      alpha: opaqueMask,
      bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
      matrix: IDENTITY_MATRIX,
    };

    if (kind === "Alpha") {
      const out = new Uint8Array(pixelCount);
      for (const elem of elements) {
        if (elem.type === "path") {
          if (elem.paintOp === "none" || elem.paintOp === "clip") {continue;}
          if (elem.graphicsState.softMask) {return null;}

          const ctmInv = invertMatrix(elem.graphicsState.ctm);
          if (!ctmInv) {return null;}
          const gridInMaskSpace: PdfSoftMask = { ...renderGrid, matrix: ctmInv };

          const raster = rasterizeSoftMaskedFillPath({ ...elem, graphicsState: { ...elem.graphicsState, softMask: gridInMaskSpace } });
          if (!raster || raster.type !== "image" || !raster.alpha) {return null;}
          if (raster.width !== width || raster.height !== height) {return null;}

          for (let i = 0; i < pixelCount; i += 1) {
            const srcA = raster.alpha[i] ?? 0;
            if (srcA === 0) {continue;}
            if (groupKnockout) {
              out[i] = srcA;
            } else {
              const dstA = out[i] ?? 0;
              out[i] = srcA + Math.round((dstA * (255 - srcA)) / 255);
            }
          }
          continue;
        }
        if (elem.type === "text") {
          const layer = rasterizeTextElementToGrid(elem, width, height, bbox, fontMappings);
          if (layer === null) {return null;}
          if (!layer) {continue;}

          for (let i = 0; i < pixelCount; i += 1) {
            const srcA = layer.alpha[i] ?? 0;
          if (srcA === 0) {continue;}
          if (groupKnockout) {
            out[i] = srcA;
          } else {
            const dstA = out[i] ?? 0;
            out[i] = srcA + Math.round((dstA * (255 - srcA)) / 255);
          }
        }
          continue;
        }
        return null;
      }
      return { kind, width, height, alpha: out, bbox: [bbox[0], bbox[1], bbox[2], bbox[3]], matrix };
    }

    const outA = new Uint16Array(pixelCount);
    const premR = new Uint32Array(pixelCount);
    const premG = new Uint32Array(pixelCount);
    const premB = new Uint32Array(pixelCount);

    if (!groupIsolated && backdropRgb) {
      const [br, bg, bb] = backdropRgb;
      for (let i = 0; i < pixelCount; i += 1) {
        outA[i] = 255;
        premR[i] = br * 255;
        premG[i] = bg * 255;
        premB[i] = bb * 255;
      }
    }

    for (const elem of elements) {
      let layer: RasterLayer | null | undefined = undefined;

      if (elem.type === "path") {
        if (elem.paintOp === "none" || elem.paintOp === "clip") {continue;}
        if (elem.graphicsState.softMask) {return null;}

        const ctmInv = invertMatrix(elem.graphicsState.ctm);
        if (!ctmInv) {return null;}
        const gridInMaskSpace: PdfSoftMask = { ...renderGrid, matrix: ctmInv };

        const raster = rasterizeSoftMaskedFillPath({ ...elem, graphicsState: { ...elem.graphicsState, softMask: gridInMaskSpace } });
        if (!raster || raster.type !== "image" || !raster.alpha) {return null;}
        if (raster.width !== width || raster.height !== height) {return null;}
        layer = { kind: "raster", width, height, data: raster.data, alpha: raster.alpha };
      } else if (elem.type === "text") {
        layer = rasterizeTextElementToGrid(elem, width, height, bbox, fontMappings);
        if (layer === null) {return null;}
        if (!layer) {continue;}
      } else {
        return null;
      }

      for (let i = 0; i < pixelCount; i += 1) {
        const srcA = layer.alpha[i] ?? 0;
        if (srcA === 0) {continue;}
        const o = i * 3;
        const r = layer.data[o] ?? 0;
        const g = layer.data[o + 1] ?? 0;
        const b = layer.data[o + 2] ?? 0;

        if (groupKnockout) {
          premR[i] = r * srcA;
          premG[i] = g * srcA;
          premB[i] = b * srcA;
          outA[i] = srcA;
        } else {
          const invA = 255 - srcA;
          premR[i] = r * srcA + Math.round((premR[i] * invA) / 255);
          premG[i] = g * srcA + Math.round((premG[i] * invA) / 255);
          premB[i] = b * srcA + Math.round((premB[i] * invA) / 255);
          outA[i] = srcA + Math.round((outA[i] * invA) / 255);
        }
      }
    }

    const out = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i += 1) {
      const a = outA[i] ?? 0;
      if (a === 0) {
        out[i] = 0;
        continue;
      }
      const r = Math.round((premR[i] ?? 0) / a);
      const g = Math.round((premG[i] ?? 0) / a);
      const b = Math.round((premB[i] ?? 0) / a);
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      out[i] = Math.round((lum * a) / 255);
    }

    return { kind, width, height, alpha: out, bbox: [bbox[0], bbox[1], bbox[2], bbox[3]], matrix };
  }

  const xObjects = hasXObjectImages ? getXObjectsDict(page, resources) : null;
  if (hasXObjectImages && !xObjects) {return null;}

  const decodedImagesByName = new Map<
    string,
    Readonly<{
      readonly width: number;
      readonly height: number;
      readonly rgba: Uint8ClampedArray;
      readonly smaskAlpha: Uint8Array | null;
      readonly opacity: number;
    }>
  >();

  let width: number | null = null;
  let height: number | null = null;

  if (hasXObjectImages) {
    for (const img of imageElements) {
      const key = img.name;
      const cached = decodedImagesByName.get(key);
      if (cached) {
        if (width == null || height == null) {
          width = cached.width;
          height = cached.height;
        } else if (cached.width !== width || cached.height !== height) {
          return null;
        }
        continue;
      }

      if (!xObjects) {return null;}
      const stream = resolveXObjectStreamByName(page, xObjects, img.name);
      if (!stream) {return null;}

      const dict = stream.dict;
      const subtype = asName(dictGet(dict, "Subtype"));
      if (subtype !== "Image") {return null;}

      const decoded = decodeImageXObjectStreamNative(page, stream, img.graphicsState, { jpxDecode: options.jpxDecode });
      if (!decoded) {return null;}
      const applied = applyGraphicsSoftMaskToPdfImage(decoded);
      const rgba = convertToRgba(applied.data, applied.width, applied.height, applied.colorSpace, applied.bitsPerComponent, {
        decode: applied.decode,
      });

      const w = applied.width;
      const h = applied.height;
      if (w <= 0 || h <= 0) {return null;}
      if (width == null || height == null) {
        width = w;
        height = h;
      } else if (w !== width || h !== height) {
        return null;
      }

      const opacity = clamp01(applied.graphicsState.fillAlpha);
      const smaskAlpha = applied.alpha ?? null;

      decodedImagesByName.set(key, { width, height, rgba, smaskAlpha, opacity });
    }
  }

  if (width == null || height == null) {
    for (const ri of rasterImageElements) {
      const img = ri.image;
      const w = img.width ?? 0;
      const h = img.height ?? 0;
      if (w <= 0 || h <= 0) {continue;}
      width = Math.max(width ?? 0, w);
      height = Math.max(height ?? 0, h);
    }
  }

  if (width == null || height == null) {return null;}

  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);

  const layers: MaskLayer[] = [];
  const opaqueMask = new Uint8Array(pixelCount);
  opaqueMask.fill(255);
  const renderGrid: PdfSoftMask = {
    kind: "Alpha",
    width,
    height,
    alpha: opaqueMask,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    matrix: IDENTITY_MATRIX,
  };

  for (const elem of elements) {
    if (elem.type === "image") {
      const decoded = decodedImagesByName.get(elem.name);
      if (!decoded) {return null;}
      const imageMatrixInv = invertMatrix(elem.graphicsState.ctm);
      if (!imageMatrixInv) {return null;}
      layers.push({
        kind: "image",
        width: decoded.width,
        height: decoded.height,
        rgba: decoded.rgba,
        smaskAlpha: decoded.smaskAlpha,
        opacity: decoded.opacity,
        imageMatrixInv,
      });
      continue;
    }
    if (elem.type === "rasterImage") {
      const img = elem.image;
      if (img.colorSpace !== "DeviceRGB" || img.bitsPerComponent !== 8) {return null;}
      const imageMatrixInv = invertMatrix(img.graphicsState.ctm);
      if (!imageMatrixInv) {return null;}
      const opacity = clamp01(img.graphicsState.fillAlpha);
      layers.push({
        kind: "pdfImage",
        width: img.width,
        height: img.height,
        data: img.data,
        alpha: img.alpha ?? null,
        opacity,
        imageMatrixInv,
      });
      continue;
    }
    if (elem.type === "path") {
      if (elem.paintOp === "none" || elem.paintOp === "clip") {
        continue;
      }
      if (elem.graphicsState.softMask) {return null;}
      const ctmInv = invertMatrix(elem.graphicsState.ctm);
      if (!ctmInv) {return null;}
      const gridInMaskSpace: PdfSoftMask = { ...renderGrid, matrix: ctmInv };
      const raster = rasterizeSoftMaskedFillPath({
        ...elem,
        graphicsState: {
          ...elem.graphicsState,
          softMask: gridInMaskSpace,
        },
      });
      if (!raster || raster.type !== "image") {
        return null;
      }
      if (!raster.alpha) {
        return null;
      }
      if (raster.width !== width || raster.height !== height) {
        return null;
      }
      layers.push({ kind: "raster", width, height, data: raster.data, alpha: raster.alpha });
      continue;
    }
    if (elem.type === "text") {
      const layer = rasterizeTextElementToGrid(elem, width, height, bbox, fontMappings);
      if (layer === null) {return null;}
      if (!layer) {continue;}
      if (layer.width !== width || layer.height !== height) {return null;}
      layers.push(layer);
      continue;
    }
    return null;
  }

  for (let row = 0; row < height; row += 1) {
    const maskY = ury - ((row + 0.5) / height) * bh;
    for (let col = 0; col < width; col += 1) {
      const maskX = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;

      if (kind === "Alpha") {
        let outA = 0;
        for (const layer of layers) {
          let srcA = 0;
          if (layer.kind === "raster") {
            srcA = layer.alpha[idx] ?? 0;
          } else if (layer.kind === "pdfImage") {
            const imagePoint = transformPoint({ x: maskX, y: maskY }, layer.imageMatrixInv);
            const u = imagePoint.x;
            const v = imagePoint.y;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) {
              continue;
            }
            const srcCol = Math.min(layer.width - 1, Math.max(0, Math.floor(u * layer.width)));
            const srcRow = Math.min(layer.height - 1, Math.max(0, Math.floor((1 - v) * layer.height)));
            const srcIdx = srcRow * layer.width + srcCol;
            srcA = layer.alpha ? (layer.alpha[srcIdx] ?? 0) : -1;
            if (srcA < 0) {
              const o = srcIdx * 3;
              const r = layer.data[o] ?? 0;
              const g = layer.data[o + 1] ?? 0;
              const b = layer.data[o + 2] ?? 0;
              if (r !== g || g !== b) {return null;}
              srcA = r;
            }
            srcA = Math.round(srcA * layer.opacity);
          } else {
            const imagePoint = transformPoint({ x: maskX, y: maskY }, layer.imageMatrixInv);
            const u = imagePoint.x;
            const v = imagePoint.y;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) {
              continue;
            }
            const srcCol = Math.min(layer.width - 1, Math.max(0, Math.floor(u * layer.width)));
            const srcRow = Math.min(layer.height - 1, Math.max(0, Math.floor((1 - v) * layer.height)));
            const srcIdx = srcRow * layer.width + srcCol;

            srcA = layer.smaskAlpha ? (layer.smaskAlpha[srcIdx] ?? 0) : -1;
            if (srcA < 0) {
              const o = srcIdx * 4;
              const r = layer.rgba[o] ?? 0;
              const g = layer.rgba[o + 1] ?? 0;
              const b = layer.rgba[o + 2] ?? 0;
              // Heuristic fallback: accept grayscale images as alpha sources.
              if (r !== g || g !== b) {return null;}
              srcA = r;
            }
            srcA = Math.round(srcA * layer.opacity);
          }

          if (srcA === 0) {continue;}
          if (groupKnockout) {
            outA = srcA;
          } else {
            outA = srcA + Math.round((outA * (255 - srcA)) / 255);
          }
        }
        alpha[idx] = outA;
        continue;
      }

      let outA = 0;
      let premR = 0;
      let premG = 0;
      let premB = 0;

      if (!groupIsolated && backdropRgb) {
        const [br, bg, bb] = backdropRgb;
        outA = 255;
        premR = br * 255;
        premG = bg * 255;
        premB = bb * 255;
      }

      for (const layer of layers) {
        let srcA = 0;
        let r = 0;
        let g = 0;
        let b = 0;

        if (layer.kind === "raster") {
          srcA = layer.alpha[idx] ?? 0;
          if (srcA === 0) {continue;}
          const o = idx * 3;
          r = layer.data[o] ?? 0;
          g = layer.data[o + 1] ?? 0;
          b = layer.data[o + 2] ?? 0;
        } else if (layer.kind === "pdfImage") {
          const imagePoint = transformPoint({ x: maskX, y: maskY }, layer.imageMatrixInv);
          const u = imagePoint.x;
          const v = imagePoint.y;
          if (u < 0 || u >= 1 || v < 0 || v >= 1) {
            continue;
          }
          const srcCol = Math.min(layer.width - 1, Math.max(0, Math.floor(u * layer.width)));
          const srcRow = Math.min(layer.height - 1, Math.max(0, Math.floor((1 - v) * layer.height)));
          const srcIdx = srcRow * layer.width + srcCol;

          srcA = layer.alpha ? (layer.alpha[srcIdx] ?? 0) : 255;
          if (srcA === 0) {continue;}
          srcA = Math.round(srcA * layer.opacity);
          if (srcA === 0) {continue;}

          const o = srcIdx * 3;
          r = layer.data[o] ?? 0;
          g = layer.data[o + 1] ?? 0;
          b = layer.data[o + 2] ?? 0;
        } else {
          const imagePoint = transformPoint({ x: maskX, y: maskY }, layer.imageMatrixInv);
          const u = imagePoint.x;
          const v = imagePoint.y;
          if (u < 0 || u >= 1 || v < 0 || v >= 1) {
            continue;
          }
          const srcCol = Math.min(layer.width - 1, Math.max(0, Math.floor(u * layer.width)));
          const srcRow = Math.min(layer.height - 1, Math.max(0, Math.floor((1 - v) * layer.height)));
          const srcIdx = srcRow * layer.width + srcCol;

          srcA = layer.smaskAlpha ? (layer.smaskAlpha[srcIdx] ?? 0) : 255;
          if (srcA === 0) {continue;}
          srcA = Math.round(srcA * layer.opacity);
          if (srcA === 0) {continue;}

          const o = srcIdx * 4;
          r = layer.rgba[o] ?? 0;
          g = layer.rgba[o + 1] ?? 0;
          b = layer.rgba[o + 2] ?? 0;
        }

        const invA = 255 - srcA;
        if (groupKnockout) {
          premR = r * srcA;
          premG = g * srcA;
          premB = b * srcA;
          outA = srcA;
        } else {
          premR = r * srcA + Math.round((premR * invA) / 255);
          premG = g * srcA + Math.round((premG * invA) / 255);
          premB = b * srcA + Math.round((premB * invA) / 255);
          outA = srcA + Math.round((outA * invA) / 255);
        }
      }

      if (outA === 0) {
        alpha[idx] = 0;
        continue;
      }

      const outR = Math.round(premR / outA);
      const outG = Math.round(premG / outA);
      const outB = Math.round(premB / outA);
      const lum = Math.round(0.299 * outR + 0.587 * outG + 0.114 * outB);
      alpha[idx] = Math.round((lum * outA) / 255);
    }
  }

  return {
    kind,
    width,
    height,
    alpha,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    matrix,
  };
}

function parseSoftMask(page: NativePdfPage, obj: PdfObject | undefined, options: ExtGStateExtractOptions): SoftMaskParseResult {
  if (!obj) {return { present: false };}

  try {
    const resolved = resolve(page, obj);
    if (!resolved) {
      // `/SMask` key exists but cannot be resolved; clear any previous mask deterministically.
      return { present: true, softMaskAlpha: 1, softMask: undefined };
    }

    const name = asName(resolved);
    if (name === "None") {
      // Explicitly clears any previously set soft mask.
      return { present: true, softMaskAlpha: 1, softMask: undefined };
    }

    const smask = asDict(resolved);
    if (!smask) {
      // `/SMask` is present but not a supported structure; clear any previous mask deterministically.
      return { present: true, softMaskAlpha: 1, softMask: undefined };
    }

    const s = asName(resolve(page, dictGet(smask, "S")));
    const kind: SoftMaskKind | null = s === "Alpha" || s === "Luminosity" ? s : null;
    if (!kind) {return { present: true, softMaskAlpha: 1, softMask: undefined };}

    const g = asStream(resolve(page, dictGet(smask, "G")));
    if (!g) {return { present: true, softMaskAlpha: 1, softMask: undefined };}
    const subtype = asName(dictGet(g.dict, "Subtype"));
    if (subtype !== "Form") {return { present: true, softMaskAlpha: 1, softMask: undefined };}

    const bbox = parseBBox4(resolve(page, dictGet(g.dict, "BBox")));
    if (!bbox) {return { present: true, softMaskAlpha: 1, softMask: undefined };}
    const matrix = parseMatrix6(page, dictGet(g.dict, "Matrix")) ?? IDENTITY_MATRIX;

    const resources = asDict(resolve(page, dictGet(g.dict, "Resources")));
    const extGState = resources ? extractExtGStateFromResourcesNative(page, resources, options) : new Map();
    const fontMappings = resources ? extractFontMappingsFromResourcesNative(page, resources) : new Map();
    const shadings = resources ? extractShadingFromResourcesNative(page, resources) : new Map();
    const patterns = resources ? extractPatternsFromResourcesNative(page, resources) : new Map();
    const colorSpaces = extractColorSpacesFromResourcesNative(page, resources);

    const group = asDict(resolve(page, dictGet(g.dict, "Group")));
    const groupKnockout = group ? (asBool(resolve(page, dictGet(group, "K"))) === true) : false;
    const groupIsolated = group ? (asBool(resolve(page, dictGet(group, "I"))) === true) : false;
    const groupColorSpace = group ? parseDeviceColorSpaceNameFromObject(page, dictGet(group, "CS")) : null;
    const backdropRgb = kind === "Luminosity" && !groupIsolated ? parseSoftMaskBackdropRgb(page, smask, groupColorSpace) : null;

    const content = new TextDecoder("latin1").decode(decodePdfStream(g));
    const tokens = tokenizeContentStream(content);
    const gfxStack = createGraphicsStateStack();
    const gfxOps = createGfxOpsFromStack(gfxStack);
    const parse = createParser(gfxOps, fontMappings, {
      extGState,
      shadings,
      patterns,
      colorSpaces,
      shadingMaxSize: options.shadingMaxSize ?? 0,
      clipPathMaxSize: 0,
      pageBBox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    });
    const elements = parse(tokens);

    const extracted = tryExtractConstantSoftMaskValueFromElements(elements, bbox, kind);
    if (extracted != null) {
      return { present: true, softMaskAlpha: extracted, softMask: undefined };
    }

    const perPixel = tryExtractPerPixelSoftMaskFromElements(
      page,
      elements,
      bbox,
      matrix,
      kind,
      resources,
      fontMappings,
      options,
      groupKnockout,
      groupIsolated,
      backdropRgb,
    );
    if (perPixel) {
      return { present: true, softMaskAlpha: 1, softMask: perPixel };
    }

    return { present: true, softMaskAlpha: 1, softMask: undefined };
  } catch (error) {
    if (error instanceof Error && error.message.includes("requires options.jpxDecode")) {
      throw error;
    }
    // `/SMask` was present but couldn't be processed (e.g. missing xref entry). Clear deterministically.
    return { present: true, softMaskAlpha: 1, softMask: undefined };
  }
}











/** Extract ExtGState entries from a native page’s resources. */
export function extractExtGStateNative(page: NativePdfPage, options: ExtGStateExtractOptions = {}): ReadonlyMap<string, ExtGStateParams> {
  const resources = page.getResourcesDict();
  if (!resources) {return new Map();}

  return extractExtGStateFromResourcesNative(page, resources, options);
}











/** Extract ExtGState entries from a specific `/Resources` dictionary (native). */
export function extractExtGStateFromResourcesNative(
  page: NativePdfPage,
  resources: PdfDict,
  options: ExtGStateExtractOptions = {},
): ReadonlyMap<string, ExtGStateParams> {
  const extObj = resolve(page, dictGet(resources, "ExtGState"));
  const ext = asDict(extObj);
  if (!ext) {return new Map();}

  const out = new Map<string, ExtGStateParams>();

  for (const [name, entry] of ext.map.entries()) {
    const dict = asDict(resolve(page, entry));
    if (!dict) {continue;}

    const ca = asNumber(dictGet(dict, "ca"));
    const CA = asNumber(dictGet(dict, "CA"));
    const BM = parseBlendMode(page, dictGet(dict, "BM"));
    const SMask = parseSoftMask(page, dictGet(dict, "SMask"), options);
    const LW = asNumber(dictGet(dict, "LW"));
    const LC = asNumber(dictGet(dict, "LC"));
    const LJ = asNumber(dictGet(dict, "LJ"));
    const ML = asNumber(dictGet(dict, "ML"));
    const D = parseDashPattern(resolve(page, dictGet(dict, "D")));

	    const params: {
	      fillAlpha?: number;
	      strokeAlpha?: number;
	      blendMode?: string;
	      softMaskAlpha?: number;
	      softMask?: PdfSoftMask;
	      lineWidth?: number;
	      lineCap?: 0 | 1 | 2;
	      lineJoin?: 0 | 1 | 2;
	      miterLimit?: number;
	      dashArray?: readonly number[];
	      dashPhase?: number;
	    } = {};

    if (ca != null && Number.isFinite(ca)) {params.fillAlpha = ca;}
    if (CA != null && Number.isFinite(CA)) {params.strokeAlpha = CA;}
    if (BM) {params.blendMode = BM;}
    if (SMask.present) {
      params.softMaskAlpha = SMask.softMaskAlpha;
      params.softMask = SMask.softMask;
    }
    if (LW != null && Number.isFinite(LW)) {params.lineWidth = LW;}
    if (LC != null && Number.isFinite(LC) && isValidCapOrJoin(LC)) {params.lineCap = LC;}
    if (LJ != null && Number.isFinite(LJ) && isValidCapOrJoin(LJ)) {params.lineJoin = LJ;}
    if (ML != null && Number.isFinite(ML)) {params.miterLimit = ML;}
    if (D) {
      params.dashArray = D.dashArray;
      params.dashPhase = D.dashPhase;
    }

	    if (
	      params.fillAlpha != null ||
	      params.strokeAlpha != null ||
	      params.blendMode != null ||
	      params.softMaskAlpha != null ||
	      params.softMask != null ||
	      params.lineWidth != null ||
	      params.lineCap != null ||
	      params.lineJoin != null ||
	      params.miterLimit != null ||
      params.dashArray != null ||
      params.dashPhase != null
    ) {
      out.set(name, params);
    }
  }

  return out;
}











/** Extract only alpha-related ExtGState fields (native). */
export function extractExtGStateAlphaNative(page: NativePdfPage, options: ExtGStateExtractOptions = {}): ReadonlyMap<string, ExtGStateAlpha> {
  const full = extractExtGStateNative(page, options);
  const out = new Map<string, ExtGStateAlpha>();
  for (const [name, params] of full) {
    const alpha: { fillAlpha?: number; strokeAlpha?: number } = {};
    if (params.fillAlpha != null) {alpha.fillAlpha = params.fillAlpha;}
    if (params.strokeAlpha != null) {alpha.strokeAlpha = params.strokeAlpha;}
    if (alpha.fillAlpha != null || alpha.strokeAlpha != null) {out.set(name, alpha);}
  }
  return out;
}
