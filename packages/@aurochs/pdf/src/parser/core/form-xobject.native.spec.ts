/**
 * @file src/pdf/parser/form-xobject.native.spec.ts
 */

import { parsePdfNative } from "./pdf-parser.native";

function buildMinimalPdfWithFormXObject(): Uint8Array {
  const formStream = "0 0 1 1 re f\n";
  const formLength = new TextEncoder().encode(formStream).length;

  const pageStream = "q 10 0 0 10 100 50 cm /Fm1 Do Q\n";
  const pageLength = new TextEncoder().encode(pageStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] " +
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

describe("Form XObject (native)", () => {
  it("parses paths inside /Subtype /Form XObjects with current CTM applied", async () => {
    const bytes = buildMinimalPdfWithFormXObject();
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(1);

    const path = paths[0]!;
    if (path.type !== "path") {throw new Error("Expected path");}

    const ops = path.operations;
    expect(ops[0]?.type).toBe("moveTo");
    if (ops[0]?.type !== "moveTo") {throw new Error("Expected moveTo");}
    expect(ops[0].point.x).toBeCloseTo(100);
    expect(ops[0].point.y).toBeCloseTo(50);

    expect(ops[1]?.type).toBe("lineTo");
    if (ops[1]?.type !== "lineTo") {throw new Error("Expected lineTo");}
    expect(ops[1].point.x).toBeCloseTo(110);
    expect(ops[1].point.y).toBeCloseTo(50);
  });

  it("extracts images referenced inside Form XObjects using the Form /Resources", async () => {
    const formStream = "q 1 0 0 1 0 0 cm /Im1 Do Q\n";
    const formLength = new TextEncoder().encode(formStream).length;

    // 1x1 DeviceRGB pixel: red (0xFF,0x00,0x00)
    const imageHex = "FF0000>";
    const imageLength = new TextEncoder().encode(imageHex).length;

    const pageStream = "q 2 0 0 2 10 20 cm /Fm1 Do Q\n";
    const pageLength = new TextEncoder().encode(pageStream).length;

    const objects: Record<number, string> = {
      1: "<< /Type /Catalog /Pages 2 0 R >>",
      2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      3:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] " +
        "/Resources << /XObject << /Fm1 4 0 R >> >> " +
        "/Contents 5 0 R >>",
      4:
        `<< /Type /XObject /Subtype /Form /BBox [0 0 1 1] /Resources 7 0 R /Length ${formLength} >>\n` +
        `stream\n${formStream}endstream`,
      5: `<< /Length ${pageLength} >>\nstream\n${pageStream}endstream`,
      6:
        `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /BitsPerComponent 8 ` +
        `/ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
        `stream\n${imageHex}\nendstream`,
      7: "<< /XObject << /Im1 6 0 R >> >>",
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

    const pdfText = parts.join("") + xrefLines.join("") + trailer;
    const bytes = new TextEncoder().encode(pdfText);

    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);

    const img = images[0]!;
    if (img.type !== "image") {throw new Error("Expected image");}
    expect(img.width).toBe(1);
    expect(img.height).toBe(1);
    expect(Array.from(img.data)).toEqual([255, 0, 0]);
    expect(img.graphicsState.ctm).toEqual([2, 0, 0, 2, 10, 20]);
  });
});
