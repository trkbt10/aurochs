/**
 * @file src/pdf/native/xmp.spec.ts
 */

import { loadNativePdfDocument } from "../document/document";

function pad10(n: number): string {
  return String(n).padStart(10, "0");
}

function buildXref(entries: ReadonlyArray<{ readonly obj: number; readonly offset: number }>, size: number): string {
  const map = new Map(entries.map((e) => [e.obj, e.offset]));
  const lines: string[] = ["xref", `0 ${size}`, "0000000000 65535 f "];
  for (let i = 1; i < size; i += 1) {
    const off = map.get(i) ?? 0;
    lines.push(`${pad10(off)} 00000 n `);
  }
  return `${lines.join("\n")}\n`;
}

function buildPdfWithXmp(xml: string): Uint8Array {
  const header = "%PDF-1.7\n";

  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Metadata 4 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";

  const xmlBytes = new TextEncoder().encode(xml);
  const obj4Prefix = `4 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${xmlBytes.length} >>\nstream\n`;
  const obj4Suffix = "\nendstream\nendobj\n";

  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset4 = offset2 + obj2.length;

  const xrefOffset = offset4 + obj4Prefix.length + xmlBytes.length + obj4Suffix.length;
  const xref = buildXref(
    [
      { obj: 1, offset: offset1 },
      { obj: 2, offset: offset2 },
      { obj: 4, offset: offset4 },
    ],
    5,
  );

  const trailer =
    "trailer\n" +
    "<< /Size 5 /Root 1 0 R >>\n" +
    "startxref\n" +
    `${xrefOffset}\n` +
    "%%EOF\n";

  return new Uint8Array([
    ...new TextEncoder().encode(header),
    ...new TextEncoder().encode(obj1),
    ...new TextEncoder().encode(obj2),
    ...new TextEncoder().encode(obj4Prefix),
    ...xmlBytes,
    ...new TextEncoder().encode(obj4Suffix),
    ...new TextEncoder().encode(xref),
    ...new TextEncoder().encode(trailer),
  ]);
}

describe("XMP metadata extraction", () => {
  it("extracts dc:title/dc:creator/dc:description from /Metadata stream", () => {
    const xml =
      `<?xpacket begin="\\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
      `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
      `  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
      `    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
      `      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">XMP Title</rdf:li></rdf:Alt></dc:title>\n` +
      `      <dc:creator><rdf:Seq><rdf:li>XMP Author</rdf:li></rdf:Seq></dc:creator>\n` +
      `      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">XMP Subject</rdf:li></rdf:Alt></dc:description>\n` +
      `    </rdf:Description>\n` +
      `  </rdf:RDF>\n` +
      `</x:xmpmeta>\n` +
      `<?xpacket end="w"?>\n`;

    const bytes = buildPdfWithXmp(xml);
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    expect(doc.getMetadata()).toEqual({ title: "XMP Title", author: "XMP Author", subject: "XMP Subject" });
  });
});
