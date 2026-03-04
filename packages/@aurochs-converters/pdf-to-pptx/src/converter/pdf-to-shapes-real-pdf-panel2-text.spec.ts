/**
 * @file Real PDF conversion regression test (panel2.pdf) - text grouping must not interleave lines
 */

import { readFileSync } from "node:fs";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Shape, SpShape } from "@aurochs-office/pptx/domain/shape";
import { parsePdf } from "@aurochs/pdf/parser/core/pdf-parser";
import { convertPageToShapes } from "./pdf-to-shapes";
import { getSampleFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";

function extractTextFromShapes(shapes: readonly Shape[]): string {
  const texts: string[] = [];
  for (const s of shapes) {
    if (s.type !== "sp") {
      continue;
    }
    const sp = s as SpShape;
    const tb = sp.textBody;
    if (!tb) {
      continue;
    }
    for (const p of tb.paragraphs) {
      for (const r of p.runs) {
        if (r.type === "text" || r.type === "field") {
          texts.push(r.text);
        } else {
          texts.push("\n");
        }
      }
      texts.push("\n");
    }
    texts.push("\n");
  }
  return texts.join("");
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "");
}

function extractTextFromShape(shape: SpShape): string {
  const tb = shape.textBody;
  if (!tb) {
    return "";
  }
  const out: string[] = [];
  for (const p of tb.paragraphs) {
    for (const r of p.runs) {
      if (r.type === "text" || r.type === "field") {
        out.push(r.text);
      } else {
        out.push("\n");
      }
    }
    out.push("\n");
  }
  return out.join("");
}

describe("convertPageToShapes (real PDF) - panel2.pdf", () => {
  const PDF_PATH = getSampleFixturePath("panel2.pdf");

  it("does not interleave Latin and Japanese text in a single line cluster (page 1)", async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [1] });
    const page = pdfDoc.pages[0];
    if (!page) {
      throw new Error("Expected page 1");
    }

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
      grouping: { preset: "text" },
    });

    const textShapes = shapes.filter((s): s is SpShape => s.type === "sp" && s.textBody !== undefined);
    const hasBunkoLabel = textShapes.some((s) => extractTextFromShape(s).includes("bunko.jp"));
    expect(hasBunkoLabel).toBe(true);

    const bunkoShape = textShapes.find(
      (s) => extractTextFromShape(s).includes("（大文庫）は") || extractTextFromShape(s).includes("大文庫）は"),
    );
    if (!bunkoShape) {
      throw new Error('Expected a TextBox containing "（大文庫）は"');
    }
    const bunkoText = extractTextFromShape(bunkoShape);

    // Line breaks must be preserved as real line breaks, not converted into tab-separated "segments".
    expect(bunkoText).not.toContain("\t");

    const allText = extractTextFromShapes(shapes);
    const compact = normalize(allText);

    expect(compact).toContain("bunko.jp");
    expect(compact).toContain(
      "（大文庫）は、世界中のパブリックドメイン作品を収集・翻訳し、日本語で読みやすく公開するオンライン文庫です。",
    );
    expect(compact).toContain("1.文書読込→spaCy前処理");
    expect(compact).toContain("2.対訳表で未知語マッピング");
    expect(compact).toContain("3.BERT埋込ベクトル生成");
    expect(compact).toContain("世界の物語を、日本語でひらく。");

    // Regression marker: previously interleaved like "b読uみnkやo.jすp..."
    expect(allText).not.toContain("b読u");
  });
});
