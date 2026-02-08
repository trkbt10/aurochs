/**
 * @file src/pdf/parser/clip-path-mask.native.spec.ts
 */

import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithTriangleClipAndImage(): Uint8Array {
  const clip = "0 0 m 10 0 l 0 10 l h W n";
  const contentStream = `q ${clip} 10 0 0 10 0 0 cm /Im1 Do Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 1x1 RGB image: solid red (ASCIIHexDecode).
  const imageStream = "FF0000>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /XObject << /Im1 4 0 R >> >> " +
      "/Contents 5 0 R >>",
    4:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
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

  return new TextEncoder().encode(parts.join("") + xrefLines.join("") + trailer);
}

describe("clip paths (per-pixel mask, native)", () => {
  it("generates a clipMask from a non-rect `W` clip path when clipPathMaxSize is enabled", async () => {
    const pdfBytes = buildMinimalPdfWithTriangleClipAndImage();
    const doc = await parsePdfNative(pdfBytes, { clipPathMaxSize: 10 });

    const page = doc.pages[0]!;
    const images = page.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    const mask = image.graphicsState.clipMask;
    expect(mask).toBeTruthy();
    if (!mask) {throw new Error("Expected clipMask");}
    expect(mask.width).toBe(10);
    expect(mask.height).toBe(10);
    expect(mask.alpha.length).toBe(10 * 10);
    expect(Array.from(mask.alpha).some((v) => v !== 0)).toBe(true);
  });
});
