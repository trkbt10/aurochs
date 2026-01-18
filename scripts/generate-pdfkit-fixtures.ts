#!/usr/bin/env bun
import * as fs from "node:fs";
import * as path from "node:path";
import PDFDocument from "pdfkit";
import { PNG } from "pngjs";

export const DEFAULT_PDFKIT_FIXTURE_DIR = path.resolve("spec", "fixtures", "pdfkit");

export type GeneratePdfkitFixturesOptions = Readonly<{
  readonly outputDir: string;
  readonly log?: boolean;
}>;

type FixtureWriter = Readonly<{
  readonly fileName: string;
  readonly generate: () => Promise<Buffer>;
}>;

const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

type PdfKitDocument = PDFKit.PDFDocument;
type PdfKitDocumentInfo = PDFKit.DocumentInfo;

function parseArgs(argv: readonly string[]): GeneratePdfkitFixturesOptions {
  const args = [...argv];
  let outputDir: string | null = null;
  let log: boolean | undefined;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) break;

    if (arg === "--outputDir") {
      const value = args.shift();
      if (!value) throw new Error("--outputDir requires a value");
      outputDir = value;
      continue;
    }
    if (arg === "--log") {
      log = true;
      continue;
    }
    if (arg === "--no-log") {
      log = false;
      continue;
    }

    throw new Error(`Unknown arg: ${arg}`);
  }

  if (!outputDir) {
    throw new Error("Missing required --outputDir. Example: bun run scripts/generate-pdfkit-fixtures.ts --outputDir spec/fixtures/pdfkit");
  }

  return { outputDir, log };
}

function renderPdf(options: { readonly info: PdfKitDocumentInfo; readonly build: (doc: PdfKitDocument) => void }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc: PdfKitDocument = new PDFDocument({
      autoFirstPage: false,
      // Keep byte output stable across runtimes (Node vs Bun). Compressed streams can differ
      // even when logical content is identical.
      compress: false,
      info: options.info,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    options.build(doc);
    doc.end();
  });
}

function create2x2PngBuffer(): Buffer {
  const png = new PNG({ width: 2, height: 2 });
  const d = png.data;
  // RGBA pixels: (0,0) red, (1,0) green, (0,1) blue, (1,1) white.
  d[0] = 255;
  d[1] = 0;
  d[2] = 0;
  d[3] = 255;
  d[4] = 0;
  d[5] = 255;
  d[6] = 0;
  d[7] = 255;
  d[8] = 0;
  d[9] = 0;
  d[10] = 255;
  d[11] = 255;
  d[12] = 255;
  d[13] = 255;
  d[14] = 255;
  d[15] = 255;
  return PNG.sync.write(png);
}

const FIXTURES: readonly FixtureWriter[] = [
  {
    fileName: "pdfkit-basic.pdf",
    generate: async () =>
      renderPdf({
        info: {
          Title: "pdfkit-basic",
          Creator: "web-pptx",
          Producer: "web-pptx pdfkit fixtures",
          CreationDate: FIXED_DATE,
          ModDate: FIXED_DATE,
        },
        build: (doc) => {
        doc.addPage({ size: [300, 200], margin: 0 });
        doc.rect(20, 20, 80, 50).stroke();
        doc.fontSize(18).text("Hello PDFKit", 20, 90);
        doc.fontSize(14).text("Café résumé naïve", 20, 120);
        },
      }),
  },
  {
    fileName: "pdfkit-multipage.pdf",
    generate: async () =>
      renderPdf({
        info: {
          Title: "pdfkit-multipage",
          Creator: "web-pptx",
          Producer: "web-pptx pdfkit fixtures",
          CreationDate: FIXED_DATE,
          ModDate: FIXED_DATE,
        },
        build: (doc) => {
        for (let i = 1; i <= 3; i += 1) {
          doc.addPage({ size: [300, 200], margin: 0 });
          doc.fontSize(18).text(`Page ${i}`, 20, 20);
          doc.moveTo(20, 60).lineTo(280, 60).stroke();
        }
        },
      }),
  },
  {
    fileName: "pdfkit-image.pdf",
    generate: async () =>
      renderPdf({
        info: {
          Title: "pdfkit-image",
          Creator: "web-pptx",
          Producer: "web-pptx pdfkit fixtures",
          CreationDate: FIXED_DATE,
          ModDate: FIXED_DATE,
        },
        build: (doc) => {
        doc.addPage({ size: [300, 200], margin: 0 });
        const png = create2x2PngBuffer();
        doc.image(png, 20, 20, { width: 80, height: 80 });
        doc.fontSize(14).text("PNG image above", 20, 120);
        },
      }),
  },
  {
    fileName: "pdfkit-clipping.pdf",
    generate: async () =>
      renderPdf({
        info: {
          Title: "pdfkit-clipping",
          Creator: "web-pptx",
          Producer: "web-pptx pdfkit fixtures",
          CreationDate: FIXED_DATE,
          ModDate: FIXED_DATE,
        },
        build: (doc) => {
          doc.addPage({ size: [300, 200], margin: 0 });
          const png = create2x2PngBuffer();

          doc.save();
          doc.moveTo(20, 20).lineTo(100, 20).lineTo(20, 100).closePath().clip();
          doc.image(png, 20, 20, { width: 80, height: 80 });
          doc.restore();

          doc.fontSize(14).text("Clipped image above", 20, 120);
        },
      }),
  },
  {
    fileName: "pdfkit-alpha-blend.pdf",
    generate: async () =>
      renderPdf({
        info: {
          Title: "pdfkit-alpha-blend",
          Creator: "web-pptx",
          Producer: "web-pptx pdfkit fixtures",
          CreationDate: FIXED_DATE,
          ModDate: FIXED_DATE,
        },
        build: (doc) => {
          doc.addPage({ size: [300, 200], margin: 0 });

          // Base rectangle (no transparency).
          doc.save();
          doc.fillColor("00ff00");
          doc.rect(20, 20, 80, 80).fill();
          doc.restore();

          // Custom ExtGState with both alpha and blend mode.
          // PDFKit doesn't expose blend modes directly, but we can register an ExtGState resource.
          const gstate = doc.ref({ Type: "ExtGState", ca: 0.5, CA: 0.5, BM: "Multiply" });
          gstate.end();
          doc.page.ext_gstates.GsBlend1 = gstate;

          doc.save();
          doc.addContent("/GsBlend1 gs");
          doc.fillColor("ff0000");
          doc.rect(60, 60, 80, 80).fill();
          doc.restore();

          doc.fontSize(14).text("Alpha+Blend (Multiply) rects above", 20, 120);
        },
      }),
  },
];

export async function generatePdfkitFixtures(
  options: GeneratePdfkitFixturesOptions,
): Promise<readonly string[]> {
  if (!options) throw new Error("options is required");
  if (!options.outputDir) throw new Error("options.outputDir is required");

  fs.mkdirSync(options.outputDir, { recursive: true });

  const generated: string[] = [];
  for (const fixture of FIXTURES) {
    const bytes = await fixture.generate();
    const filePath = path.join(options.outputDir, fixture.fileName);
    fs.writeFileSync(filePath, bytes);
    generated.push(filePath);
    if (options.log ?? true) {
      console.log(`Generated: ${fixture.fileName}`);
    }
  }

  return generated;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await generatePdfkitFixtures(options);
  console.log("All pdfkit fixtures generated!");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
