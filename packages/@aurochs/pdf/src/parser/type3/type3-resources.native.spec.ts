/**
 * @file Type3 font /Resources support (native parser)
 */

import type { PdfImage } from "../../domain";
import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithType3ImageXObject(): Uint8Array {
  const pageContent = "BT /F1 10 Tf 0 0 Td (A) Tj ET\n";
  const pageContentLen = new TextEncoder().encode(pageContent).length;

  const imageEncoded = "FF0000>"; // ASCIIHexDecode: 1x1 RGB (red)
  const imageEncodedLen = new TextEncoder().encode(imageEncoded).length;

  const charProcStream = "q /GS1 gs 100 0 0 100 0 0 cm /Im1 Do Q\n";
  const charProcLen = new TextEncoder().encode(charProcStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 9 0 R >>",
    4:
      "<< /Type /Font /Subtype /Type3 /Name /F1 " +
      "/FontBBox [0 0 1000 1000] " +
      "/FontMatrix [0.01 0 0 0.01 0 0] " +
      "/CharProcs << /A 5 0 R >> " +
      "/Encoding << /Differences [65 /A] >> " +
      "/FirstChar 65 /LastChar 65 " +
      "/Widths [100] " +
      "/Resources << " +
      "/XObject << /Im1 6 0 R >> " +
      "/ExtGState << /GS1 << /ca 0.25 >> >> " +
      ">> >>",
    5: `<< /Length ${charProcLen} >>\nstream\n${charProcStream}endstream`,
    6:
      "<< /Type /XObject /Subtype /Image /Width 1 /Height 1 " +
      "/ColorSpace /DeviceRGB /BitsPerComponent 8 " +
      `/Filter /ASCIIHexDecode /Length ${imageEncodedLen} >>\nstream\n${imageEncoded}endstream`,
    9: `<< /Length ${pageContentLen} >>\nstream\n${pageContent}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 9];
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

describe("Type3 /Resources (native)", () => {
  it("resolves XObject and ExtGState referenced from CharProcs", async () => {
    const bytes = buildMinimalPdfWithType3ImageXObject();
    const doc = await parsePdfNative(bytes);
    const page = doc.pages[0]!;

    const images = page.elements.filter((e): e is PdfImage => e.type === "image");
    expect(images).toHaveLength(1);
    expect(images[0]!.width).toBe(1);
    expect(images[0]!.height).toBe(1);
    expect([...images[0]!.data]).toEqual([255, 0, 0]);
    expect(images[0]!.graphicsState.fillAlpha).toBeCloseTo(0.25);
  });
});
