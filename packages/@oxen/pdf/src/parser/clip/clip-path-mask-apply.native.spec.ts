/**
 * @file src/pdf/parser/clip-path-mask-apply.native.spec.ts
 */

import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithTriangleClipAndFillPath(): Uint8Array {
  const clip = "0 0 m 10 0 l 0 10 l h W n";
  const contentStream = `q ${clip} 1 0 0 rg 0 0 10 10 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << >> " +
      "/Contents 4 0 R >>",
    4: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
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

  return new TextEncoder().encode(parts.join("") + xrefLines.join("") + trailer);
}

function buildMinimalPdfWithTriangleClipAndText(): Uint8Array {
  const clip = "0 0 m 10 0 l 0 10 l h W n";
  const contentStream = `q ${clip} BT /F1 20 Tf 1 0 0 rg 1 0 0 1 0 0 Tm (MMMM) Tj ET Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  const font = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      `/Resources << /Font << /F1 ${font} >> >> ` +
      "/Contents 4 0 R >>",
    4: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
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

  return new TextEncoder().encode(parts.join("") + xrefLines.join("") + trailer);
}

describe("clip paths (apply to paths/text via rasterization, native)", () => {
  it("rasterizes filled paths under a non-rect `W` clip path when clipPathMaxSize is enabled", async () => {
    const pdfBytes = buildMinimalPdfWithTriangleClipAndFillPath();
    const doc = await parsePdfNative(pdfBytes, { clipPathMaxSize: 10 });
    const page = doc.pages[0]!;

    const images = page.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(10);
    expect(image.height).toBe(10);
    expect(image.graphicsState.clipMask).toBeUndefined();

    const alphaAt = (x: number, y: number): number => (image.alpha ?? new Uint8Array())[y * image.width + x] ?? 0;
    expect(alphaAt(8, 0)).toBe(0);
    expect(alphaAt(1, 8)).toBe(255);
  });

  it("rasterizes text under a non-rect `W` clip path when clipPathMaxSize is enabled", async () => {
    const pdfBytes = buildMinimalPdfWithTriangleClipAndText();
    const doc = await parsePdfNative(pdfBytes, { clipPathMaxSize: 10 });
    const page = doc.pages[0]!;

    expect(page.elements.some((e) => e.type === "text")).toBe(false);
    const images = page.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(10);
    expect(image.height).toBe(10);
    expect(image.graphicsState.clipMask).toBeUndefined();

    const alphaAt = (x: number, y: number): number => (image.alpha ?? new Uint8Array())[y * image.width + x] ?? 0;
    expect(alphaAt(8, 0)).toBe(0);
    expect(alphaAt(1, 8)).toBeGreaterThan(0);
  });
});
