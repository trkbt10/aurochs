/**
 * @file src/pdf/parser/color-space.native.ts
 */

import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfObject, PdfStream } from "../../native";
import { decodePdfStream } from "../../native/stream/stream";
import { parseIccProfile, type ParsedIccProfile } from "./icc-profile.native";

export type ParsedNamedColorSpace =
  | Readonly<{ kind: "device"; colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK" }>
  | Readonly<{
      kind: "iccBased";
      n: number;
      alternate: "DeviceGray" | "DeviceRGB" | "DeviceCMYK";
      profile: ParsedIccProfile | null;
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

function getNumberValue(page: NativePdfPage, dict: PdfDict, key: string): number | null {
  const v = resolve(page, dictGet(dict, key));
  return v?.type === "number" && Number.isFinite(v.value) ? v.value : null;
}

function parseDeviceColorSpaceName(name: string): "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | null {
  if (name === "DeviceGray") {return "DeviceGray";}
  if (name === "DeviceRGB") {return "DeviceRGB";}
  if (name === "DeviceCMYK") {return "DeviceCMYK";}
  return null;
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

  if (head.value === "ICCBased" && arr.items.length > 1) {
    const profileObj = resolve(page, arr.items[1]);
    const profileStream = asStream(profileObj);
    const profileDict = profileStream ? profileStream.dict : asDict(profileObj);
    const n = profileDict ? getNumberValue(page, profileDict, "N") : null;
    const alternate = n === 1 ? "DeviceGray" : n === 3 ? "DeviceRGB" : n === 4 ? "DeviceCMYK" : "DeviceRGB";
    const parsed = (() => {
      if (!profileStream) {return null;}
      try {
        return parseIccProfile(decodePdfStream(profileStream));
      } catch {
        return null;
      }
    })();
    return { kind: "iccBased", n: n ?? 0, alternate, profile: parsed };
  }

  return null;
}

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
