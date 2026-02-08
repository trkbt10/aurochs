/**
 * @file PDFKit fixtures validation tests
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePdf } from "@aurochs/pdf";
import type { PdfParserOptions } from "@aurochs/pdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../../../../");
const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "pdfkit");

type FixtureExpectation = Readonly<{
  readonly fileName: string;
  readonly expectedPages: number;
  readonly minPaths?: number;
  readonly minTexts?: number;
  readonly minImages?: number;
  readonly expectedTextIncludes?: readonly string[];
  readonly parseOptions?: PdfParserOptions;
  readonly expectAnyImageClipMask?: boolean;
  readonly expectAnyBlendMode?: string;
  readonly expectAnyFillAlpha?: number;
}>;

const FIXTURES: readonly FixtureExpectation[] = [
  {
    fileName: "pdfkit-basic.pdf",
    expectedPages: 1,
    minPaths: 1,
    minTexts: 2,
    expectedTextIncludes: ["Hello PDFKit", "Café résumé naïve"],
  },
  {
    fileName: "pdfkit-multipage.pdf",
    expectedPages: 3,
    minPaths: 3,
    minTexts: 3,
    expectedTextIncludes: ["Page 1", "Page 2", "Page 3"],
  },
  {
    fileName: "pdfkit-image.pdf",
    expectedPages: 1,
    minTexts: 1,
    expectedTextIncludes: ["PNG image above"],
  },
  {
    fileName: "pdfkit-clipping.pdf",
    expectedPages: 1,
    minTexts: 1,
    minImages: 1,
    expectedTextIncludes: ["Clipped image above"],
    parseOptions: { clipPathMaxSize: 64 },
    expectAnyImageClipMask: true,
  },
  {
    fileName: "pdfkit-alpha-blend.pdf",
    expectedPages: 1,
    minPaths: 2,
    minTexts: 1,
    expectedTextIncludes: ["Alpha+Blend (Multiply) rects above"],
    expectAnyBlendMode: "Multiply",
    expectAnyFillAlpha: 0.5,
  },
];

function isValidPdf(bytes: Uint8Array): boolean {
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 8));
  const trailer = new TextDecoder("latin1").decode(bytes.slice(Math.max(0, bytes.length - 32)));
  return header.startsWith("%PDF-") && trailer.includes("%%EOF");
}

function normalizeTextForIncludes(text: string): string {
  return text.replace(/\s+/g, "");
}

function createTempDir(): string {
  const base = path.resolve(__dirname, "../.tmp/pdfkit-fixtures");
  fs.mkdirSync(base, { recursive: true });
  const tmp = path.join(base, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}

function generateFixturesWithBun(outputDir: string): void {
  const result = spawnSync(
    "bun",
    ["run", "scripts/generate/generate-pdfkit-fixtures.ts", "--outputDir", outputDir, "--no-log"],
    { cwd: ROOT_DIR, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "bun fixture generation failed");
  }
}

describe("PDFKit fixtures", () => {
  it("checked-in fixtures exist, are valid PDFs, and match expected content", async () => {
    for (const fixture of FIXTURES) {
      const filePath = path.join(FIXTURES_DIR, fixture.fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      const bytes = fs.readFileSync(filePath);
      expect(isValidPdf(bytes)).toBe(true);

      const parsed = await parsePdf(bytes, fixture.parseOptions ?? {});
      expect(parsed.pages.length).toBe(fixture.expectedPages);

      const allElements = parsed.pages.flatMap((p) => p.elements);
      const pathElements = allElements.filter((e) => e.type === "path");
      const textElements = allElements.filter((e) => e.type === "text");
      const imageElements = allElements.filter((e) => e.type === "image");

      if (fixture.minPaths !== undefined) {
        expect(pathElements.length).toBeGreaterThanOrEqual(fixture.minPaths);
      }
      if (fixture.minTexts !== undefined) {
        expect(textElements.length).toBeGreaterThanOrEqual(fixture.minTexts);
      }
      if (fixture.minImages !== undefined) {
        expect(imageElements.length).toBeGreaterThanOrEqual(fixture.minImages);
      }
      if (fixture.expectedTextIncludes && fixture.expectedTextIncludes.length > 0) {
        const allText = normalizeTextForIncludes(textElements.map((t) => t.text).join("\n"));
        for (const expected of fixture.expectedTextIncludes) {
          expect(allText).toContain(normalizeTextForIncludes(expected));
        }
      }
      if (fixture.expectAnyImageClipMask) {
        expect(imageElements.some((img) => Boolean(img.graphicsState.clipMask))).toBe(true);
      }
      if (fixture.expectAnyBlendMode) {
        expect(allElements.some((e) => e.graphicsState.blendMode === fixture.expectAnyBlendMode)).toBe(true);
      }
      if (fixture.expectAnyFillAlpha !== undefined) {
        const expected = fixture.expectAnyFillAlpha;
        expect(
          allElements.some(
            (e) =>
              typeof e.graphicsState.fillAlpha === "number" && Math.abs(e.graphicsState.fillAlpha - expected) < 1e-6,
          ),
        ).toBe(true);
      }
    }
  });

  it("generator output is deterministic and matches checked-in fixtures", async () => {
    const tmpDir = createTempDir();

    try {
      generateFixturesWithBun(tmpDir);
      const firstRun = new Map<string, Buffer>();
      for (const fixture of FIXTURES) {
        firstRun.set(fixture.fileName, fs.readFileSync(path.join(tmpDir, fixture.fileName)));
      }

      generateFixturesWithBun(tmpDir);

      for (const fixture of FIXTURES) {
        const generated = fs.readFileSync(path.join(tmpDir, fixture.fileName));
        const expected = fs.readFileSync(path.join(FIXTURES_DIR, fixture.fileName));
        expect(generated.equals(expected)).toBe(true);
        expect(generated.equals(firstRun.get(fixture.fileName)!)).toBe(true);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
