/**
 * @file src/pdf/parser/inline-image.native.spec.ts
 */

import { parsePdfNative } from "../core/pdf-parser.native";

function buildPdfWithInlineImage(args: { readonly contentStream: string }): Uint8Array {
  const contentLength = new TextEncoder().encode(args.contentStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] " +
      "/Resources << >> " +
      "/Contents 4 0 R >>",
    4: `<< /Length ${contentLength} >>\nstream\n${args.contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4];
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
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

function buildPdfWithInlineImageInsideForm(): Uint8Array {
  const formStream =
    "BI /W 1 /H 1 /CS /RGB /BPC 8 /F /AHx ID\n" +
    "FF0000>\n" +
    "EI\n";
  const formLength = new TextEncoder().encode(formStream).length;

  const pageStream = "q 1 0 0 1 10 20 cm /Fm1 Do Q\n";
  const pageLength = new TextEncoder().encode(pageStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] " +
      "/Resources << /XObject << /Fm1 4 0 R >> >> " +
      "/Contents 5 0 R >>",
    4:
      `<< /Type /XObject /Subtype /Form /BBox [0 0 1 1] /Length ${formLength} >>\n` +
      `stream\n${formStream}endstream`,
    5: `<< /Length ${pageLength} >>\nstream\n${pageStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5];
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
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

describe("Inline images (BI/ID/EI) (native)", () => {
  it("extracts an inline image by rewriting it into a synthetic XObject", async () => {
    const content =
      "q 2 0 0 2 0 0 cm\n" +
      "BI /W 1 /H 1 /CS /RGB /BPC 8 /F /AHx ID\n" +
      "FF0000>\n" +
      "EI\n" +
      "Q\n";

    const bytes = buildPdfWithInlineImage({ contentStream: content });
    const doc = await parsePdfNative(bytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const img = images[0]!;
    if (img.type !== "image") {throw new Error("Expected image");}
    expect(img.width).toBe(1);
    expect(img.height).toBe(1);
    expect(Array.from(img.data)).toEqual([255, 0, 0]);
    expect(img.graphicsState.ctm).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it("extracts inline images inside Form XObjects", async () => {
    const bytes = buildPdfWithInlineImageInsideForm();
    const doc = await parsePdfNative(bytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const img = images[0]!;
    if (img.type !== "image") {throw new Error("Expected image");}
    expect(img.width).toBe(1);
    expect(img.height).toBe(1);
    expect(Array.from(img.data)).toEqual([255, 0, 0]);
    expect(img.graphicsState.ctm).toEqual([1, 0, 0, 1, 10, 20]);
  });
});
