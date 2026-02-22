/**
 * @file Corpus-driven segmentation tests.
 */

import path from "node:path";
import { existsSync } from "node:fs";
import { parsePdf } from "../../parser/core/pdf-parser";
import type { PdfText } from "../../domain/text";
import { spatialGrouping } from "./spatial-grouping";
import {
  SEGMENTATION_CORPUS_CASES,
  buildSegmentationCorpusPdf,
  type SegmentationCorpusCase,
  type SegmentationCorpusCaseId,
} from "./corpus-pdf-builder";
import { getSampleFixturePath } from "../../test-utils/pdf-fixtures";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function getGroupText(group: ReturnType<typeof spatialGrouping>[number]): string {
  return group.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
}

const FIXTURES_DIR = path.resolve(path.dirname(getSampleFixturePath("_unused.tmp")), "..");
const FONT_PATH = path.join(FIXTURES_DIR, "poi-test-data", "test-data", "slideshow", "mona.ttf");

describe("segmentation corpus", () => {
  const runCase = async (scenario: SegmentationCorpusCase): Promise<void> => {
    const bytes = await buildSegmentationCorpusPdf({
      caseId: scenario.id as SegmentationCorpusCaseId,
      fontPath: FONT_PATH,
    });

    const parsed = await parsePdf(bytes);
    const page = parsed.pages[0];
    if (!page) {
      throw new Error(`No page parsed for scenario: ${scenario.id}`);
    }

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    const groups = spatialGrouping(texts, {
      pageWidth: page.width,
      pageHeight: page.height,
    });

    expect(groups.length).toBeGreaterThanOrEqual(scenario.expectation.minGroups);
    expect(groups.length).toBeLessThanOrEqual(scenario.expectation.maxGroups);

    const allText = normalizeText(groups.map(getGroupText).join("\n"));
    for (const token of scenario.expectation.requiredTokens) {
      expect(allText).toContain(normalizeText(token));
    }

    if (scenario.expectation.writingMode === "vertical") {
      const eachGroup = groups.map((g) => normalizeText(getGroupText(g)));
      const markerGroups = eachGroup.filter((text) => text.includes("【"));
      expect(markerGroups.length).toBeGreaterThan(0);
    }
  };

  (existsSync(FONT_PATH) ? it : it.skip)("has required Japanese font fixture", () => {
    expect(existsSync(FONT_PATH)).toBe(true);
  });

  for (const scenario of SEGMENTATION_CORPUS_CASES) {
    it(`${scenario.id}: ${scenario.title}`, async () => {
      await runCase(scenario);
    });
  }
});
