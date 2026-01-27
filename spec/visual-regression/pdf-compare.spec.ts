/**
 * PDF Screenshot Comparison Tests
 *
 * These tests compare our SVG rendering output against PDF screenshots
 * generated from LibreOffice. This is the ground truth for text layout,
 * positioning, and overall visual fidelity.
 *
 * Baseline snapshots are generated via:
 *   ./spec/visual-regression/scripts/generate-snapshots.sh <pptx-file>
 *
 * The snapshots are generated from LibreOffice's PDF export, which is
 * considered the reference implementation for PPTX rendering.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "../../src/pptx";
import { openPresentation } from "../../src/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "../../src/pptx/render/svg";
import {
  compareWithDetails,
  generateCompareReport,
  printCompareReport,
  saveCompareReport,
  listSnapshots,
  type CompareOptions,
  type DetailedCompareResult,
} from "./compare";

/**
 * Text layout test configuration
 * Focus on slides with significant text content
 */
type TextLayoutTestCase = {
  name: string;
  pptxPath: string;
  slides: number[];
  /** Maximum allowed diff percentage for text layout */
  maxDiffPercent: number;
  /** Description of what this test validates */
  description: string;
}

const TEXT_LAYOUT_TESTS: TextLayoutTestCase[] = [
  {
    name: "2411-Performance_Up",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx",
    slides: [1], // Title slide with centered text
    maxDiffPercent: 10,
    description: "Title slide text positioning and color inheritance",
  },
];

describe("PDF Screenshot Comparison - Text Layout", () => {
  for (const testCase of TEXT_LAYOUT_TESTS) {
    describe(`${testCase.name}: ${testCase.description}`, () => {
      let presentationFile: PresentationFile | null = null;
      let skipReason: string | null = null;

      beforeAll(async () => {
        const fullPath = path.resolve(testCase.pptxPath);

        if (!fs.existsSync(fullPath)) {
          skipReason = `PPTX file not found: ${testCase.pptxPath}`;
          return;
        }

        const availableSnapshots = listSnapshots(testCase.name);
        if (availableSnapshots.length === 0) {
          skipReason = `No baseline snapshots. Run: ./spec/visual-regression/scripts/generate-snapshots.sh ${testCase.pptxPath}`;
          return;
        }

        ({ presentationFile } = await loadPptxFile(fullPath));
      });

      for (const slideNum of testCase.slides) {
        it(`slide ${slideNum} text layout matches PDF`, () => {
          if (skipReason !== null) {
            console.warn(`SKIPPED: ${skipReason}`);
            return;
          }

          if (presentationFile === null) {
            throw new Error("Presentation file not loaded");
          }

          const presentation = openPresentation(presentationFile);
          const slide = presentation.getSlide(slideNum);
          const svg = renderSlideToSvg(slide).svg;

          const result = compareWithDetails(svg, testCase.name, slideNum, {
            maxDiffPercent: testCase.maxDiffPercent,
            threshold: 0.1,
          });

          if (!result.match) {
            console.log(`\n--- Text Layout Diff: ${testCase.name} slide ${slideNum} ---`);
            console.log(`Diff: ${result.diffPercent.toFixed(2)}% (max: ${testCase.maxDiffPercent}%)`);
            console.log(`Diff pixels: ${result.diffPixels} / ${result.totalPixels}`);
            console.log(`Expected: ${result.snapshotPath}`);
            console.log(`Actual: ${result.actualPath}`);
            if (result.diffImagePath) {
              console.log(`Diff image: ${result.diffImagePath}`);
            }
          }

          expect(result.match).toBe(true);
        });
      }
    });
  }
});

/**
 * Helper function to run comparison and generate a full report
 * Useful for manual testing and CI reporting
 */
export async function runFullComparison(
  pptxPath: string,
  snapshotName: string,
  options: CompareOptions = {},
): Promise<void> {
  const { presentationFile } = await loadPptxFile(pptxPath);
  const presentation = openPresentation(presentationFile);
  const slides = listSnapshots(snapshotName);

  if (slides.length === 0) {
    console.error(`No snapshots found for ${snapshotName}`);
    return;
  }

  const results: DetailedCompareResult[] = [];

  for (const slideNum of slides) {
    const slide = presentation.getSlide(slideNum);
    const svg = renderSlideToSvg(slide).svg;
    const result = compareWithDetails(svg, snapshotName, slideNum, options);
    results.push(result);
  }

  const report = generateCompareReport(results);
  printCompareReport(report);

  const reportPath = saveCompareReport(report);
  console.log(`Report saved to: ${reportPath}`);
}

/**
 * Test a single slide and get detailed comparison result
 */
export async function testSingleSlide(
  pptxPath: string,
  snapshotName: string,
  slideNumber: number,
  options: CompareOptions = {},
): Promise<{
  svg: string;
  result: DetailedCompareResult;
}> {
  const { presentationFile } = await loadPptxFile(pptxPath);
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(slideNumber);
  const svg = renderSlideToSvg(slide).svg;

  const result = compareWithDetails(svg, snapshotName, slideNumber, options);

  return { svg, result };
}
