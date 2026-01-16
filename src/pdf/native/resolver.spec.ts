import { describe, it, expect } from "vitest";
import { PdfResolver } from "./resolver";
import type { PdfDict, PdfObject } from "./types";

type LzwEncodeOptions = Readonly<{ readonly earlyChange: 0 | 1 }>;

function encodeLatin1(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function encodeLzw(data: Uint8Array, options: LzwEncodeOptions): Uint8Array {
  const CLEAR = 256;
  const EOD = 257;
  const maxCode = 4095;
  const early = options.earlyChange;

  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i += 1) dict.set(String.fromCharCode(i), i);

  let nextCode = 258;
  let codeSize = 9;
  const codes: number[] = [CLEAR];

  let w = "";
  for (const b of data) {
    const c = String.fromCharCode(b);
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
      continue;
    }
    if (w.length > 0) codes.push(dict.get(w)!);

    if (nextCode <= maxCode) {
      dict.set(wc, nextCode);
      nextCode += 1;
      const threshold = early ? (1 << codeSize) - 1 : 1 << codeSize;
      if (nextCode === threshold && codeSize < 12) codeSize += 1;
    }

    w = c;
  }

  if (w.length > 0) codes.push(dict.get(w)!);
  codes.push(EOD);

  const out: number[] = [];
  let bitBuf = 0;
  let bitLen = 0;

  nextCode = 258;
  codeSize = 9;
  for (const code of codes) {
    bitBuf = (bitBuf << codeSize) | (code & ((1 << codeSize) - 1));
    bitLen += codeSize;
    while (bitLen >= 8) {
      const shift = bitLen - 8;
      out.push((bitBuf >>> shift) & 0xff);
      bitLen -= 8;
      bitBuf &= (1 << bitLen) - 1;
    }

    if (code === CLEAR) {
      nextCode = 258;
      codeSize = 9;
      continue;
    }
    if (code === EOD) break;

    if (nextCode <= maxCode) {
      nextCode += 1;
      const threshold = early ? (1 << codeSize) - 1 : 1 << codeSize;
      if (nextCode === threshold && codeSize < 12) codeSize += 1;
    }
  }
  if (bitLen > 0) out.push((bitBuf << (8 - bitLen)) & 0xff);
  return new Uint8Array(out);
}

function asDict(map: Map<string, PdfObject>): PdfDict {
  return { type: "dict", map };
}

describe("PdfResolver (ObjStm)", () => {
  it("honors ObjStm /DecodeParms (LZW EarlyChange=0)", () => {
    // Decoded object stream bytes: header "10 0 " (First=5) and one object body "42".
    const decoded = encodeLatin1("10 0 42");
    const encoded = encodeLzw(decoded, { earlyChange: 0 });

    const objStmBytes = new Uint8Array([
      ...encodeLatin1(
        `5 0 obj\n` +
          `<< /Type /ObjStm /N 1 /First 5 /Filter /LZWDecode /DecodeParms << /EarlyChange 0 >> /Length ${encoded.length} >>\n` +
          `stream\n`,
      ),
      ...encoded,
      ...encodeLatin1("\nendstream\nendobj\n"),
    ]);

    const trailer = asDict(new Map());
    const entries = new Map<number, { type: 0 } | { type: 1; offset: number; gen: number } | { type: 2; objStm: number; index: number }>([
      [5, { type: 1, offset: 0, gen: 0 }],
      [10, { type: 2, objStm: 5, index: 0 }],
    ]);

    const resolver = new PdfResolver(objStmBytes, { entries, trailer });
    const obj = resolver.getObject(10);
    expect(obj).toEqual({ type: "number", value: 42 });
  });

  it("parses ObjStm headers with newlines/whitespace variations", () => {
    const headerText = "10 0\n11 3\n";
    const bodyText = "42 43";
    const decoded = encodeLatin1(headerText + bodyText);
    const first = encodeLatin1(headerText).length;

    const objStmBytes = new Uint8Array([
      ...encodeLatin1(
        `5 0 obj\n` +
          `<< /Type /ObjStm /N 2 /First ${first} /Length ${decoded.length} >>\n` +
          `stream\n`,
      ),
      ...decoded,
      ...encodeLatin1("\nendstream\nendobj\n"),
    ]);

    const trailer = asDict(new Map());
    const entries = new Map<number, { type: 0 } | { type: 1; offset: number; gen: number } | { type: 2; objStm: number; index: number }>([
      [5, { type: 1, offset: 0, gen: 0 }],
      [10, { type: 2, objStm: 5, index: 0 }],
      [11, { type: 2, objStm: 5, index: 1 }],
    ]);

    const resolver = new PdfResolver(objStmBytes, { entries, trailer });
    expect(resolver.getObject(10)).toEqual({ type: "number", value: 42 });
    expect(resolver.getObject(11)).toEqual({ type: "number", value: 43 });
  });

  it("throws when xref references a missing ObjStm index", () => {
    const headerText = "10 0\n";
    const bodyText = "42";
    const decoded = encodeLatin1(headerText + bodyText);
    const first = encodeLatin1(headerText).length;

    const objStmBytes = new Uint8Array([
      ...encodeLatin1(
        `5 0 obj\n` +
          `<< /Type /ObjStm /N 1 /First ${first} /Length ${decoded.length} >>\n` +
          `stream\n`,
      ),
      ...decoded,
      ...encodeLatin1("\nendstream\nendobj\n"),
    ]);

    const trailer = asDict(new Map());
    const entries = new Map<number, { type: 0 } | { type: 1; offset: number; gen: number } | { type: 2; objStm: number; index: number }>([
      [5, { type: 1, offset: 0, gen: 0 }],
      [11, { type: 2, objStm: 5, index: 1 }],
    ]);

    const resolver = new PdfResolver(objStmBytes, { entries, trailer });
    expect(() => resolver.getObject(11)).toThrow(/missing object index 1/);
  });
});
