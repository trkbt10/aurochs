/**
 * @file src/pdf/parser/ext-gstate.native.ts
 */

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
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

export type ExtGStateAlpha = Readonly<{ readonly fillAlpha?: number; readonly strokeAlpha?: number }>;

export type ExtGStateParams = Readonly<{
  readonly fillAlpha?: number;
  readonly strokeAlpha?: number;
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
    const LW = asNumber(dictGet(dict, "LW"));
    const LC = asNumber(dictGet(dict, "LC"));
    const LJ = asNumber(dictGet(dict, "LJ"));
    const ML = asNumber(dictGet(dict, "ML"));
    const D = parseDashPattern(resolve(page, dictGet(dict, "D")));

    const params: {
      fillAlpha?: number;
      strokeAlpha?: number;
      lineWidth?: number;
      lineCap?: 0 | 1 | 2;
      lineJoin?: 0 | 1 | 2;
      miterLimit?: number;
      dashArray?: readonly number[];
      dashPhase?: number;
    } = {};

    if (ca != null && Number.isFinite(ca)) {params.fillAlpha = ca;}
    if (CA != null && Number.isFinite(CA)) {params.strokeAlpha = CA;}
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
