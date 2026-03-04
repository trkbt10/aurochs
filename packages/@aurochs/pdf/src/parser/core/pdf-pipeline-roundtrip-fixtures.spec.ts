/**
 * @file Round-trip integrity tests for all PDF fixtures.
 */

import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPdf, buildPdfFromBuilderContext } from "@aurochs-builder/pdf";
import {
  createPdfContext,
  parsePdfSource,
} from "./pdf-parser";

function collectPdfFilesRecursive(dir: string): readonly string[] {
  const result: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectPdfFilesRecursive(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      result.push(fullPath);
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

const FIXTURES_DIR = fileURLToPath(new URL("../../../fixtures", import.meta.url));
const FIXTURE_PATHS = collectPdfFilesRecursive(FIXTURES_DIR);
const ROUND_TRIP_CHUNK_SIZE = 8;

type RoundTripCase = Readonly<{
  fixturePath: string;
  fixtureName: string;
  pages: readonly number[];
}>;

function buildPageChunks(pageCount: number, chunkSize: number): readonly (readonly number[])[] {
  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    throw new Error(`pageCount must be a positive integer: ${pageCount}`);
  }
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive integer: ${chunkSize}`);
  }

  const chunks: number[][] = [];
  for (let start = 1; start <= pageCount; start += chunkSize) {
    const end = Math.min(pageCount, start + chunkSize - 1);
    chunks.push(Array.from({ length: end - start + 1 }, (_, index) => start + index));
  }
  return chunks;
}

function buildRoundTripCases(): readonly RoundTripCase[] {
  const cases: RoundTripCase[] = [];
  const fixturePageCounts: Readonly<Record<string, number>> = {
    "241770.pdf": 52,
    "block-segmentation-corpus/20241224jokenhenko.pdf": 1,
    "block-segmentation-corpus/20260219c000320001.pdf": 1,
    "block-segmentation-corpus/20260219g000350002.pdf": 1,
    "block-segmentation-corpus/20260219h016500001.pdf": 1,
    "block-segmentation-corpus/courts-hanrei-87071.pdf": 18,
    "block-segmentation-corpus/grib2_manual.pdf": 6,
    "block-segmentation-corpus/horizontal-long-single.pdf": 1,
    "block-segmentation-corpus/horizontal-long-two-column.pdf": 1,
    "block-segmentation-corpus/jp-public-doc-merged-cells.pdf": 1,
    "block-segmentation-corpus/mlit-001059436.pdf": 2,
    "block-segmentation-corpus/mlit-hakusho-r07-np101100.pdf": 27,
    "block-segmentation-corpus/paper-cover-abstract-two-column.pdf": 1,
    "block-segmentation-corpus/rtl-arabic-pdfjs.pdf": 1,
    "block-segmentation-corpus/table-with-rules.pdf": 1,
    "block-segmentation-corpus/vertical-long-single.pdf": 1,
    "block-segmentation-corpus/vertical-three-columns.pdf": 1,
    "block-segmentation-corpus/vertical-two-columns.pdf": 1,
  };

  for (const fixturePath of FIXTURE_PATHS) {
    const fixtureName = path.relative(FIXTURES_DIR, fixturePath);
    const pageCount = fixturePageCounts[fixtureName];
    if (pageCount === undefined) {
      throw new Error(`Missing page count mapping for fixture: ${fixtureName}`);
    }

    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      throw new Error(`Unable to resolve page count: ${fixtureName}`);
    }

    const chunks = buildPageChunks(pageCount, ROUND_TRIP_CHUNK_SIZE);

    for (const pages of chunks) {
      cases.push({ fixturePath, fixtureName, pages });
    }
  }

  return cases;
}

const ROUND_TRIP_CASES = buildRoundTripCases();

describe("PDF pipeline round-trip integrity (all fixtures)", () => {
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeAll(() => {
    console.warn = () => {};
    console.error = () => {};
  });

  afterAll(() => {
    console.warn = originalWarn;
    console.error = originalError;
  });

  it("discovers fixture PDFs", () => {
    expect(FIXTURE_PATHS.length).toBeGreaterThan(0);
  });

  it("builds chunked round-trip cases", () => {
    expect(ROUND_TRIP_CASES.length).toBeGreaterThan(0);
  });

  for (const roundTripCase of ROUND_TRIP_CASES) {
    const start = roundTripCase.pages[0]!;
    const end = roundTripCase.pages[roundTripCase.pages.length - 1]!;
    it(`keeps round-trip integrity: ${roundTripCase.fixtureName} pages ${start}-${end}`, async () => {
      const bytes = new Uint8Array(readFileSync(roundTripCase.fixturePath));
      const options = { encryption: { mode: "password", password: "" } } as const;
      const parseOptions = { ...options, pages: roundTripCase.pages };

      const direct = await buildPdf({
        data: bytes,
        parseOptions,
        buildOptions: {
          includeText: true,
          includePaths: true,
          minPathComplexity: 0,
        },
      });
      const parsed = await parsePdfSource(bytes, parseOptions);
      const context = createPdfContext(parsed, {
        includeText: true,
        includePaths: true,
        minPathComplexity: 0,
      });
      const rebuilt = buildPdfFromBuilderContext({ context });

      expect(
        rebuilt,
        `round-trip mismatch: ${roundTripCase.fixtureName} pages ${start}-${end}`,
      ).toEqual(direct);
    }, 90_000);
  }
});
