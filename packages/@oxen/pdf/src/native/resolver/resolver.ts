/**
 * @file src/pdf/native/resolver.ts
 */

import { parseIndirectObjectAt, parseObject } from "../syntax/object-parser";
import { decodeStreamData } from "../filters";
import type { PdfDict, PdfObject, PdfStream } from "../core/types";
import type { XRefEntry, XRefTable } from "../xref/xref";
import type { PdfDecrypter } from "../encryption/standard";
import { decryptPdfObject } from "../encryption/decrypt-object";

type ObjStmCacheEntry = Readonly<{
  readonly objStm: number;
  readonly objects: ReadonlyMap<number, PdfObject>;
}>;

function asStream(obj: PdfObject): PdfStream | null {
  return obj.type === "stream" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}

function asName(obj: PdfObject | undefined): string | null {
  return obj?.type === "name" ? obj.value : null;
}

function readFilterNames(dict: PdfDict): readonly string[] {
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

  if (decodeParms.type === "dict") {
    if (filterCount <= 1) {return [decodeParms];}
    return [decodeParms, ...new Array<null>(Math.max(0, filterCount - 1)).fill(null)];
  }

  return undefined;
}











/** PDF object resolver (xref + ObjStm aware). */
export type PdfResolver = Readonly<{
  deref(obj: PdfObject): PdfObject;
  getObject(objNum: number): PdfObject;
}>;

/**
 * Create an object resolver for a PDF file.
 *
 * Resolves indirect references via the xref table, including objects stored in ObjStm streams.
 */
export function createPdfResolver(
  bytes: Uint8Array,
  xref: XRefTable,
  options: Readonly<{
    readonly decrypter?: PdfDecrypter;
    readonly skipDecryptObjectNums?: ReadonlySet<number>;
  }> = {},
): PdfResolver {
  const indirectCache = new Map<number, PdfObject>();
  const objStmCache = new Map<number, ObjStmCacheEntry>();

  const deref = (obj: PdfObject): PdfObject => (obj.type === "ref" ? getObject(obj.obj) : obj);

  function getObject(objNum: number): PdfObject {
    const cached = indirectCache.get(objNum);
    if (cached) {return cached;}

    const entry = xref.entries.get(objNum);
    if (!entry) {
      throw new Error(`Missing xref entry for object ${objNum}`);
    }

    const { value, gen } = resolveXRefEntry(objNum, entry);
    const decrypted = decryptIfNeeded(value, objNum, gen);

    indirectCache.set(objNum, decrypted);
    return decrypted;
  }

  const resolveXRefEntry = (objNum: number, entry: XRefEntry): { readonly value: PdfObject; readonly gen: number } => {
    if (entry.type === 0) {
      throw new Error(`Object ${objNum} is free`);
    }
    if (entry.type === 1) {
      const { obj } = parseIndirectObjectAt(bytes, entry.offset, { resolveObject: (n) => getObject(n) });
      if (obj.obj !== objNum) {
        // Some PDFs may have padding; still trust parsed obj.
      }
      return { value: obj.value, gen: entry.gen };
    }
    if (entry.type === 2) {
      return { value: getCompressedObject(entry.objStm, entry.index), gen: 0 };
    }
    const exhaustive: never = entry;
    throw new Error(`Unsupported xref entry: ${String(exhaustive)}`);
  };

  const decryptIfNeeded = (value: PdfObject, objNum: number, gen: number): PdfObject => {
    const decrypter = options.decrypter;
    if (!decrypter) {return value;}
    const skip = options.skipDecryptObjectNums;
    if (skip?.has(objNum)) {return value;}
    return decryptPdfObject(value, objNum, gen, decrypter);
  };

  const getCompressedObject = (objStmNum: number, index: number): PdfObject => {
    const cache = objStmCache.get(objStmNum);
    const objects = cache ? cache.objects : parseObjStm(objStmNum);
    const value = objects.get(index);
    if (!value) {throw new Error(`ObjStm ${objStmNum}: missing object index ${index}`);}
    return value;
  };

  const parseObjStm = (objStmNum: number): ReadonlyMap<number, PdfObject> => {
    const stmObj = getObject(objStmNum);
    const stream = asStream(stmObj);
    if (!stream) {throw new Error(`ObjStm ${objStmNum}: not a stream`);}

    const type = asName(dictGet(stream.dict, "Type"));
    if (type !== "ObjStm") {throw new Error(`ObjStm ${objStmNum}: /Type is not /ObjStm`);}

    const n = asNumber(dictGet(stream.dict, "N"));
    const first = asNumber(dictGet(stream.dict, "First"));
    if (n == null || first == null) {throw new Error(`ObjStm ${objStmNum}: missing /N or /First`);}

    const filters = readFilterNames(stream.dict);
    const decodeParms = decodeParmsFromStreamDict(stream.dict, filters.length);
    const decoded = decodeStreamData(stream.data, { filters, decodeParms });

    const headerBytes = decoded.slice(0, first);
    const headerText = new TextDecoder("latin1").decode(headerBytes);
    const parts = headerText.trim().split(/\s+/).filter(Boolean);
    if (parts.length < n * 2) {throw new Error(`ObjStm ${objStmNum}: header too short`);}

    const offsets: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const obj = Number.parseInt(parts[i * 2] ?? "", 10);
      const off = Number.parseInt(parts[i * 2 + 1] ?? "", 10);
      if (!Number.isFinite(obj) || !Number.isFinite(off)) {
        throw new Error(`ObjStm ${objStmNum}: invalid header number`);
      }
      offsets.push(off);
    }

    const out = new Map<number, PdfObject>();
    const base = first;
    for (let i = 0; i < n; i += 1) {
      const off = offsets[i] ?? 0;
      const pos = base + off;
      const parsed = parseObject({ lex: { bytes: decoded, pos } });
      out.set(i, parsed.value);
    }

    objStmCache.set(objStmNum, { objStm: objStmNum, objects: out });
    return out;
  };

  return { deref, getObject };
}
