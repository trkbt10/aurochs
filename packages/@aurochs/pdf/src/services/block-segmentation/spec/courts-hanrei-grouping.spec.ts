/**
 * @file Grouping regression tests for courts-hanrei-87071.pdf.
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

function nonEmptyGroups(groups: readonly GroupedText[]): readonly GroupedText[] {
  return groups.filter((group) => normalizeText(groupText(group)).length > 0);
}

function findGroupContaining(groups: readonly GroupedText[], token: string): GroupedText | undefined {
  const normalizedToken = normalizeText(token);
  return groups.find((group) => normalizeText(groupText(group)).includes(normalizedToken));
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus/courts-hanrei-87071.pdf");

type PageGrouping = {
  readonly pageNumber: number;
  readonly groups: readonly GroupedText[];
};

describe("courts hanrei grouping", () => {
  const state: { pages: readonly PageGrouping[] } = { pages: [] };

  beforeAll(async () => {
    if (!existsSync(FIXTURE_PATH)) {
      state.pages = [];
      return;
    }
    const parsed = await parsePdf(readFileSync(FIXTURE_PATH), {
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

  (existsSync(FIXTURE_PATH) ? it : it.skip)("has courts hanrei fixture", () => {
    expect(existsSync(FIXTURE_PATH)).toBe(true);
  });

  it("keeps first-page judgment order block separate from issue-overview block", () => {
    const page1 = state.pages.find((page) => page.pageNumber === 1);
    expect(page1).toBeDefined();
    const shubun = findGroupContaining(page1?.groups ?? [], "主 文");
    const dai1 = findGroupContaining(page1?.groups ?? [], "第１ 請求");
    expect(shubun).toBeDefined();
    expect(dai1).toBeDefined();
    expect(shubun).not.toBe(dai1);
    const shubunText = normalizeText(groupText(shubun!));
    expect(shubunText).toContain(normalizeText("訴訟費用"));
  });

  it("separates page-number footer blocks from body blocks on selected pages", () => {
    for (const pageNumber of [2, 10, 17, 18]) {
      const page = state.pages.find((item) => item.pageNumber === pageNumber);
      expect(page).toBeDefined();
      const token = `${pageNumber}`;
      const footer = findGroupContaining(page?.groups ?? [], token);
      expect(footer).toBeDefined();
      const footerText = normalizeText(groupText(footer!));
      expect(footerText).toBe(token);
      const competing = nonEmptyGroups(page?.groups ?? []).filter((group) =>
        group !== footer && normalizeText(groupText(group)).includes(normalizeText(token))
      );
      expect(competing).toHaveLength(0);
    }
  });

  it("keeps pages 2-14 body content concentrated in a few non-footer blocks per page", () => {
    for (let pageNumber = 2; pageNumber <= 14; pageNumber++) {
      const page = state.pages.find((item) => item.pageNumber === pageNumber);
      expect(page).toBeDefined();
      const body = nonEmptyGroups(page?.groups ?? []).filter((group) => !normalizeText(groupText(group)).match(/^\d+$/));
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.length).toBeLessThanOrEqual(3);
      const longestLength = body
        .map((group) => normalizeText(groupText(group)).length)
        .reduce((max, length) => Math.max(max, length), 0);
      expect(longestLength).toBeGreaterThan(200);
    }
  });

  it("keeps appendix heading and posting-table content in separate groups on page 16", () => {
    const page16 = state.pages.find((page) => page.pageNumber === 16);
    expect(page16).toBeDefined();
    const heading = findGroupContaining(page16?.groups ?? [], "投稿記事目録");
    const tableBody = findGroupContaining(page16?.groups ?? [], "掲示板タイトル");
    expect(heading).toBeDefined();
    expect(tableBody).toBeDefined();
    expect(heading).not.toBe(tableBody);
  });

  it("keeps final-page closing marker separate from posting-body block", () => {
    const page18 = state.pages.find((page) => page.pageNumber === 18);
    expect(page18).toBeDefined();
    const body = findGroupContaining(page18?.groups ?? [], "１８ 午後２時３９分");
    const closing = findGroupContaining(page18?.groups ?? [], "以 上");
    expect(body).toBeDefined();
    expect(closing).toBeDefined();
    expect(closing).not.toBe(body);
  });

  it("keeps page-15 signature-name region split into multiple vertical groups", () => {
    const page15 = state.pages.find((page) => page.pageNumber === 15);
    expect(page15).toBeDefined();
    expect(page15?.groups.length ?? 0).toBeGreaterThanOrEqual(10);
    expect(page15?.groups.length ?? 0).toBeLessThanOrEqual(28);
  });
});
