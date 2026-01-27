/**
 * @file src/pdf/parser/pattern.native.ts
 *
 * Extract `/Pattern` resources from native PDF objects into a parser-friendly model.
 *
 * Supported subset:
 * - PatternType 2 (shading pattern)
 *   - /Shading entry: ShadingType 2/3 as supported by `shading.native.ts`
 *   - /Matrix: optional (defaults to identity)
 */

import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfNumber, PdfObject, PdfStream } from "../../native";
import type { PdfMatrix } from "../../domain";
import type { PdfPattern, PdfShadingPattern, PdfTilingPattern } from "./pattern.types";
import { parseShadingObjectNative } from "../shading/shading.native";
import { decodePdfStream } from "../../native/stream/stream";

const IDENTITY_MATRIX: PdfMatrix = [1, 0, 0, 1, 0, 0];

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}
function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): PdfNumber | null {
  return obj?.type === "number" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

function resolveDictOrStreamDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  const resolved = resolve(page, obj);
  const dict = asDict(resolved);
  if (dict) {return dict;}
  const stream = asStream(resolved);
  return stream?.dict ?? null;
}

function parseMatrix6(page: NativePdfPage, obj: PdfObject | undefined): PdfMatrix | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr || arr.items.length !== 6) {return null;}
  const nums: number[] = [];
  for (const item of arr.items) {
    const n = asNumber(resolve(page, item))?.value;
    if (n == null || !Number.isFinite(n)) {return null;}
    nums.push(n);
  }
  return [nums[0] ?? 1, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1, nums[4] ?? 0, nums[5] ?? 0];
}

function parsePattern(page: NativePdfPage, obj: PdfObject | undefined): PdfPattern | null {
  const resolved = resolve(page, obj);
  const dict = resolveDictOrStreamDict(page, obj);
  if (!dict) {return null;}

  const pt = asNumber(resolve(page, dictGet(dict, "PatternType")))?.value;
  const matrix = parseMatrix6(page, dictGet(dict, "Matrix")) ?? IDENTITY_MATRIX;

  if (pt === 2) {
    const shadingObj = dictGet(dict, "Shading");
    const shading = parseShadingObjectNative(page, shadingObj);
    if (!shading) {return null;}

    const pattern: PdfShadingPattern = {
      patternType: 2,
      matrix,
      shading,
    };
    return pattern;
  }

  if (pt === 1) {
    const stream = asStream(resolved);
    if (!stream) {return null;}

    const paintType = asNumber(resolve(page, dictGet(dict, "PaintType")))?.value;
    if (paintType !== 1 && paintType !== 2) {return null;}

    const tilingType = asNumber(resolve(page, dictGet(dict, "TilingType")))?.value;
    if (tilingType !== 1 && tilingType !== 2 && tilingType !== 3) {return null;}

    const bboxArr = asArray(resolve(page, dictGet(dict, "BBox")));
    if (!bboxArr || bboxArr.items.length !== 4) {return null;}
    const nums: number[] = [];
    for (const item of bboxArr.items) {
      const n = asNumber(resolve(page, item))?.value;
      if (n == null || !Number.isFinite(n)) {return null;}
      nums.push(n);
    }
    const bbox: readonly [number, number, number, number] = [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 0];

    const xStep = asNumber(resolve(page, dictGet(dict, "XStep")))?.value;
    const yStep = asNumber(resolve(page, dictGet(dict, "YStep")))?.value;
    if (xStep == null || yStep == null || !Number.isFinite(xStep) || !Number.isFinite(yStep) || xStep === 0 || yStep === 0) {
      return null;
    }

    const content = new TextDecoder("latin1").decode(decodePdfStream(stream));

    const pattern: PdfTilingPattern = {
      patternType: 1,
      paintType,
      tilingType,
      bbox,
      xStep,
      yStep,
      matrix,
      content,
    };
    return pattern;
  }

  return null;
}

export function extractPatternsFromResourcesNative(page: NativePdfPage, resources: PdfDict | null): ReadonlyMap<string, PdfPattern> {
  if (!resources) {return new Map();}

  const patternDict = asDict(resolve(page, dictGet(resources, "Pattern")));
  if (!patternDict || patternDict.map.size === 0) {return new Map();}

  const out = new Map<string, PdfPattern>();
  for (const [key, value] of patternDict.map.entries()) {
    const pattern = parsePattern(page, value);
    if (pattern) {
      out.set(key, pattern);
    }
  }
  return out;
}

export function extractPatternsNative(page: NativePdfPage): ReadonlyMap<string, PdfPattern> {
  return extractPatternsFromResourcesNative(page, page.getResourcesDict());
}
