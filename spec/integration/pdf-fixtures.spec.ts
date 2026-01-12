import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../../src/pdf";
import { DEFAULT_PDF_FIXTURE_DIR, generatePdfFixtures } from "../../scripts/generate-pdf-fixtures";

type FixtureExpectation = {
  readonly fileName: string;
  readonly expectedPages: number;
  readonly minPaths?: number;
  readonly minTexts?: number;
  readonly expectAnyCurve?: boolean;
  readonly expectedTextIncludes?: readonly string[];
};

const FIXTURES: readonly FixtureExpectation[] = [
  {
    fileName: "simple-rect.pdf",
    expectedPages: 1,
    minPaths: 1,
  },
  {
    fileName: "bezier-curves.pdf",
    expectedPages: 1,
    minPaths: 1,
    expectAnyCurve: true,
  },
  {
    fileName: "colored-shapes.pdf",
    expectedPages: 1,
    minPaths: 4,
  },
  {
    fileName: "text-content.pdf",
    expectedPages: 1,
    minTexts: 3,
    expectedTextIncludes: ["Hello World", "This is a test document.", "Café résumé naïve"],
  },
  {
    fileName: "multi-page.pdf",
    expectedPages: 5,
    minPaths: 5,
    minTexts: 5,
  },
  {
    fileName: "mixed-content.pdf",
    expectedPages: 1,
    minPaths: 3,
    minTexts: 4,
    expectedTextIncludes: ["Mixed Content Test", "Line 3: Testing text extraction."],
  },
];

function isValidPdf(bytes: Uint8Array): boolean {
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 8));
  const trailer = new TextDecoder("latin1").decode(bytes.slice(Math.max(0, bytes.length - 32)));
  return header.startsWith("%PDF-") && trailer.includes("%%EOF");
}

function createTempDir(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const base = path.resolve(__dirname, "../.tmp/pdf-fixtures");
  fs.mkdirSync(base, { recursive: true });
  const tmp = path.join(base, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}

describe("PDF fixtures", () => {
  it("checked-in fixtures exist, are valid PDFs, and match expected content", async () => {
    for (const fixture of FIXTURES) {
      const filePath = path.join(DEFAULT_PDF_FIXTURE_DIR, fixture.fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      const bytes = fs.readFileSync(filePath);
      expect(isValidPdf(bytes)).toBe(true);

      const parsed = await parsePdf(bytes);
      expect(parsed.pages.length).toBe(fixture.expectedPages);

      const allElements = parsed.pages.flatMap((p) => p.elements);
      const pathElements = allElements.filter((e) => e.type === "path");
      const textElements = allElements.filter((e) => e.type === "text");

      if (fixture.minPaths !== undefined) {
        expect(pathElements.length).toBeGreaterThanOrEqual(fixture.minPaths);
      }
      if (fixture.minTexts !== undefined) {
        expect(textElements.length).toBeGreaterThanOrEqual(fixture.minTexts);
      }
      if (fixture.expectAnyCurve) {
        const hasCurve = pathElements.some((e) =>
          e.operations.some(
            (op) =>
              op.type === "curveTo" ||
              op.type === "curveToV" ||
              op.type === "curveToY",
          ),
        );
        expect(hasCurve).toBe(true);
      }
      if (fixture.expectedTextIncludes && fixture.expectedTextIncludes.length > 0) {
        const allText = textElements.map((t) => t.text).join("\n");
        for (const expected of fixture.expectedTextIncludes) {
          expect(allText).toContain(expected);
        }
      }

      if (fixture.fileName === "multi-page.pdf") {
        for (let i = 1; i <= 5; i++) {
          const pageText = parsed.pages[i - 1]?.elements
            .filter((e) => e.type === "text")
            .map((t) => t.text)
            .join("\n");
          expect(pageText).toContain(`Page ${i}`);
        }
      }
    }
  });

  it("generator output is deterministic and matches checked-in fixtures", async () => {
    const tmpDir = createTempDir();

    try {
      await generatePdfFixtures({ outputDir: tmpDir, log: false });
      const firstRun = new Map<string, Buffer>();
      for (const fixture of FIXTURES) {
        firstRun.set(fixture.fileName, fs.readFileSync(path.join(tmpDir, fixture.fileName)));
      }

      await generatePdfFixtures({ outputDir: tmpDir, log: false });

      for (const fixture of FIXTURES) {
        const generated = fs.readFileSync(path.join(tmpDir, fixture.fileName));
        const expected = fs.readFileSync(path.join(DEFAULT_PDF_FIXTURE_DIR, fixture.fileName));
        expect(generated.equals(expected)).toBe(true);
        expect(generated.equals(firstRun.get(fixture.fileName)!)).toBe(true);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

