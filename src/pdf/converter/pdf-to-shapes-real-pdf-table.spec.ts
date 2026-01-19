/**
 * @file Real PDF conversion test with k-namingrule-dl.pdf (table inference)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { px } from "../../ooxml/domain/units";
import type { GraphicFrame } from "../../pptx/domain/shape";
import { parsePdf } from "../parser/core/pdf-parser";
import { convertPageToShapes } from "./pdf-to-shapes";

function cellText(cell: { textBody?: { paragraphs: readonly { runs: readonly { type: string; text?: string }[] }[] } }): string {
  const paras = cell.textBody?.paragraphs ?? [];
  return paras
    .map((p) =>
      p.runs
        .map((r) => (r.type === "text" ? (r.text ?? "") : ""))
        .join(""),
    )
    .join("\n");
}

describe("convertPageToShapes (real PDF) - table inference", () => {
  const PDF_PATH = join(process.cwd(), "fixtures/samples/k-namingrule-dl.pdf");

  it("converts the prefecture table to a graphicFrame table", async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [2] });
    const page = pdfDoc.pages[0];
    if (!page) {throw new Error("Expected page 2");}

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
    });

    const tableFrames = shapes.filter(
      (s): s is GraphicFrame => s.type === "graphicFrame" && s.content.type === "table",
    );

    expect(tableFrames.length).toBeGreaterThanOrEqual(1);

    const tableFrame = tableFrames[0]!;
    if (tableFrame.content.type !== "table") {
      throw new Error("Expected table graphicFrame");
    }
    const table = tableFrame.content.data.table;
    expect(table.rows.length).toBeGreaterThanOrEqual(20);
    expect(table.grid.columns.length).toBeGreaterThanOrEqual(6);

    const cellTexts = table.rows.flatMap((r) => r.cells.map((c) => cellText(c)));
    const allCellText = cellTexts.join("\n");

    expect(allCellText).toContain("00");
    expect(allCellText).toContain("hokkaido");
    expect(allCellText).toContain("北海道");

    // Header is 3 columns × 2 blocks: [都道府県コード, 都道府県名, 参考] x2
    const headerRow0 = table.rows[0]!;
    const headerTexts0 = headerRow0.cells.map((c) => cellText(c).trim());
    expect(headerTexts0).toEqual([
      "都道府県コード\n（半角数字）",
      "都道府県名\n（半角英字）",
      "参考",
      "都道府県コード\n（半角数字）",
      "都道府県名\n（半角英字）",
      "参考",
    ]);

    // Ensure code / romanized / reference are separate cells (00 / zenkoku / 全国)
    expect(cellTexts.some((t) => t.trim() === "00")).toBe(true);
    expect(cellTexts.some((t) => t.trim() === "zenkoku")).toBe(true);
    expect(cellTexts.some((t) => t.trim() === "全国")).toBe(true);
  });
});
