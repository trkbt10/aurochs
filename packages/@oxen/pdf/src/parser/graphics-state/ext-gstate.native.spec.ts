/**
 * @file src/pdf/parser/ext-gstate.native.spec.ts
 */

import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithExtGState(args: {
  readonly ca: number;
  readonly CA: number;
  readonly BM?: string;
  readonly LW?: number;
  readonly LC?: 0 | 1 | 2;
  readonly LJ?: 0 | 1 | 2;
  readonly ML?: number;
  readonly D?: { readonly array: readonly number[]; readonly phase: number };
}): Uint8Array {
  const contentStream = "q /GS1 gs 0 0 10 10 re f Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;

  const dash = args.D ? `/D [ [${args.D.array.join(" ")}] ${args.D.phase} ] ` : "";
  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 5 0 R >>",
    4:
      `<< /Type /ExtGState /ca ${args.ca} /CA ${args.CA} ` +
      (args.BM ? `/BM /${args.BM} ` : "") +
      (args.LW != null ? `/LW ${args.LW} ` : "") +
      (args.LC != null ? `/LC ${args.LC} ` : "") +
      (args.LJ != null ? `/LJ ${args.LJ} ` : "") +
      (args.ML != null ? `/ML ${args.ML} ` : "") +
      dash +
      ">>",
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

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

function buildMinimalPdfWithSoftMaskExtGState(args: { readonly kind: "Alpha" | "Luminosity"; readonly value: number }): Uint8Array {
  const contentStream = "q /GS1 gs 0 0 10 10 re f /GS2 gs 20 0 10 10 re f Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;

  const { maskStreamContent, maskResources } = (() => {
    if (args.kind === "Alpha") {
      return {
        maskStreamContent: "q /GSalpha gs 0 0 100 100 re f Q\n",
        maskResources: "/Resources << /ExtGState << /GSalpha 8 0 R >> >> ",
      };
    }
    return {
      maskStreamContent: `q ${args.value} g 0 0 100 100 re f Q\n`,
      maskResources: "/Resources << >> ",
    };
  })();
  const maskStreamLength = new TextEncoder().encode(maskStreamContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R /GS2 5 0 R >> >> " +
      "/Contents 9 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 6 0 R >>`,
    5: `<< /Type /ExtGState /ca 1 /CA 1 /SMask /None >>`,
    6: `<< /S /${args.kind} /G 7 0 R >>`,
    7:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 100 100] ` +
      `/Group << /S /Transparency /CS /DeviceGray >> ` +
      maskResources +
      `/Length ${maskStreamLength} >>\n` +
      `stream\n${maskStreamContent}endstream`,
    8: `<< /Type /ExtGState /ca ${args.value} >>`,
    9: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
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

function buildMinimalPdfWithUnsupportedSoftMaskClears(args: { readonly maskAlpha: number }): Uint8Array {
  const contentStream = "q /GS1 gs 0 0 10 10 re f /GSbad gs 20 0 10 10 re f Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;

  const maskStreamContent = `q /GSalpha gs 0 0 100 100 re f Q\n`;
  const maskStreamLength = new TextEncoder().encode(maskStreamContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R /GSbad 5 0 R >> >> " +
      "/Contents 9 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 6 0 R >>`,
    5: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 10 0 R >>`,
    6: `<< /S /Alpha /G 7 0 R >>`,
    7:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 100 100] ` +
      `/Group << /S /Transparency /CS /DeviceGray >> ` +
      `/Resources << /ExtGState << /GSalpha 8 0 R >> >> ` +
      `/Length ${maskStreamLength} >>\n` +
      `stream\n${maskStreamContent}endstream`,
    8: `<< /Type /ExtGState /ca ${args.maskAlpha} >>`,
    9: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    10: `<< /S /Alpha /G 999 0 R >>`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMask(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 RGB image: left=black, right=white. Used as a luminosity soft mask.
  const imageStream = "000000FFFFFF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const maskFormContent = "q 2 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskIccBasedGray(args: {
  readonly fillRgb: readonly [number, number, number];
}): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 grayscale image: left=0, right=255, encoded as ICCBased (N=1).
  const imageStream = "00FF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const maskFormContent = "q 2 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const iccProfileStreamContent = "";
  const iccProfileLength = new TextEncoder().encode(iccProfileStreamContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace [ /ICCBased 8 0 R ] /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    8: `<< /N 1 /Length ${iccProfileLength} >>\nstream\n${iccProfileStreamContent}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskIndexed(args: {
  readonly fillRgb: readonly [number, number, number];
}): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 Indexed image: left=index0 (black), right=index1 (white).
  const imageStream = "0001>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const maskFormContent = "q 2 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace [ /Indexed /DeviceRGB 1 <000000FFFFFF> ] ` +
      `/Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskTwoImages(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // Two 2x1 RGB images:
  // - Im1: all black, painted into the left half of the /BBox
  // - Im2: all white, painted into the right half of the /BBox
  const imageStream1 = "000000000000>";
  const imageStream2 = "FFFFFFFFFFFF>";
  const imageLength1 = new TextEncoder().encode(imageStream1).length;
  const imageLength2 = new TextEncoder().encode(imageStream2).length;

  const maskFormContent =
    "q 1 0 0 1 0 0 cm /Im1 Do Q\n" +
    "q 1 0 0 1 1 0 cm /Im2 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R /Im2 8 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength1} >>\n` +
      `stream\n${imageStream1}\nendstream`,
    8:
      `<< /Type /XObject /Subtype /Image /Name /Im2 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength2} >>\n` +
      `stream\n${imageStream2}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskImageAndPath(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // Base 2x1 RGB image: all black (lum=0). Then we draw a white rect over the right half.
  const imageStream = "000000000000>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const maskFormContent =
    "q 2 0 0 1 0 0 cm /Im1 Do Q\n" +
    "1 1 1 rg 1 0 1 1 re f\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskPathsOnly(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // Mask Form fills left half with black and right half with white (paths only).
  const maskFormContent = "0 0 0 rg 0 0 1 1 re f 1 1 1 rg 1 0 1 1 re f\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskTextOnly(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // Text-only mask Form: draws a single glyph into the right pixel.
  // Default font metrics: 1-char width ≈ 0.5 * fontSize, height ≈ fontSize.
  const maskFormContent = "1 1 1 rg BT /F1 1 Tf 1 0 0 1 1 0.2 Tm (A) Tj ET\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /Font << /F1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskKnockout(args: {
  readonly fillRgb: readonly [number, number, number];
  readonly knockout: boolean;
}): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 1 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  const whiteImageStream = "FFFFFF>";
  const blackImageStream = "000000>";
  const alphaImageStream = "80>";
  const whiteLen = new TextEncoder().encode(whiteImageStream).length;
  const blackLen = new TextEncoder().encode(blackImageStream).length;
  const alphaLen = new TextEncoder().encode(alphaImageStream).length;

  const maskFormContent =
    "q 1 0 0 1 0 0 cm /Im1 Do Q\n" +
    "q 1 0 0 1 0 0 cm /Im2 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const groupDict = (() => {
    if (args.knockout) {
      return "/Group << /S /Transparency /CS /DeviceRGB /K true >> ";
    }
    return "/Group << /S /Transparency /CS /DeviceRGB >> ";
  })();

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 1 1] ` +
      groupDict +
      `/Resources << /XObject << /Im1 7 0 R /Im2 8 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 1 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${whiteLen} >>\n` +
      `stream\n${whiteImageStream}\nendstream`,
    8:
      `<< /Type /XObject /Subtype /Image /Name /Im2 /Width 1 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode ` +
      `/SMask 9 0 R /Length ${blackLen} >>\n` +
      `stream\n${blackImageStream}\nendstream`,
    9:
      `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode /Length ${alphaLen} >>\n` +
      `stream\n${alphaImageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskFlippedX(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 RGB image: left=black, right=white. Used as a luminosity soft mask.
  const imageStream = "000000FFFFFF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  // Flip X: scale -2 and translate +2 to cover [0..2] bbox.
  const maskFormContent = "q -2 0 0 1 2 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskPartialCoverage(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 RGB image: left=black, right=white. Used as a luminosity soft mask.
  const imageStream = "000000FFFFFF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  // Only cover [0..1] in X within the [0..2] bbox (half coverage).
  const maskFormContent = "q 1 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskBackdrop(args: {
  readonly fillRgb: readonly [number, number, number];
  readonly isolated: boolean;
  readonly backdropRgb: readonly [number, number, number];
}): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 RGB image: left=black, right=white. Used as a luminosity soft mask.
  const imageStream = "000000FFFFFF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  // Only cover [0..1] in X within the [0..2] bbox (half coverage).
  const maskFormContent = "q 1 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const [br, bg, bb] = args.backdropRgb;
  const groupDict = `/Group << /S /Transparency /CS /DeviceRGB /I ${args.isolated ? "true" : "false"} >> `;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R /BC [${br} ${bg} ${bb}] >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      groupDict +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskRotatedImage(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 2 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x2 grayscale-coded RGB image (row-major, top-to-bottom):
  // row0: [0, 255]
  // row1: [128, 64]
  const imageStream = "000000FFFFFF808080404040>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  // Rotate/shear: b and c non-zero, still covers bbox [0..2]x[0..2].
  const maskFormContent = "q 0 2 -2 0 2 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 2] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 2 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskScaled(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q 10 0 0 10 0 0 cm /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 RGB image: left=black, right=white. Used as a luminosity soft mask.
  const imageStream = "000000FFFFFF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const maskFormContent = "q 2 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskWithFormMatrix(args: {
  readonly fillRgb: readonly [number, number, number];
  readonly formMatrix: readonly [number, number, number, number, number, number];
  readonly drawRect: readonly [number, number, number, number];
}): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const [x, y, w, h] = args.drawRect;
  const [m0, m1, m2, m3, m4, m5] = args.formMatrix;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // 2x1 RGB image: left=black, right=white. Used as a luminosity soft mask.
  const imageStream = "000000FFFFFF>";
  const imageLength = new TextEncoder().encode(imageStream).length;

  const maskFormContent = "q 2 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Matrix [${m0} ${m1} ${m2} ${m3} ${m4} ${m5}] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode /Length ${imageLength} >>\n` +
      `stream\n${imageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 10];
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

function buildMinimalPdfWithPerPixelSoftMaskFromImageSMask(args: {
  readonly kind: "Alpha" | "Luminosity";
  readonly fillRgb: readonly [number, number, number];
  readonly alphaImageHex: string;
}): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // Base 2x1 RGB image: left=black, right=white.
  const baseImageStream = "000000FFFFFF>";
  const baseImageLength = new TextEncoder().encode(baseImageStream).length;

  // 2x1 Gray alpha image for the base image /SMask.
  const alphaImageStream = args.alphaImageHex;
  const alphaImageLength = new TextEncoder().encode(alphaImageStream).length;

  const maskFormContent = "q 2 0 0 1 0 0 cm /Im1 Do Q\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /${args.kind} /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Resources << /XObject << /Im1 7 0 R >> >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      `<< /Type /XObject /Subtype /Image /Name /Im1 /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode ` +
      `/SMask 8 0 R /Length ${baseImageLength} >>\n` +
      `stream\n${baseImageStream}\nendstream`,
    8:
      `<< /Type /XObject /Subtype /Image /Width 2 /Height 1 ` +
      `/BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /ASCIIHexDecode /Length ${alphaImageLength} >>\n` +
      `stream\n${alphaImageStream}\nendstream`,
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 10];
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

function buildMinimalPdfWithPerPixelLuminositySoftMaskShading(args: { readonly fillRgb: readonly [number, number, number] }): Uint8Array {
  const [r, g, b] = args.fillRgb;
  const contentStream = `q /GS1 gs ${r} ${g} ${b} rg 0 0 2 1 re f Q\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  // Shading-only mask Form: axial gradient black→white over the 2-wide bbox.
  const maskFormContent = "/Sh1 sh\n";
  const maskFormLength = new TextEncoder().encode(maskFormContent).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 10 0 R >>",
    4: `<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>`,
    5: `<< /S /Luminosity /G 6 0 R >>`,
    6:
      `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 2 1] ` +
      `/Resources << /Shading << /Sh1 7 0 R >> >> ` +
      `/Group << /S /Transparency /CS /DeviceRGB >> ` +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      "<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 2 0] " +
      "/Function 8 0 R /Extend [true true] >>",
    8: "<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0] /C1 [1 1 1] /N 1 >>",
    10: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 10];
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

describe("ExtGState alpha (native)", () => {
  it("applies /ca and /CA via gs operator to parsed elements", async () => {
    const bytes = buildMinimalPdfWithExtGState({ ca: 0.5, CA: 0.25 });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(1);
    const path = paths[0]!;
    if (path.type !== "path") {throw new Error("Expected path");}
    expect(path.graphicsState.fillAlpha).toBeCloseTo(0.5);
    expect(path.graphicsState.strokeAlpha).toBeCloseTo(0.25);
  });

  it("applies /LW /LC /LJ /ML /D via gs operator to parsed elements", async () => {
    const bytes = buildMinimalPdfWithExtGState({
      ca: 1,
      CA: 1,
      LW: 3,
      LC: 2,
      LJ: 1,
      ML: 7,
      D: { array: [2, 1], phase: 0 },
    });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(1);
    const path = paths[0]!;
    if (path.type !== "path") {throw new Error("Expected path");}
    expect(path.graphicsState.lineWidth).toBeCloseTo(3);
    expect(path.graphicsState.lineCap).toBe(2);
    expect(path.graphicsState.lineJoin).toBe(1);
    expect(path.graphicsState.miterLimit).toBeCloseTo(7);
    expect(path.graphicsState.dashArray).toEqual([2, 1]);
    expect(path.graphicsState.dashPhase).toBeCloseTo(0);
  });

  it("extracts /BM and applies it via gs operator", async () => {
    const bytes = buildMinimalPdfWithExtGState({ ca: 1, CA: 1, BM: "Multiply" });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(1);
    const path = paths[0]!;
    if (path.type !== "path") {throw new Error("Expected path");}
    expect(path.graphicsState.blendMode).toBe("Multiply");
  });

  it("extracts a constant /SMask (Alpha) and applies it via gs operator", async () => {
    const bytes = buildMinimalPdfWithSoftMaskExtGState({ kind: "Alpha", value: 0.25 });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(2);
    const p1 = paths[0]!;
    const p2 = paths[1]!;
    if (p1.type !== "path" || p2.type !== "path") {throw new Error("Expected paths");}

    expect(p1.graphicsState.softMaskAlpha).toBeCloseTo(0.25);
    expect(p2.graphicsState.softMaskAlpha).toBeCloseTo(1);
  });

  it("extracts a constant /SMask (Luminosity) and applies it via gs operator", async () => {
    const bytes = buildMinimalPdfWithSoftMaskExtGState({ kind: "Luminosity", value: 0.3 });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(2);
    const p1 = paths[0]!;
    if (p1.type !== "path") {throw new Error("Expected path");}
    expect(p1.graphicsState.softMaskAlpha).toBeCloseTo(0.3);
  });

  it("clears the previous /SMask when a new /SMask is present but unsupported", async () => {
    const bytes = buildMinimalPdfWithUnsupportedSoftMaskClears({ maskAlpha: 0.25 });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(2);
    const p1 = paths[0]!;
    const p2 = paths[1]!;
    if (p1.type !== "path" || p2.type !== "path") {throw new Error("Expected paths");}

    expect(p1.graphicsState.softMaskAlpha).toBeCloseTo(0.25);
    expect(p2.graphicsState.softMaskAlpha).toBeCloseTo(1);
  });

  it("evaluates a non-constant /SMask (Luminosity) based on a mask image and preserves it via rasterization", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMask({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) for ICCBased (N=1) mask images", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskIccBasedGray({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) for /Indexed mask images", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskIndexed({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) when the mask Form draws a shading fill (sh)", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskShading({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes, { shadingMaxSize: 2 });
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    // Axial gradient sampled at pixel centers (x=0.5, 1.5) → t=0.25, 0.75 → lum=64, 191.
    expect(Array.from(image.alpha ?? [])).toEqual([64, 191]);
  });

  it("evaluates a non-constant /SMask (Luminosity) when the mask Form draws multiple images", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskTwoImages({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    // Left half is painted by black Im1 (lum=0), right half by white Im2 (lum=255).
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) when the mask Form draws images and paths", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskImageAndPath({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    // Left pixel is black image (lum=0). Right pixel is overwritten by white rect (lum=255).
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) for paths-only mask Forms when softMaskVectorMaxSize is enabled", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskPathsOnly({ fillRgb: [1, 0, 0] as const });

    const without = await parsePdfNative(bytes);
    const pathsWithout = without.pages[0]!.elements.filter((e) => e.type === "path");
    const imagesWithout = without.pages[0]!.elements.filter((e) => e.type === "image");
    expect(pathsWithout.length).toBeGreaterThan(0);
    expect(imagesWithout).toHaveLength(0);

    const withOpt = await parsePdfNative(bytes, { softMaskVectorMaxSize: 2 });
    const images = withOpt.pages[0]!.elements.filter((e) => e.type === "image");
    const texts = withOpt.pages[0]!.elements.filter((e) => e.type === "text");
    expect(texts).toHaveLength(0);
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) for text-only mask Forms when softMaskVectorMaxSize is enabled", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskTextOnly({ fillRgb: [1, 0, 0] as const });

    const without = await parsePdfNative(bytes);
    const pathsWithout = without.pages[0]!.elements.filter((e) => e.type === "path");
    const imagesWithout = without.pages[0]!.elements.filter((e) => e.type === "image");
    expect(pathsWithout.length).toBeGreaterThan(0);
    expect(imagesWithout).toHaveLength(0);

    const withOpt = await parsePdfNative(bytes, { softMaskVectorMaxSize: 2 });
    const images = withOpt.pages[0]!.elements.filter((e) => e.type === "image");
    const texts = withOpt.pages[0]!.elements.filter((e) => e.type === "text");
    expect(texts).toHaveLength(0);
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("honors mask group /K (Knockout) when compositing per-pixel /Luminosity masks", async () => {
    const noK = buildMinimalPdfWithPerPixelLuminositySoftMaskKnockout({ fillRgb: [1, 0, 0] as const, knockout: false });
    const withK = buildMinimalPdfWithPerPixelLuminositySoftMaskKnockout({ fillRgb: [1, 0, 0] as const, knockout: true });

    const docNoK = await parsePdfNative(noK);
    const imagesNoK = docNoK.pages[0]!.elements.filter((e) => e.type === "image");
    expect(imagesNoK).toHaveLength(1);
    const imgNoK = imagesNoK[0]!;
    if (imgNoK.type !== "image") {throw new Error("Expected image");}
    expect(Array.from(imgNoK.alpha ?? [])).toEqual([127]);

    const docWithK = await parsePdfNative(withK);
    const imagesWithK = docWithK.pages[0]!.elements.filter((e) => e.type === "image");
    expect(imagesWithK).toHaveLength(1);
    const imgWithK = imagesWithK[0]!;
    if (imgWithK.type !== "image") {throw new Error("Expected image");}
    expect(Array.from(imgWithK.alpha ?? [])).toEqual([0]);
  });

  it("evaluates a non-constant /SMask (Luminosity) when the mask image is flipped horizontally in the mask Form", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskFlippedX({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    // Base mask image is [black, white] but flipped X, so alpha becomes [255, 0].
    expect(Array.from(image.alpha ?? [])).toEqual([255, 0]);
  });

  it("evaluates a non-constant /SMask (Luminosity) when the mask image does not cover the full /BBox", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskPartialCoverage({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    // With identity image placement, the unit-square image covers only the left half of the 2-wide bbox.
    expect(Array.from(image.alpha ?? [])).toEqual([255, 0]);
  });

  it("honors transparency group /I and soft mask /BC when evaluating per-pixel /SMask (Luminosity)", async () => {
    const backdrop = [0.5, 0.5, 0.5] as const;
    const isolated = buildMinimalPdfWithPerPixelLuminositySoftMaskBackdrop({
      fillRgb: [1, 0, 0] as const,
      isolated: true,
      backdropRgb: backdrop,
    });
    const nonIsolated = buildMinimalPdfWithPerPixelLuminositySoftMaskBackdrop({
      fillRgb: [1, 0, 0] as const,
      isolated: false,
      backdropRgb: backdrop,
    });

    const docIso = await parsePdfNative(isolated);
    const imgIso = docIso.pages[0]!.elements.find((e) => e.type === "image");
    if (!imgIso || imgIso.type !== "image") {throw new Error("Expected image");}
    expect(Array.from(imgIso.alpha ?? [])).toEqual([255, 0]);

    const docNon = await parsePdfNative(nonIsolated);
    const imgNon = docNon.pages[0]!.elements.find((e) => e.type === "image");
    if (!imgNon || imgNon.type !== "image") {throw new Error("Expected image");}
    // Unpainted pixels use /BC (0.5 gray) when the group is non-isolated.
    expect(Array.from(imgNon.alpha ?? [])).toEqual([255, 128]);
  });

  it("evaluates a non-constant /SMask (Luminosity) for a non-axis-aligned mask image placement matrix", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskRotatedImage({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    // Expected sampling pattern for the chosen matrix and 2x2 image:
    // output row0: src (1,0)=255, (1,1)=64
    // output row1: src (0,0)=0, (0,1)=128
    expect(Array.from(image.alpha ?? [])).toEqual([255, 64, 0, 128]);
  });

  it("evaluates a non-constant /SMask (Luminosity) under a non-identity CTM and preserves placement via rasterization", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskScaled({ fillRgb: [1, 0, 0] as const });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.graphicsState.ctm).toEqual([20, 0, 0, 10, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("honors the /Matrix on the /SMask /G Form XObject", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskWithFormMatrix({
      fillRgb: [1, 0, 0] as const,
      formMatrix: [10, 0, 0, 10, 0, 0] as const,
      drawRect: [0, 0, 20, 10] as const,
    });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.graphicsState.ctm).toEqual([20, 0, 0, 10, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Alpha) from the mask image's own /SMask and preserves it via rasterization", async () => {
    const bytes = buildMinimalPdfWithPerPixelSoftMaskFromImageSMask({
      kind: "Alpha",
      fillRgb: [1, 0, 0] as const,
      alphaImageHex: "00FF>",
    });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 255]);
  });

  it("evaluates a non-constant /SMask (Luminosity) and multiplies by the mask image alpha (/SMask)", async () => {
    const bytes = buildMinimalPdfWithPerPixelSoftMaskFromImageSMask({
      kind: "Luminosity",
      fillRgb: [1, 0, 0] as const,
      alphaImageHex: "FF80>",
    });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);
    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0, 255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([0, 128]);
  });
});
