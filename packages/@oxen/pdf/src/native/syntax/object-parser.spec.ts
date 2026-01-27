/**
 * @file src/pdf/native/object-parser.spec.ts
 */

import { createPdfResolver } from "../resolver/resolver";
import type { PdfStream } from "../core/types";
import { loadXRef } from "../xref/xref";

function encodeLatin1(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function asStream(obj: unknown): PdfStream {
  const s = obj as PdfStream;
  if (!s || typeof s !== "object" || s.type !== "stream") {
    throw new Error("Expected stream object");
  }
  return s;
}

describe("parseIndirectObjectAt (stream Length)", () => {
  it("uses indirect /Length to avoid endstream false positives", () => {
    const header = "%PDF-1.7\n";

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";

    const streamData = encodeLatin1("abcXendstreamYdef"); // contains 'endstream' bytes inside payload
    const obj3 = `3 0 obj\n${streamData.length}\nendobj\n`;

    const obj4Prefix = "4 0 obj\n<< /Length 3 0 R >>\nstream\n";
    const obj4Suffix = "\nendstream\nendobj\n";

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3 = offset2 + obj2.length;
    const offset4 = offset3 + obj3.length;

    const xrefOffset = offset4 + obj4Prefix.length + streamData.length + obj4Suffix.length;
    const xref =
      "xref\n" +
      "0 5\n" +
      "0000000000 65535 f \n" +
      `${String(offset1).padStart(10, "0")} 00000 n \n` +
      `${String(offset2).padStart(10, "0")} 00000 n \n` +
      `${String(offset3).padStart(10, "0")} 00000 n \n` +
      `${String(offset4).padStart(10, "0")} 00000 n \n` +
      "trailer\n" +
      "<< /Size 5 /Root 1 0 R >>\n" +
      "startxref\n" +
      `${xrefOffset}\n` +
      "%%EOF\n";

    const pdfBytes = new Uint8Array([
      ...encodeLatin1(header),
      ...encodeLatin1(obj1),
      ...encodeLatin1(obj2),
      ...encodeLatin1(obj3),
      ...encodeLatin1(obj4Prefix),
      ...streamData,
      ...encodeLatin1(obj4Suffix),
      ...encodeLatin1(xref),
    ]);

    const xrefTable = loadXRef(pdfBytes);
    const resolver = createPdfResolver(pdfBytes, xrefTable);

    const obj = resolver.getObject(4);
    const stream = asStream(obj);
    expect(stream.data.length).toBe(streamData.length);
    expect(new TextDecoder("latin1").decode(stream.data)).toBe("abcXendstreamYdef");
  });

  it("tolerates whitespace/comments between 'stream' and EOL", () => {
    const header = "%PDF-1.7\n";

    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";

    const streamData = encodeLatin1("abc");
    const obj3 = `3 0 obj\n<< /Length ${streamData.length} >>\nstream %comment\r\nabc\r\nendstream\nendobj\n`;

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3 = offset2 + obj2.length;

    const xrefOffset = offset3 + obj3.length;
    const xref =
      "xref\n" +
      "0 4\n" +
      "0000000000 65535 f \n" +
      `${String(offset1).padStart(10, "0")} 00000 n \n` +
      `${String(offset2).padStart(10, "0")} 00000 n \n` +
      `${String(offset3).padStart(10, "0")} 00000 n \n` +
      "trailer\n" +
      "<< /Size 4 /Root 1 0 R >>\n" +
      "startxref\n" +
      `${xrefOffset}\n` +
      "%%EOF\n";

    const pdfBytes = new Uint8Array([
      ...encodeLatin1(header),
      ...encodeLatin1(obj1),
      ...encodeLatin1(obj2),
      ...encodeLatin1(obj3),
      ...encodeLatin1(xref),
    ]);

    const xrefTable = loadXRef(pdfBytes);
    const resolver = createPdfResolver(pdfBytes, xrefTable);
    const obj = resolver.getObject(3);
    const stream = asStream(obj);
    expect(stream.data).toEqual(streamData);
  });
});
