import type { NativePdfPage } from "../native";
import type { PdfDict, PdfObject } from "../native/types";

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) return undefined;
  return page.lookup(obj);
}

export type ExtGStateAlpha = Readonly<{ readonly fillAlpha?: number; readonly strokeAlpha?: number }>;

export function extractExtGStateAlphaNative(page: NativePdfPage): ReadonlyMap<string, ExtGStateAlpha> {
  const resources = page.getResourcesDict();
  if (!resources) return new Map();

  const extObj = resolve(page, dictGet(resources, "ExtGState"));
  const ext = asDict(extObj);
  if (!ext) return new Map();

  const out = new Map<string, ExtGStateAlpha>();

  for (const [name, entry] of ext.map.entries()) {
    const dict = asDict(resolve(page, entry));
    if (!dict) continue;
    const ca = asNumber(dictGet(dict, "ca"));
    const CA = asNumber(dictGet(dict, "CA"));

    const alpha: { fillAlpha?: number; strokeAlpha?: number } = {};
    if (ca != null && Number.isFinite(ca)) alpha.fillAlpha = ca;
    if (CA != null && Number.isFinite(CA)) alpha.strokeAlpha = CA;
    if (alpha.fillAlpha != null || alpha.strokeAlpha != null) out.set(name, alpha);
  }

  return out;
}

