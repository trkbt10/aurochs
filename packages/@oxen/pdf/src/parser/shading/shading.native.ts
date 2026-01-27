/**
 * @file src/pdf/parser/shading.native.ts
 *
 * Extract `/Shading` resources from native PDF objects into a parser-friendly model.
 *
 * Supported subset (initial):
 * - ShadingType 2 (axial)
 * - ColorSpace: /DeviceRGB, /DeviceGray
 * - Function: FunctionType 2 (exponential interpolation)
 */

import type { NativePdfPage, PdfArray, PdfBool, PdfDict, PdfName, PdfNumber, PdfObject, PdfStream } from "../../native";
import type { PdfShading, PdfShadingFunctionType2 } from "./shading.types";

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
function asBool(obj: PdfObject | undefined): PdfBool | null {
  return obj?.type === "bool" ? obj : null;
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

function parseNumberArray(page: NativePdfPage, obj: PdfObject | undefined, expectedLen: number): number[] | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr) {return null;}
  if (expectedLen >= 0 && arr.items.length !== expectedLen) {return null;}
  const nums: number[] = [];
  for (const item of arr.items) {
    const n = asNumber(resolve(page, item))?.value;
    if (n == null || !Number.isFinite(n)) {return null;}
    nums.push(n);
  }
  return nums;
}

function parseBoolArray2(page: NativePdfPage, obj: PdfObject | undefined): readonly [boolean, boolean] | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr || arr.items.length !== 2) {return null;}
  const b0 = asBool(resolve(page, arr.items[0]))?.value;
  const b1 = asBool(resolve(page, arr.items[1]))?.value;
  if (b0 == null || b1 == null) {return null;}
  return [b0, b1];
}

function parseColorSpace(page: NativePdfPage, obj: PdfObject | undefined): "DeviceGray" | "DeviceRGB" | null {
  const resolved = resolve(page, obj);
  if (!resolved) {return null;}
  if (resolved.type === "name") {
    if (resolved.value === "DeviceGray") {return "DeviceGray";}
    if (resolved.value === "DeviceRGB") {return "DeviceRGB";}
    return null;
  }
  // Color space arrays (ICCBased, CalRGB, etc) are not supported yet.
  return null;
}

function parseFunctionType2(page: NativePdfPage, obj: PdfObject | undefined): PdfShadingFunctionType2 | null {
  const dict = resolveDictOrStreamDict(page, obj);
  if (!dict) {return null;}

  const ft = asNumber(resolve(page, dictGet(dict, "FunctionType")) )?.value;
  if (ft !== 2) {return null;}

  const c0 = parseNumberArray(page, dictGet(dict, "C0"), -1) ?? [];
  const c1 = parseNumberArray(page, dictGet(dict, "C1"), -1) ?? [];

  const n = asNumber(resolve(page, dictGet(dict, "N")))?.value;
  if (n == null || !Number.isFinite(n)) {return null;}

  const domainNums = parseNumberArray(page, dictGet(dict, "Domain"), 2);
  const domain: readonly [number, number] | undefined = domainNums
    ? [domainNums[0] ?? 0, domainNums[1] ?? 1]
    : undefined;

  return { type: "FunctionType2", c0, c1, n, domain };
}

export function parseShadingObjectNative(page: NativePdfPage, obj: PdfObject | undefined): PdfShading | null {
  const dict = resolveDictOrStreamDict(page, obj);
  if (!dict) {return null;}

  const st = asNumber(resolve(page, dictGet(dict, "ShadingType")))?.value;
  const colorSpace = parseColorSpace(page, dictGet(dict, "ColorSpace"));
  if (!colorSpace) {return null;}

  const fn = parseFunctionType2(page, dictGet(dict, "Function"));
  if (!fn) {return null;}

  const extend = parseBoolArray2(page, dictGet(dict, "Extend")) ?? ([false, false] as const);

  if (st === 2) {
    const coordsNums = parseNumberArray(page, dictGet(dict, "Coords"), 4);
    if (!coordsNums) {return null;}
    const coords: readonly [number, number, number, number] = [
      coordsNums[0] ?? 0,
      coordsNums[1] ?? 0,
      coordsNums[2] ?? 0,
      coordsNums[3] ?? 0,
    ];

    return {
      shadingType: 2,
      colorSpace,
      coords,
      extend,
      fn,
    };
  }

  if (st === 3) {
    const coordsNums = parseNumberArray(page, dictGet(dict, "Coords"), 6);
    if (!coordsNums) {return null;}
    const coords: readonly [number, number, number, number, number, number] = [
      coordsNums[0] ?? 0,
      coordsNums[1] ?? 0,
      coordsNums[2] ?? 0,
      coordsNums[3] ?? 0,
      coordsNums[4] ?? 0,
      coordsNums[5] ?? 0,
    ];

    return {
      shadingType: 3,
      colorSpace,
      coords,
      extend,
      fn,
    };
  }

  return null;
}

export function extractShadingFromResourcesNative(page: NativePdfPage, resources: PdfDict | null): ReadonlyMap<string, PdfShading> {
  if (!resources) {return new Map();}

  const shadingDict = asDict(resolve(page, dictGet(resources, "Shading")));
  if (!shadingDict || shadingDict.map.size === 0) {return new Map();}

  const out = new Map<string, PdfShading>();
  for (const [key, value] of shadingDict.map.entries()) {
    const shading = parseShadingObjectNative(page, value);
    if (shading) {
      out.set(key, shading);
    }
  }
  return out;
}

export function extractShadingNative(page: NativePdfPage): ReadonlyMap<string, PdfShading> {
  return extractShadingFromResourcesNative(page, page.getResourcesDict());
}
