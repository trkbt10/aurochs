/**
 * @file Real PDF conversion test with k-namingrule-dl.pdf (table inference)
 */

import { readFileSync } from "node:fs";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { GraphicFrame } from "@aurochs-office/pptx/domain/shape";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { convertPageToShapes } from "./pdf-to-shapes";
import { getSampleFixturePath } from "../test-utils/pdf-fixtures";

function cellText(cell: {
  textBody?: { paragraphs: readonly { runs: readonly { type: string; text?: string }[] }[] };
}): string {
  const paras = cell.textBody?.paragraphs ?? [];
  return paras
    .map((p) => p.runs.map((r) => (r.type === "text" ? (r.text ?? "") : r.type === "break" ? "\n" : "")).join(""))
    .join("\n");
}

describe("convertPageToShapes (real PDF) - table inference", () => {
  const PDF_PATH = getSampleFixturePath("k-namingrule-dl.pdf");
  const RESOURCE_PDF_PATH = getSampleFixturePath("k-resource-dl.pdf");

  it("converts page 1 tables (2-column) to graphicFrame tables", async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [1] });
    const page = pdfDoc.pages[0];
    if (!page) {
      throw new Error("Expected page 1");
    }

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
    });

    const tableFrames = shapes
      .filter((s): s is GraphicFrame => s.type === "graphicFrame" && s.content.type === "table")
      .sort((a, b) => (a.transform.y as number) - (b.transform.y as number));

    expect(tableFrames.length).toBeGreaterThanOrEqual(2);

    const tables = tableFrames.map((f) => {
      if (f.content.type !== "table") {
        throw new Error("Expected table graphicFrame");
      }
      return f.content.data.table;
    });

    for (const t of tables.slice(0, 2)) {
      expect(t.grid.columns.length).toBe(2);
      expect(t.rows.length).toBeGreaterThanOrEqual(2);
    }

    const t0Text = tables[0]!.rows.flatMap((r) => r.cells.map((c) => cellText(c))).join("\n");
    const t1Text = tables[1]!.rows.flatMap((r) => r.cells.map((c) => cellText(c))).join("\n");

    expect(t0Text).toContain("都道府県コード_都道府県名_all_作成年月日");
    expect(t0Text).toContain(".csv");
    expect(t1Text).toContain("diff_作成年月日");
    expect(t1Text).toContain(".csv");
  });

  it("converts the prefecture table to a graphicFrame table", async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [2] });
    const page = pdfDoc.pages[0];
    if (!page) {
      throw new Error("Expected page 2");
    }

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
    });

    const tableFrames = shapes.filter(
      (s): s is GraphicFrame => s.type === "graphicFrame" && s.content.type === "table",
    );

    expect(tableFrames.length).toBeGreaterThanOrEqual(1);

    // This page has two independent 3-column tables side-by-side (not one 6-column table).
    const tables = tableFrames
      .map((f) => ({ frame: f, table: f.content.type === "table" ? f.content.data.table : null }))
      .filter((x): x is { frame: GraphicFrame; table: NonNullable<(typeof x)["table"]> } => x.table !== null)
      .sort((a, b) => (a.frame.transform.x as number) - (b.frame.transform.x as number));

    expect(tables.length).toBeGreaterThanOrEqual(2);

    for (const { table } of tables.slice(0, 2)) {
      expect(table.rows.length).toBeGreaterThanOrEqual(20);
      expect(table.grid.columns.length).toBe(3);
    }

    const left = tables[0]!.table;
    const right = tables[1]!.table;

    const leftTexts = left.rows.flatMap((r) => r.cells.map((c) => cellText(c)));
    const rightTexts = right.rows.flatMap((r) => r.cells.map((c) => cellText(c)));
    const allLeftText = leftTexts.join("\n");
    const allRightText = rightTexts.join("\n");

    expect(allLeftText).toContain("00");
    expect(allLeftText).toContain("hokkaido");
    expect(allLeftText).toContain("北海道");

    expect(allRightText).toContain("25");
    expect(allRightText).toContain("shiga");
    expect(allRightText).toContain("滋賀県");

    // Header is 3 columns: [都道府県コード, 都道府県名, 参考]
    //
    // PDFs differ in how they encode this header:
    // - Single row with multi-line cell text
    // - Two header rows (second row contains "(半角…)" and the 参考 column is empty/merged)
    const leftHeader0 = left.rows[0]!;
    const leftHeader0Texts = leftHeader0.cells.map((c) => cellText(c).trim());
    if (leftHeader0Texts[0]?.includes("（半角数字）") || leftHeader0Texts[1]?.includes("（半角英字）")) {
      expect(leftHeader0Texts).toEqual(["都道府県コード\n（半角数字）", "都道府県名\n（半角英字）", "参考"]);
    } else {
      const leftHeader1 = left.rows[1]!;
      const leftHeader1Texts = leftHeader1.cells.map((c) => cellText(c).trim());
      expect(leftHeader0Texts).toEqual(["都道府県コード", "都道府県名", "参考"]);
      expect(leftHeader1Texts).toEqual(["（半角数字）", "（半角英字）", ""]);
    }

    // Grid lines/backgrounds should be represented as table borders/fills (not separate shapes)
    expect(leftHeader0.cells.some((c) => c.properties.fill?.type === "solidFill")).toBe(true);
    expect(leftHeader0.cells[0]?.properties.borders?.top).toBeDefined();
    expect(leftHeader0.cells[0]?.properties.borders?.left).toBeDefined();
    expect(leftHeader0.cells[0]?.properties.borders?.right).toBeDefined();
    {
      const header1 = left.rows[1];
      const bottom = leftHeader0.cells[0]?.properties.borders?.bottom ?? header1?.cells[0]?.properties.borders?.bottom;
      expect(bottom).toBeDefined();
    }

    const rightHeader0 = right.rows[0]!;
    expect(rightHeader0.cells.some((c) => c.properties.fill?.type === "solidFill")).toBe(true);
    expect(rightHeader0.cells[0]?.properties.borders?.top).toBeDefined();
    expect(rightHeader0.cells[0]?.properties.borders?.left).toBeDefined();
    expect(rightHeader0.cells[0]?.properties.borders?.right).toBeDefined();
    {
      const header1 = right.rows[1];
      const bottom = rightHeader0.cells[0]?.properties.borders?.bottom ?? header1?.cells[0]?.properties.borders?.bottom;
      expect(bottom).toBeDefined();
    }

    // Ensure code / romanized / reference are separate cells (00 / zenkoku / 全国)
    expect(leftTexts.some((t) => t.trim() === "00")).toBe(true);
    expect(leftTexts.some((t) => t.trim() === "zenkoku")).toBe(true);
    expect(leftTexts.some((t) => t.trim() === "全国")).toBe(true);
  });

  it("converts k-resource-dl.pdf page 2 (改版履歴) table to a 5-column graphicFrame table", async () => {
    const pdfBytes = readFileSync(RESOURCE_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [2] });
    const page = pdfDoc.pages[0];
    if (!page) {
      throw new Error("Expected page 2");
    }

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
    });

    const tableFrames = shapes.filter(
      (s): s is GraphicFrame => s.type === "graphicFrame" && s.content.type === "table",
    );

    expect(tableFrames.length).toBeGreaterThanOrEqual(1);

    const frame = tableFrames[0];
    if (!frame) {
      throw new Error("Expected table graphicFrame");
    }
    if (frame.content.type !== "table") {
      throw new Error("Expected table graphicFrame");
    }
    const table = frame.content.data.table;

    expect(table.grid.columns.length).toBe(5);
    expect(table.rows.length).toBeGreaterThanOrEqual(5);

    const headerTexts = table.rows[0]!.cells.map((c) => cellText(c).trim());
    expect(headerTexts).toEqual(["項番", "版数", "変更箇所", "変更内容", "変更理由等"]);
  });

  it("converts k-resource-dl.pdf page 4 (凡例 / 表1 / 表2) tables to graphicFrame tables", async () => {
    const pdfBytes = readFileSync(RESOURCE_PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [4] });
    const page = pdfDoc.pages[0];
    if (!page) {
      throw new Error("Expected page 4");
    }

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
    });

    const tableFrames = shapes
      .filter((s): s is GraphicFrame => s.type === "graphicFrame" && s.content.type === "table")
      .sort(
        (a, b) =>
          (a.transform.y as number) - (b.transform.y as number) ||
          (a.transform.x as number) - (b.transform.x as number),
      );

    expect(tableFrames.length).toBeGreaterThanOrEqual(3);

    const tables = tableFrames.map((f) => {
      if (f.content.type !== "table") {
        throw new Error("Expected table graphicFrame");
      }
      return f.content.data.table;
    });

    const allTexts = tables.map((t) => t.rows.flatMap((r) => r.cells.map((c) => cellText(c))).join("\n"));

    expect(allTexts.some((t) => t.includes("凡例") && t.includes("凡例の説明"))).toBe(true);
    expect(allTexts.some((t) => t.includes("エスケープシーケンス"))).toBe(true);
    expect(allTexts.some((t) => t.includes("表") && t.includes("CSV") && t.includes("エスケープ"))).toBe(true);
  });
});
