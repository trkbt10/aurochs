/**
 * @file src/pdf/parser/image-extractor.spec.ts
 */

import { parsePdf } from "./pdf-parser";
import { convertToRgba } from "../converter/pixel-converter";
import { base64ToArrayBuffer } from "../../buffer/base64";
import jpeg from "jpeg-js";
import { decodeJpxNative } from "./jpeg2000/jpx-decode.native";
import { loadXRef } from "../native/xref";
import { createPdfResolver } from "../native/resolver";
import type { PdfObject } from "../native/types";

const CCITT_GROUP4_PDF_BASE64 = `
JVBERi0xLjEgCiXi48/TCjEgMCBvYmoKPDwgCi9UeXBlIC9DYXRhbG9nIAovUGFnZXMgMyAwIFIgCj4+CmVuZG9iagoyIDAgb2JqCjw8IAovQ3JlYXRpb25EYXRlIChEOjIwMjYwMTE1MTUxNDQ5KQovTW9kRGF0ZSAoRDoyMDI2MDExNTE1MTQ0OSkKL1Byb2R1Y2VyIChsaWJ0aWZmIC8gdGlmZjJwZGYgLSAyMDI1MDkxMSkKPj4gCmVuZG9iagozIDAgb2JqCjw8IAovVHlwZSAvUGFnZXMgCi9LaWRzIFsgNCAwIFIgXSAKL0NvdW50IDEgCj4+IAplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZSAKL1BhcmVudCAzIDAgUiAKL01lZGlhQm94IFswLjAwMDAgMC4wMDAwIDE1LjM2MDAgMTUuMzYwMF0gCi9Db250ZW50cyA1IDAgUiAKL1Jlc291cmNlcyA8PCAKL1hPYmplY3QgPDwKL0ltMSA3IDAgUiA+PgovUHJvY1NldCBbIC9JbWFnZUIgXQo+Pgo+PgplbmRvYmoKNSAwIG9iago8PCAKL0xlbmd0aCA2IDAgUiAKID4+CnN0cmVhbQpxICAxNS4zNjAwIDAuMDAwMCAwLjAwMDAgMTUuMzYwMCAwLjAwMDAgMC4wMDAwIGNtIC9JbTEgRG8gUQoKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjYwCmVuZG9iago3IDAgb2JqCjw8IAovTGVuZ3RoIDggMCBSIAovVHlwZSAvWE9iamVjdCAKL1N1YnR5cGUgL0ltYWdlIAovTmFtZSAvSW0xCi9XaWR0aCA2NAovSGVpZ2h0IDY0Ci9CaXRzUGVyQ29tcG9uZW50IDEKL0NvbG9yU3BhY2UgL0RldmljZUdyYXkgCi9GaWx0ZXIgL0NDSVRURmF4RGVjb2RlIC9EZWNvZGVQYXJtcyA8PCAvSyAtMSAvQ29sdW1ucyA2NCAvUm93cyA2NCAvQmxhY2tJczEgdHJ1ZSA+PgogPj4Kc3RyZWFtCiNg1f/////////5NQav///////////////ABABACmVuZHN0cmVhbQplbmRvYmoKOCAwIG9iagoyOQplbmRvYmoKeHJlZgowIDkgCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxOTQgMDAwMDAgbiAKMDAwMDAwMDI1OCAwMDAwMCBuIAowMDAwMDAwNDMyIDAwMDAwIG4gCjAwMDAwMDA1NDggMDAwMDAgbiAKMDAwMDAwMDU2NiAwMDAwMCBuIAowMDAwMDAwODQ2IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgOQovUm9vdCAxIDAgUiAKL0luZm8gMiAwIFIgCi9JRFs8MDAwMDQxQTcxMEQ2M0FGMTYwQjdBQ0Q5M0FCNTBDMkE+PDAwMDA0MUE3MTBENjNBRjE2MEI3QUNEOTNBQjUwQzJBPl0KPj4Kc3RhcnR4cmVmCjg2NAolJUVPRgo=
`;

function decodePdfBase64(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64.replace(/\s+/g, "")));
}

function toRgba64x64(image: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | "ICCBased" | "Pattern";
  readonly bitsPerComponent: number;
  readonly decode?: readonly number[];
}): Uint8ClampedArray {
  return convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent, { decode: image.decode });
}

function pixelGray(rgba: Uint8ClampedArray, x: number, y: number, width: number): number {
  const idx = (y * width + x) * 4;
  return rgba[idx] ?? 0;
}

function ascii85Encode(data: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const remaining = data.length - i;
    const b0 = data[i] ?? 0;
    const b1 = data[i + 1] ?? 0;
    const b2 = data[i + 2] ?? 0;
    const b3 = data[i + 3] ?? 0;
    const value = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;

    if (remaining >= 4 && value === 0) {
      chunks.push("z");
      continue;
    }

    const digits = new Array<number>(5);
    for (let j = 4, v = value; j >= 0; j -= 1) {
      digits[j] = v % 85;
      v = Math.floor(v / 85);
    }
    const encoded = String.fromCharCode(...digits.map((d) => d + 33));

    if (remaining >= 4) {
      chunks.push(encoded);
    } else {
      // For partial groups, output n+1 chars (n = remaining bytes).
      chunks.push(encoded.slice(0, remaining + 1));
    }
  }
  return `${chunks.join("")}~>`;
}

function asciiHexEncodeBytes(data: Uint8Array): string {
  const hex: string[] = [];
  for (const b of data) {
    hex.push((b ?? 0).toString(16).padStart(2, "0").toUpperCase());
  }
  return `${hex.join("")}>`;
}

type LzwEncodeOptions = Readonly<{ readonly earlyChange: 0 | 1 }>;

// Minimal MSB-first LZW encoder for test vectors (Clear/EOD, 9..12 bit).
function lzwEncode(data: Uint8Array, options: LzwEncodeOptions = { earlyChange: 1 }): Uint8Array {
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

  const out: number[] = [];
  const pack = { bitBuf: 0, bitLen: 0, nextCode: 258, codeSize: 9 };

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

function writeAscii4(dst: Uint8Array, offset: number, s: string): void {
  for (let i = 0; i < 4; i += 1) {dst[offset + i] = s.charCodeAt(i) & 0xff;}
}

function writeU32BE(view: DataView, offset: number, v: number): void {
  view.setUint32(offset, v >>> 0, false);
}

function writeU16BE(view: DataView, offset: number, v: number): void {
  view.setUint16(offset, v & 0xffff, false);
}

function writeS15Fixed16(view: DataView, offset: number, v: number): void {
  const i32 = Math.trunc(v * 65536);
  view.setInt32(offset, i32, false);
}

function makeIccXyzTag(x: number, y: number, z: number): Uint8Array {
  const bytes = new Uint8Array(20);
  writeAscii4(bytes, 0, "XYZ ");
  const view = new DataView(bytes.buffer);
  writeS15Fixed16(view, 8, x);
  writeS15Fixed16(view, 12, y);
  writeS15Fixed16(view, 16, z);
  return bytes;
}

function makeIccParaGammaTag(gamma: number): Uint8Array {
  const bytes = new Uint8Array(16);
  writeAscii4(bytes, 0, "para");
  const view = new DataView(bytes.buffer);
  writeU16BE(view, 8, 0); // functionType 0: y = x^g
  writeS15Fixed16(view, 12, gamma);
  return bytes;
}

function pad4(n: number): number {
  return (n + 3) & ~3;
}

function makeMinimalIccProfileBytes(args: { readonly dataColorSpace: "RGB " | "GRAY" }): Uint8Array {
  const wp: readonly [number, number, number] = [0.9505, 1, 1.089];
  const tags: Array<{ sig: string; data: Uint8Array }> = [{ sig: "wtpt", data: makeIccXyzTag(wp[0], wp[1], wp[2]) }];

  if (args.dataColorSpace === "RGB ") {
    tags.push(
      { sig: "rXYZ", data: makeIccXyzTag(0.4124, 0.2126, 0.0193) },
      { sig: "gXYZ", data: makeIccXyzTag(0.3576, 0.7152, 0.1192) },
      { sig: "bXYZ", data: makeIccXyzTag(0.1805, 0.0722, 0.9505) },
      { sig: "rTRC", data: makeIccParaGammaTag(2) },
      { sig: "gTRC", data: makeIccParaGammaTag(2) },
      { sig: "bTRC", data: makeIccParaGammaTag(2) },
    );
  } else {
    tags.push({ sig: "kTRC", data: makeIccParaGammaTag(2) });
  }

  const headerSize = 128;
  const tagTableSize = 4 + tags.length * 12;
  let cursor = pad4(headerSize + tagTableSize);

  const records: Array<{ sig: string; off: number; size: number }> = [];
  const tagDataParts: Uint8Array[] = [];
  for (const t of tags) {
    const off = cursor;
    const size = t.data.length;
    records.push({ sig: t.sig, off, size });
    tagDataParts.push(t.data);
    cursor = pad4(cursor + size);
    if (cursor > off + size) {
      tagDataParts.push(new Uint8Array(cursor - (off + size)));
    }
  }

  const totalSize = cursor;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  writeU32BE(view, 0, totalSize);
  writeAscii4(out, 16, args.dataColorSpace);
  writeAscii4(out, 20, "XYZ ");
  writeAscii4(out, 36, "acsp");

  writeU32BE(view, 128, tags.length);
  let tpos = 132;
  for (const r of records) {
    writeAscii4(out, tpos, r.sig);
    writeU32BE(view, tpos + 4, r.off);
    writeU32BE(view, tpos + 8, r.size);
    tpos += 12;
  }

  let dpos = pad4(headerSize + tagTableSize);
  for (const part of tagDataParts) {
    out.set(part, dpos);
    dpos += part.length;
  }

  return out;
}

function makeMinimalCmykLutIccProfileBytes(): Uint8Array {
  const makeMft1CmykToXyzTag = (): Uint8Array => {
    const inChannels = 4;
    const outChannels = 3;
    const gridPoints = 2;
    const inputEntries = 2;
    const outputEntries = 2;

    const clutPoints = gridPoints ** inChannels; // 16
    const headerBytes = 52;
    const inputTableBytes = inChannels * inputEntries; // u8
    const clutBytes = clutPoints * outChannels; // u8
    const outputTableBytes = outChannels * outputEntries; // u8
    const total = headerBytes + inputTableBytes + clutBytes + outputTableBytes;
    const bytes = new Uint8Array(total);
    const view = new DataView(bytes.buffer);

    writeAscii4(bytes, 0, "mft1");
    bytes[8] = inChannels;
    bytes[9] = outChannels;
    bytes[10] = gridPoints;

    const mat = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
    for (let i = 0; i < 9; i += 1) {
      writeS15Fixed16(view, 12 + i * 4, mat[i] ?? 0);
    }

    writeU16BE(view, 48, inputEntries);
    writeU16BE(view, 50, outputEntries);

    let cursor = 52;
    for (let c = 0; c < inChannels; c += 1) {
      bytes[cursor++] = 0;
      bytes[cursor++] = 255;
    }

    const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
    const toByte = (v01: number): number => Math.floor(clamp01(v01) * 255);
    const rgbToXyzD65 = (r: number, g: number, b: number): readonly [number, number, number] => {
      const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
      const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
      return [X, Y, Z] as const;
    };

    for (let k = 0; k <= 1; k += 1) {
      for (let y = 0; y <= 1; y += 1) {
        for (let m = 0; m <= 1; m += 1) {
          for (let c = 0; c <= 1; c += 1) {
            const r = 1 - c;
            const gg = 1 - m;
            const bb = 1 - y;
            const [X, Y, Z] = rgbToXyzD65(r, gg, bb);
            bytes[cursor++] = toByte(X);
            bytes[cursor++] = toByte(Y);
            bytes[cursor++] = toByte(Z);
          }
        }
      }
    }

    for (let c = 0; c < outChannels; c += 1) {
      bytes[cursor++] = 0;
      bytes[cursor++] = 255;
    }

    return bytes;
  };

  const tags: Array<{ sig: string; data: Uint8Array }> = [
    { sig: "wtpt", data: makeIccXyzTag(0.9505, 1, 1.089) },
    { sig: "A2B0", data: makeMft1CmykToXyzTag() },
  ];

  const headerSize = 128;
  const tagTableSize = 4 + tags.length * 12;
  let cursor = pad4(headerSize + tagTableSize);

  const records: Array<{ sig: string; off: number; size: number }> = [];
  const tagDataParts: Uint8Array[] = [];
  for (const t of tags) {
    const off = cursor;
    const size = t.data.length;
    records.push({ sig: t.sig, off, size });
    tagDataParts.push(t.data);
    cursor = pad4(cursor + size);
    if (cursor > off + size) {
      tagDataParts.push(new Uint8Array(cursor - (off + size)));
    }
  }

  const totalSize = cursor;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  writeU32BE(view, 0, totalSize);
  writeAscii4(out, 16, "CMYK");
  writeAscii4(out, 20, "XYZ ");
  writeAscii4(out, 36, "acsp");

  writeU32BE(view, 128, tags.length);
  let tpos = 132;
  for (const r of records) {
    writeAscii4(out, tpos, r.sig);
    writeU32BE(view, tpos + 4, r.off);
    writeU32BE(view, tpos + 8, r.size);
    tpos += 12;
  }

  let dpos = pad4(headerSize + tagTableSize);
  for (const part of tagDataParts) {
    out.set(part, dpos);
    dpos += part.length;
  }

  return out;
}

function buildMinimalPdfWithImageXObject(args: {
  readonly imageStreamAscii: string;
  readonly imageDictEntries: string;
  readonly contentStream?: string;
}): Uint8Array {
  const contentStream = args.contentStream ?? "q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;
  const imageLength = new TextEncoder().encode(args.imageStreamAscii).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 3 0 R >>",
    3: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
    4: "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 15.36 15.36] /Contents 5 0 R /Resources << /XObject << /Im1 7 0 R >> >> >>",
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    7: `<< ${args.imageDictEntries} /Length ${imageLength} >>\nstream\n${args.imageStreamAscii}\nendstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 3, 4, 5, 7];
  const parts: string[] = [header];
  const offsets: number[] = [0];

  const cursor = { value: header.length };
  for (const n of order) {
    offsets[n] = cursor.value;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor.value += body.length;
  }

  const xrefStart = cursor.value;
  const size = Math.max(...order) + 1;
  const xrefLines: string[] = [];
  xrefLines.push("xref\n");
  xrefLines.push(`0 ${size}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = offsets[i] ?? 0;
    const line = `${String(off).padStart(10, "0")} 00000 n \n`;
    xrefLines.push(line);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

function buildMinimalPdfWithIccBasedImageXObject(args: {
  readonly imageStreamAscii: string;
  readonly imageDictEntries: string;
  readonly iccProfileDictEntries: string;
  readonly iccProfileStreamAscii?: string;
}): Uint8Array {
  const contentStream = "q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;
  const imageLength = new TextEncoder().encode(args.imageStreamAscii).length;
  const iccStream = args.iccProfileStreamAscii ?? "";
  const iccLength = new TextEncoder().encode(iccStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 3 0 R >>",
    3: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
    4: "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 15.36 15.36] /Contents 5 0 R /Resources << /XObject << /Im1 7 0 R >> >> >>",
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    7: `<< ${args.imageDictEntries} /Length ${imageLength} >>\nstream\n${args.imageStreamAscii}\nendstream`,
    8: `<< ${args.iccProfileDictEntries} /Length ${iccLength} >>\nstream\n${iccStream}\nendstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 3, 4, 5, 7, 8];
  const parts: string[] = [header];
  const offsets: number[] = [0];

  const cursor = { value: header.length };
  for (const n of order) {
    offsets[n] = cursor.value;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor.value += body.length;
  }

  const xrefStart = cursor.value;
  const size = Math.max(...order) + 1;
  const xrefLines: string[] = [];
  xrefLines.push("xref\n");
  xrefLines.push(`0 ${size}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = offsets[i] ?? 0;
    const line = `${String(off).padStart(10, "0")} 00000 n \n`;
    xrefLines.push(line);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

function buildMinimalPdfWithSmaskImageXObject(args: {
  readonly imageStreamAscii: string;
  readonly imageDictEntries: string;
  readonly smaskStreamAscii: string;
  readonly smaskDictEntries: string;
}): Uint8Array {
  const contentStream = "q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;
  const imageLength = new TextEncoder().encode(args.imageStreamAscii).length;
  const smaskLength = new TextEncoder().encode(args.smaskStreamAscii).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 3 0 R >>",
    3: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
    4: "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 15.36 15.36] /Contents 5 0 R /Resources << /XObject << /Im1 7 0 R >> >> >>",
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    7: `<< ${args.imageDictEntries} /SMask 8 0 R /Length ${imageLength} >>\nstream\n${args.imageStreamAscii}\nendstream`,
    8: `<< ${args.smaskDictEntries} /Length ${smaskLength} >>\nstream\n${args.smaskStreamAscii}\nendstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 3, 4, 5, 7, 8];
  const parts: string[] = [header];
  const offsets: number[] = [0];

  const cursor = { value: header.length };
  for (const n of order) {
    offsets[n] = cursor.value;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor.value += body.length;
  }

  const xrefStart = cursor.value;
  const size = Math.max(...order) + 1;
  const xrefLines: string[] = [];
  xrefLines.push("xref\n");
  xrefLines.push(`0 ${size}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = offsets[i] ?? 0;
    const line = `${String(off).padStart(10, "0")} 00000 n \n`;
    xrefLines.push(line);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

function buildMinimalPdfWithMaskImageXObject(args: {
  readonly imageStreamAscii: string;
  readonly imageDictEntries: string;
  readonly maskStreamAscii: string;
  readonly maskDictEntries: string;
}): Uint8Array {
  const contentStream = "q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;
  const imageLength = new TextEncoder().encode(args.imageStreamAscii).length;
  const maskLength = new TextEncoder().encode(args.maskStreamAscii).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 3 0 R >>",
    3: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
    4: "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 15.36 15.36] /Contents 5 0 R /Resources << /XObject << /Im1 7 0 R >> >> >>",
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    7: `<< ${args.imageDictEntries} /Mask 8 0 R /Length ${imageLength} >>\nstream\n${args.imageStreamAscii}\nendstream`,
    8: `<< ${args.maskDictEntries} /Length ${maskLength} >>\nstream\n${args.maskStreamAscii}\nendstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 3, 4, 5, 7, 8];
  const parts: string[] = [header];
  const offsets: number[] = [0];

  const cursor = { value: header.length };
  for (const n of order) {
    offsets[n] = cursor.value;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor.value += body.length;
  }

  const xrefStart = cursor.value;
  const size = Math.max(...order) + 1;
  const xrefLines: string[] = [];
  xrefLines.push("xref\n");
  xrefLines.push(`0 ${size}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = offsets[i] ?? 0;
    const line = `${String(off).padStart(10, "0")} 00000 n \n`;
    xrefLines.push(line);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

async function extractFirstCcittImageStreamBytes(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const xref = loadXRef(pdfBytes);
  const resolver = createPdfResolver(pdfBytes, xref);

  const readNameArray = (obj: PdfObject | undefined): readonly string[] => {
    const v = obj ? resolver.deref(obj) : undefined;
    if (!v) {return [];}
    if (v.type === "name") {return [v.value];}
    if (v.type === "array") {
      const out: string[] = [];
      for (const item of v.items) {
        const deref = resolver.deref(item);
        if (deref.type === "name") {out.push(deref.value);}
      }
      return out;
    }
    return [];
  };

  for (const [objNum, entry] of xref.entries.entries()) {
    if (entry.type === 0) {continue;}
    const obj = resolver.getObject(objNum);
    if (obj.type !== "stream") {continue;}

    const subtype = resolver.deref(obj.dict.map.get("Subtype") ?? { type: "null" });
    if (subtype.type !== "name" || subtype.value !== "Image") {continue;}

    const filters = readNameArray(obj.dict.map.get("Filter"));
    if (!filters.includes("CCITTFaxDecode")) {continue;}

    // When /Length is indirect and we fall back to searching "endstream",
    // stream.data may include a trailing newline before "endstream".
    // Trim a single trailing CR/LF sequence for fixture stability.
    const data = obj.data;
    if (data.length > 0 && data[data.length - 1] === 0x0a) {
      const maybeCr = data.length > 1 ? data[data.length - 2] : null;
      return maybeCr === 0x0d ? data.slice(0, -2) : data.slice(0, -1);
    }
    if (data.length > 0 && data[data.length - 1] === 0x0d) {
      return data.slice(0, -1);
    }
    return data;
  }
  throw new Error("No CCITTFaxDecode image found");
}

describe("image-extractor (CCITTFaxDecode)", () => {
  it("decodes /CCITTFaxDecode (Group4) images", async () => {
    const bytes = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const doc = await parsePdf(bytes);

    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0];
    expect(image?.width).toBe(64);
    expect(image?.height).toBe(64);
    expect(image?.colorSpace).toBe("DeviceGray");
    expect(image?.bitsPerComponent).toBe(1);

    const rgba = toRgba64x64({
      data: image?.data ?? new Uint8Array(),
      width: image?.width ?? 0,
      height: image?.height ?? 0,
      colorSpace: image?.colorSpace ?? "DeviceGray",
      bitsPerComponent: image?.bitsPerComponent ?? 1,
    });

    // Expect black on (0,0) and (63,63), white on the other diagonal.
    expect(pixelGray(rgba, 0, 0, 64)).toBe(0);
    expect(pixelGray(rgba, 63, 0, 64)).toBe(255);
    expect(pixelGray(rgba, 0, 63, 64)).toBe(255);
    expect(pixelGray(rgba, 63, 63, 64)).toBe(0);
  });

  it("decodes Filter chain [/ASCII85Decode /CCITTFaxDecode]", async () => {
    const source = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const ccittBytes = await extractFirstCcittImageStreamBytes(source);
    const ascii85 = ascii85Encode(ccittBytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0];
    const rgba = toRgba64x64({
      data: image?.data ?? new Uint8Array(),
      width: image?.width ?? 0,
      height: image?.height ?? 0,
      colorSpace: image?.colorSpace ?? "DeviceGray",
      bitsPerComponent: image?.bitsPerComponent ?? 1,
    });

    expect(pixelGray(rgba, 0, 0, 64)).toBe(0);
    expect(pixelGray(rgba, 63, 0, 64)).toBe(255);
    expect(pixelGray(rgba, 0, 63, 64)).toBe(255);
    expect(pixelGray(rgba, 63, 63, 64)).toBe(0);
  });

  it("respects DecodeParms /BlackIs1=false", async () => {
    const source = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const ccittBytes = await extractFirstCcittImageStreamBytes(source);
    const ascii85 = ascii85Encode(ccittBytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 false >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0];
    const rgba = toRgba64x64({
      data: image?.data ?? new Uint8Array(),
      width: image?.width ?? 0,
      height: image?.height ?? 0,
      colorSpace: image?.colorSpace ?? "DeviceGray",
      bitsPerComponent: image?.bitsPerComponent ?? 1,
    });

    // Inverted relative to /BlackIs1=true.
    expect(pixelGray(rgba, 0, 0, 64)).toBe(255);
    expect(pixelGray(rgba, 63, 0, 64)).toBe(0);
    expect(pixelGray(rgba, 0, 63, 64)).toBe(0);
    expect(pixelGray(rgba, 63, 63, 64)).toBe(255);
  });

  it("decodes when DecodeParms has EndOfLine=true (ignored for Group4)", async () => {
    const source = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const ccittBytes = await extractFirstCcittImageStreamBytes(source);
    const ascii85 = ascii85Encode(ccittBytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true /EndOfLine true >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);
  });

  it("decodes when DecodeParms has DamagedRowsBeforeError (ignored for Group4)", async () => {
    const source = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const ccittBytes = await extractFirstCcittImageStreamBytes(source);
    const ascii85 = ascii85Encode(ccittBytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true /DamagedRowsBeforeError 1 >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);
  });

  it("decodes /CCITTFaxDecode Group3 mixed 1D/2D (K>0)", async () => {
    // Encoded bytes from ccitt-fax-decode.spec.ts (0x98 0xB8) wrapped in ASCIIHex.
    const ccittHex = "98B8>";

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ccittHex,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 16 /Height 2 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCIIHexDecode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K 1 /Columns 16 /Rows 2 /BlackIs1 false >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(16);
    expect(image.height).toBe(2);
    expect(image.colorSpace).toBe("DeviceGray");
    expect(image.bitsPerComponent).toBe(1);

    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    // Expect white on the left half, black on the right half (row 0).
    expect(pixelGray(rgba, 0, 0, 16)).toBe(255);
    expect(pixelGray(rgba, 15, 0, 16)).toBe(0);
  });

  it("decodes /CCITTFaxDecode Group3 1D (K=0) with EndOfLine=true", async () => {
    // Encoded bits: white=8, black=8, then EOL marker (000000000001).
    // 23 bits => 0x98 0xA0 0x02 (padded).
    const ccittHex = "98A002>";

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ccittHex,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 16 /Height 1 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCIIHexDecode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K 0 /Columns 16 /Rows 1 /BlackIs1 false /EndOfLine true >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(16);
    expect(image.height).toBe(1);
    expect(image.colorSpace).toBe("DeviceGray");
    expect(image.bitsPerComponent).toBe(1);

    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    expect(pixelGray(rgba, 0, 0, 16)).toBe(255);
    expect(pixelGray(rgba, 15, 0, 16)).toBe(0);
  });
});

describe("image-extractor (LZWDecode)", () => {
  it("decodes Filter chain [/ASCII85Decode /LZWDecode] for DeviceRGB images", async () => {
    const rawRgb = new Uint8Array([
      255, 0, 0, // red
      0, 255, 0, // green
    ]);
    const lzw = lzwEncode(rawRgb, { earlyChange: 1 });
    const ascii85 = ascii85Encode(lzw);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB " +
        "/Filter [/ASCII85Decode /LZWDecode]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(rgba.slice(4, 8))).toEqual([0, 255, 0, 255]);
  });
});

describe("image-extractor (DCTDecode)", () => {
  it("decodes Filter chain [/ASCII85Decode /DCTDecode] into pixel bytes", async () => {
    const rgba = new Uint8Array([
      255, 0, 0, 255, // red
      0, 255, 0, 255, // green
    ]);
    const encoded = jpeg.encode({ data: rgba, width: 2, height: 1 }, 90).data;
    const ascii85 = ascii85Encode(new Uint8Array(encoded));

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB " +
        "/Filter [/ASCII85Decode /DCTDecode]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const out = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    const p0 = out.slice(0, 4);
    const p1 = out.slice(4, 8);
    // JPEG is lossy; use generous thresholds.
    expect(p0[0]).toBeGreaterThan(180);
    expect(p0[1]).toBeLessThan(80);
    expect(p0[2]).toBeLessThan(80);
    expect(p0[3]).toBe(255);

    expect(p1[0]).toBeLessThan(80);
    expect(p1[1]).toBeGreaterThan(180);
    expect(p1[2]).toBeLessThan(80);
    expect(p1[3]).toBe(255);
  });
});

describe("image-extractor (JPXDecode)", () => {
  it("throws when /JPXDecode is present and no jpxDecode is provided", async () => {
    const jpxBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const jpxHex = asciiHexEncodeBytes(jpxBytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: jpxHex,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB " +
        "/Filter [/ASCIIHexDecode /JPXDecode]",
    });

    await expect(parsePdf(pdfBytes)).rejects.toThrow("/JPXDecode requires options.jpxDecode");
  });

  it("decodes /JPXDecode images via injected jpxDecode", async () => {
    const jpxBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const jpxHex = asciiHexEncodeBytes(jpxBytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: jpxHex,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB " +
        "/Filter [/ASCIIHexDecode /JPXDecode]",
    });

    const doc = await parsePdf(pdfBytes, {
      jpxDecode: (bytes, options) => {
        expect(options.expectedWidth).toBe(2);
        expect(options.expectedHeight).toBe(1);
        expect(Array.from(bytes)).toEqual(Array.from(jpxBytes));
        return {
          width: 2,
          height: 1,
          components: 3,
          bitsPerComponent: 8,
          data: new Uint8Array([255, 0, 0, 0, 255, 0]),
        };
      },
    });

    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 2, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(rgba.slice(4, 8))).toEqual([0, 255, 0, 255]);
  });

  it("decodes /SMask /JPXDecode via injected jpxDecode", async () => {
    const smaskJpxBytes = new Uint8Array([0x01, 0x02, 0x03]);
    const smaskJpxHex = asciiHexEncodeBytes(smaskJpxBytes);

    const pdfBytes = buildMinimalPdfWithSmaskImageXObject({
      imageStreamAscii: "FF000000FF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode",
      smaskStreamAscii: smaskJpxHex,
      smaskDictEntries:
        "/Type /XObject /Subtype /Image /Name /SM1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceGray " +
        "/Filter [/ASCIIHexDecode /JPXDecode]",
    });

    const doc = await parsePdf(pdfBytes, {
      jpxDecode: (bytes, options) => {
        expect(options.expectedWidth).toBe(2);
        expect(options.expectedHeight).toBe(1);
        expect(Array.from(bytes)).toEqual(Array.from(smaskJpxBytes));
        return {
          width: 2,
          height: 1,
          components: 1,
          bitsPerComponent: 8,
          data: new Uint8Array([0, 255]),
        };
      },
    });

    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);
    expect(Array.from(images[0]!.alpha ?? [])).toEqual([0, 255]);
  });

  it("decodes /JPXDecode images via decodeJpxNative (pure TS)", async () => {
    const jp2Base64 =
      "AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAAAQAAAAIAAwcHAAAAAAAPY29scgEAAAAAABAAAACYanAyY/9P/1EALwAAAAAAAgAAAAEAAAAAAAAAAAAAAAIAAAABAAAAAAAAAAAAAwcBAQcBAQcBAf9SAAwAAAABAAAEBAAB/1wABEBA/2QAJQABQ3JlYXRlZCBieSBPcGVuSlBFRyB2ZXJzaW9uIDIuNS40/5AACgAAAAAAIAAB/5PfgCALsop/34AYBaLd34AQCT//2Q==";
    const jp2Bytes = new Uint8Array(base64ToArrayBuffer(jp2Base64));
    const jpxHex = asciiHexEncodeBytes(jp2Bytes);

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: jpxHex,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB " +
        "/Filter [/ASCIIHexDecode /JPXDecode]",
    });

    const doc = await parsePdf(pdfBytes, { jpxDecode: decodeJpxNative });
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    const rgba = convertToRgba(image.data, 2, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(rgba.slice(4, 8))).toEqual([0, 255, 0, 255]);
  });
});

describe("image-extractor (SMask)", () => {
  it("extracts /SMask alpha for raw images", async () => {
    const pdfBytes = buildMinimalPdfWithSmaskImageXObject({
      imageStreamAscii: "FF000000FF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode",
      smaskStreamAscii: "00FF>",
      smaskDictEntries:
        "/Type /XObject /Subtype /Image /Name /SM1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(image.alpha).toBeTruthy();
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("extracts /SMask alpha for LZWDecode masks with Predictor=12 (PNG)", async () => {
    // Width=2, Height=1, Colors=1, bpc=8, Predictor=12.
    // Encoded row: [filterType=0, a0=0x00, a1=0xFF]
    const predicted = new Uint8Array([0, 0x00, 0xff]);
    const lzw = lzwEncode(predicted, { earlyChange: 1 });
    const ascii85 = ascii85Encode(lzw);

    const pdfBytes = buildMinimalPdfWithSmaskImageXObject({
      imageStreamAscii: "FF000000FF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode",
      smaskStreamAscii: ascii85,
      smaskDictEntries:
        "/Type /XObject /Subtype /Image /Name /SM1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /LZWDecode] " +
        "/DecodeParms [null << /Predictor 12 /Colors 1 /Columns 2 /BitsPerComponent 8 >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.alpha).toBeTruthy();
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("extracts /SMask /Matte when present", async () => {
    const pdfBytes = buildMinimalPdfWithSmaskImageXObject({
      // 2 pixels (RGB, 8bpc): [FF 7F 7F] [BF BF FF]
      imageStreamAscii: "FF7F7FBFBFFF>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode",
      // alpha: [0x80, 0x40]
      smaskStreamAscii: "8040>",
      smaskDictEntries:
        "/Type /XObject /Subtype /Image /Name /SM1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode " +
        "/Matte [1 1 1]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.alpha).toBeTruthy();
    expect(Array.from(image.alpha ?? [])).toEqual([128, 64]);
    expect(image.softMaskMatte).toEqual([1, 1, 1]);
  });

  it("extracts /SMask alpha when BitsPerComponent=4", async () => {
    const pdfBytes = buildMinimalPdfWithSmaskImageXObject({
      imageStreamAscii: "FF000000FF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode",
      // 2 samples @ 4bpc packed into one byte: 0x0F => [0, 15] => [0, 255]
      smaskStreamAscii: "0F>",
      smaskDictEntries:
        "/Type /XObject /Subtype /Image /Name /SM1 /Width 2 /Height 1 " +
        "/BitsPerComponent 4 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.alpha).toBeTruthy();
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("extracts /SMask alpha for /CCITTFaxDecode masks (with /Decode inversion)", async () => {
    const source = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const ccittBytes = await extractFirstCcittImageStreamBytes(source);
    const ascii85 = ascii85Encode(ccittBytes);

    const pdfBytes = buildMinimalPdfWithSmaskImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true >>]",
      smaskStreamAscii: ascii85,
      smaskDictEntries:
        "/Type /XObject /Subtype /Image /Name /SM1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Decode [1 0] " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(64);
    expect(image.height).toBe(64);
    expect(image.alpha).toBeTruthy();

    const alpha = image.alpha!;
    expect(alpha).toHaveLength(64 * 64);

    const a00 = alpha[0 * 64 + 0] ?? 0;
    const a630 = alpha[0 * 64 + 63] ?? 0;
    const a063 = alpha[63 * 64 + 0] ?? 0;
    const a6363 = alpha[63 * 64 + 63] ?? 0;

    // Inverted relative to the CCITT image's black/white pattern.
    expect(a00).toBe(255);
    expect(a630).toBe(0);
    expect(a063).toBe(0);
    expect(a6363).toBe(255);
  });
});

describe("image-extractor (Separation/DeviceN)", () => {
  it("extracts /Separation images via deterministic tint fallback (tint → grayscale RGB)", async () => {
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "00FF>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/Separation /Spot /DeviceGray << /FunctionType 2 /Domain [0 1] /C0 [1] /C1 [0] /N 1 >>] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    // tint 0 => white, tint 1 => black (inverted grayscale mapping)
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(rgba.slice(4, 8))).toEqual([0, 0, 0, 255]);
  });

  it("extracts /DeviceN images via deterministic tint fallback (avg tints → grayscale RGB)", async () => {
    const pdfBytes = buildMinimalPdfWithImageXObject({
      // 1 pixel, 2 components: [0x00, 0xFF] => avg tint=0.5 => gray=0.5
      imageStreamAscii: "00FF>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/DeviceN [/C1 /C2] /DeviceRGB << /FunctionType 2 /Domain [0 1 0 1] /C0 [0 0 0] /C1 [1 1 1] /N 1 >>] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([128, 128, 128, 255]);
  });
});

describe("image-extractor (Lab)", () => {
  it("extracts /Lab images by converting Lab→sRGB (white)", async () => {
    // 1x1 pixel with L=100, a=0, b=0 using /Decode mapping.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "FF8080>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/Lab << /WhitePoint [0.9505 1 1.0890] /Range [-128 127 -128 127] >>] " +
        "/Decode [0 100 -128 127 -128 127] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 255, 255, 255]);
  });

  it("extracts /Lab images by converting Lab→sRGB (black)", async () => {
    // 1x1 pixel with L=0, a=0, b=0.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "008080>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/Lab << /WhitePoint [0.9505 1 1.0890] /Range [-128 127 -128 127] >>] " +
        "/Decode [0 100 -128 127 -128 127] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([0, 0, 0, 255]);
  });
});

describe("image-extractor (CalGray / CalRGB)", () => {
  it("extracts /CalGray images by applying /Gamma and /WhitePoint", async () => {
    // 1x1 pixel: sample=0.5 with Gamma=2.0 -> linear=0.25 -> sRGB≈0.537 -> byte≈137.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "80>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/CalGray << /WhitePoint [0.9505 1 1.0890] /Gamma 2 >>] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([137, 137, 137, 255]);
  });

  it("extracts /CalRGB images by applying /Gamma and /Matrix", async () => {
    // 1x1 pixel: R=0.5, Gamma=2.0 -> linear=0.25 -> sRGB≈0.537 -> byte≈137.
    // Use an sRGB→XYZ matrix so XYZ→sRGB round-trips the linear value.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "800000>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/CalRGB << " +
        "/WhitePoint [0.9505 1 1.0890] " +
        "/Gamma [2 2 2] " +
        "/Matrix [0.4124 0.3576 0.1805 0.2126 0.7152 0.0722 0.0193 0.1192 0.9505] " +
        ">>] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([137, 0, 0, 255]);
  });
});

describe("image-extractor (ICCBased)", () => {
  it("extracts ICCBased images with N=2 via deterministic tint fallback (avg tints → grayscale RGB)", async () => {
    const pdfBytes = buildMinimalPdfWithIccBasedImageXObject({
      // 1 pixel, 2 components: [0x00, 0xFF] => avg tint=0.5 => gray=0.5
      imageStreamAscii: "00FF>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/ICCBased 8 0 R] " +
        "/Filter /ASCIIHexDecode",
      iccProfileDictEntries: "/N 2",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([128, 128, 128, 255]);
  });

  it("extracts ICCBased RGB images by parsing the ICC profile (matrix + TRC)", async () => {
    const icc = makeMinimalIccProfileBytes({ dataColorSpace: "RGB " });
    const iccHex = asciiHexEncodeBytes(icc);

    const pdfBytes = buildMinimalPdfWithIccBasedImageXObject({
      // 1 pixel: R=0.5, G=0, B=0. TRC gamma=2 => linear=0.25 => sRGB≈137
      imageStreamAscii: "800000>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/ICCBased 8 0 R] " +
        "/Filter /ASCIIHexDecode",
      iccProfileDictEntries: "/N 3 /Filter /ASCIIHexDecode",
      iccProfileStreamAscii: iccHex,
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([137, 0, 0, 255]);
  });

  it("extracts ICCBased Gray images by parsing the ICC profile (kTRC)", async () => {
    const icc = makeMinimalIccProfileBytes({ dataColorSpace: "GRAY" });
    const iccHex = asciiHexEncodeBytes(icc);

    const pdfBytes = buildMinimalPdfWithIccBasedImageXObject({
      // 1 pixel: gray=0.5. TRC gamma=2 => linear=0.25 => sRGB≈137
      imageStreamAscii: "80>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/ICCBased 8 0 R] " +
        "/Filter /ASCIIHexDecode",
      iccProfileDictEntries: "/N 1 /Filter /ASCIIHexDecode",
      iccProfileStreamAscii: iccHex,
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([137, 137, 137, 255]);
  });

  it("extracts ICCBased CMYK images by parsing a LUT-based ICC profile (mft1 A2B0)", async () => {
    const icc = makeMinimalCmykLutIccProfileBytes();
    const iccHex = asciiHexEncodeBytes(icc);

    const pdfBytes = buildMinimalPdfWithIccBasedImageXObject({
      // 1 pixel: C=0, M=1, Y=1, K=0 => red
      imageStreamAscii: "00FFFF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 " +
        "/ColorSpace [/ICCBased 8 0 R] " +
        "/Filter /ASCIIHexDecode",
      iccProfileDictEntries: "/N 4 /Filter /ASCIIHexDecode",
      iccProfileStreamAscii: iccHex,
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, 1, 1, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
  });
});

describe("image-extractor (DeviceCMYK)", () => {
  it("extracts DeviceCMYK images and converts to expected RGBA (end-to-end)", async () => {
    // 1x1 pixel: C=0, M=255, Y=0, K=0 => magenta-like.
    const cmykHex = "00FF0000>";

    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: cmykHex,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceCMYK " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(image.colorSpace).toBe("DeviceCMYK");
    expect(image.bitsPerComponent).toBe(8);

    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    const p0 = Array.from(rgba.slice(0, 4));
    expect(p0[0]).toBeGreaterThan(200);
    expect(p0[1]).toBeLessThan(60);
    expect(p0[2]).toBeGreaterThan(200);
    expect(p0[3]).toBe(255);
  });
});

describe("image-extractor (/Decode)", () => {
  it("honors grayscale inversion via /Decode [1 0]", async () => {
    // 1x1 pixel: raw=0 (black). With /Decode [1 0], it inverts to white.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceGray " +
        "/Decode [1 0] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent, {
      decode: image.decode,
    });
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 255, 255, 255]);
  });
});

describe("image-extractor (/Indexed)", () => {
  it("expands /Indexed palette images into DeviceRGB bytes", async () => {
    // /Indexed /DeviceRGB 1 with lookup: index0=black, index1=white.
    // 2 pixels @ 1bpp: indices [0, 1] => 0b01000000 (0x40)
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "40>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 1 /ColorSpace [/Indexed /DeviceRGB 1 <000000FFFFFF>] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);
    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 8))).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });

  it("applies /Decode [1 0] to indices before palette lookup", async () => {
    // Same as above, but invert indices so [0,1] becomes [1,0].
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "40>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 1 /ColorSpace [/Indexed /DeviceRGB 1 <000000FFFFFF>] " +
        "/Decode [1 0] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    const rgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
    expect(Array.from(rgba.slice(0, 8))).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
  });

  it("applies color-key /Mask arrays to /Indexed images (mask by palette index)", async () => {
    // Indices [0, 1]; mask out index 0 only.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "40>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 1 /ColorSpace [/Indexed /DeviceRGB 1 <000000FFFFFF>] " +
        "/Mask [0 0] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });
});

describe("image-extractor (ImageMask)", () => {
  it("expands /ImageMask true into RGB+alpha using current fill color", async () => {
    const pdfBytes = buildMinimalPdfWithImageXObject({
      contentStream: "1 0 0 rg q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n",
      imageStreamAscii: "80>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/ImageMask true /Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.colorSpace).toBe("DeviceRGB");
    expect(image.bitsPerComponent).toBe(8);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([255, 0]);
  });

  it("honors /Decode [1 0] inversion for ImageMask", async () => {
    const pdfBytes = buildMinimalPdfWithImageXObject({
      contentStream: "0 0 1 rg q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n",
      imageStreamAscii: "80>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/ImageMask true /Decode [1 0] /Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });
});

describe("image-extractor (/Mask)", () => {
  it("applies color-key /Mask arrays by producing alpha=0 for matching pixels", async () => {
    // 2 pixels: red then green. Mask out only pure red.
    const pdfBytes = buildMinimalPdfWithImageXObject({
      imageStreamAscii: "FF000000FF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB " +
        "/Mask [255 255 0 0 0 0] " +
        "/Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("uses explicit /Mask streams as alpha (ImageMask) for base images", async () => {
    const pdfBytes = buildMinimalPdfWithMaskImageXObject({
      imageStreamAscii: "FF000000FF00>",
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 " +
        "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode",
      maskStreamAscii: "80>",
      maskDictEntries:
        "/Type /XObject /Subtype /Image /Name /M1 /Width 2 /Height 1 " +
        "/ImageMask true /Filter /ASCIIHexDecode",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(Array.from(image.alpha ?? [])).toEqual([255, 0]);
  });

  it("decodes explicit /Mask streams with /CCITTFaxDecode (with /Decode inversion)", async () => {
    const source = decodePdfBase64(CCITT_GROUP4_PDF_BASE64);
    const ccittBytes = await extractFirstCcittImageStreamBytes(source);
    const ascii85 = ascii85Encode(ccittBytes);

    const pdfBytes = buildMinimalPdfWithMaskImageXObject({
      imageStreamAscii: ascii85,
      imageDictEntries:
        "/Type /XObject /Subtype /Image /Name /Im1 /Width 64 /Height 64 " +
        "/BitsPerComponent 1 /ColorSpace /DeviceGray " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true >>]",
      maskStreamAscii: ascii85,
      maskDictEntries:
        "/Type /XObject /Subtype /Image /Name /M1 /Width 64 /Height 64 " +
        "/ImageMask true " +
        "/Decode [1 0] " +
        "/Filter [/ASCII85Decode /CCITTFaxDecode] " +
        "/DecodeParms [null << /K -1 /Columns 64 /Rows 64 /BlackIs1 true >>]",
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(64);
    expect(image.height).toBe(64);
    expect(image.alpha).toBeTruthy();

    const alpha = image.alpha!;
    expect(alpha).toHaveLength(64 * 64);

    const a00 = alpha[0 * 64 + 0] ?? 0;
    const a630 = alpha[0 * 64 + 63] ?? 0;
    const a063 = alpha[63 * 64 + 0] ?? 0;
    const a6363 = alpha[63 * 64 + 63] ?? 0;

    // Decode inverted relative to the CCITT image's black/white pattern.
    expect(a00).toBe(255);
    expect(a630).toBe(0);
    expect(a063).toBe(0);
    expect(a6363).toBe(255);
  });
});
