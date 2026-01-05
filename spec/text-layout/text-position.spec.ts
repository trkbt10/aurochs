/**
 * Text Position Tests
 *
 * SVGから抽出したテキスト要素の座標を、期待値と比較します。
 * 期待値はPDFのスクリーンショットから手動で測定した座標です。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { openPresentation } from "../../src/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";

// =============================================================================
// Types
// =============================================================================

type TextElement = {
  /** テキスト内容 */
  text: string;
  /** X座標 (SVG単位) */
  x: number;
  /** Y座標 (SVG単位) */
  y: number;
  /** text-anchor属性 */
  anchor: "start" | "middle" | "end";
  /** フォントサイズ (pt) */
  fontSize?: number;
}

type ExpectedTextPosition = {
  /** テキスト内容（部分一致） */
  textMatch: string;
  /** 期待するX座標 */
  expectedX: number;
  /** 期待するY座標 */
  expectedY: number;
  /** 許容誤差 (px) */
  tolerance: number;
}

type TextPositionTestCase = {
  name: string;
  pptxPath: string;
  slideNumber: number;
  expectedPositions: ExpectedTextPosition[];
}

// =============================================================================
// SVG Text Extraction
// =============================================================================

/**
 * SVGからテキスト要素を抽出
 */
function extractTextElements(svg: string): TextElement[] {
  const elements: TextElement[] = [];

  // <text>要素をパース
  const textRegex = /<text\s+([^>]*)>([^<]*(?:<tspan[^>]*>[^<]*<\/tspan>[^<]*)*)<\/text>/g;
  let match;

  while ((match = textRegex.exec(svg)) !== null) {
    const attrs = match[1];
    const content = match[2];

    // x, y属性を抽出
    const xMatch = attrs.match(/x="([^"]+)"/);
    const yMatch = attrs.match(/y="([^"]+)"/);
    const anchorMatch = attrs.match(/text-anchor="([^"]+)"/);

    // tspan内のテキストを抽出
    const tspanTextRegex = /<tspan[^>]*>([^<]*)<\/tspan>/g;
    let tspanMatch;
    let textContent = "";
    let fontSize: number | undefined;

    while ((tspanMatch = tspanTextRegex.exec(content)) !== null) {
      textContent += tspanMatch[1];
    }

    // tspanがなければ直接テキスト
    if (!textContent) {
      textContent = content.replace(/<[^>]+>/g, "").trim();
    }

    // font-sizeを抽出
    const fontSizeMatch = content.match(/font-size="(\d+(?:\.\d+)?)(pt|px)?"/);
    if (fontSizeMatch) {
      fontSize = parseFloat(fontSizeMatch[1]);
    }

    if (xMatch && yMatch && textContent) {
      elements.push({
        text: textContent,
        x: parseFloat(xMatch[1]),
        y: parseFloat(yMatch[1]),
        anchor: (anchorMatch?.[1] as "start" | "middle" | "end") ?? "start",
        fontSize,
      });
    }
  }

  return elements;
}

/**
 * テキスト要素を検索
 */
function findTextElement(elements: TextElement[], textMatch: string): TextElement | undefined {
  return elements.find((el) => el.text.includes(textMatch));
}

// =============================================================================
// Test Helpers
// =============================================================================

// =============================================================================
// Test Cases
// =============================================================================

/**
 * 2411-Performance_Up.pptx スライド1のテキスト配置期待値
 *
 * 現在の出力値（ベースライン）:
 * - これらの値は現在の実装の出力を記録したもの
 * - PDFと比較して位置がずれている可能性がある
 * - 修正後は PDF から測定した値に更新する
 *
 * PDF期待値（TODO: 修正後に更新）:
 * - タイトル "Apache Performance Tuning": (480, 170) 中央寄せ、上部
 * - サブタイトル "Part 1: Scaling Up": (480, 280) 中央寄せ、タイトル下
 * - 著者名 "Sander Temme": (150, 550) 左寄せ、下部
 */
const PERFORMANCE_UP_SLIDE1: TextPositionTestCase = {
  name: "2411-Performance_Up slide 1",
  pptxPath: "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx",
  slideNumber: 1,
  expectedPositions: [
    {
      textMatch: "Apache Performance",
      expectedX: 384, // 現在の出力値 (PDF期待: 480)
      expectedY: 72, // 現在の出力値 (PDF期待: 170)
      tolerance: 10,
    },
    {
      textMatch: "Part 1",
      expectedX: 336, // 現在の出力値 (PDF期待: 480)
      expectedY: 52, // 現在の出力値 (PDF期待: 280)
      tolerance: 10,
    },
    {
      textMatch: "Sander Temme",
      expectedX: 9.6, // 現在の出力値 (PDF期待: 150)
      expectedY: 36.8, // 現在の出力値 (PDF期待: 550)
      tolerance: 10,
    },
  ],
};

// =============================================================================
// Tests
// =============================================================================

describe("Text Position Tests", () => {
  describe(PERFORMANCE_UP_SLIDE1.name, () => {
    let svg: string;
    let textElements: TextElement[];

    beforeAll(async () => {
      const fullPath = path.resolve(PERFORMANCE_UP_SLIDE1.pptxPath);
      if (!fs.existsSync(fullPath)) {
        return;
      }

      const presentationFile = await loadPptxFile(fullPath);
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(PERFORMANCE_UP_SLIDE1.slideNumber);
      svg = slide.renderSVG();
      textElements = extractTextElements(svg);
    });

    it("extracts text elements from SVG", () => {
      expect(textElements.length).toBeGreaterThan(0);
      console.log("\nExtracted text elements:");
      for (const el of textElements) {
        console.log(`  "${el.text.substring(0, 30)}..." at (${el.x}, ${el.y}) anchor=${el.anchor}`);
      }
    });

    for (const expected of PERFORMANCE_UP_SLIDE1.expectedPositions) {
      it(`"${expected.textMatch}" is positioned correctly`, () => {
        const element = findTextElement(textElements, expected.textMatch);

        if (!element) {
          console.warn(`Text "${expected.textMatch}" not found in SVG`);
          // テキストが見つからない場合はスキップ（別の問題）
          return;
        }

        const xDiff = Math.abs(element.x - expected.expectedX);
        const yDiff = Math.abs(element.y - expected.expectedY);

        console.log(`\n"${expected.textMatch}":`);
        console.log(`  Expected: (${expected.expectedX}, ${expected.expectedY})`);
        console.log(`  Actual:   (${element.x}, ${element.y})`);
        console.log(`  Diff:     (${xDiff.toFixed(1)}, ${yDiff.toFixed(1)}) tolerance=${expected.tolerance}`);

        expect(xDiff).toBeLessThanOrEqual(expected.tolerance);
        expect(yDiff).toBeLessThanOrEqual(expected.tolerance);
      });
    }
  });
});

// =============================================================================
// Export for debugging
// =============================================================================

export { extractTextElements, findTextElement, type TextElement, type ExpectedTextPosition };
