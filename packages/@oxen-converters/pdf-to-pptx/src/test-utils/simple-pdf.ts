export type SimplePdfPageSpec = Readonly<{
  readonly width: number;
  readonly height: number;
  /**
   * Content stream operators (PDF content stream syntax).
   * Leave empty/undefined to create a blank page.
   */
  readonly content?: string;
  /**
   * When true, adds a simple /F1 Helvetica font to Resources so text operators work.
   */
  readonly includeHelvetica?: boolean;
}>;

export type SimplePdfInfoSpec = Readonly<{
  readonly title?: string;
  readonly creator?: string;
  readonly producer?: string;
  readonly creationDate?: string;
  readonly modDate?: string;
}>;

function formatPdfStringLiteral(value: string): string {
  // Minimal escaping sufficient for our fixtures/tests.
  return `(${value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")})`;
}

function formatPdfDate(date: string): string {
  // Caller should pass a PDF date string like "D:20000101000000Z" or already-formatted.
  return date.startsWith("D:") ? date : `D:${date}`;
}

function makeInfoDict(info: SimplePdfInfoSpec | undefined): string {
  if (!info) {return "<< >>";}
  const entries: string[] = [];
  if (info.title) {entries.push(`/Title ${formatPdfStringLiteral(info.title)}`);}
  if (info.creator) {entries.push(`/Creator ${formatPdfStringLiteral(info.creator)}`);}
  if (info.producer) {entries.push(`/Producer ${formatPdfStringLiteral(info.producer)}`);}
  if (info.creationDate) {entries.push(`/CreationDate ${formatPdfStringLiteral(formatPdfDate(info.creationDate))}`);}
  if (info.modDate) {entries.push(`/ModDate ${formatPdfStringLiteral(formatPdfDate(info.modDate))}`);}
  return `<< ${entries.join(" ")} >>`;
}

function encodeAscii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function buildXrefAndTrailer(args: {
  readonly objectOffsets: ReadonlyArray<number | undefined>;
  readonly rootObjNum: number;
  readonly infoObjNum?: number;
  readonly xrefStart: number;
}): string {
  const size = args.objectOffsets.length;
  const lines: string[] = [];
  lines.push("xref\n");
  lines.push(`0 ${size}\n`);
  lines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = args.objectOffsets[i] ?? 0;
    lines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  const trailerParts = [`/Size ${size}`, `/Root ${args.rootObjNum} 0 R`];
  if (args.infoObjNum) {trailerParts.push(`/Info ${args.infoObjNum} 0 R`);}
  lines.push(`trailer\n<< ${trailerParts.join(" ")} >>\n`);
  lines.push(`startxref\n${args.xrefStart}\n%%EOF\n`);
  return lines.join("");
}

/**
 * Build a minimal PDF (xref table) sufficient for parser/importer tests.
 */
export function buildSimplePdfBytes(args: {
  readonly pages: readonly SimplePdfPageSpec[];
  readonly info?: SimplePdfInfoSpec;
}): Uint8Array {
  if (!args) {throw new Error("args is required");}
  if (!args.pages) {throw new Error("args.pages is required");}
  if (args.pages.length === 0) {throw new Error("args.pages must not be empty");}

  const header = "%PDF-1.4\n";
  const parts: string[] = [header];
  const offsets: number[] = [];
  offsets[0] = 0;

  const objects: Array<{ objNum: number; body: string }> = [];

  const CATALOG = 1;
  const PAGES = 2;
  const INFO = 3;

  // Reserve: catalog/pages/info
  objects.push({ objNum: CATALOG, body: `<< /Type /Catalog /Pages ${PAGES} 0 R >>` });
  objects.push({ objNum: INFO, body: makeInfoDict(args.info) });

  // Optional shared Helvetica font.
  const includeHelvetica = args.pages.some((p) => p.includeHelvetica);
  const HELVETICA_FONT = includeHelvetica ? 4 : null;
  if (HELVETICA_FONT) {
    objects.push({
      objNum: HELVETICA_FONT,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    });
  }

  // Page objects + content streams.
  const pageObjNums: number[] = [];
  const nextObjNum = { value: (HELVETICA_FONT ? HELVETICA_FONT + 1 : INFO + 1) };

  for (const page of args.pages) {
    const pageObjNum = nextObjNum.value;
    nextObjNum.value += 1;
    const contentObjNum = nextObjNum.value;
    nextObjNum.value += 1;
    pageObjNums.push(pageObjNum);

    const content = page.content ?? "";
    const contentBytes = encodeAscii(content);
    const contentLen = contentBytes.length;
    const contentStream =
      `<< /Length ${contentLen} >>\n` +
      `stream\n` +
      `${content}\n` +
      `endstream`;

    objects.push({ objNum: contentObjNum, body: contentStream });

    const resourcesParts: string[] = [];
    if (page.includeHelvetica && HELVETICA_FONT) {
      resourcesParts.push(`/Font << /F1 ${HELVETICA_FONT} 0 R >>`);
    }
    const resources = resourcesParts.length > 0 ? ` /Resources << ${resourcesParts.join(" ")} >>` : "";

    const pageDict =
      `<< /Type /Page /Parent ${PAGES} 0 R ` +
      `/MediaBox [0 0 ${page.width} ${page.height}]` +
      `${resources} ` +
      `/Contents ${contentObjNum} 0 R >>`;

    objects.push({ objNum: pageObjNum, body: pageDict });
  }

  // Pages tree
  const kids = pageObjNums.map((n) => `${n} 0 R`).join(" ");
  objects.push({ objNum: PAGES, body: `<< /Type /Pages /Kids [${kids}] /Count ${pageObjNums.length} >>` });

  // Write objects in objNum order.
  objects.sort((a, b) => a.objNum - b.objNum);

  const cursor = { value: header.length };
  for (const { objNum, body } of objects) {
    offsets[objNum] = cursor.value;
    const objText = `${objNum} 0 obj\n${body}\nendobj\n`;
    parts.push(objText);
    cursor.value += objText.length;
  }

  const xrefStart = cursor.value;
  const maxObjNum = Math.max(...objects.map((o) => o.objNum));
  const objectOffsets: Array<number | undefined> = new Array(maxObjNum + 1);
  for (let i = 0; i <= maxObjNum; i += 1) {objectOffsets[i] = offsets[i];}

  parts.push(
    buildXrefAndTrailer({
      objectOffsets,
      rootObjNum: CATALOG,
      infoObjNum: INFO,
      xrefStart,
    }),
  );

  return encodeAscii(parts.join(""));
}

