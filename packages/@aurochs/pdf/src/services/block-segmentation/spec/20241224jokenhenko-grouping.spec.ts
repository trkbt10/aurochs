/**
 * @file Grouping regression tests for 20241224jokenhenko.pdf.
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../../../parser/core/pdf-parser";
import type { PdfPath } from "../../../domain/path";
import type { PdfText } from "../../../domain/text";
import type { GroupedText } from "../contracts/types";
import { buildBlockingZonesFromPageElements } from "../strategies/blocking-zones";
import { spatialGrouping } from "../strategies/spatial-grouping";
import { normalizePageElementsForDisplay } from "../visualization/page-coordinate-normalization";

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

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus/20241224jokenhenko.pdf");

describe("20241224jokenhenko grouping", () => {
  const state: { groups: readonly GroupedText[] } = { groups: [] };

  beforeAll(async () => {
    if (!existsSync(FIXTURE_PATH)) {
      state.groups = [];
      return;
    }

    const bytes = readFileSync(FIXTURE_PATH);
    const parsed = await parsePdf(bytes, {
      pages: [1],
      encryption: { mode: "password", password: "" },
    });
    const page = parsed.pages[0];
    if (!page) {
      throw new Error("expected page 1");
    }

    const pageTexts = page.elements.filter((element): element is PdfText => element.type === "text");
    const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
    const normalized = await normalizePageElementsForDisplay({
      pdfBytes: bytes,
      pageNumber: 1,
      pageWidth: page.width,
      pageHeight: page.height,
      texts: pageTexts,
      paths: pagePaths,
    });
    const blockingZones = buildBlockingZonesFromPageElements({ paths: normalized.paths });
    state.groups = spatialGrouping(normalized.texts, {
      pageWidth: page.width,
      pageHeight: page.height,
      blockingZones: blockingZones.length > 0 ? blockingZones : undefined,
    });
  });

  (existsSync(FIXTURE_PATH) ? it : it.skip)("has 20241224jokenhenko fixture", () => {
    expect(existsSync(FIXTURE_PATH)).toBe(true);
  });

  it("keeps notice heading separate from section-1 table header rows", () => {
    const heading = findGroupContaining(state.groups, "新しい「官報情報検索サービス」ご提供についてのお知らせ");
    const tableHeader = findGroupContaining(state.groups, "コース 定期購読 日付検索 記事検索 R7.4.1～");
    expect(heading).toBeDefined();
    expect(tableHeader).toBeDefined();
    expect(heading).not.toBe(tableHeader);
  });

  it("keeps section-1 lead text separated from A/B/C course row content", () => {
    const sectionLead = findGroupContaining(state.groups, "１ 変更内容について");
    const aRow = findGroupContaining(state.groups, "Ａコース 有 ○ ×");
    expect(sectionLead).toBeDefined();
    expect(aRow).toBeDefined();
    expect(sectionLead).not.toBe(aRow);
  });

  it("keeps section-2 heading separated from table-cell content", () => {
    const section2 = findGroupContaining(state.groups, "２ 新たに提供する「官報情報検索サービス」について");
    const tableCell = findGroupContaining(state.groups, "ＰＤＦデータ");
    expect(section2).toBeDefined();
    expect(tableCell).toBeDefined();
    expect(section2).not.toBe(tableCell);
  });

  it("keeps section-4 procedural body separate from fee section", () => {
    const fee = findGroupContaining(state.groups, "月額 ２，２００円（税込）");
    const section4 = findGroupContaining(state.groups, "４ 手続について");
    expect(fee).toBeDefined();
    expect(section4).toBeDefined();
    expect(fee).not.toBe(section4);
    const section4Text = normalizeText(groupText(section4!));
    expect(section4Text).toContain(normalizeText("Ａ、Ｂ又はＣコースをご利用の方"));
  });

  it("keeps grouping count in stable range", () => {
    expect(state.groups.length).toBeGreaterThanOrEqual(34);
    expect(state.groups.length).toBeLessThanOrEqual(60);
  });
});
