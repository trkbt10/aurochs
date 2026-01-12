#!/usr/bin/env bun
import * as fs from "node:fs";
import * as path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const DEFAULT_PDF_FIXTURE_DIR = path.resolve("spec", "fixtures", "pdf");

export type GeneratePdfFixturesOptions = {
  readonly outputDir: string;
  readonly log?: boolean;
};

type FixtureWriter = {
  readonly fileName: string;
  readonly generate: (options: { readonly outputDir: string }) => Promise<void>;
};

const PAGE_SIZE_LETTER: readonly [number, number] = [612, 792];
const FIXED_METADATA_DATE = new Date("2000-01-01T00:00:00.000Z");

const FIXTURES: readonly FixtureWriter[] = [
  { fileName: "simple-rect.pdf", generate: generateSimpleRect },
  { fileName: "bezier-curves.pdf", generate: generateBezierCurves },
  { fileName: "colored-shapes.pdf", generate: generateColoredShapes },
  { fileName: "text-content.pdf", generate: generateTextContent },
  { fileName: "multi-page.pdf", generate: generateMultiPage },
  { fileName: "mixed-content.pdf", generate: generateMixedContent },
];

export async function generatePdfFixtures(
  options: GeneratePdfFixturesOptions,
): Promise<readonly string[]> {
  fs.mkdirSync(options.outputDir, { recursive: true });

  const generated: string[] = [];

  for (const fixture of FIXTURES) {
    await fixture.generate({ outputDir: options.outputDir });
    generated.push(path.join(options.outputDir, fixture.fileName));
    if (options.log ?? true) {
      console.log(`Generated: ${fixture.fileName}`);
    }
  }

  return generated;
}

async function writePdf(outputDir: string, fileName: string, doc: PDFDocument): Promise<void> {
  doc.setTitle(fileName);
  doc.setCreator("web-pptx");
  doc.setProducer("web-pptx pdf fixtures");
  doc.setCreationDate(FIXED_METADATA_DATE);
  doc.setModificationDate(FIXED_METADATA_DATE);

  const bytes = await doc.save();
  fs.writeFileSync(path.join(outputDir, fileName), bytes);
}

async function generateSimpleRect(options: { readonly outputDir: string }): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([...PAGE_SIZE_LETTER]);

  page.drawRectangle({
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    color: rgb(0.2, 0.4, 0.6),
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });

  await writePdf(options.outputDir, "simple-rect.pdf", doc);
}

async function generateBezierCurves(options: { readonly outputDir: string }): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([...PAGE_SIZE_LETTER]);

  page.drawSvgPath(
    "M 120 420 C 210 520 300 320 390 420 C 450 490 520 470 520 360 C 520 270 450 250 390 320 C 300 420 210 220 120 320 Z",
    {
      color: rgb(0.8, 0.2, 0.2),
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 2,
    },
  );

  await writePdf(options.outputDir, "bezier-curves.pdf", doc);
}

async function generateColoredShapes(options: { readonly outputDir: string }): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([...PAGE_SIZE_LETTER]);

  page.drawRectangle({
    x: 50,
    y: 600,
    width: 100,
    height: 100,
    color: rgb(1, 0, 0),
  });

  page.drawRectangle({
    x: 200,
    y: 600,
    width: 100,
    height: 100,
    color: rgb(0, 1, 0),
  });

  page.drawRectangle({
    x: 350,
    y: 600,
    width: 100,
    height: 100,
    color: rgb(0, 0, 1),
  });

  page.drawCircle({
    x: 306,
    y: 400,
    size: 75,
    color: rgb(0.5, 0.5, 0.5),
  });

  await writePdf(options.outputDir, "colored-shapes.pdf", doc);
}

async function generateTextContent(options: { readonly outputDir: string }): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([...PAGE_SIZE_LETTER]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText("Hello World", {
    x: 50,
    y: 700,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText("This is a test document.", {
    x: 50,
    y: 650,
    size: 14,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText("Café résumé naïve", {
    x: 50,
    y: 600,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });

  await writePdf(options.outputDir, "text-content.pdf", doc);
}

async function generateMultiPage(options: { readonly outputDir: string }): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 5; i++) {
    const page = doc.addPage([...PAGE_SIZE_LETTER]);

    page.drawText(`Page ${i}`, {
      x: 250,
      y: 400,
      size: 36,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawRectangle({
      x: 200,
      y: 200,
      width: 200,
      height: 100,
      color: rgb(i * 0.2, 0.5, 1 - i * 0.15),
    });
  }

  await writePdf(options.outputDir, "multi-page.pdf", doc);
}

async function generateMixedContent(options: { readonly outputDir: string }): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([...PAGE_SIZE_LETTER]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText("Mixed Content Test", {
    x: 150,
    y: 720,
    size: 28,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawRectangle({
    x: 50,
    y: 500,
    width: 150,
    height: 100,
    color: rgb(0.9, 0.3, 0.3),
  });

  page.drawCircle({
    x: 350,
    y: 550,
    size: 60,
    color: rgb(0.3, 0.9, 0.3),
  });

  // Line (thin rectangle)
  page.drawRectangle({
    x: 50,
    y: 400,
    width: 500,
    height: 2,
    color: rgb(0, 0, 0),
  });

  const textLines: readonly string[] = [
    "Line 1: This is a paragraph.",
    "Line 2: More text content here.",
    "Line 3: Testing text extraction.",
  ];

  textLines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 350 - index * 20,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  await writePdf(options.outputDir, "mixed-content.pdf", doc);
}

async function main(): Promise<void> {
  await generatePdfFixtures({ outputDir: DEFAULT_PDF_FIXTURE_DIR });
  console.log("All fixtures generated!");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
