/**
 * @file src/pdf/native/xref.ts
 */

import { encodeAscii } from "../core/encoding";
import { createLexer } from "../syntax/lexer";
import { parseIndirectObjectAt, parseObject } from "../syntax/object-parser";
import { lastIndexOfBytes } from "../core/scan";
import type { PdfArray, PdfDict, PdfObject, PdfRef, PdfStream } from "../core/types";
import { decodeStreamData } from "../filters";

export type XRefEntry =
  | Readonly<{ type: 0 }>
  | Readonly<{ type: 1; offset: number; gen: number }>
  | Readonly<{ type: 2; objStm: number; index: number }>;

export type XRefTable = Readonly<{
  readonly entries: ReadonlyMap<number, XRefEntry>;
  /** Trailer dictionary (xref stream dict or trailer dict) */
  readonly trailer: PdfDict;
}>;

function asStream(obj: PdfObject): PdfStream | null {
  return obj.type === "stream" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}
function asName(obj: PdfObject | undefined): string | null {
  return obj?.type === "name" ? obj.value : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function asInt(obj: PdfObject | undefined): number | null {
  if (!obj || obj.type !== "number") {return null;}
  if (!Number.isFinite(obj.value)) {return null;}
  return Math.trunc(obj.value);
}

function readUIntBE(bytes: Uint8Array, pos: number, width: number): number {
  const state = { value: 0 };
  for (let i = 0; i < width; i += 1) {
    state.value = (state.value << 8) | (bytes[pos + i] ?? 0);
  }
  return state.value >>> 0;
}











/** Locate `startxref` and return the xref section offset. */
export function findStartXrefOffset(bytes: Uint8Array): number {
  const marker = encodeAscii("startxref");
  const idx = lastIndexOfBytes(bytes, marker);
  if (idx < 0) {throw new Error("startxref not found");}

  const state = { pos: idx + marker.length, num: "" };
  // skip whitespace
  while (state.pos < bytes.length) {
    const b = bytes[state.pos] ?? 0;
    if (b === 0x0d || b === 0x0a || b === 0x20 || b === 0x09) {
      state.pos += 1;
      continue;
    }
    break;
  }

  // parse integer line
  while (state.pos < bytes.length) {
    const b = bytes[state.pos] ?? 0;
    if (b >= 0x30 && b <= 0x39) {
      state.num += String.fromCharCode(b);
      state.pos += 1;
      continue;
    }
    break;
  }
  if (state.num.length === 0) {throw new Error("startxref offset missing");}
  return Number.parseInt(state.num, 10);
}

function parseXRefStream(stream: PdfStream): { entries: ReadonlyMap<number, XRefEntry>; trailer: PdfDict } {
  const dict = stream.dict;
  const type = asName(dictGet(dict, "Type"));
  if (type !== "XRef") {throw new Error("xref stream: /Type is not /XRef");}

  const wArr = asArray(dictGet(dict, "W"));
  if (!wArr) {throw new Error("xref stream: missing /W");}
  const w = wArr.items.map((x) => (x.type === "number" ? Math.trunc(x.value) : 0));
  if (w.length !== 3) {throw new Error("xref stream: /W must have 3 entries");}
  const [w0, w1, w2] = w;

  const size = asNumber(dictGet(dict, "Size"));
  if (!size) {throw new Error("xref stream: missing /Size");}

  const indexArr = asArray(dictGet(dict, "Index"));
  const indexPairs = buildXRefIndexPairs(indexArr, size);

  if (indexPairs.length % 2 !== 0) {throw new Error("xref stream: /Index must have even length");}

  const filters = readFilterNames(dict);
  const decodeParms = decodeParmsFromStreamDict(dict, filters.length);
  const decoded = decodeStreamData(stream.data, { filters, decodeParms });

  const entryWidth = w0 + w1 + w2;
  if (entryWidth <= 0) {throw new Error("xref stream: invalid /W");}

  const out = new Map<number, XRefEntry>();
  const cursor = { value: 0 };
  for (let i = 0; i < indexPairs.length; i += 2) {
    const start = indexPairs[i] ?? 0;
    const count = indexPairs[i + 1] ?? 0;
    for (let j = 0; j < count; j += 1) {
      const objNum = start + j;
      const t = w0 === 0 ? 1 : readUIntBE(decoded, cursor.value, w0);
      const f1 = w1 === 0 ? 0 : readUIntBE(decoded, cursor.value + w0, w1);
      const f2 = w2 === 0 ? 0 : readUIntBE(decoded, cursor.value + w0 + w1, w2);
      cursor.value += entryWidth;

      if (t === 0) {
        out.set(objNum, { type: 0 });
      } else if (t === 1) {
        out.set(objNum, { type: 1, offset: f1, gen: f2 });
      } else if (t === 2) {
        out.set(objNum, { type: 2, objStm: f1, index: f2 });
      } else {
        // unknown type; ignore
      }
    }
  }
  return { entries: out, trailer: dict };
}

function buildXRefIndexPairs(indexArr: PdfArray | null, size: number): number[] {
  if (indexArr) {
    return indexArr.items.map((x) => (x.type === "number" ? Math.trunc(x.value) : 0));
  }
  return [0, Math.trunc(size)];
}

function readFilterNames(dict: PdfDict): readonly string[] {
  const filterObj = dictGet(dict, "Filter");
  if (!filterObj) {return [];}
  if (filterObj.type === "name") {return [filterObj.value];}
  if (filterObj.type === "array") {
    const out: string[] = [];
    for (const item of filterObj.items) {
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

  if (decodeParms.type === "dict") {
    if (filterCount <= 1) {return [decodeParms];}
    return [decodeParms, ...new Array<null>(Math.max(0, filterCount - 1)).fill(null)];
  }

  return undefined;
}

function skipWs(bytes: Uint8Array, pos: number): number {
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    if (b === 0x00 || b === 0x09 || b === 0x0a || b === 0x0c || b === 0x0d || b === 0x20) {
      pos += 1;
      continue;
    }
    break;
  }
  return pos;
}

function readLine(bytes: Uint8Array, pos: number): { line: string; nextPos: number } {
  const start = pos;
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    if (b === 0x0a || b === 0x0d) {break;}
    pos += 1;
  }
  const line = new TextDecoder("latin1").decode(bytes.slice(start, pos));
  if ((bytes[pos] ?? 0) === 0x0d) {
    pos += 1;
    if ((bytes[pos] ?? 0) === 0x0a) {pos += 1;}
  } else if ((bytes[pos] ?? 0) === 0x0a) {
    pos += 1;
  }
  return { line, nextPos: pos };
}

function parseXRefTableAt(bytes: Uint8Array, offset: number): {
  entries: ReadonlyMap<number, XRefEntry>;
  trailer: PdfDict;
  prev: number | null;
  xrefStm: number | null;
} {
  const pos = { value: skipWs(bytes, offset) };
  const first = readLine(bytes, pos.value);
  if (first.line.trim() !== "xref") {throw new Error("xref table: missing 'xref'");}
  pos.value = first.nextPos;

  const entries = new Map<number, XRefEntry>();

  while (pos.value < bytes.length) {
    pos.value = skipWs(bytes, pos.value);
    const { line, nextPos } = readLine(bytes, pos.value);
    pos.value = nextPos;
    const trimmed = line.trim();
    if (trimmed.length === 0) {continue;}
    if (trimmed === "trailer") {break;}

    const parts = trimmed.split(/\s+/);
    const startObj = Number.parseInt(parts[0] ?? "", 10);
    const count = Number.parseInt(parts[1] ?? "", 10);
    if (!Number.isFinite(startObj) || !Number.isFinite(count)) {
      throw new Error("xref table: invalid subsection header");
    }

    for (let i = 0; i < count; i += 1) {
      const row = readLine(bytes, pos.value);
      pos.value = row.nextPos;
      const rowParts = row.line.trim().split(/\s+/);
      const off = Number.parseInt(rowParts[0] ?? "", 10);
      const gen = Number.parseInt(rowParts[1] ?? "", 10);
      const inUse = rowParts[2] ?? "";
      const objNum = startObj + i;

      if (inUse === "n") {
        entries.set(objNum, { type: 1, offset: off, gen });
      } else {
        entries.set(objNum, { type: 0 });
      }
    }
  }

  pos.value = skipWs(bytes, pos.value);
  const parsedTrailer = parseObject({ lex: createLexer(bytes, pos.value) });
  const trailer = parsedTrailer.value;
  if (trailer.type !== "dict") {
    throw new Error("xref table: trailer is not a dictionary");
  }
  const prev = asInt(dictGet(trailer, "Prev"));
  const xrefStm = asInt(dictGet(trailer, "XRefStm"));
  return { entries, trailer, prev, xrefStm };
}

function parseXRefStreamAt(bytes: Uint8Array, offset: number): {
  entries: ReadonlyMap<number, XRefEntry>;
  trailer: PdfDict;
  prev: number | null;
  xrefStm: number | null;
} {
  const { obj } = parseIndirectObjectAt(bytes, offset);
  const stream = asStream(obj.value);
  if (!stream) {throw new Error("xref stream: object is not a stream");}
  const parsed = parseXRefStream(stream);
  const prev = asInt(dictGet(parsed.trailer, "Prev"));
  return { entries: parsed.entries, trailer: parsed.trailer, prev, xrefStm: null };
}











/** Load and merge xref sections (including xref streams) into a single table. */
export function loadXRef(bytes: Uint8Array): XRefTable {
  const state: { offset: number | null; trailer: PdfDict | null } = { offset: findStartXrefOffset(bytes), trailer: null };
  const entries = new Map<number, XRefEntry>();

  while (state.offset != null && state.offset > 0) {
    const pos = skipWs(bytes, state.offset);
    const looksLikeXrefTable =
      (bytes[pos] ?? 0) === 0x78 && // 'x'
      (bytes[pos + 1] ?? 0) === 0x72 && // 'r'
      (bytes[pos + 2] ?? 0) === 0x65 && // 'e'
      (bytes[pos + 3] ?? 0) === 0x66; // 'f'

    const parsed: {
      entries: ReadonlyMap<number, XRefEntry>;
      trailer: PdfDict;
      prev: number | null;
      xrefStm: number | null;
    } = parseXRefSectionAt(bytes, state.offset, looksLikeXrefTable);

    if (!state.trailer) {state.trailer = parsed.trailer;}
    for (const [objNum, entry] of parsed.entries.entries()) {
      if (!entries.has(objNum)) {
        entries.set(objNum, entry);
      }
    }

    // Hybrid-reference PDFs: trailer of an xref table may include /XRefStm pointing to an xref stream offset.
    // Load that additional xref stream and merge its entries (without overriding the xref table section).
    if (looksLikeXrefTable && parsed.xrefStm != null && parsed.xrefStm > 0) {
      const hybrid = parseXRefStreamAt(bytes, parsed.xrefStm);
      for (const [objNum, entry] of hybrid.entries.entries()) {
        if (!entries.has(objNum)) {
          entries.set(objNum, entry);
        }
      }
      if (!state.trailer) {state.trailer = hybrid.trailer;}
    }

    state.offset = parsed.prev;
  }

  if (!state.trailer) {throw new Error("Failed to load xref");}
  return { entries, trailer: state.trailer };
}

function parseXRefSectionAt(
  bytes: Uint8Array,
  offset: number,
  looksLikeXrefTable: boolean,
): { entries: ReadonlyMap<number, XRefEntry>; trailer: PdfDict; prev: number | null; xrefStm: number | null } {
  if (looksLikeXrefTable) {
    return parseXRefTableAt(bytes, offset);
  }
  return parseXRefStreamAt(bytes, offset);
}











/** Get a `/ref` value from the trailer, if present. */
export function getTrailerRef(trailer: PdfDict, key: string): PdfRef | null {
  const value = trailer.map.get(key);
  return value?.type === "ref" ? value : null;
}
