/**
 * @file Corpus-driven segmentation tests.
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../../../parser/core/pdf-parser";
import type { PdfText } from "../../../domain/text";
import { spatialGrouping } from "../strategies/spatial-grouping";
import type { GroupedText } from "../contracts/types";
import {
  SEGMENTATION_CORPUS_CASES,
  type SegmentationCorpusCase,
} from "./segmentation-corpus-cases";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function getGroupText(group: GroupedText): string {
  return group.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n");
}

function findGroupByToken(groups: readonly GroupedText[], token: string): GroupedText | undefined {
  return groups.find((group) => normalizeText(getGroupText(group)).includes(normalizeText(token)));
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus");

const CASE_TO_FIXTURE_BASENAME: Record<SegmentationCorpusCase["id"], string> = {
  "horizontal-long-single": "horizontal-long-single.pdf",
  "horizontal-long-two-column": "horizontal-long-two-column.pdf",
  "paper-cover-abstract-two-column": "paper-cover-abstract-two-column.pdf",
  "table-with-rules": "table-with-rules.pdf",
  "jp-public-doc-merged-cells": "jp-public-doc-merged-cells.pdf",
  "rtl-arabic-pdfjs": "rtl-arabic-pdfjs.pdf",
  "vertical-long-single": "vertical-long-single.pdf",
  "vertical-two-columns": "vertical-two-columns.pdf",
  "vertical-three-columns": "vertical-three-columns.pdf",
  "kanpo-20260219c000320001": "20260219c000320001.pdf",
  "kanpo-20260219g000350002": "20260219g000350002.pdf",
  "kanpo-20260219h016500001": "20260219h016500001.pdf",
};

function getFixturePath(caseId: SegmentationCorpusCase["id"]): string {
  const basename = CASE_TO_FIXTURE_BASENAME[caseId];
  return path.join(FIXTURE_DIR, basename);
}

describe("segmentation corpus", () => {
  const runCase = async (scenario: SegmentationCorpusCase): Promise<void> => {
    const fixturePath = getFixturePath(scenario.id);
    const bytes = readFileSync(fixturePath);
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
      const hasMarkerExpectation = scenario.expectation.requiredTokens.some((token) => token.includes("【"));
      if (hasMarkerExpectation) {
        const eachGroup = groups.map((g) => normalizeText(getGroupText(g)));
        const markerGroups = eachGroup.filter((text) => text.includes("【"));
        expect(markerGroups.length).toBeGreaterThan(0);
      }
    }

    if (scenario.id === "rtl-arabic-pdfjs") {
      const hasRtlParagraph = groups.some((g) => g.paragraphs.some((p) => p.inlineDirection === "rtl"));
      expect(hasRtlParagraph).toBe(true);
    }

    if (
      scenario.id === "kanpo-20260219c000320001" ||
      scenario.id === "kanpo-20260219g000350002" ||
      scenario.id === "kanpo-20260219h016500001"
    ) {
      const ttbGroupCount = groups.filter((g) => g.layoutInference?.inlineDirection === "ttb").length;
      expect(ttbGroupCount >= Math.ceil(groups.length / 2)).toBe(true);
    }

    if (scenario.id === "horizontal-long-single") {
      const longBodyGroup = findGroupByToken(groups, "吾輩は猫である");
      expect(longBodyGroup).toBeDefined();
      expect((longBodyGroup?.paragraphs.length ?? 0) >= 5).toBe(true);
    }

    if (scenario.id === "horizontal-long-two-column") {
      const leftGroup = findGroupByToken(groups, "【左段】");
      const rightGroup = findGroupByToken(groups, "【右段】");
      expect(leftGroup).toBeDefined();
      expect(rightGroup).toBeDefined();
      expect((leftGroup?.paragraphs.length ?? 0) >= 5).toBe(true);
      expect((rightGroup?.paragraphs.length ?? 0) >= 5).toBe(true);
    }
  };

  (existsSync(FIXTURE_DIR) ? it : it.skip)("has block segmentation fixtures", () => {
    expect(existsSync(FIXTURE_DIR)).toBe(true);
  });

  for (const scenario of SEGMENTATION_CORPUS_CASES) {
    const fixturePath = getFixturePath(scenario.id);
    if (!existsSync(fixturePath)) {
      it.skip(`${scenario.id}: fixture not found`, () => {
        expect(existsSync(fixturePath)).toBe(true);
      });
      continue;
    }

    it(`${scenario.id}: ${scenario.title}`, async () => {
      await runCase(scenario);
    });
  }
});
