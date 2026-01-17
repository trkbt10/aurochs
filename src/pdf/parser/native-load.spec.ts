/**
 * @file src/pdf/parser/native-load.spec.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { loadNativePdfDocumentForParser } from "./native-load";
import PDFDocument from "pdfkit";

function renderPdfkitEncryptedPdf(args: { readonly userPassword: string; readonly ownerPassword: string; readonly text: string }): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      // Keep output stable where possible; encryption still introduces /ID, but tests should not depend on bytes.
      compress: false,
      userPassword: args.userPassword,
      ownerPassword: args.ownerPassword,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));

    doc.text(args.text);
    doc.end();
  });
}

function pad10(n: number): string {
  return String(n).padStart(10, "0");
}

function buildXrefTable(entries: ReadonlyArray<{ readonly obj: number; readonly offset: number; readonly gen: number }>, size: number): string {
  const byObj = new Map<number, { offset: number; gen: number }>(entries.map((e) => [e.obj, { offset: e.offset, gen: e.gen }]));
  const lines: string[] = ["xref", `0 ${size}`, "0000000000 65535 f "];
  for (let obj = 1; obj < size; obj += 1) {
    const e = byObj.get(obj);
    if (!e) {
      lines.push("0000000000 00000 f ");
      continue;
    }
    lines.push(`${pad10(e.offset)} ${String(e.gen).padStart(5, "0")} n `);
  }
  return `${lines.join("\n")}\n`;
}

function buildPdfWithEncryptTrailer(options: { readonly includeRoot: boolean }): Uint8Array {
  const header = "%PDF-1.7\n";

  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Filter /Standard >>\nendobj\n"; // dummy Encrypt dictionary (not actually used)

  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;

  const includeRoot = options.includeRoot;
  const size = includeRoot ? 4 : 1;
  const xrefOffset = includeRoot ? offset3 + obj3.length : header.length;
  const xref = buildEncryptTrailerXref(includeRoot, size, offset1, offset2, offset3);
  const trailer = buildEncryptTrailerTrailer(includeRoot, size, xrefOffset);
  return buildEncryptTrailerBytes(includeRoot, header, obj1, obj2, obj3, xref, trailer);
}

function buildEncryptTrailerXref(
  includeRoot: boolean,
  size: number,
  offset1: number,
  offset2: number,
  offset3: number,
): string {
  if (!includeRoot) {
    return "xref\n0 1\n0000000000 65535 f \n";
  }
  return buildXrefTable(
    [
      { obj: 1, offset: offset1, gen: 0 },
      { obj: 2, offset: offset2, gen: 0 },
      { obj: 3, offset: offset3, gen: 0 },
    ],
    size,
  );
}

function buildEncryptTrailerTrailer(includeRoot: boolean, size: number, xrefOffset: number): string {
  if (includeRoot) {
    return `trailer\n<< /Size ${size} /Root 1 0 R /Encrypt 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  }
  return `trailer\n<< /Size ${size} /Encrypt 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
}

function buildEncryptTrailerBytes(
  includeRoot: boolean,
  header: string,
  obj1: string,
  obj2: string,
  obj3: string,
  xref: string,
  trailer: string,
): Uint8Array {
  const encoder = new TextEncoder();
  if (includeRoot) {
    return new Uint8Array([
      ...encoder.encode(header),
      ...encoder.encode(obj1),
      ...encoder.encode(obj2),
      ...encoder.encode(obj3),
      ...encoder.encode(xref),
      ...encoder.encode(trailer),
    ]);
  }
  return new Uint8Array([...encoder.encode(header), ...encoder.encode(xref), ...encoder.encode(trailer)]);
}

describe("loadNativePdfDocumentForParser", () => {
  it("loads xref-table fixtures", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/ccitt-group4.pdf"));
    const doc = await loadNativePdfDocumentForParser(bytes, {
      purpose: "inspect",
      encryption: { mode: "ignore" },
      updateMetadata: false,
    });
    expect(doc.getPageCount()).toBe(1);
  });

  it("classifies trailer /Encrypt as ENCRYPTED_PDF when encryption=reject", async () => {
    const bytes = buildPdfWithEncryptTrailer({ includeRoot: false });
    await expect(
      loadNativePdfDocumentForParser(bytes, {
        purpose: "parse",
        encryption: { mode: "reject" },
        updateMetadata: false,
      }),
    ).rejects.toMatchObject({ name: "PdfLoadError", code: "ENCRYPTED_PDF" });
  });

  it("allows trailer /Encrypt when encryption=ignore", async () => {
    // This is intentionally not a real encrypted PDF; it's a regression test for classification behavior.
    const bytes = buildPdfWithEncryptTrailer({ includeRoot: true });
    const doc = await loadNativePdfDocumentForParser(bytes, {
      purpose: "inspect",
      encryption: { mode: "ignore" },
      updateMetadata: false,
    });
    expect(doc.getPageCount()).toBe(0);
  });

  it("loads encrypted PDFs when encryption=password (pdfkit V=1/R=2)", async () => {
    const bytes = await renderPdfkitEncryptedPdf({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    const doc = await loadNativePdfDocumentForParser(bytes, {
      purpose: "parse",
      encryption: { mode: "password", password: "pw" },
      updateMetadata: false,
    });

    const pages = doc.getPages();
    expect(pages.length).toBe(1);

    const page0 = pages[0]!;
    const streams = page0.getDecodedContentStreams();
    expect(streams.length).toBeGreaterThan(0);
    const content = new TextDecoder("latin1").decode(streams[0]!);
    // pdfkit encodes the text as a hex string in TJ: <48454c4c4f> == "HELLO".
    expect(content).toContain("<48454c4c4f>");
  });

  it("rejects encrypted PDFs when encryption=password with wrong password", async () => {
    const bytes = await renderPdfkitEncryptedPdf({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    await expect(
      loadNativePdfDocumentForParser(bytes, {
        purpose: "parse",
        encryption: { mode: "password", password: "wrong" },
        updateMetadata: false,
      }),
    ).rejects.toMatchObject({ name: "PdfLoadError", code: "ENCRYPTED_PDF" });
  });

  (existsSync("fixtures/samples/000459554.pdf") ? it : it.skip)(
    "rejects encrypted PDFs with ENCRYPTED_PDF",
    async () => {
      const bytes = new Uint8Array(readFileSync("fixtures/samples/000459554.pdf"));
      await expect(
        loadNativePdfDocumentForParser(bytes, {
          purpose: "parse",
          encryption: { mode: "reject" },
          updateMetadata: false,
        }),
      ).rejects.toMatchObject({ name: "PdfLoadError", code: "ENCRYPTED_PDF" });
    },
    30_000,
  );
});
