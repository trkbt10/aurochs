import { decodeStreamData } from "./filters";
import type { PdfDict, PdfObject, PdfStream } from "./types";

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function filterNamesFromStreamDict(dict: PdfDict): readonly string[] {
  const filter = dictGet(dict, "Filter");
  if (!filter) return [];
  if (filter.type === "name") return [filter.value];
  if (filter.type === "array") {
    const out: string[] = [];
    for (const item of filter.items) {
      if (item.type === "name") out.push(item.value);
    }
    return out;
  }
  return [];
}

export function decodePdfStream(stream: PdfStream): Uint8Array {
  const filters = filterNamesFromStreamDict(stream.dict);
  if (filters.length === 0) return stream.data;
  return decodeStreamData(stream.data, { filters });
}

