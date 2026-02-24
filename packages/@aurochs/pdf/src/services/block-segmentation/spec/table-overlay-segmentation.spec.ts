/**
 * @file Table overlay inference regression test for corpus fixture.
 */

import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../../../parser/core/pdf-parser";
import type { PdfPath } from "../../../domain/path";
import type { PdfText } from "../../../domain/text";
import { inferTableVisualizationsForPage } from "../../../../../../../scripts/visualize-block-segmentation";

type TableOverlayExpected = {
  readonly tableCount: number;
  readonly tables: readonly {
    readonly tableIndex: number;
    readonly rowCount: number;
    readonly colCount: number;
    readonly cellCount: number;
    readonly bounds?: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
    readonly cells: readonly {
      readonly rowIndex: number;
      readonly colStart: number;
      readonly rowSpan: number;
      readonly colSpan: number;
      readonly preview: string;
      readonly x0?: number;
      readonly y0?: number;
      readonly x1?: number;
      readonly y1?: number;
    }[];
  }[];
  readonly forbiddenCellTokens?: readonly string[];
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus");
const EXPECTED_FILE_SUFFIX = ".segmentation.expected.json";
const POSITION_TOLERANCE_PT = 1.0;

function expectNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(POSITION_TOLERANCE_PT);
}

type FixtureCase = {
  readonly pdfName: string;
  readonly pageNumber: number;
  readonly expectedPath: string;
};

function listFixtureCases(): readonly FixtureCase[] {
  const entries = readdirSync(FIXTURE_DIR).filter((name) => name.endsWith(EXPECTED_FILE_SUFFIX));
  return entries
    .flatMap((name) => {
      const match = name.match(/^(.*)\.p(\d+)\.segmentation\.expected\.json$/);
      if (!match) {
        return [];
      }
      const pdfName = `${match[1]}.pdf`;
      const pageNumber = Number.parseInt(match[2]!, 10);
      if (!Number.isFinite(pageNumber) || pageNumber <= 0) {
        return [];
      }
      return [{
        pdfName,
        pageNumber,
        expectedPath: path.join(FIXTURE_DIR, name),
      }];
    })
    .sort((a, b) => {
      if (a.pdfName !== b.pdfName) {
        return a.pdfName.localeCompare(b.pdfName, "en");
      }
      return a.pageNumber - b.pageNumber;
    });
}

describe("table overlay segmentation", () => {
  const cases = listFixtureCases();
  for (const fixtureCase of cases) {
    it(`matches expected table segmentation for ${fixtureCase.pdfName} page ${fixtureCase.pageNumber}`, async () => {
      const fixturePdfPath = path.join(FIXTURE_DIR, fixtureCase.pdfName);

      const expected = JSON.parse(readFileSync(fixtureCase.expectedPath, "utf8")) as TableOverlayExpected;
      const parsed = await parsePdf(readFileSync(fixturePdfPath), {
        pages: [fixtureCase.pageNumber],
        encryption: { mode: "password", password: "" },
      });
      const page = parsed.pages[0];
      if (!page) {
        throw new Error(`expected page ${fixtureCase.pageNumber} in fixture ${fixtureCase.pdfName}`);
      }

      const texts = page.elements.filter((element): element is PdfText => element.type === "text");
      const paths = page.elements.filter((element): element is PdfPath => element.type === "path");
      const tables = inferTableVisualizationsForPage({
        texts,
        pagePaths: paths,
        pageWidth: page.width,
        pageHeight: page.height,
      });

      expect(tables.length).toBe(expected.tableCount);
      expect(expected.tables.length).toBe(expected.tableCount);

      for (const expectedTable of expected.tables) {
        const actual = tables.find((table) => table.tableIndex === expectedTable.tableIndex);
        expect(actual).toBeDefined();
        expect(actual?.rowCount).toBe(expectedTable.rowCount);
        expect(actual?.colCount).toBe(expectedTable.colCount);
        expect(actual?.cellCount).toBe(expectedTable.cellCount);
        if (actual && expectedTable.bounds) {
          expectNear(actual.bounds.x, expectedTable.bounds.x);
          expectNear(actual.bounds.y, expectedTable.bounds.y);
          expectNear(actual.bounds.width, expectedTable.bounds.width);
          expectNear(actual.bounds.height, expectedTable.bounds.height);
        }
        const actualCells = (actual?.cells ?? [])
          .map((cell) => ({
            rowIndex: cell.rowIndex,
            colStart: cell.colStart,
            rowSpan: cell.rowSpan,
            colSpan: cell.colSpan,
            preview: normalizeText(cell.preview),
          }))
          .sort((a, b) => {
            if (a.rowIndex !== b.rowIndex) {
              return a.rowIndex - b.rowIndex;
            }
            if (a.colStart !== b.colStart) {
              return a.colStart - b.colStart;
            }
            if (a.rowSpan !== b.rowSpan) {
              return a.rowSpan - b.rowSpan;
            }
            if (a.colSpan !== b.colSpan) {
              return a.colSpan - b.colSpan;
            }
            return a.preview.localeCompare(b.preview, "ja");
          });
        const expectedCells = expectedTable.cells
          .map((cell) => ({
            rowIndex: cell.rowIndex,
            colStart: cell.colStart,
            rowSpan: cell.rowSpan,
            colSpan: cell.colSpan,
            preview: normalizeText(cell.preview),
          }))
          .sort((a, b) => {
            if (a.rowIndex !== b.rowIndex) {
              return a.rowIndex - b.rowIndex;
            }
            if (a.colStart !== b.colStart) {
              return a.colStart - b.colStart;
            }
            if (a.rowSpan !== b.rowSpan) {
              return a.rowSpan - b.rowSpan;
            }
            if (a.colSpan !== b.colSpan) {
              return a.colSpan - b.colSpan;
            }
            return a.preview.localeCompare(b.preview, "ja");
          });
        expect(actualCells).toEqual(expectedCells);

        for (const expectedCell of expectedTable.cells) {
          const hasCoordinates = typeof expectedCell.x0 === "number" &&
            typeof expectedCell.y0 === "number" &&
            typeof expectedCell.x1 === "number" &&
            typeof expectedCell.y1 === "number";
          if (!hasCoordinates || !actual) {
            continue;
          }

          const actualCell = actual.cells.find((cell) =>
            cell.rowIndex === expectedCell.rowIndex &&
            cell.colStart === expectedCell.colStart &&
            cell.rowSpan === expectedCell.rowSpan &&
            cell.colSpan === expectedCell.colSpan &&
            normalizeText(cell.preview) === normalizeText(expectedCell.preview)
          );
          expect(actualCell).toBeDefined();
          if (!actualCell) {
            continue;
          }

          expectNear(actualCell.x0, expectedCell.x0);
          expectNear(actualCell.y0, expectedCell.y0);
          expectNear(actualCell.x1, expectedCell.x1);
          expectNear(actualCell.y1, expectedCell.y1);
        }
      }

      const cellText = normalizeText(tables.flatMap((table) => table.cells.map((cell) => cell.preview)).join("\n"));
      for (const token of expected.forbiddenCellTokens ?? []) {
        expect(cellText).not.toContain(normalizeText(token));
      }
    });
  }
});
