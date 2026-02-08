/**
 * @file Type3 `/Resources /Font` support (native)
 */

import { parsePdf } from "../core/pdf-parser";

function buildPdfWithType3CharProcUsingFontResource(): Uint8Array {
  const pageContent = "BT /F1 12 Tf 10 10 Td (A) Tj ET\n";
  const pageContentLength = new TextEncoder().encode(pageContent).length;

  // The CharProc emits a WinAnsi-encoded byte 0x80 (Euro sign) using a font
  // defined in the Type3 font's `/Resources /Font`.
  const charProc = "500 0 d0 BT /F2 1 Tf 0 0 Td <80> Tj ET\n";
  const charProcLength = new TextEncoder().encode(charProc).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /Font << /F1 5 0 R >> >> " +
      "/Contents 4 0 R >>",
    4: `<< /Length ${pageContentLength} >>\nstream\n${pageContent}endstream`,
    5:
      "<< /Type /Font /Subtype /Type3 " +
      "/FontBBox [0 0 1000 1000] " +
      "/FontMatrix [0.001 0 0 0.001 0 0] " +
      "/CharProcs << /A 6 0 R >> " +
      "/Encoding << /Type /Encoding /Differences [65 /A] >> " +
      "/FirstChar 65 /LastChar 65 /Widths [500] " +
      "/Resources << /Font << /F2 7 0 R >> >> " +
      ">>",
    6: `<< /Length ${charProcLength} >>\nstream\n${charProc}endstream`,
    7: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7];
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

describe("Type3 /Resources /Font (native)", () => {
  it("decodes Type3 CharProc text using Type3 font's resource-local font mapping", async () => {
    const pdfBytes = buildPdfWithType3CharProcUsingFontResource();
    const doc = await parsePdf(pdfBytes);
    const texts = doc.pages.flatMap((p) => p.elements.filter((e) => e.type === "text"));
    expect(texts.some((t) => t.text.includes("€"))).toBe(true);
  });
});
