/**
 * @file src/pdf/native/stream.ts
 */

import { decodeStreamData } from "../filters";
import type { PdfDict, PdfObject, PdfStream } from "../core/types";

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function filterNamesFromStreamDict(dict: PdfDict): readonly string[] {
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

function decodeParmsFromStreamDict(dict: PdfDict, filterCount: number): readonly (PdfObject | null)[] | undefined {
  const decodeParms = dictGet(dict, "DecodeParms");
  if (!decodeParms) {return undefined;}

  if (decodeParms.type === "array") {
    const out: (PdfObject | null)[] = [];
    for (const item of decodeParms.items) {
      if (item.type === "null") {out.push(null);}
      else {out.push(item);}
    }
    return out;
  }

  if (decodeParms.type === "null") {
    return [null];
  }

  // Common case: single filter with a dict decode parm.
  if (decodeParms.type === "dict") {
    if (filterCount <= 1) {return [decodeParms];}
    // Multiple filters should normally provide an array; keep the first and leave the rest unspecified.
    return [decodeParms, ...new Array<null>(Math.max(0, filterCount - 1)).fill(null)];
  }

  return undefined;
}











/** Decode a PDF stream by applying its filters in order. */
export function decodePdfStream(stream: PdfStream): Uint8Array {
  const filters = filterNamesFromStreamDict(stream.dict);
  if (filters.length === 0) {return stream.data;}
  const decodeParms = decodeParmsFromStreamDict(stream.dict, filters.length);
  return decodeStreamData(stream.data, { filters, decodeParms });
}
