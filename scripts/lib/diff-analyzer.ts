/**
 * @file Visual diff analysis utility
 *
 * Analyzes visual regression test results to identify specification gaps.
 */

import { compareSlideToSnapshot, printCompareResult } from "./visual-compare";

export type DiffAnalysisResult = {
  name: string;
  slideNumber: number;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath: string | null;
}

/**
 * Analyze all slides in a PPTX file for visual differences.
 */
export async function analyzeAllSlides(
  pptxPath: string,
  snapshotName: string,
  slideNumbers: number[],
): Promise<DiffAnalysisResult[]> {
  const results: DiffAnalysisResult[] = [];

  for (const slideNum of slideNumbers) {
    try {
      const result = await compareSlideToSnapshot(pptxPath, snapshotName, slideNum, {
        maxDiffPercent: 100,
      });

      results.push({
        name: snapshotName,
        slideNumber: slideNum,
        diffPercent: result.diffPercent,
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
        diffImagePath: result.diffImagePath,
      });
    } catch (e) {
      console.error(`Error analyzing slide ${slideNum}:`, e);
    }
  }

  return results;
}

/**
 * Print a summary table of diff results.
 */
export function printDiffSummary(results: DiffAnalysisResult[]): void {
  console.log("\n=== Diff Summary ===");
  console.log("Slide\tDiff %\tPixels\tStatus");
  console.log("-----\t------\t------\t------");

  for (const r of results) {
    const status = r.diffPercent < 5 ? "✅" : r.diffPercent < 15 ? "⚠️" : "❌";
    console.log(`${r.slideNumber}\t${r.diffPercent.toFixed(2)}%\t${r.diffPixels}\t${status}`);
  }

  const avgDiff = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;
  console.log(`\nAverage diff: ${avgDiff.toFixed(2)}%`);
}
