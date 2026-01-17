/**
 * @file src/pdf/parser/clip-rect.native.spec.ts
 */

import { parsePdf } from "./pdf-parser";
import { buildSimplePdfBytes } from "../test-utils/simple-pdf";

function buildMinimalPdfWithClipAndImage(args: {
  readonly clipRect: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly imageCtm: Readonly<{ a: number; d: number; e: number; f: number }>;
}): Uint8Array {
  const { clipRect, imageCtm } = args;

  const contentStream =
    `q ` +
    `${clipRect.x} ${clipRect.y} ${clipRect.width} ${clipRect.height} re W n ` +
    `${imageCtm.a} 0 0 ${imageCtm.d} ${imageCtm.e} ${imageCtm.f} cm /Im1 Do ` +
    `Q\n`;

  const contentLength = new TextEncoder().encode(contentStream).length;
  const imageStream = "00>"; // 1x1 gray pixel (ASCIIHex)
  const imageLength = new TextEncoder().encode(imageStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 3 0 R >>",
    3: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
    4: "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 100 100] /Contents 5 0 R /Resources << /XObject << /Im1 7 0 R >> >> >>",
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
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

describe("clip paths (native)", () => {
  it("propagates `re W n` clipBBox to subsequent images", async () => {
    const pdfBytes = buildMinimalPdfWithClipAndImage({
      clipRect: { x: 10, y: 10, width: 20, height: 20 },
      imageCtm: { a: 100, d: 100, e: 0, f: 0 },
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.graphicsState.clipBBox).toEqual([10, 10, 30, 30]);
  });

  it("drops paths that are completely outside a rectangular clipBBox (bbox-only)", async () => {
    const pdfBytes = buildSimplePdfBytes({
      pages: [
        {
          width: 100,
          height: 100,
          content: "q 0 0 10 10 re W n 20 20 5 5 re f Q\n",
        },
      ],
    });

    const doc = await parsePdf(pdfBytes);
    const paths = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "path"));
    expect(paths).toHaveLength(0);
  });

  it("keeps paths that intersect a rectangular clipBBox (bbox-only)", async () => {
    const pdfBytes = buildSimplePdfBytes({
      pages: [
        {
          width: 100,
          height: 100,
          content: "q 0 0 10 10 re W n 5 5 10 10 re f Q\n",
        },
      ],
    });

    const doc = await parsePdf(pdfBytes);
    const paths = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "path"));
    expect(paths).toHaveLength(1);
  });

  it("drops text that is completely outside a rectangular clipBBox (bbox-only)", async () => {
    const pdfBytes = buildSimplePdfBytes({
      pages: [
        {
          width: 100,
          height: 100,
          includeHelvetica: true,
          content: "q 0 0 10 10 re W n BT /F1 12 Tf 30 30 Td (Hi) Tj ET Q\n",
        },
      ],
    });

    const doc = await parsePdf(pdfBytes);
    const texts = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "text"));
    expect(texts).toHaveLength(0);
  });

  it("keeps text that intersects a rectangular clipBBox (bbox-only)", async () => {
    const pdfBytes = buildSimplePdfBytes({
      pages: [
        {
          width: 100,
          height: 100,
          includeHelvetica: true,
          content: "q 0 0 10 10 re W n BT /F1 12 Tf 2 2 Td (Hi) Tj ET Q\n",
        },
      ],
    });

    const doc = await parsePdf(pdfBytes);
    const texts = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "text"));
    expect(texts).toHaveLength(1);
  });
});
