/**
 * @file Grouping regression tests for mlit-hakusho-r07-np101100.pdf.
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../../../parser/core/pdf-parser";
import type { PdfText } from "../../../domain/text";
import type { GroupedText } from "../contracts/types";
import { spatialGrouping } from "../strategies/spatial-grouping";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function groupText(group: GroupedText): string {
  return group.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")).join("\n");
}

function findGroupContaining(groups: readonly GroupedText[], token: string): GroupedText | undefined {
  const normalizedToken = normalizeText(token);
  return groups.find((group) => normalizeText(groupText(group)).includes(normalizedToken));
}

function isNoteOnlyGroup(group: GroupedText): boolean {
  return /^注\d+$/.test(normalizeText(groupText(group)));
}

function normalizedLength(group: GroupedText): number {
  return normalizeText(groupText(group)).length;
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus/mlit-hakusho-r07-np101100.pdf");

type PageGrouping = {
  readonly pageNumber: number;
  readonly groups: readonly GroupedText[];
};

describe("mlit hakusho grouping", () => {
  const state: { pages: readonly PageGrouping[] } = { pages: [] };

  beforeAll(async () => {
    if (!existsSync(FIXTURE_PATH)) {
      state.pages = [];
      return;
    }
    const parsed = await parsePdf(readFileSync(FIXTURE_PATH), {
      pages: [1, 2, 3, 4, 5, 13, 18],
      encryption: { mode: "password", password: "" },
    });
    state.pages = parsed.pages.map((page) => {
      const texts = page.elements.filter((element): element is PdfText => element.type === "text");
      return {
        pageNumber: page.pageNumber,
        groups: spatialGrouping(texts, {
          pageWidth: page.width,
          pageHeight: page.height,
        }),
      };
    });
  });

  (existsSync(FIXTURE_PATH) ? it : it.skip)("has mlit hakusho fixture", () => {
    expect(existsSync(FIXTURE_PATH)).toBe(true);
  });

  it("keeps first-page section heading in a dedicated group", () => {
    const page1 = state.pages.find((page) => page.pageNumber === 1);
    expect(page1).toBeDefined();
    const heading = findGroupContaining(page1?.groups ?? [], "担い手不足等によるサービスの供給制約");
    expect(heading).toBeDefined();
    const text = normalizeText(groupText(heading!));
    expect(text).toContain(normalizeText("第ビ節"));
    expect(text.includes(normalizeText("注1"))).toBe(false);
  });

  it("keeps note markers as independent short groups on pages 1-5", () => {
    for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
      const page = state.pages.find((item) => item.pageNumber === pageNumber);
      expect(page).toBeDefined();
      const noteGroups = (page?.groups ?? []).filter(isNoteOnlyGroup);
      expect(noteGroups.length).toBeGreaterThanOrEqual(1);
      for (const noteGroup of noteGroups) {
        expect(normalizedLength(noteGroup)).toBeLessThanOrEqual(4);
      }
    }
  });

  it("keeps body-like long text groups present on each of pages 1-5", () => {
    for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
      const page = state.pages.find((item) => item.pageNumber === pageNumber);
      expect(page).toBeDefined();
      const longGroups = (page?.groups ?? []).filter((group) => normalizedLength(group) >= 120);
      expect(longGroups.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("maintains horizontal writing inference on pages 1-5", () => {
    for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
      const page = state.pages.find((item) => item.pageNumber === pageNumber);
      expect(page).toBeDefined();
      const verticalGroups = (page?.groups ?? []).filter((group) => group.layoutInference?.inlineDirection === "ttb");
      expect(verticalGroups).toHaveLength(0);
    }
  });

  it("keeps per-page group counts within a stable range", () => {
    const expectedRanges: Record<number, readonly [number, number]> = {
      1: [16, 30],
      2: [20, 36],
      3: [12, 24],
      4: [14, 26],
      5: [10, 22],
    };
    for (const [pageNumberRaw, range] of Object.entries(expectedRanges)) {
      const pageNumber = Number.parseInt(pageNumberRaw, 10);
      const page = state.pages.find((item) => item.pageNumber === pageNumber);
      expect(page).toBeDefined();
      expect(page?.groups.length ?? 0).toBeGreaterThanOrEqual(range[0]);
      expect(page?.groups.length ?? 0).toBeLessThanOrEqual(range[1]);
    }
  });

  it("keeps page-13 sentence continuation in one line group", () => {
    const page13 = state.pages.find((page) => page.pageNumber === 13);
    expect(page13).toBeDefined();
    const group = findGroupContaining(page13?.groups ?? [], "我が国における少子高齢化");
    expect(group).toBeDefined();
    const text = normalizeText(groupText(group!));
    expect(text).toContain(normalizeText("・人口減少は深刻化しており"));
  });

  it("keeps page-18 section heading marker and title in one group", () => {
    const page18 = state.pages.find((page) => page.pageNumber === 18);
    expect(page18).toBeDefined();
    const group = findGroupContaining(page18?.groups ?? [], "第ビ節");
    expect(group).toBeDefined();
    const text = normalizeText(groupText(group!));
    expect(text).toContain(normalizeText("担い手不足等によるサービスの供給制約"));
  });
});
