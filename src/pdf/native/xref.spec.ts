/**
 * @file src/pdf/native/xref.spec.ts
 */

import { loadXRef } from "./xref";

function encodeLatin1(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function u16be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 8) & 0xff, n & 0xff]);
}

type LzwEncodeOptions = Readonly<{ readonly earlyChange: 0 | 1 }>;

// Minimal MSB-first LZW encoder for test vectors (Clear/EOD, 9..12 bit).
function encodeLzw(data: Uint8Array, options: LzwEncodeOptions): Uint8Array {
  const CLEAR = 256;
  const EOD = 257;
  const maxCode = 4095;

  const early = options.earlyChange;

  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i += 1) {dict.set(String.fromCharCode(i), i);}

  const build = { nextCode: 258, codeSize: 9 };

  const codes: number[] = [CLEAR];

  const wState = { w: "" };
  for (const b of data) {
    const c = String.fromCharCode(b);
    const wc = wState.w + c;
    if (dict.has(wc)) {
      wState.w = wc;
      continue;
    }
    if (wState.w.length > 0) {codes.push(dict.get(wState.w)!);}

    if (build.nextCode <= maxCode) {
      dict.set(wc, build.nextCode);
      build.nextCode += 1;
      const threshold = early ? (1 << build.codeSize) - 1 : 1 << build.codeSize;
      if (build.nextCode === threshold && build.codeSize < 12) {build.codeSize += 1;}
    }

    wState.w = c;
  }
  if (wState.w.length > 0) {codes.push(dict.get(wState.w)!);}
  codes.push(EOD);

  // Pack MSB-first bitstream.
  const out: number[] = [];
  const pack = { bitBuf: 0, bitLen: 0, nextCode: 258, codeSize: 9 };

  // Replay with code size changes matching decoder rules.
  for (const code of codes) {
    pack.bitBuf = (pack.bitBuf << pack.codeSize) | (code & ((1 << pack.codeSize) - 1));
    pack.bitLen += pack.codeSize;
    while (pack.bitLen >= 8) {
      const shift = pack.bitLen - 8;
      out.push((pack.bitBuf >>> shift) & 0xff);
      pack.bitLen -= 8;
      pack.bitBuf &= (1 << pack.bitLen) - 1;
    }

    if (code === CLEAR) {
      pack.nextCode = 258;
      pack.codeSize = 9;
      continue;
    }
    if (code === EOD) {break;}

    if (pack.nextCode <= maxCode) {
      pack.nextCode += 1;
      const threshold = early ? (1 << pack.codeSize) - 1 : 1 << pack.codeSize;
      if (pack.nextCode === threshold && pack.codeSize < 12) {pack.codeSize += 1;}
    }
  }
  if (pack.bitLen > 0) {out.push((pack.bitBuf << (8 - pack.bitLen)) & 0xff);}
  return new Uint8Array(out);
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  for (let off = 0, i = 0; i < parts.length; i += 1) {
    const p = parts[i]!;
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function findConsecutiveEntryRunEnd(sorted: ReadonlyArray<readonly [number, unknown]>, start: number): number {
  for (let end = start + 1; end < sorted.length; end += 1) {
    const prevObj = sorted[end - 1]![0];
    const curObj = sorted[end]![0];
    if (curObj !== prevObj + 1) {
      return end;
    }
  }
  return sorted.length;
}

function pad10(n: number): string {
  return String(n).padStart(10, "0");
}

function pad5(n: number): string {
  return String(n).padStart(5, "0");
}

function buildXrefTableSection(
  entries: ReadonlyMap<number, { readonly offset: number; readonly gen: number }>,
  options: { readonly includeFree0: boolean },
): string {
  const sorted = [...entries.entries()].sort((a, b) => a[0] - b[0]);

  const out: string[] = ["xref\n"];

  if (options.includeFree0) {
    out.push("0 1\n");
    out.push("0000000000 65535 f \n");
  }

  // Group into consecutive runs so we don't emit synthetic "free" entries for objects
  // that are not present in this incremental xref section.
  for (let i = 0; i < sorted.length; ) {
    const startObj = sorted[i]![0];
    const end = findConsecutiveEntryRunEnd(sorted, i);

    out.push(`${startObj} ${end - i}\n`);
    for (let j = i; j < end; j += 1) {
      const [, e] = sorted[j]!;
      out.push(`${pad10(e.offset)} ${pad5(e.gen)} n \n`);
    }
    i = end;
  }

  return out.join("");
}

function buildXrefStreamData(
  entries: ReadonlyMap<number, { readonly type: 0 | 1; readonly offset: number; readonly gen: number }>,
  start: number,
  count: number,
): Uint8Array {
  const parts: Uint8Array[] = [];
  for (let obj = start; obj < start + count; obj += 1) {
    const e = entries.get(obj) ?? { type: 0 as const, offset: 0, gen: 0xffff };
    parts.push(new Uint8Array([e.type]));
    parts.push(u32be(e.offset));
    parts.push(u16be(e.gen));
  }
  return concatBytes(parts);
}

function buildXrefStreamObjectBytes(
  objNum: number,
  dictCore: string,
  data: Uint8Array,
): Uint8Array {
  const prefix = `${objNum} 0 obj\n<< ${dictCore} /Length ${data.length} >>\nstream\n`;
  const suffix = "\nendstream\nendobj\n";
  return concatBytes([encodeLatin1(prefix), data, encodeLatin1(suffix)]);
}

describe("loadXRef (xref stream)", () => {
  it("honors xref stream /DecodeParms (LZW EarlyChange=0)", () => {
    const header = "%PDF-1.7\n";

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;

    const xrefDecoded = concatBytes([
      // obj 0: free
      new Uint8Array([0x00]),
      u32be(0),
      u16be(0xffff),
      // obj 1: in use (offset1)
      new Uint8Array([0x01]),
      u32be(offset1),
      u16be(0),
      // obj 2: in use (offset2)
      new Uint8Array([0x01]),
      u32be(offset2),
      u16be(0),
    ]);

    const xrefEncoded = encodeLzw(xrefDecoded, { earlyChange: 0 });

    const xrefObjHeader = "3 0 obj\n";
    const xrefObjDict =
      `<< /Type /XRef /Size 3 /W [1 4 2] /Index [0 3] /Root 1 0 R ` +
      `/Filter /LZWDecode /DecodeParms << /EarlyChange 0 >> /Length ${xrefEncoded.length} >>\n`;
    const xrefObjBodyPrefix = "stream\n";
    const xrefObjBodySuffix = "\nendstream\nendobj\n";

    const startXrefOffset = header.length + obj1.length + obj2.length;
    const pdfBytes = concatBytes([
      encodeLatin1(header),
      encodeLatin1(obj1),
      encodeLatin1(obj2),
      encodeLatin1(xrefObjHeader),
      encodeLatin1(xrefObjDict),
      encodeLatin1(xrefObjBodyPrefix),
      xrefEncoded,
      encodeLatin1(xrefObjBodySuffix),
      encodeLatin1(`startxref\n${startXrefOffset}\n%%EOF\n`),
    ]);

    const xref = loadXRef(pdfBytes);
    const e1 = xref.entries.get(1);
    const e2 = xref.entries.get(2);
    expect(e1).toEqual({ type: 1, offset: offset1, gen: 0 });
    expect(e2).toEqual({ type: 1, offset: offset2, gen: 0 });
  });
});

describe("loadXRef (hybrid-reference)", () => {
  it("honors trailer /XRefStm by loading the referenced xref stream", () => {
    const header = "%PDF-1.7\n";

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";
    const obj3 = "3 0 obj\n(hello)\nendobj\n";

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3 = offset2 + obj2.length;

    const xrefStreamData = concatBytes([
      new Uint8Array([0x01]),
      u32be(offset3),
      u16be(0),
    ]);

    const xrefStreamObjPrefix = "5 0 obj\n<< /Type /XRef /Size 6 /W [1 4 2] /Index [3 1] /Length 7 >>\nstream\n";
    const xrefStreamObjSuffix = "\nendstream\nendobj\n";
    const xrefStmOffset = offset3 + obj3.length;

    const xrefTableOffset = xrefStmOffset + xrefStreamObjPrefix.length + xrefStreamData.length + xrefStreamObjSuffix.length;
    const xrefTable =
      "xref\n" +
      "0 3\n" +
      "0000000000 65535 f \n" +
      `${String(offset1).padStart(10, "0")} 00000 n \n` +
      `${String(offset2).padStart(10, "0")} 00000 n \n` +
      "trailer\n" +
      `<< /Size 6 /Root 1 0 R /XRefStm ${xrefStmOffset} >>\n` +
      "startxref\n" +
      `${xrefTableOffset}\n` +
      "%%EOF\n";

    const pdfBytes = concatBytes([
      encodeLatin1(header),
      encodeLatin1(obj1),
      encodeLatin1(obj2),
      encodeLatin1(obj3),
      encodeLatin1(xrefStreamObjPrefix),
      xrefStreamData,
      encodeLatin1(xrefStreamObjSuffix),
      encodeLatin1(xrefTable),
    ]);

    const xref = loadXRef(pdfBytes);
    expect(xref.entries.get(3)).toEqual({ type: 1, offset: offset3, gen: 0 });
  });
});

describe("loadXRef (incremental updates via /Prev)", () => {
  it("supports xref table → xref table chaining", () => {
    const header = "%PDF-1.7\n";

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";
    const obj3v1 = "3 0 obj\n(old)\nendobj\n";

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3v1 = offset2 + obj2.length;

    const xref1Offset = offset3v1 + obj3v1.length;
    const xref1Entries = new Map<number, { offset: number; gen: number }>([
      [1, { offset: offset1, gen: 0 }],
      [2, { offset: offset2, gen: 0 }],
      [3, { offset: offset3v1, gen: 0 }],
    ]);
    const xref1 =
      buildXrefTableSection(xref1Entries, { includeFree0: true }) +
      "trailer\n" +
      "<< /Size 4 /Root 1 0 R >>\n" +
      "startxref\n" +
      `${xref1Offset}\n` +
      "%%EOF\n";

    const obj3v2 = "3 0 obj\n(new)\nendobj\n";
    const obj4 = "4 0 obj\n(added)\nendobj\n";
    const offset3v2 = xref1Offset + xref1.length;
    const offset4 = offset3v2 + obj3v2.length;

    const xref2Offset = offset4 + obj4.length;
    const xref2Entries = new Map<number, { offset: number; gen: number }>([
      [3, { offset: offset3v2, gen: 0 }],
      [4, { offset: offset4, gen: 0 }],
    ]);
    const xref2 =
      buildXrefTableSection(xref2Entries, { includeFree0: false }) +
      "trailer\n" +
      `<< /Size 5 /Root 1 0 R /Prev ${xref1Offset} >>\n` +
      "startxref\n" +
      `${xref2Offset}\n` +
      "%%EOF\n";

    const pdfBytes = concatBytes([
      encodeLatin1(header),
      encodeLatin1(obj1),
      encodeLatin1(obj2),
      encodeLatin1(obj3v1),
      encodeLatin1(xref1),
      encodeLatin1(obj3v2),
      encodeLatin1(obj4),
      encodeLatin1(xref2),
    ]);

    const xref = loadXRef(pdfBytes);
    expect(xref.entries.get(3)).toEqual({ type: 1, offset: offset3v2, gen: 0 });
    expect(xref.entries.get(4)).toEqual({ type: 1, offset: offset4, gen: 0 });
    expect(xref.entries.get(1)).toEqual({ type: 1, offset: offset1, gen: 0 });
  });

  it("supports xref stream → xref stream chaining", () => {
    const header = "%PDF-1.7\n";

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";
    const obj3v1 = "3 0 obj\n(old)\nendobj\n";

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3v1 = offset2 + obj2.length;

    const xref1Offset = offset3v1 + obj3v1.length;
    const xref1Entries = new Map<number, { type: 0 | 1; offset: number; gen: number }>([
      [0, { type: 0, offset: 0, gen: 0xffff }],
      [1, { type: 1, offset: offset1, gen: 0 }],
      [2, { type: 1, offset: offset2, gen: 0 }],
      [3, { type: 1, offset: offset3v1, gen: 0 }],
      [4, { type: 1, offset: xref1Offset, gen: 0 }],
    ]);
    const xref1Data = buildXrefStreamData(xref1Entries, 0, 5);
    const xref1Bytes = buildXrefStreamObjectBytes(
      4,
      "/Type /XRef /Size 5 /W [1 4 2] /Index [0 5] /Root 1 0 R",
      xref1Data,
    );

    const obj3v2 = "3 0 obj\n(new)\nendobj\n";
    const offset3v2 = xref1Offset + xref1Bytes.length;

    const xref2Offset = offset3v2 + obj3v2.length;
    const xref2Entries = new Map<number, { type: 0 | 1; offset: number; gen: number }>([
      [3, { type: 1, offset: offset3v2, gen: 0 }],
      [4, { type: 1, offset: xref1Offset, gen: 0 }],
    ]);
    const xref2Data = buildXrefStreamData(xref2Entries, 3, 2);
    const xref2Bytes = buildXrefStreamObjectBytes(
      5,
      `/Type /XRef /Size 6 /W [1 4 2] /Index [3 2] /Root 1 0 R /Prev ${xref1Offset}`,
      xref2Data,
    );

    const startXrefOffset = xref2Offset;
    const trailer = `startxref\n${startXrefOffset}\n%%EOF\n`;

    const pdfBytes = concatBytes([
      encodeLatin1(header),
      encodeLatin1(obj1),
      encodeLatin1(obj2),
      encodeLatin1(obj3v1),
      xref1Bytes,
      encodeLatin1(obj3v2),
      xref2Bytes,
      encodeLatin1(trailer),
    ]);

    const xref = loadXRef(pdfBytes);
    expect(xref.entries.get(3)).toEqual({ type: 1, offset: offset3v2, gen: 0 });
    expect(xref.entries.get(1)).toEqual({ type: 1, offset: offset1, gen: 0 });
  });

  it("supports mixed xref table ↔ xref stream chaining", () => {
    const header = "%PDF-1.7\n";
    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";
    const obj3v1 = "3 0 obj\n(old)\nendobj\n";

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3v1 = offset2 + obj2.length;

    const xref1Offset = offset3v1 + obj3v1.length;
    const xref1Entries = new Map<number, { offset: number; gen: number }>([
      [1, { offset: offset1, gen: 0 }],
      [2, { offset: offset2, gen: 0 }],
      [3, { offset: offset3v1, gen: 0 }],
    ]);
    const xref1 =
      buildXrefTableSection(xref1Entries, { includeFree0: true }) +
      "trailer\n" +
      "<< /Size 4 /Root 1 0 R >>\n" +
      "startxref\n" +
      `${xref1Offset}\n` +
      "%%EOF\n";

    const obj3v2 = "3 0 obj\n(new)\nendobj\n";
    const offset3v2 = xref1Offset + xref1.length;

    const xref2Offset = offset3v2 + obj3v2.length;
    const xref2Entries = new Map<number, { type: 0 | 1; offset: number; gen: number }>([
      [3, { type: 1, offset: offset3v2, gen: 0 }],
    ]);
    const xref2Data = buildXrefStreamData(xref2Entries, 3, 1);
    const xref2Bytes = buildXrefStreamObjectBytes(
      4,
      `/Type /XRef /Size 5 /W [1 4 2] /Index [3 1] /Root 1 0 R /Prev ${xref1Offset}`,
      xref2Data,
    );

    const trailer = `startxref\n${xref2Offset}\n%%EOF\n`;

    const pdfBytes = concatBytes([
      encodeLatin1(header),
      encodeLatin1(obj1),
      encodeLatin1(obj2),
      encodeLatin1(obj3v1),
      encodeLatin1(xref1),
      encodeLatin1(obj3v2),
      xref2Bytes,
      encodeLatin1(trailer),
    ]);

    const xref = loadXRef(pdfBytes);
    expect(xref.entries.get(3)).toEqual({ type: 1, offset: offset3v2, gen: 0 });
    expect(xref.entries.get(1)).toEqual({ type: 1, offset: offset1, gen: 0 });
  });
});
