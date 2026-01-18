/**
 * @file src/pdf/parser/ext-gstate.native.ts
 */

import type { NativePdfPage } from "../native";
import type { PdfDict, PdfObject, PdfStream } from "../native/types";
import { decodePdfStream } from "../native/stream";
import { tokenizeContentStream } from "../domain/content-stream";
import type { PdfColor, PdfColorSpace, PdfMatrix, PdfSoftMask } from "../domain";
import { createGraphicsStateStack, invertMatrix, transformPoint } from "../domain";
import { clamp01, cmykToRgb } from "../domain/color";
import { convertToRgba } from "../converter/pixel-converter";
import { decodeJpegToRgb } from "./jpeg-decode";
import { createGfxOpsFromStack, createParser, type ParsedElement } from "./operator";

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

function parseFilterNames(dict: PdfDict): readonly string[] {
  const filter = dictGet(dict, "Filter");
  if (!filter) {return [];}
  if (filter.type === "name") {return [filter.value];}
  if (filter.type === "array") {
    const out: string[] = [];
    for (const item of filter.items) {
      if (item.type === "name") {out.push(item.value);}
    }
    return out;
  }
  return [];
}

function parseDecodeArray(dict: PdfDict): readonly number[] | undefined {
  const decode = dictGet(dict, "Decode");
  if (!decode || decode.type !== "array") {return undefined;}
  const nums: number[] = [];
  for (const item of decode.items) {
    if (!item || item.type !== "number" || !Number.isFinite(item.value)) {return undefined;}
    nums.push(item.value);
  }
  return nums.length > 0 ? nums : undefined;
}

function parseColorSpaceName(page: NativePdfPage, dict: PdfDict): PdfColorSpace | null {
  const csObj = resolve(page, dictGet(dict, "ColorSpace"));
  if (!csObj) {return null;}
  if (csObj.type === "name") {
    if (csObj.value === "DeviceGray") {return "DeviceGray";}
    if (csObj.value === "DeviceRGB") {return "DeviceRGB";}
    if (csObj.value === "DeviceCMYK") {return "DeviceCMYK";}
    return null;
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
): PdfSoftMask | null {
  const xObjects = getXObjectsDict(page, resources);
  if (!xObjects) {return null;}

  const decodeImageStreamToRgba = (imageStream: PdfStream): { readonly width: number; readonly height: number; readonly rgba: Uint8ClampedArray } | null => {
    const imageDict = imageStream.dict;
    const imageSubtype = asName(dictGet(imageDict, "Subtype"));
    if (imageSubtype !== "Image") {return null;}

    const w = getNumberValue(page, imageDict, "Width") ?? 0;
    const h = getNumberValue(page, imageDict, "Height") ?? 0;
    if (w <= 0 || h <= 0) {return null;}

    const imageBpc = getNumberValue(page, imageDict, "BitsPerComponent") ?? 8;
    const imageDecode = parseDecodeArray(imageDict);
    const imageFilters = parseFilterNames(imageDict);
    const imageCs = parseColorSpaceName(page, imageDict);
    if (!imageCs) {return null;}

    let raw: Uint8Array;
    let colorSpace: PdfColorSpace = imageCs;
    let bitsPerComponent = imageBpc;

    if (imageFilters.some((f) => f === "DCTDecode" || f === "DCT")) {
      const jpegBytes = decodePdfStream(imageStream);
      const decodedJpeg = decodeJpegToRgb(jpegBytes, { expectedWidth: w, expectedHeight: h });
      raw = decodedJpeg.data;
      colorSpace = "DeviceRGB";
      bitsPerComponent = 8;
    } else {
      raw = decodePdfStream(imageStream);
    }

    const rgba = convertToRgba(raw, w, h, colorSpace, bitsPerComponent, { decode: imageDecode });
    return { width: w, height: h, rgba };
  };

  const imageElements = elements.filter((e): e is Extract<ParsedElement, { readonly type: "image" }> => e?.type === "image");
  if (imageElements.length === 0) {return null;}
  if (imageElements.length !== elements.length) {return null;}

  type DecodedMaskImage = Readonly<{
    readonly width: number;
    readonly height: number;
    readonly rgba: Uint8ClampedArray;
    readonly smaskAlpha: Uint8Array | null;
    readonly imageMatrixInv: PdfMatrix;
  }>;

  const decodedImages: DecodedMaskImage[] = [];

  let width = 0;
  let height = 0;

  for (const img of imageElements) {
    const stream = resolveXObjectStreamByName(page, xObjects, img.name);
    if (!stream) {return null;}

    const dict = stream.dict;
    const subtype = asName(dictGet(dict, "Subtype"));
    if (subtype !== "Image") {return null;}

    const w = getNumberValue(page, dict, "Width") ?? 0;
    const h = getNumberValue(page, dict, "Height") ?? 0;
    if (w <= 0 || h <= 0) {return null;}

    const baseDecoded = decodeImageStreamToRgba(stream);
    if (!baseDecoded) {return null;}
    if (baseDecoded.width !== w || baseDecoded.height !== h) {return null;}

    if (decodedImages.length === 0) {
      width = w;
      height = h;
    } else {
      if (w !== width || h !== height) {return null;}
    }

    const imageMatrix = img.graphicsState.ctm;
    const imageMatrixInv = invertMatrix(imageMatrix);
    if (!imageMatrixInv) {return null;}

    const smaskStream = asStream(resolve(page, dictGet(dict, "SMask")));
    const smaskDecoded = smaskStream ? decodeImageStreamToRgba(smaskStream) : null;
    const smaskAlpha = (() => {
      if (!smaskDecoded) {return null;}
      if (smaskDecoded.width !== width || smaskDecoded.height !== height) {return null;}
      const out = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i += 1) {
        out[i] = smaskDecoded.rgba[i * 4] ?? 0;
      }
      return out;
    })();

    decodedImages.push({
      width,
      height,
      rgba: baseDecoded.rgba,
      smaskAlpha,
      imageMatrixInv,
    });
  }

  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);

  for (let row = 0; row < height; row += 1) {
    const maskY = ury - ((row + 0.5) / height) * bh;
    for (let col = 0; col < width; col += 1) {
      const maskX = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;

      if (kind === "Alpha") {
        let outA = 0;
        for (const img of decodedImages) {
          const imagePoint = transformPoint({ x: maskX, y: maskY }, img.imageMatrixInv);
          const u = imagePoint.x;
          const v = imagePoint.y;
          if (u < 0 || u >= 1 || v < 0 || v >= 1) {
            continue;
          }

          const srcCol = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
          const srcRow = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * height)));
          const srcIdx = srcRow * width + srcCol;

          let srcA = img.smaskAlpha ? (img.smaskAlpha[srcIdx] ?? 0) : null;
          if (srcA == null) {
            const o = srcIdx * 4;
            const r = img.rgba[o] ?? 0;
            const g = img.rgba[o + 1] ?? 0;
            const b = img.rgba[o + 2] ?? 0;
            // Heuristic fallback: accept grayscale images as alpha sources.
            if (r !== g || g !== b) {return null;}
            srcA = r;
          }

          outA = srcA + Math.round((outA * (255 - srcA)) / 255);
        }
        alpha[idx] = outA;
        continue;
      }

      let outA = 0;
      let premR = 0;
      let premG = 0;
      let premB = 0;

      for (const img of decodedImages) {
        const imagePoint = transformPoint({ x: maskX, y: maskY }, img.imageMatrixInv);
        const u = imagePoint.x;
        const v = imagePoint.y;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) {
          continue;
        }

        const srcCol = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
        const srcRow = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * height)));
        const srcIdx = srcRow * width + srcCol;

        const srcA = img.smaskAlpha ? (img.smaskAlpha[srcIdx] ?? 0) : 255;
        if (srcA === 0) {
          continue;
        }

        const o = srcIdx * 4;
        const r = img.rgba[o] ?? 0;
        const g = img.rgba[o + 1] ?? 0;
        const b = img.rgba[o + 2] ?? 0;

        const invA = 255 - srcA;
        premR = r * srcA + Math.round((premR * invA) / 255);
        premG = g * srcA + Math.round((premG * invA) / 255);
        premB = b * srcA + Math.round((premB * invA) / 255);
        outA = srcA + Math.round((outA * invA) / 255);
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

function parseSoftMask(page: NativePdfPage, obj: PdfObject | undefined): SoftMaskParseResult {
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
    const extGState = resources ? extractExtGStateFromResourcesNative(page, resources) : new Map();

    const content = new TextDecoder("latin1").decode(decodePdfStream(g));
    const tokens = tokenizeContentStream(content);
    const gfxStack = createGraphicsStateStack();
    const gfxOps = createGfxOpsFromStack(gfxStack);
    const parse = createParser(gfxOps, new Map(), { extGState });
    const elements = parse(tokens);

    const extracted = tryExtractConstantSoftMaskValueFromElements(elements, bbox, kind);
    if (extracted != null) {
      return { present: true, softMaskAlpha: extracted, softMask: undefined };
    }

    const perPixel = tryExtractPerPixelSoftMaskFromElements(page, elements, bbox, matrix, kind, resources);
    if (perPixel) {
      return { present: true, softMaskAlpha: 1, softMask: perPixel };
    }

    return { present: true, softMaskAlpha: 1, softMask: undefined };
  } catch {
    // `/SMask` was present but couldn't be processed (e.g. missing xref entry). Clear deterministically.
    return { present: true, softMaskAlpha: 1, softMask: undefined };
  }
}











/** Extract ExtGState entries from a native page’s resources. */
export function extractExtGStateNative(page: NativePdfPage): ReadonlyMap<string, ExtGStateParams> {
  const resources = page.getResourcesDict();
  if (!resources) {return new Map();}

  return extractExtGStateFromResourcesNative(page, resources);
}











/** Extract ExtGState entries from a specific `/Resources` dictionary (native). */
export function extractExtGStateFromResourcesNative(
  page: NativePdfPage,
  resources: PdfDict,
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
    const SMask = parseSoftMask(page, dictGet(dict, "SMask"));
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
export function extractExtGStateAlphaNative(page: NativePdfPage): ReadonlyMap<string, ExtGStateAlpha> {
  const full = extractExtGStateNative(page);
  const out = new Map<string, ExtGStateAlpha>();
  for (const [name, params] of full) {
    const alpha: { fillAlpha?: number; strokeAlpha?: number } = {};
    if (params.fillAlpha != null) {alpha.fillAlpha = params.fillAlpha;}
    if (params.strokeAlpha != null) {alpha.strokeAlpha = params.strokeAlpha;}
    if (alpha.fillAlpha != null || alpha.strokeAlpha != null) {out.set(name, alpha);}
  }
  return out;
}
