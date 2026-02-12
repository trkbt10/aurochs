/**
 * @file Visual comparison utility for PPTX rendering against LibreOffice baseline
 *
 * This module provides a shared implementation for comparing SVG output
 * against LibreOffice-generated PNG snapshots. It should be used by scripts
 * that need to check visual rendering quality.
 *
 * Usage:
 * ```typescript
 * import { compareSlideToSnapshot } from "../scripts/lib/visual-compare";
 *
 * const result = await compareSlideToSnapshot(
 *   "fixtures/path/to/file.pptx",
 *   "snapshot-name",
 *   1, // slide number
 *   { maxDiffPercent: 10 }
 * );
 * console.log(`Diff: ${result.diffPercent.toFixed(2)}%`);
 * ```
 */

import { openPresentation } from "@aurochs-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS } from "@aurochs-renderer/pptx/render-options";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
import { compareSvgToSnapshot, type CompareOptions, type CompareResult } from "../../spec/visual-regression/compare";
import { loadPptxFile } from "./pptx-loader";

type CompareSlideToSnapshotArgs = {
  readonly pptxPath: string;
  readonly snapshotName: string;
  readonly slideNumber: number;
  readonly options?: CompareOptions;
};

/**
 * Compare a slide rendering against LibreOffice snapshot.
 *
 * @param pptxPath - Path to the PPTX file
 * @param snapshotName - Name of the snapshot directory
 * @param slideNumber - Slide number to compare (1-based)
 * @param options - Comparison options
 * @returns Comparison result with diff percentage and pixel count
 */
export async function compareSlideToSnapshot(
  args: CompareSlideToSnapshotArgs,
): Promise<CompareResult & { svg: string }> {
  const { pptxPath, snapshotName, slideNumber, options } = args;
  const { presentationFile } = await loadPptxFile(pptxPath);
  const presentation = openPresentation(presentationFile, {
    renderOptions: LIBREOFFICE_RENDER_OPTIONS,
  });
  const slide = presentation.getSlide(slideNumber);
  const { svg } = renderSlideToSvg(slide);

  const result = compareSvgToSnapshot({ svg, snapshotName, slideNumber, options });

  return { ...result, svg };
}

/**
 * Print comparison result to console.
 */
export function printCompareResult(result: CompareResult, snapshotName: string, slideNumber: number): void {
  console.log(`\n=== ${snapshotName} slide ${slideNumber} ===`);
  console.log(`Diff percent: ${result.diffPercent.toFixed(2)}%`);
  console.log(`Diff pixels: ${result.diffPixels} / ${result.totalPixels}`);
  if (result.diffImagePath !== null) {
    console.log(`Diff image: ${result.diffImagePath}`);
  }
  console.log(`Match: ${result.match}`);
}
