import { parseIndirectObjectAt, parseObject } from "./object-parser";
import { decodeStreamData } from "./filters";
import type { PdfDict, PdfObject, PdfStream } from "./types";
import type { XRefTable } from "./xref";

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

export class PdfResolver {
  private readonly indirectCache = new Map<number, PdfObject>();
  private readonly objStmCache = new Map<number, ObjStmCacheEntry>();

  constructor(
    private readonly bytes: Uint8Array,
    private readonly xref: XRefTable,
  ) {}

  deref(obj: PdfObject): PdfObject {
    return obj.type === "ref" ? this.getObject(obj.obj) : obj;
  }

  getObject(objNum: number): PdfObject {
    const cached = this.indirectCache.get(objNum);
    if (cached) return cached;

    const entry = this.xref.entries.get(objNum);
    if (!entry) {
      throw new Error(`Missing xref entry for object ${objNum}`);
    }

    const value = (() => {
      if (entry.type === 0) {
        throw new Error(`Object ${objNum} is free`);
      }
      if (entry.type === 1) {
        const { obj } = parseIndirectObjectAt(this.bytes, entry.offset);
        if (obj.obj !== objNum) {
          // Some PDFs may have padding; still trust parsed obj.
        }
        return obj.value;
      }
      if (entry.type === 2) {
        return this.getCompressedObject(entry.objStm, entry.index);
      }
      const exhaustive: never = entry;
      throw new Error(`Unsupported xref entry: ${String(exhaustive)}`);
    })();

    this.indirectCache.set(objNum, value);
    return value;
  }

  private getCompressedObject(objStmNum: number, index: number): PdfObject {
    const cache = this.objStmCache.get(objStmNum);
    const objects = cache ? cache.objects : this.parseObjStm(objStmNum);
    const value = objects.get(index);
    if (!value) throw new Error(`ObjStm ${objStmNum}: missing object index ${index}`);
    return value;
  }

  private parseObjStm(objStmNum: number): ReadonlyMap<number, PdfObject> {
    const stmObj = this.getObject(objStmNum);
    const stream = asStream(stmObj);
    if (!stream) throw new Error(`ObjStm ${objStmNum}: not a stream`);

    const type = asName(dictGet(stream.dict, "Type"));
    if (type !== "ObjStm") throw new Error(`ObjStm ${objStmNum}: /Type is not /ObjStm`);

    const n = asNumber(dictGet(stream.dict, "N"));
    const first = asNumber(dictGet(stream.dict, "First"));
    if (!n || !first) throw new Error(`ObjStm ${objStmNum}: missing /N or /First`);

    const filters = readFilterNames(stream.dict);
    const decoded = decodeStreamData(stream.data, { filters });

    const headerBytes = decoded.slice(0, first);
    const headerText = new TextDecoder("latin1").decode(headerBytes);
    const parts = headerText.trim().split(/\s+/).filter(Boolean);
    if (parts.length < n * 2) throw new Error(`ObjStm ${objStmNum}: header too short`);

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

    this.objStmCache.set(objStmNum, { objStm: objStmNum, objects: out });
    return out;
  }
}
