/**
 * @file src/pdf/native/object-parser.ts
 */

import { decodePdfStringBytes, encodeAscii } from "../core/encoding";
import { createLexer, nextToken, type PdfLexer, type PdfToken } from "./lexer";
import { indexOfBytes, isDelimiter, isWhite } from "../core/scan";
import type {
  PdfArray,
  PdfBool,
  PdfDict,
  PdfIndirectObject,
  PdfName,
  PdfNull,
  PdfNumber,
  PdfObject,
  PdfRef,
  PdfStream,
  PdfString,
} from "../core/types";

type ParseState = Readonly<{ lex: PdfLexer }>;
type ParseIndirectOptions = Readonly<{
  readonly resolveObject?: (objNum: number) => PdfObject;
}>;

function expectKeyword(state: ParseState, keyword: string): ParseState {
  const { token, next } = nextToken(state.lex);
  if (token.type !== "keyword" || token.value !== keyword) {
    throw new Error(`Expected keyword "${keyword}", got ${token.type === "keyword" ? token.value : token.type}`);
  }
  return { lex: next };
}

function parsePrimitiveFromToken(token: PdfToken): PdfObject | null {
  if (token.type === "keyword") {
    if (token.value === "true") {return { type: "bool", value: true } satisfies PdfBool;}
    if (token.value === "false") {return { type: "bool", value: false } satisfies PdfBool;}
    if (token.value === "null") {return { type: "null" } satisfies PdfNull;}
  }
  if (token.type === "number") {return { type: "number", value: token.value } satisfies PdfNumber;}
  if (token.type === "name") {return { type: "name", value: token.value } satisfies PdfName;}
  if (token.type === "string") {
    return { type: "string", bytes: token.bytes, text: decodePdfStringBytes(token.bytes) } satisfies PdfString;
  }
  if (token.type === "hexstring") {
    return { type: "string", bytes: token.bytes, text: decodePdfStringBytes(token.bytes) } satisfies PdfString;
  }
  return null;
}

function parseObjectWithInitialToken(state: ParseState, initial: PdfToken): { value: PdfObject; state: ParseState } {
  // compound
  if (initial.type === "punct" && initial.value === "[") {
    const items: PdfObject[] = [];
    const st = { state };
    while (true) {
      const { token, next } = nextToken(st.state.lex);
      if (token.type === "punct" && token.value === "]") {
        st.state = { lex: next };
        break;
      }
      const parsed = parseObjectWithInitialToken({ lex: next }, token);
      items.push(parsed.value);
      st.state = parsed.state;
    }
    return { value: { type: "array", items } satisfies PdfArray, state: st.state };
  }

  if (initial.type === "punct" && initial.value === "<<") {
    const entries = new Map<string, PdfObject>();
    const st = { state };
    while (true) {
      const { token, next } = nextToken(st.state.lex);
      if (token.type === "punct" && token.value === ">>") {
        st.state = { lex: next };
        break;
      }
      if (token.type !== "name") {
        throw new Error(`PDF dict key must be name, got ${token.type}`);
      }
      const key = token.value;
      const valueParsed = parseObject({ lex: next });
      entries.set(key, valueParsed.value);
      st.state = valueParsed.state;
    }
    return { value: { type: "dict", map: entries } satisfies PdfDict, state: st.state };
  }

  // primitives and refs
  const prim = parsePrimitiveFromToken(initial);
  if (prim) {
    if (initial.type === "number" && initial.isInt) {
      // maybe "obj gen R"
      const afterFirst = state;
      const { token: t2, next: n2 } = nextToken(afterFirst.lex);
      if (t2.type === "number" && t2.isInt) {
        const { token: t3, next: n3 } = nextToken(n2);
        if (t3.type === "keyword" && t3.value === "R") {
          return {
            value: { type: "ref", obj: Math.trunc(initial.value), gen: Math.trunc(t2.value) } satisfies PdfRef,
            state: { lex: n3 },
          };
        }
      }
    }
    return { value: prim, state };
  }

  throw new Error(`Unexpected token: ${initial.type === "keyword" ? initial.value : initial.type}`);
}











/** Parse a single PDF object from the current parser state. */
export function parseObject(state: ParseState): { value: PdfObject; state: ParseState } {
  const { token, next } = nextToken(state.lex);
  return parseObjectWithInitialToken({ lex: next }, token);
}

function skipStreamEol(bytes: Uint8Array, pos: number): number {
  // After "stream", allow:
  // - LF or CRLF (common, per spec)
  // - optional spaces/tabs before the line break (tolerate non-standard writers)
  // - an optional comment up to the line break (tolerate odd formatting)
  //
  // IMPORTANT: do not skip arbitrary whitespace unless a line break follows; otherwise we would
  // accidentally consume whitespace that is part of the stream data.
  const b0 = bytes[pos] ?? 0;

  const consumeEol = (p: number): number => {
    const b = bytes[p] ?? 0;
    if (b === 0x0d) {
      p += 1;
      if ((bytes[p] ?? 0) === 0x0a) {p += 1;}
      return p;
    }
    if (b === 0x0a) {return p + 1;}
    return p;
  };

  if (b0 === 0x0d || b0 === 0x0a) {return consumeEol(pos);}

  // spaces/tabs before EOL
  if (b0 === 0x20 || b0 === 0x09) {
    const pState = { p: pos };
    while (pState.p < bytes.length) {
      const b = bytes[pState.p] ?? 0;
      if (b === 0x20 || b === 0x09) {
        pState.p += 1;
        continue;
      }
      break;
    }
    const b = bytes[pState.p] ?? 0;
    if (b === 0x0d || b === 0x0a) {return consumeEol(pState.p);}
    if (b === 0x25) {
      // comment until EOL
      pState.p += 1;
      while (pState.p < bytes.length) {
        const c = bytes[pState.p] ?? 0;
        if (c === 0x0d || c === 0x0a) {break;}
        pState.p += 1;
      }
      return consumeEol(pState.p);
    }
    return pos;
  }

  // comment immediately after stream keyword
  if (b0 === 0x25) {
    const pState = { p: pos + 1 };
    while (pState.p < bytes.length) {
      const c = bytes[pState.p] ?? 0;
      if (c === 0x0d || c === 0x0a) {break;}
      pState.p += 1;
    }
    return consumeEol(pState.p);
  }

  return pos;
}

function parseStreamDataFromRaw(
  bytes: Uint8Array,
  startPos: number,
  length: number | null,
): { data: Uint8Array; nextPos: number } {
  const streamStart = skipStreamEol(bytes, startPos);
  if (length != null) {
    const dataStart = streamStart;
    const dataEnd = dataStart + length;
    const data = bytes.slice(dataStart, dataEnd);
    return { data, nextPos: dataEnd };
  }

  // Fallback: search for endstream, but avoid obvious false positives inside binary payloads.
  const dataEnd = findEndstreamStart(bytes, streamStart);
  if (dataEnd < 0) {throw new Error("Failed to find endstream");}
  return { data: bytes.slice(streamStart, dataEnd), nextPos: dataEnd };
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function asNumber(obj: PdfObject | undefined): number | null {
  if (!obj) {return null;}
  if (obj.type === "number") {return obj.value;}
  return null;
}

function asRef(obj: PdfObject | undefined): PdfRef | null {
  return obj?.type === "ref" ? obj : null;
}

const ENDSTREAM = encodeAscii("endstream");

function isTokenBoundary(byte: number): boolean {
  return isWhite(byte) || isDelimiter(byte);
}

function findEndstreamStart(bytes: Uint8Array, from: number): number {
  const state = { pos: from };
  while (state.pos >= 0 && state.pos < bytes.length) {
    const idx = indexOfBytes(bytes, ENDSTREAM, state.pos);
    if (idx < 0) {return -1;}

    const before = idx > 0 ? (bytes[idx - 1] ?? 0) : 0;
    const after = bytes[idx + ENDSTREAM.length] ?? 0;
    if (idx > 0 && !isTokenBoundary(before)) {
      state.pos = idx + 1;
      continue;
    }
    if (!isTokenBoundary(after)) {
      state.pos = idx + 1;
      continue;
    }

    // Additional check: ensure 'endobj' follows.
    const st: ParseState = { lex: createLexer(bytes, idx) };
    const s1 = expectKeyword(st, "endstream");
    try {
      expectKeyword(s1, "endobj");
      return idx;
    } catch {
      state.pos = idx + 1;
      continue;
    }
  }
  return -1;
}











/** Parse an indirect object (`n n obj ... endobj`) at a byte offset. */
export function parseIndirectObjectAt(
  bytes: Uint8Array,
  offset: number,
  options: ParseIndirectOptions = {},
): { obj: PdfIndirectObject; nextOffset: number } {
  const parseState: { st: ParseState } = { st: { lex: createLexer(bytes, offset) } };

  const { token: tObj, next: n1 } = nextToken(parseState.st.lex);
  if (tObj.type !== "number" || !tObj.isInt) {throw new Error("Indirect object: missing object number");}
  const { token: tGen, next: n2 } = nextToken(n1);
  if (tGen.type !== "number" || !tGen.isInt) {throw new Error("Indirect object: missing generation number");}
  parseState.st = { lex: n2 };
  parseState.st = expectKeyword(parseState.st, "obj");

  const parsed = parseObject(parseState.st);
  parseState.st = parsed.state;
  const value = { value: parsed.value };

  // If the value is a dict and followed by "stream", parse stream body.
  if (value.value.type === "dict") {
    const afterDict = parseState.st;
    const { token: maybeStream, next: afterStreamToken } = nextToken(afterDict.lex);
    if (maybeStream.type === "keyword" && maybeStream.value === "stream") {
      const lengthObj = dictGet(value.value, "Length");
      const length = (() => {
        const direct = asNumber(lengthObj);
        if (direct != null) {return direct;}
        const ref = asRef(lengthObj);
        if (ref && options.resolveObject) {
          const resolved = options.resolveObject(ref.obj);
          return resolved.type === "number" ? resolved.value : null;
        }
        return null;
      })();
      const rawPos = afterStreamToken.pos;
      const { data, nextPos } = parseStreamDataFromRaw(bytes, rawPos, length);
      // Move lexer to after stream data; then expect endstream/endobj.
      parseState.st = { lex: createLexer(bytes, nextPos) };
      parseState.st = expectKeyword(parseState.st, "endstream");
      value.value = { type: "stream", dict: value.value, data } satisfies PdfStream;
    }
  }

  parseState.st = expectKeyword(parseState.st, "endobj");
  return {
    obj: { obj: Math.trunc(tObj.value), gen: Math.trunc(tGen.value), value: value.value },
    nextOffset: parseState.st.lex.pos,
  };
}
