/**
 * @file Type3 font /Resources /Shading support (native parser)
 */

import type { PdfImage } from "../../domain";
import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithType3Shading(): Uint8Array {
  const pageContent = "BT /F1 10 Tf 0 0 Td (A) Tj ET\n";
  const pageContentLen = new TextEncoder().encode(pageContent).length;

  // CharProc paints the current clip using `sh`. We clip to a 1x1 rect in glyph space,
  // then scale by 100 so with FontMatrix 0.01 and fontSize 10, the painted bbox is 10x10.
  const charProcStream = "q 100 0 0 100 0 0 cm 0 0 1 1 re W n /Sh1 sh Q\n";
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
      "/Shading << /Sh1 6 0 R >> " +
      ">> >>",
    5: `<< /Length ${charProcLen} >>\nstream\n${charProcStream}endstream`,
    6:
      "<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 1 0] " +
      "/Function 7 0 R /Extend [true true] >>",
    7: "<< /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [1 0 0] /N 1 >>",
    9: `<< /Length ${pageContentLen} >>\nstream\n${pageContent}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 9];
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

describe("Type3 /Resources /Shading (native)", () => {
  it("resolves shading resources referenced from CharProcs (sh operator)", async () => {
    const bytes = buildMinimalPdfWithType3Shading();
    const doc = await parsePdfNative(bytes, { shadingMaxSize: 10 });
    const page = doc.pages[0]!;

    const images = page.elements.filter((e): e is PdfImage => e.type === "image");
    expect(images).toHaveLength(1);

    const img = images[0]!;
    expect(img.width).toBe(10);
    expect(img.height).toBe(10);
    for (let i = 0; i < img.width * img.height; i += 1) {
      expect(img.data[i * 3]).toBe(255);
      expect(img.data[i * 3 + 1]).toBe(0);
      expect(img.data[i * 3 + 2]).toBe(0);
      expect(img.alpha?.[i]).toBe(255);
    }
    expect(img.graphicsState.ctm).toEqual([10, 0, 0, 10, 0, 0]);
  });
});
