/**
 * @file src/pdf/parser/form-bbox-clip-mask.native.spec.ts
 */

import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithShearedFormBBoxClip(): Uint8Array {
  const formContent = "1 0 0 rg 0 0 30 30 re f\n";
  const formLength = new TextEncoder().encode(formContent).length;

  const pageContent = "q /Fm1 Do Q\n";
  const pageLength = new TextEncoder().encode(pageContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /XObject << /Fm1 4 0 R >> >> " +
      "/Contents 5 0 R >>",
    4:
      "<< /Type /XObject /Subtype /Form /FormType 1 " +
      "/BBox [0 0 10 10] " +
      "/Matrix [1 1 0 1 0 0] " +
      "/Resources << >> " +
      `/Length ${formLength} >>\n` +
      `stream\n${formContent}endstream`,
    5: `<< /Length ${pageLength} >>\nstream\n${pageContent}endstream`,
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

describe("Form /BBox clipping (per-pixel mask, native)", () => {
  it("applies Form /BBox clipping under a non-axis-aligned Form /Matrix when clipPathMaxSize is enabled", async () => {
    const bytes = buildMinimalPdfWithShearedFormBBoxClip();
    const doc = await parsePdfNative(bytes, { clipPathMaxSize: 20 });
    expect(doc.pages).toHaveLength(1);

    const page = doc.pages[0]!;
    const images = page.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    // Form /BBox [0..10] under /Matrix [1 1 0 1 0 0] yields a page-space parallelogram.
    // The AABB is [0..10]x[0..20], so with maxSize=20 we get a 10x20 grid.
    expect(image.width).toBe(10);
    expect(image.height).toBe(20);
    expect(image.graphicsState.clipMask).toBeUndefined();

    const alphaAt = (x: number, y: number): number => (image.alpha ?? new Uint8Array())[y * image.width + x] ?? 0;
    // Top-left corner (x≈0.5, y≈9.5) is outside the sheared bbox → transparent.
    expect(alphaAt(0, 0)).toBe(0);
    // Bottom-left interior (x≈0.5, y≈1.5) is inside → opaque.
    expect(alphaAt(0, 18)).toBe(255);
    // Bottom-right interior (x≈9.5, y≈1.5) is outside → transparent.
    expect(alphaAt(9, 18)).toBe(0);
  });
});
