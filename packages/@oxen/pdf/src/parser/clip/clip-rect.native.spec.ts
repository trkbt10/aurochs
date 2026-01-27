/**
 * @file src/pdf/parser/clip-rect.native.spec.ts
 */

import { parsePdf } from "../core/pdf-parser";
import { buildSimplePdfBytes } from "../../test-utils/simple-pdf";

function buildMinimalPdfWithClipAndImage(args: {
  readonly clipPath: string;
  readonly imageCtm: Readonly<{ a: number; d: number; e: number; f: number }>;
}): Uint8Array {
  const { clipPath, imageCtm } = args;

  const contentStream =
    `q ` +
    `${clipPath} ` +
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
      clipPath: "10 10 20 20 re W n",
      imageCtm: { a: 100, d: 100, e: 0, f: 0 },
    });

    const doc = await parsePdf(pdfBytes);
    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.graphicsState.clipBBox).toEqual([10, 10, 30, 30]);
  });

  it("propagates `m/l/h W n` clipBBox to subsequent images (bbox-only)", async () => {
    const pdfBytes = buildMinimalPdfWithClipAndImage({
      clipPath: "10 10 m 30 10 l 30 30 l 10 30 l h W n",
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

  it("applies Tr=7 text clipping by intersecting clipBBox and suppresses visible text output (bbox-only)", async () => {
    const contentStream =
      "q 0 0 100 100 re W n " +
      "BT /F1 10 Tf 7 Tr (Hi) Tj ET " +
      "q 100 0 0 100 0 0 cm /Im1 Do Q " +
      "Q\n";
    const contentLength = new TextEncoder().encode(contentStream).length;

    const imageStream = "00>"; // 1x1 gray pixel (ASCIIHex)
    const imageLength = new TextEncoder().encode(imageStream).length;

    const objects: Record<number, string> = {
      1: "<< /Type /Catalog /Pages 3 0 R >>",
      3: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
      4:
        "<< /Type /Page /Parent 3 0 R /MediaBox [0 0 100 100] " +
        "/Contents 5 0 R " +
        "/Resources << /Font << /F1 6 0 R >> /XObject << /Im1 7 0 R >> >> >>",
      5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
      6: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      7:
        `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 ` +
        `/BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
        `stream\n${imageStream}\nendstream`,
    };

    const header = "%PDF-1.4\n";
    const order = [1, 3, 4, 5, 6, 7];
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

    const pdfBytes = new TextEncoder().encode(parts.join("") + xrefLines.join("") + trailer);

    const doc = await parsePdf(pdfBytes);
    const texts = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "text"));
    expect(texts).toHaveLength(0);

    const images = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "image"));
    expect(images).toHaveLength(1);
    const image = images[0]!;

    const clipBBox = image.graphicsState.clipBBox;
    expect(clipBBox).toBeTruthy();
    // Default metrics (asc=800, desc=-200) at size 10 => bbox height 10.
    // Intersected with 0..100 page clip => y starts at 0.
    expect(clipBBox?.[0]).toBeCloseTo(0);
    expect(clipBBox?.[1]).toBeCloseTo(0);
    expect(clipBBox?.[2]).toBeCloseTo(10);
    expect(clipBBox?.[3]).toBeCloseTo(8);
  });
});
