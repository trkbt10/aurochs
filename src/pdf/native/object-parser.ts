import { decodePdfStringBytes, encodeAscii } from "./encoding";
import { createLexer, nextToken, type PdfLexer, type PdfToken } from "./lexer";
import { indexOfBytes, isDelimiter, isWhite } from "./scan";
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
} from "./types";

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
    if (token.value === "true") return { type: "bool", value: true } satisfies PdfBool;
    if (token.value === "false") return { type: "bool", value: false } satisfies PdfBool;
    if (token.value === "null") return { type: "null" } satisfies PdfNull;
  }
  if (token.type === "number") return { type: "number", value: token.value } satisfies PdfNumber;
  if (token.type === "name") return { type: "name", value: token.value } satisfies PdfName;
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
    let st: ParseState = state;
    while (true) {
      const { token, next } = nextToken(st.lex);
      if (token.type === "punct" && token.value === "]") {
        st = { lex: next };
        break;
      }
      const parsed = parseObjectWithInitialToken({ lex: next }, token);
      items.push(parsed.value);
      st = parsed.state;
    }
    return { value: { type: "array", items } satisfies PdfArray, state: st };
  }

  if (initial.type === "punct" && initial.value === "<<") {
    const entries = new Map<string, PdfObject>();
    let st: ParseState = state;
    while (true) {
      const { token, next } = nextToken(st.lex);
      if (token.type === "punct" && token.value === ">>") {
        st = { lex: next };
        break;
      }
      if (token.type !== "name") {
        throw new Error(`PDF dict key must be name, got ${token.type}`);
      }
      const key = token.value;
      const valueParsed = parseObject({ lex: next });
      entries.set(key, valueParsed.value);
      st = valueParsed.state;
    }
    return { value: { type: "dict", map: entries } satisfies PdfDict, state: st };
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
      if ((bytes[p] ?? 0) === 0x0a) p += 1;
      return p;
    }
    if (b === 0x0a) return p + 1;
    return p;
  };

  if (b0 === 0x0d || b0 === 0x0a) return consumeEol(pos);

  // spaces/tabs before EOL
  if (b0 === 0x20 || b0 === 0x09) {
    let p = pos;
    while (p < bytes.length) {
      const b = bytes[p] ?? 0;
      if (b === 0x20 || b === 0x09) {
        p += 1;
        continue;
      }
      break;
    }
    const b = bytes[p] ?? 0;
    if (b === 0x0d || b === 0x0a) return consumeEol(p);
    if (b === 0x25) {
      // comment until EOL
      p += 1;
      while (p < bytes.length) {
        const c = bytes[p] ?? 0;
        if (c === 0x0d || c === 0x0a) break;
        p += 1;
      }
      return consumeEol(p);
    }
    return pos;
  }

  // comment immediately after stream keyword
  if (b0 === 0x25) {
    let p = pos + 1;
    while (p < bytes.length) {
      const c = bytes[p] ?? 0;
      if (c === 0x0d || c === 0x0a) break;
      p += 1;
    }
    return consumeEol(p);
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
  if (dataEnd < 0) throw new Error("Failed to find endstream");
  return { data: bytes.slice(streamStart, dataEnd), nextPos: dataEnd };
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function asNumber(obj: PdfObject | undefined): number | null {
  if (!obj) return null;
  if (obj.type === "number") return obj.value;
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
  let pos = from;
  while (pos >= 0 && pos < bytes.length) {
    const idx = indexOfBytes(bytes, ENDSTREAM, pos);
    if (idx < 0) return -1;

    const before = idx > 0 ? (bytes[idx - 1] ?? 0) : 0;
    const after = bytes[idx + ENDSTREAM.length] ?? 0;
    if (idx > 0 && !isTokenBoundary(before)) {
      pos = idx + 1;
      continue;
    }
    if (!isTokenBoundary(after)) {
      pos = idx + 1;
      continue;
    }

    // Additional check: ensure 'endobj' follows.
    const st: ParseState = { lex: createLexer(bytes, idx) };
    const s1 = expectKeyword(st, "endstream");
    try {
      expectKeyword(s1, "endobj");
      return idx;
    } catch {
      pos = idx + 1;
      continue;
    }
  }
  return -1;
}

export function parseIndirectObjectAt(
  bytes: Uint8Array,
  offset: number,
  options: ParseIndirectOptions = {},
): { obj: PdfIndirectObject; nextOffset: number } {
  let st: ParseState = { lex: createLexer(bytes, offset) };

  const { token: tObj, next: n1 } = nextToken(st.lex);
  if (tObj.type !== "number" || !tObj.isInt) throw new Error("Indirect object: missing object number");
  const { token: tGen, next: n2 } = nextToken(n1);
  if (tGen.type !== "number" || !tGen.isInt) throw new Error("Indirect object: missing generation number");
  st = { lex: n2 };
  st = expectKeyword(st, "obj");

  const parsed = parseObject(st);
  st = parsed.state;
  let value: PdfObject = parsed.value;

  // If the value is a dict and followed by "stream", parse stream body.
  if (value.type === "dict") {
    const afterDict = st;
    const { token: maybeStream, next: afterStreamToken } = nextToken(afterDict.lex);
    if (maybeStream.type === "keyword" && maybeStream.value === "stream") {
      const lengthObj = dictGet(value, "Length");
      const length = (() => {
        const direct = asNumber(lengthObj);
        if (direct != null) return direct;
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
      st = { lex: createLexer(bytes, nextPos) };
      st = expectKeyword(st, "endstream");
      value = { type: "stream", dict: value, data } satisfies PdfStream;
    }
  }

  st = expectKeyword(st, "endobj");
  return {
    obj: { obj: Math.trunc(tObj.value), gen: Math.trunc(tGen.value), value },
    nextOffset: st.lex.pos,
  };
}
