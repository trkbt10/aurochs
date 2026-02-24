/**
 * @file Regression tests for mlit-001059436.pdf title/subtitle grouping.
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

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(CURRENT_DIR, "../../../../fixtures/block-segmentation-corpus/mlit-001059436.pdf");

type PageGrouping = {
  readonly pageNumber: number;
  readonly groups: readonly GroupedText[];
};

function findGroupContaining(groups: readonly GroupedText[], token: string): GroupedText | undefined {
  const normalizedToken = normalizeText(token);
  return groups.find((group) => normalizeText(groupText(group)).includes(normalizedToken));
}

describe("mlit-001059436 grouping", () => {
  const state: { pages: readonly PageGrouping[] } = { pages: [] };

  beforeAll(async () => {
    if (!existsSync(FIXTURE_PATH)) {
      state.pages = [];
      return;
    }

    const bytes = readFileSync(FIXTURE_PATH);
    const parsed = await parsePdf(bytes, {
      pages: [1, 2],
      encryption: { mode: "password", password: "" },
    });

    state.pages = await Promise.all(parsed.pages.map(async (page) => {
      const pageTexts = page.elements.filter((element): element is PdfText => element.type === "text");
      const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
      const normalized = await normalizePageElementsForDisplay({
        pdfBytes: bytes,
        pageNumber: page.pageNumber,
        pageWidth: page.width,
        pageHeight: page.height,
        texts: pageTexts,
        paths: pagePaths,
      });
      const blockingZones = buildBlockingZonesFromPageElements({ paths: normalized.paths });
      return {
        pageNumber: page.pageNumber,
        groups: spatialGrouping(normalized.texts, {
          pageWidth: page.width,
          pageHeight: page.height,
          blockingZones: blockingZones.length > 0 ? blockingZones : undefined,
        }),
      };
    }));
  });

  (existsSync(FIXTURE_PATH) ? it : it.skip)("has mlit-001059436 fixture", () => {
    expect(existsSync(FIXTURE_PATH)).toBe(true);
  });

  it("keeps first-page subtitle line contiguous across the mid-page area", () => {
    const page1 = state.pages.find((page) => page.pageNumber === 1);
    expect(page1).toBeDefined();
    const normalizedGroups = (page1?.groups ?? []).map((group) => normalizeText(groupText(group)));
    const targetToken = normalizeText("事故等調査を実施し、安全対策を関係者へ提言");
    expect(normalizedGroups.some((text) => text.includes(targetToken))).toBe(true);
  });

  it("keeps second-page horizontal subtitle as one contiguous group", () => {
    const page2 = state.pages.find((page) => page.pageNumber === 2);
    expect(page2).toBeDefined();
    const subtitle = findGroupContaining(page2?.groups ?? [], "～運輸の安全性の更なる向上を図る観点からは");
    expect(subtitle).toBeDefined();
    const text = normalizeText(groupText(subtitle!));
    expect(text).toContain(normalizeText("社会全体に幅広く水平展開されることが極めて重要"));
    expect(text).not.toContain(normalizeText("船舶事故ハザードマップ"));
  });

  it("keeps second-page left-column digest text separated from right-column hazard-map body", () => {
    const page2 = state.pages.find((page) => page.pageNumber === 2);
    expect(page2).toBeDefined();
    const left = findGroupContaining(page2?.groups ?? [], "～各モードごと又はテーマを決めモード横断的に事故");
    const right = findGroupContaining(page2?.groups ?? [], "船舶交通の安全性の更なる向上のため");
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(left).not.toBe(right);
  });

  it("keeps second-page grouping count in stable range", () => {
    const page2 = state.pages.find((page) => page.pageNumber === 2);
    expect(page2).toBeDefined();
    expect(page2?.groups.length ?? 0).toBeGreaterThanOrEqual(26);
    expect(page2?.groups.length ?? 0).toBeLessThanOrEqual(44);
  });
});
