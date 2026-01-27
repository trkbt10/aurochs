/**
 * @file src/pdf/parser/shading-fill.native.spec.ts
 */

import { parsePdf } from "../core/pdf-parser";

function buildMinimalPdfWithAxialShading(args: {
  readonly content: string;
  readonly shadingDict: string;
}): Uint8Array {
  const contentStream = `${args.content}\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /Shading << /Sh1 5 0 R >> >> " +
      "/Contents 4 0 R >>",
    4: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    5: args.shadingDict,
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

function rgbAt(image: { data: Uint8Array; width: number }, row: number, col: number): readonly [number, number, number] {
  const idx = row * image.width + col;
  const o = idx * 3;
  return [image.data[o] ?? 0, image.data[o + 1] ?? 0, image.data[o + 2] ?? 0] as const;
}

describe("shading fill (native)", () => {
  it("rasterizes axial shading via `sh` when shadingMaxSize>0", async () => {
    const bytes = buildMinimalPdfWithAxialShading({
      content: "q /Sh1 sh Q",
      shadingDict:
        "<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 100 0] " +
        "/Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> " +
        "/Extend [true true] >>",
    });

    const doc = await parsePdf(bytes, { shadingMaxSize: 10 });
    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}
    expect(image.width).toBe(10);
    expect(image.height).toBe(10);

    expect(rgbAt(image, 0, 0)).toEqual([242, 0, 13]); // x≈5%: mostly red
    expect(rgbAt(image, 0, 9)).toEqual([13, 0, 242]); // x≈95%: mostly blue

    expect(image.alpha?.[0]).toBe(255);
    expect(image.alpha?.[image.alpha.length - 1]).toBe(255);
  });

  it("respects /Extend when disabled (out-of-range pixels become transparent)", async () => {
    const bytes = buildMinimalPdfWithAxialShading({
      content: "q /Sh1 sh Q",
      shadingDict:
        "<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [25 0 75 0] " +
        "/Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> " +
        "/Extend [false false] >>",
    });

    const doc = await parsePdf(bytes, { shadingMaxSize: 10 });
    const image = doc.pages[0]!.elements.find((e) => e.type === "image");
    if (!image || image.type !== "image") {throw new Error("Expected image");}

    // Left edge (x≈5) is before x0=25 and ExtendStart=false → unpainted.
    expect(image.alpha?.[0]).toBe(0);
  });

  it("accounts for current CTM when evaluating shading coordinates", async () => {
    const bytes = buildMinimalPdfWithAxialShading({
      content: "q 2 0 0 2 0 0 cm /Sh1 sh Q",
      shadingDict:
        "<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 100 0] " +
        "/Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> " +
        "/Extend [true true] >>",
    });

    const doc = await parsePdf(bytes, { shadingMaxSize: 10 });
    const image = doc.pages[0]!.elements.find((e) => e.type === "image");
    if (!image || image.type !== "image") {throw new Error("Expected image");}

    // With CTM scale=2, page x≈95 maps to user x≈47.5 → t≈0.475 (purple-ish).
    expect(rgbAt(image, 0, 9)).toEqual([134, 0, 121]);
  });
});
