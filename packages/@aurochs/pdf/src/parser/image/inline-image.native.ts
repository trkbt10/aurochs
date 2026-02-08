/**
 * @file src/pdf/parser/inline-image.native.ts
 */

import { tokenizeContentStream } from "../../domain/content-stream";
import type { PdfArray, PdfBool, PdfDict, PdfName, PdfNumber, PdfObject, PdfStream, PdfString } from "../../native";

function isPdfWhitespace(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    code === 0x00 ||
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0c ||
    code === 0x0d ||
    code === 0x20
  );
}

function latin1ToBytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) {out[i] = str.charCodeAt(i) & 0xff;}
  return out;
}

function isBoundaryChar(ch: string | undefined): boolean {
  if (!ch) {return true;}
  return isPdfWhitespace(ch);
}

function makeName(value: string): PdfName {
  return { type: "name", value };
}
function makeNumber(value: number): PdfNumber {
  return { type: "number", value };
}
function makeBool(value: boolean): PdfBool {
  return { type: "bool", value };
}
function makeNull(): PdfObject {
  return { type: "null" };
}
function makeString(text: string): PdfString {
  return { type: "string", bytes: latin1ToBytes(text), text };
}
function makeArray(items: readonly PdfObject[]): PdfArray {
  return { type: "array", items };
}
function makeDict(entries: Iterable<readonly [string, PdfObject]>): PdfDict {
  return { type: "dict", map: new Map(entries) };
}

function normalizeColorSpaceName(name: string): string {
  // Inline image abbreviations (PDF Ref 7.9.7)
  if (name === "G") {return "DeviceGray";}
  if (name === "RGB") {return "DeviceRGB";}
  if (name === "CMYK") {return "DeviceCMYK";}
  if (name === "I") {return "Indexed";}
  return name;
}

function normalizeFilterName(name: string): string {
  // Inline image abbreviations (PDF Ref 7.9.7)
  if (name === "AHx") {return "ASCIIHexDecode";}
  if (name === "A85") {return "ASCII85Decode";}
  if (name === "LZW") {return "LZWDecode";}
  if (name === "Fl") {return "FlateDecode";}
  if (name === "RL") {return "RunLengthDecode";}
  if (name === "CCF") {return "CCITTFaxDecode";}
  if (name === "DCT") {return "DCTDecode";}
  if (name === "JPX") {return "JPXDecode";}
  return name;
}

function normalizeInlineKey(key: string): string {
  if (key === "W") {return "Width";}
  if (key === "H") {return "Height";}
  if (key === "CS") {return "ColorSpace";}
  if (key === "BPC") {return "BitsPerComponent";}
  if (key === "F") {return "Filter";}
  if (key === "DP") {return "DecodeParms";}
  if (key === "D") {return "Decode";}
  if (key === "IM") {return "ImageMask";}
  return key;
}

function normalizeInlineValue(key: string, value: PdfObject): PdfObject {
  if (key === "ColorSpace") {
    if (value.type === "name") {return makeName(normalizeColorSpaceName(value.value));}
    if (value.type === "array" && value.items.length > 0) {
      const first = value.items[0];
      if (first?.type === "name") {
        const normalized = [makeName(normalizeColorSpaceName(first.value)), ...value.items.slice(1)];
        return makeArray(normalized);
      }
    }
    return value;
  }

  if (key === "Filter") {
    if (value.type === "name") {return makeName(normalizeFilterName(value.value));}
    if (value.type === "array") {
      const out: PdfObject[] = [];
      for (const item of value.items) {
        if (item.type === "name") {out.push(makeName(normalizeFilterName(item.value)));}
        else {out.push(item);}
      }
      return makeArray(out);
    }
    return value;
  }

  return value;
}

type Token = ReturnType<typeof tokenizeContentStream>[number];

function parseValue(tokens: readonly Token[], start: number): { value: PdfObject; next: number } {
  const tok = tokens[start];
  if (!tok) {return { value: makeNull(), next: start };}

  switch (tok.type) {
    case "number":
      return { value: makeNumber(tok.value as number), next: start + 1 };
    case "string":
      return { value: makeString(tok.value as string), next: start + 1 };
    case "name":
      return { value: makeName(tok.value as string), next: start + 1 };
    case "operator": {
      const op = tok.value as string;
      if (op === "true") {return { value: makeBool(true), next: start + 1 };}
      if (op === "false") {return { value: makeBool(false), next: start + 1 };}
      if (op === "null") {return { value: makeNull(), next: start + 1 };}
      // Fallback: treat as name-like token.
      return { value: makeName(op), next: start + 1 };
    }
    case "array_start": {
      const items: PdfObject[] = [];
      for (let i = start + 1; ; ) {
        if (i >= tokens.length) {
          return { value: makeArray(items), next: i };
        }
        const t = tokens[i];
        if (!t) {
          return { value: makeArray(items), next: i };
        }
        if (t.type === "array_end") {
          return { value: makeArray(items), next: i + 1 };
        }
        const parsed = parseValue(tokens, i);
        items.push(parsed.value);
        i = parsed.next;
      }
    }
    case "dict_start": {
      const entries: Array<readonly [string, PdfObject]> = [];
      for (let i = start + 1; ; ) {
        if (i >= tokens.length) {
          return { value: makeDict(entries), next: i };
        }
        const t = tokens[i];
        if (!t) {
          return { value: makeDict(entries), next: i };
        }
        if (t.type === "dict_end") {
          return { value: makeDict(entries), next: i + 1 };
        }
        if (t.type !== "name") {
          i += 1;
          continue;
        }
        const key = t.value as string;
        const parsed = parseValue(tokens, i + 1);
        entries.push([key, parsed.value]);
        i = parsed.next;
      }
    }
    default:
      return { value: makeNull(), next: start + 1 };
  }
}

function parseInlineImageDict(dictText: string): PdfDict {
  const tokens = tokenizeContentStream(dictText);
  const entries: Array<readonly [string, PdfObject]> = [];

  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i];
    if (!t) {break;}
    if (t.type !== "name") {
      i += 1;
      continue;
    }

    const rawKey = t.value as string;
    const key = normalizeInlineKey(rawKey);
    const parsed = parseValue(tokens, i + 1);
    const value = normalizeInlineValue(key, parsed.value);
    entries.push([key, value]);
    i = parsed.next;
  }

  // Ensure extractor can treat it as a normal image XObject.
  entries.push(["Subtype", makeName("Image")]);
  return makeDict(entries);
}

function findInlineImageEnd(content: string, startData: number): number | null {
  for (let i = startData; i < content.length - 1; i += 1) {
    if (content[i] !== "E" || content[i + 1] !== "I") {continue;}
    if (!isBoundaryChar(content[i - 1])) {continue;}
    if (!isBoundaryChar(content[i + 2])) {continue;}
    return i;
  }
  return null;
}

function findOperatorWithBoundary(content: string, op: string, start: number): number | null {
  for (let pos = start; pos < content.length; ) {
    const idx = content.indexOf(op, pos);
    if (idx < 0) {return null;}
    if (isBoundaryChar(content[idx - 1]) && isBoundaryChar(content[idx + op.length])) {return idx;}
    pos = idx + op.length;
  }
  return null;
}

export type PreprocessInlineImagesResult = Readonly<{
  readonly content: string;
  readonly xObjects: ReadonlyMap<string, PdfStream>;
}>;











/** Rewrite inline images (BI/ID/EI) into synthetic XObject `/Do` calls. */
export function preprocessInlineImages(
  bytes: Uint8Array,
  options: Readonly<{
    readonly nextId: () => number;
    readonly existingNames?: ReadonlySet<string>;
  }>,
): PreprocessInlineImagesResult {
  if (!bytes) {throw new Error("bytes is required");}
  if (!options) {throw new Error("options is required");}
  if (!options.nextId) {throw new Error("options.nextId is required");}

  const content = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  const xObjects = new Map<string, PdfStream>();

  const used = new Set<string>(options.existingNames ? [...options.existingNames] : []);

  const allocateName = (): string => {
    for (;;) {
      const candidate = `__InlineIm${options.nextId()}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
  };

  const pos = { value: 0 };
  while (pos.value < content.length) {
    const bi = findOperatorWithBoundary(content, "BI", pos.value);
    if (bi == null) {break;}

    const id = findOperatorWithBoundary(content, "ID", bi + 2);
    if (id == null) {
      // No terminator; keep remainder as-is.
      break;
    }

    const dictText = content.slice(bi + 2, id);
    const dict = parseInlineImageDict(dictText);

    const dataStart = { value: id + 2 };
    // Consume the required whitespace separator after ID. Some producers use CRLF.
    if (content[dataStart.value] === "\r" && content[dataStart.value + 1] === "\n") {dataStart.value += 2;}
    else if (isBoundaryChar(content[dataStart.value])) {dataStart.value += 1;}

    const ei = findInlineImageEnd(content, dataStart.value);
    if (ei == null) {break;}

    const dataEnd = Math.max(dataStart.value, ei - 1); // exclude the whitespace before EI
    const data = latin1ToBytes(content.slice(dataStart.value, dataEnd));
    const name = allocateName();

    xObjects.set(name, { type: "stream", dict, data });

    out.push(content.slice(pos.value, bi));
    out.push(`/${name} Do`);
    pos.value = ei + 2;
  }

  out.push(content.slice(pos.value));
  return { content: out.join(""), xObjects };
}
