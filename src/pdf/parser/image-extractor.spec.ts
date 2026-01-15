import { describe, expect, it } from "vitest";
import { parsePdf } from "./pdf-parser";
import { convertToRgba } from "../converter/pixel-converter";
import { base64ToArrayBuffer } from "../../buffer/base64";
import { loadXRef } from "../native/xref";
import { PdfResolver } from "../native/resolver";
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
}): Uint8ClampedArray {
  return convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent);
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
    let v = value;
    for (let j = 4; j >= 0; j -= 1) {
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

function buildMinimalPdfWithImageXObject(args: {
  readonly imageStreamAscii: string;
  readonly imageDictEntries: string;
}): Uint8Array {
  const contentStream = "q 15.36 0 0 15.36 0 0 cm /Im1 Do Q\n";
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

  let cursor = header.length;
  for (const n of order) {
    offsets[n] = cursor;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor += body.length;
  }

  const xrefStart = cursor;
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
  const resolver = new PdfResolver(pdfBytes, xref);

  const readNameArray = (obj: PdfObject | undefined): readonly string[] => {
    const v = obj ? resolver.deref(obj) : undefined;
    if (!v) return [];
    if (v.type === "name") return [v.value];
    if (v.type === "array") {
      const out: string[] = [];
      for (const item of v.items) {
        const deref = resolver.deref(item);
        if (deref.type === "name") out.push(deref.value);
      }
      return out;
    }
    return [];
  };

  for (const [objNum, entry] of xref.entries.entries()) {
    if (entry.type === 0) continue;
    const obj = resolver.getObject(objNum);
    if (obj.type !== "stream") continue;

    const subtype = resolver.deref(obj.dict.map.get("Subtype") ?? { type: "null" });
    if (subtype.type !== "name" || subtype.value !== "Image") continue;

    const filters = readNameArray(obj.dict.map.get("Filter"));
    if (!filters.includes("CCITTFaxDecode")) continue;

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

  it("fails closed (no image) for unsupported DecodeParms (EndOfLine=true)", async () => {
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
    expect(images).toHaveLength(0);
  });
});
