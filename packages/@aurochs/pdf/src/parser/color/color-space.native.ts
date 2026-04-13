/**
 * @file src/pdf/parser/color-space.native.ts
 */

import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfObject, PdfStream } from "../../native";
import { decodePdfStream } from "../../native/stream/stream";
import { parseIccProfile, type ParsedIccProfile } from "./icc-profile.native";
import { parsePdfFunction } from "../function/parse";
import type { PdfFunction } from "../function/types";

type DeviceColorSpace = "DeviceGray" | "DeviceRGB" | "DeviceCMYK";

export type ParsedNamedColorSpace =
  | Readonly<{ kind: "device"; colorSpace: DeviceColorSpace }>
  | Readonly<{
      kind: "iccBased";
      n: number;
      alternate: DeviceColorSpace;
      profile: ParsedIccProfile | null;
    }>
  | Readonly<{
      kind: "separation";
      colorantName: string;
      alternate: DeviceColorSpace;
      alternateComponents: number;
      tintTransform: PdfFunction | null;
    }>
  | Readonly<{
      kind: "deviceN";
      colorantNames: readonly string[];
      alternate: DeviceColorSpace;
      alternateComponents: number;
      tintTransform: PdfFunction | null;
    }>
  | Readonly<{
      kind: "indexed";
      base: DeviceColorSpace;
      hival: number;
      lookup: Uint8Array;
    }>
  | Readonly<{
      kind: "calGray";
      whitePoint: readonly [number, number, number];
      gamma: number;
    }>
  | Readonly<{
      kind: "calRgb";
      whitePoint: readonly [number, number, number];
      gamma: readonly [number, number, number];
      matrix: readonly number[];
    }>
  | Readonly<{
      kind: "lab";
      whitePoint: readonly [number, number, number];
      range: readonly [number, number, number, number];
    }>;

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}

function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}

function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function parseIccProfileSafe(profileStream: PdfStream | null): ParsedIccProfile | null {
  if (!profileStream) {return null;}
  try {
    return parseIccProfile(decodePdfStream(profileStream));
  } catch (error) {
    console.debug("[PDF] ICC profile parse error:", error);
    return null;
  }
}

function getNumberValue(page: NativePdfPage, dict: PdfDict, key: string): number | null {
  const v = resolve(page, dictGet(dict, key));
  return v?.type === "number" && Number.isFinite(v.value) ? v.value : null;
}

function parseDeviceColorSpaceName(name: string): DeviceColorSpace | null {
  if (name === "DeviceGray") {return "DeviceGray";}
  if (name === "DeviceRGB") {return "DeviceRGB";}
  if (name === "DeviceCMYK") {return "DeviceCMYK";}
  return null;
}

function deviceColorSpaceComponents(cs: DeviceColorSpace): number {
  if (cs === "DeviceGray") {return 1;}
  if (cs === "DeviceRGB") {return 3;}
  return 4; // DeviceCMYK
}

/**
 * Resolve a color space object to a device color space name.
 *
 * Handles both simple name references (/DeviceRGB) and array-based
 * references ([/ICCBased ...]) by extracting the alternate device space.
 */
function resolveAlternateDeviceColorSpace(page: NativePdfPage, obj: PdfObject | undefined): DeviceColorSpace | null {
  const resolved = resolve(page, obj);
  if (!resolved) {return null;}

  if (resolved.type === "name") {
    return parseDeviceColorSpaceName(resolved.value);
  }

  // Array form: e.g. [/ICCBased stream] — extract alternate from component count
  if (resolved.type === "array" && resolved.items.length > 0) {
    const head = asName(resolved.items[0]);
    if (head?.value === "ICCBased" && resolved.items.length > 1) {
      const profileObj = resolve(page, resolved.items[1]);
      const profileStream = asStream(profileObj);
      const profileDict = profileStream ? profileStream.dict : asDict(profileObj);
      const n = profileDict ? getNumberValue(page, profileDict, "N") : null;
      if (n === 1) {return "DeviceGray";}
      if (n === 4) {return "DeviceCMYK";}
      return "DeviceRGB"; // n === 3 or default
    }
    // CalGray → DeviceGray, CalRGB → DeviceRGB
    if (head?.value === "CalGray") {return "DeviceGray";}
    if (head?.value === "CalRGB") {return "DeviceRGB";}
    if (head?.value === "Lab") {return "DeviceRGB";} // Lab → converted to RGB
  }

  return null;
}

function parseNumberArrayLocal(page: NativePdfPage, arr: PdfArray): number[] {
  const nums: number[] = [];
  for (const item of arr.items) {
    const v = resolve(page, item);
    if (v?.type === "number" && Number.isFinite(v.value)) {nums.push(v.value);}
  }
  return nums;
}

function parseNamedColorSpaceEntry(page: NativePdfPage, entry: PdfObject | undefined): ParsedNamedColorSpace | null {
  const resolved = resolve(page, entry);
  const name = asName(resolved);
  if (name) {
    const device = parseDeviceColorSpaceName(name.value);
    return device ? { kind: "device", colorSpace: device } : null;
  }

  const arr = asArray(resolved);
  if (!arr || arr.items.length === 0) {return null;}
  const head = asName(arr.items[0]);
  if (!head) {return null;}

  // --- ICCBased ---
  if (head.value === "ICCBased" && arr.items.length > 1) {
    const profileObj = resolve(page, arr.items[1]);
    const profileStream = asStream(profileObj);
    const profileDict = profileStream ? profileStream.dict : asDict(profileObj);
    const n = profileDict ? getNumberValue(page, profileDict, "N") : null;
    const alternate: DeviceColorSpace = n === 1 ? "DeviceGray" : n === 3 ? "DeviceRGB" : n === 4 ? "DeviceCMYK" : "DeviceRGB";
    const parsed = parseIccProfileSafe(profileStream);
    return { kind: "iccBased", n: n ?? 0, alternate, profile: parsed };
  }

  // --- Separation ---
  // [/Separation colorantName alternateSpace tintTransform]
  if (head.value === "Separation" && arr.items.length >= 4) {
    const colorantObj = resolve(page, arr.items[1]);
    const colorantName = colorantObj?.type === "name" ? colorantObj.value
      : colorantObj?.type === "string" ? colorantObj.text : "Unknown";
    const alternate = resolveAlternateDeviceColorSpace(page, arr.items[2]);
    if (!alternate) {return null;}
    const tintTransform = parsePdfFunction(page, arr.items[3]);
    return {
      kind: "separation",
      colorantName,
      alternate,
      alternateComponents: deviceColorSpaceComponents(alternate),
      tintTransform,
    };
  }

  // --- DeviceN ---
  // [/DeviceN names alternateSpace tintTransform]
  if (head.value === "DeviceN" && arr.items.length >= 4) {
    const namesObj = resolve(page, arr.items[1]);
    const namesArr = asArray(namesObj);
    const colorantNames: string[] = [];
    if (namesArr) {
      for (const item of namesArr.items) {
        const n = asName(resolve(page, item));
        if (n) {colorantNames.push(n.value);}
      }
    }
    const alternate = resolveAlternateDeviceColorSpace(page, arr.items[2]);
    if (!alternate) {return null;}
    const tintTransform = parsePdfFunction(page, arr.items[3]);
    return {
      kind: "deviceN",
      colorantNames,
      alternate,
      alternateComponents: deviceColorSpaceComponents(alternate),
      tintTransform,
    };
  }

  // --- Indexed ---
  // [/Indexed base hival lookup]
  if (head.value === "Indexed" && arr.items.length >= 4) {
    const base = resolveAlternateDeviceColorSpace(page, arr.items[1]);
    if (!base) {return null;}
    const hivalObj = resolve(page, arr.items[2]);
    const hival = hivalObj?.type === "number" && Number.isFinite(hivalObj.value) ? Math.trunc(hivalObj.value) : null;
    if (hival == null || hival < 0) {return null;}

    // Lookup can be a string (raw bytes) or a stream
    const lookupObj = resolve(page, arr.items[3]);
    let lookup: Uint8Array | null = null;
    if (lookupObj?.type === "string") {
      lookup = lookupObj.bytes;
    } else if (lookupObj?.type === "stream") {
      try { lookup = decodePdfStream(lookupObj); } catch { lookup = null; }
    }
    if (!lookup) {return null;}

    return { kind: "indexed", base, hival, lookup };
  }

  // --- CalGray ---
  // [/CalGray dict]
  if (head.value === "CalGray" && arr.items.length >= 2) {
    const paramsObj = resolve(page, arr.items[1]);
    const params = asDict(paramsObj);
    if (params) {
      const wp = parseWhitePoint(page, params);
      if (wp) {
        const gammaObj = resolve(page, dictGet(params, "Gamma"));
        const gamma = gammaObj?.type === "number" && Number.isFinite(gammaObj.value) ? gammaObj.value : 1;
        return { kind: "calGray", whitePoint: wp, gamma };
      }
    }
    return null;
  }

  // --- CalRGB ---
  // [/CalRGB dict]
  if (head.value === "CalRGB" && arr.items.length >= 2) {
    const paramsObj = resolve(page, arr.items[1]);
    const params = asDict(paramsObj);
    if (params) {
      const wp = parseWhitePoint(page, params);
      if (wp) {
        const gammaObj = resolve(page, dictGet(params, "Gamma"));
        const gammaArr = asArray(gammaObj);
        const gamma: readonly [number, number, number] = gammaArr && gammaArr.items.length >= 3
          ? (() => {
              const nums = parseNumberArrayLocal(page, gammaArr);
              return [nums[0] ?? 1, nums[1] ?? 1, nums[2] ?? 1] as const;
            })()
          : [1, 1, 1];

        const matrixObj = resolve(page, dictGet(params, "Matrix"));
        const matrixArr = asArray(matrixObj);
        const matrix: readonly number[] = matrixArr
          ? (() => {
              const nums = parseNumberArrayLocal(page, matrixArr);
              return nums.length === 9 ? nums : [1, 0, 0, 0, 1, 0, 0, 0, 1];
            })()
          : [1, 0, 0, 0, 1, 0, 0, 0, 1];

        return { kind: "calRgb", whitePoint: wp, gamma, matrix };
      }
    }
    return null;
  }

  // --- Lab ---
  // [/Lab dict]
  if (head.value === "Lab" && arr.items.length >= 2) {
    const paramsObj = resolve(page, arr.items[1]);
    const params = asDict(paramsObj);
    if (params) {
      const wp = parseWhitePoint(page, params);
      if (wp) {
        const rangeObj = resolve(page, dictGet(params, "Range"));
        const rangeArr = asArray(rangeObj);
        let range: readonly [number, number, number, number] = [-100, 100, -100, 100]; // PDF default
        if (rangeArr && rangeArr.items.length >= 4) {
          const nums = parseNumberArrayLocal(page, rangeArr);
          if (nums.length >= 4) {
            range = [nums[0] ?? -100, nums[1] ?? 100, nums[2] ?? -100, nums[3] ?? 100];
          }
        }
        return { kind: "lab", whitePoint: wp, range };
      }
    }
    return null;
  }

  return null;
}

function parseWhitePoint(page: NativePdfPage, params: PdfDict): readonly [number, number, number] | null {
  const wp = resolve(page, dictGet(params, "WhitePoint"));
  const wpArr = asArray(wp);
  if (!wpArr || wpArr.items.length < 3) {return null;}
  const w0 = resolve(page, wpArr.items[0]);
  const w1 = resolve(page, wpArr.items[1]);
  const w2 = resolve(page, wpArr.items[2]);
  if (w0?.type === "number" && w1?.type === "number" && w2?.type === "number") {
    return [w0.value, w1.value, w2.value];
  }
  return null;
}































/** Extract named color spaces from PDF page resources. */
export function extractColorSpacesFromResourcesNative(
  page: NativePdfPage,
  resources: PdfDict | null,
): ReadonlyMap<string, ParsedNamedColorSpace> {
  if (!resources) {return new Map();}
  const csDict = asDict(resolve(page, dictGet(resources, "ColorSpace")));
  if (!csDict) {return new Map();}

  const out = new Map<string, ParsedNamedColorSpace>();
  for (const [name, obj] of csDict.map.entries()) {
    const parsed = parseNamedColorSpaceEntry(page, obj);
    if (parsed) {out.set(name, parsed);}
  }
  return out;
}
