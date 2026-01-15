import { decodeLatin1 } from "./encoding";
import { createLexer, nextToken, type PdfLexer, type PdfToken } from "./lexer";
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
    return { type: "string", bytes: token.bytes, text: decodeLatin1(token.bytes) } satisfies PdfString;
  }
  if (token.type === "hexstring") {
    return { type: "string", bytes: token.bytes, text: decodeLatin1(token.bytes) } satisfies PdfString;
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
  // After "stream", allow either LF or CRLF.
  const b = bytes[pos] ?? 0;
  if (b === 0x0d) {
    pos += 1;
    if ((bytes[pos] ?? 0) === 0x0a) pos += 1;
    return pos;
  }
  if (b === 0x0a) return pos + 1;
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

  // Fallback: search for endstream.
  const endMarker = new TextEncoder().encode("endstream");
  const dataEnd = (() => {
    // naive scan
    for (let i = streamStart; i + endMarker.length <= bytes.length; i += 1) {
      let ok = true;
      for (let j = 0; j < endMarker.length; j += 1) {
        if (bytes[i + j] !== endMarker[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
    return -1;
  })();
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

export function parseIndirectObjectAt(bytes: Uint8Array, offset: number): { obj: PdfIndirectObject; nextOffset: number } {
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
      const length = asNumber(dictGet(value, "Length"));
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
