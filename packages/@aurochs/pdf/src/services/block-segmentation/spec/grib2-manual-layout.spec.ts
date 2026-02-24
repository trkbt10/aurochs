/**
 * @file Layout reconstruction regression for grib2_manual.pdf.
 *
 * Validates that block segmentation restores:
 * - key text blocks with stable bounds
 * - table structures (rows/columns/cells)
 * - representative table-cell coordinates
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../../../parser/core/pdf-parser";
import type { PdfPath } from "../../../domain/path";
import type { PdfText } from "../../../domain/text";
import { spatialGrouping } from "../strategies/spatial-grouping";
import type { GroupedText, TextBounds } from "../contracts/types";
import { inferTableVisualizationsForPage } from "../../../../../../../scripts/visualize-block-segmentation";

type ExpectedTextBlock = {
  readonly token: string;
  readonly bounds: TextBounds;
  readonly paragraphCount: number;
  readonly runCount: number;
};

type ExpectedCell = {
  readonly rowIndex: number;
  readonly colStart: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly preview: string;
  readonly x0?: number;
  readonly y0?: number;
  readonly x1?: number;
  readonly y1?: number;
};

type ExpectedTable = {
  readonly tableIndex: number;
  readonly bounds?: TextBounds;
  readonly rowCount: number;
  readonly colCount: number;
  readonly cellCount: number;
  readonly cells: readonly ExpectedCell[];
};

type LayoutExpected = {
  readonly page?: {
    readonly width: number;
    readonly height: number;
  };
  readonly groupCountRange?: {
    readonly min: number;
    readonly max: number;
  };
  readonly requiredTokens?: readonly string[];
  readonly textBlocks: readonly ExpectedTextBlock[];
  readonly tableCount: number;
  readonly tables: readonly ExpectedTable[];
  readonly forbiddenCellTokens?: readonly string[];
};

const BOUNDS_TOLERANCE_PT = 1.0;
const CELL_TOLERANCE_PT = 0.8;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function groupText(group: GroupedText): string {
  return group.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")).join("\n");
}

function findGroupByToken(groups: readonly GroupedText[], token: string): GroupedText | undefined {
  const normalizedToken = normalizeText(token);
  const exact = groups.find((group) => normalizeText(groupText(group)) === normalizedToken);
  if (exact) {
    return exact;
  }
  return groups.find((group) => normalizeText(groupText(group)).includes(normalizedToken));
}

function expectNear(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function expectBoundsNear(actual: TextBounds, expected: TextBounds, tolerance: number): void {
  expectNear(actual.x, expected.x, tolerance);
  expectNear(actual.y, expected.y, tolerance);
  expectNear(actual.width, expected.width, tolerance);
  expectNear(actual.height, expected.height, tolerance);
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus/grib2_manual.pdf");
const EXPECTED_PATH = path.resolve(
  CURRENT_DIR,
  "../../../../fixtures/block-segmentation-corpus/grib2_manual.p1.segmentation.expected.json",
);

describe("grib2 manual layout regression", () => {
  const state: {
    expected: LayoutExpected | null;
    groups: readonly GroupedText[];
    tables: ReturnType<typeof inferTableVisualizationsForPage>;
    pageWidth: number;
    pageHeight: number;
  } = {
    expected: null,
    groups: [],
    tables: [],
    pageWidth: 0,
    pageHeight: 0,
  };

  beforeAll(async () => {
    if (!existsSync(FIXTURE_PATH) || !existsSync(EXPECTED_PATH)) {
      return;
    }

    state.expected = JSON.parse(readFileSync(EXPECTED_PATH, "utf8")) as LayoutExpected;
    const parsed = await parsePdf(readFileSync(FIXTURE_PATH), {
      pages: [1],
      encryption: { mode: "password", password: "" },
    });

    const page = parsed.pages[0];
    if (!page) {
      throw new Error("grib2_manual.pdf page 1 was not parsed");
    }

    const texts = page.elements.filter((element): element is PdfText => element.type === "text");
    const paths = page.elements.filter((element): element is PdfPath => element.type === "path");

    state.pageWidth = page.width;
    state.pageHeight = page.height;
    state.groups = spatialGrouping(texts, {
      pageWidth: page.width,
      pageHeight: page.height,
    });
    state.tables = inferTableVisualizationsForPage({
      texts,
      pagePaths: paths,
      pageWidth: page.width,
      pageHeight: page.height,
    });
  });

  (existsSync(FIXTURE_PATH) ? it : it.skip)("has grib2 manual fixture", () => {
    expect(existsSync(FIXTURE_PATH)).toBe(true);
  });

  (existsSync(EXPECTED_PATH) ? it : it.skip)("has grib2 manual expected json", () => {
    expect(existsSync(EXPECTED_PATH)).toBe(true);
  });

  it("restores page-level grouping with stable run coverage", () => {
    expect(state.expected).toBeDefined();
    if (!state.expected) {
      return;
    }

    if (state.expected.page) {
      expect(state.pageWidth).toBeCloseTo(state.expected.page.width, 3);
      expect(state.pageHeight).toBeCloseTo(state.expected.page.height, 2);
    }

    if (state.expected.groupCountRange) {
      expect(state.groups.length).toBeGreaterThanOrEqual(state.expected.groupCountRange.min);
      expect(state.groups.length).toBeLessThanOrEqual(state.expected.groupCountRange.max);
    }

    const allText = normalizeText(state.groups.map(groupText).join("\n"));
    for (const token of state.expected.requiredTokens ?? []) {
      expect(allText).toContain(normalizeText(token));
    }
  });

  it("restores key text blocks at stable coordinates", () => {
    expect(state.expected).toBeDefined();
    if (!state.expected) {
      return;
    }

    for (const expectedBlock of state.expected.textBlocks) {
      const group = findGroupByToken(state.groups, expectedBlock.token);
      expect(group).toBeDefined();
      expect(group?.paragraphs.length).toBe(expectedBlock.paragraphCount);
      const runCount = group?.paragraphs.reduce((sum, paragraph) => sum + paragraph.runs.length, 0) ?? 0;
      expect(runCount).toBe(expectedBlock.runCount);
      if (group) {
        expectBoundsNear(group.bounds, expectedBlock.bounds, BOUNDS_TOLERANCE_PT);
      }
    }
  });

  it("restores parameter-correction tables with stable geometry", () => {
    expect(state.expected).toBeDefined();
    if (!state.expected) {
      return;
    }

    expect(state.tables.length).toBe(state.expected.tableCount);

    for (const expectedTable of state.expected.tables) {
      const table = state.tables.find((candidate) => candidate.tableIndex === expectedTable.tableIndex);
      expect(table).toBeDefined();
      expect(table?.rowCount).toBe(expectedTable.rowCount);
      expect(table?.colCount).toBe(expectedTable.colCount);
      expect(table?.cellCount).toBe(expectedTable.cellCount);

      if (!table) {
        continue;
      }

      if (expectedTable.bounds) {
        expectBoundsNear(table.bounds, expectedTable.bounds, BOUNDS_TOLERANCE_PT);
      }

      for (const expectedCell of expectedTable.cells) {
        const actualCell = table.cells.find(
          (cell) =>
            cell.rowIndex === expectedCell.rowIndex &&
            cell.colStart === expectedCell.colStart &&
            cell.rowSpan === expectedCell.rowSpan &&
            cell.colSpan === expectedCell.colSpan &&
            normalizeText(cell.preview) === normalizeText(expectedCell.preview),
        );
        expect(actualCell).toBeDefined();

        if (!actualCell) {
          continue;
        }

        if (typeof expectedCell.x0 === "number") {
          expectNear(actualCell.x0, expectedCell.x0, CELL_TOLERANCE_PT);
        }
        if (typeof expectedCell.y0 === "number") {
          expectNear(actualCell.y0, expectedCell.y0, CELL_TOLERANCE_PT);
        }
        if (typeof expectedCell.x1 === "number") {
          expectNear(actualCell.x1, expectedCell.x1, CELL_TOLERANCE_PT);
        }
        if (typeof expectedCell.y1 === "number") {
          expectNear(actualCell.y1, expectedCell.y1, CELL_TOLERANCE_PT);
        }
      }
    }

    const cellText = normalizeText(state.tables.flatMap((table) => table.cells.map((cell) => cell.preview)).join("\n"));
    for (const token of state.expected.forbiddenCellTokens ?? []) {
      expect(cellText).not.toContain(normalizeText(token));
    }
  });
});
