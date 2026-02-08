/**
 * @file Chart visual regression test utilities
 *
 * Provides shared types and utilities for ECMA-376 Part 1, Section 21.2
 * (DrawingML Charts) visual regression tests within @aurochs-renderer/chart.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { openPresentation } from "@aurochs-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS } from "@aurochs-renderer/pptx/render-options";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
import { loadPptxFile } from "../../../../../scripts/lib/pptx-loader";
import {
  compareSvgToSnapshot,
  type CompareOptions,
  type CompareResult,
} from "../../../../../spec/visual-regression/compare";

/**
 * Threshold levels for chart visual tests based on implementation maturity.
 */
export const CHART_THRESHOLDS = {
  /** New/experimental implementations (20-30%) */
  experimental: 25,
  /** Stabilizing implementations (10-15%) */
  stabilizing: 15,
  /** Mature implementations (3-5%) */
  mature: 5,
  /** Pixel-perfect implementations (0.5-1%) */
  pixelPerfect: 1,
} as const;

/**
 * Chart test case definition with ECMA-376 section references.
 */
export type ChartTestCase = {
  /** Test name (used for snapshot directory) */
  readonly name: string;
  /** Path to PPTX fixture file (relative to project root) */
  readonly pptxPath: string;
  /** Slide number containing the chart */
  readonly slideNumber: number;
  /** ECMA-376 section references (e.g., ["21.2.2.16"]) */
  readonly ecmaSections: readonly string[];
  /** Maximum allowed diff percentage */
  readonly threshold: number;
  /** Optional description */
  readonly description?: string;
};

/**
 * Run a chart visual test case.
 */
export async function runChartTest(testCase: ChartTestCase): Promise<CompareResult> {
  const fullPath = path.resolve(testCase.pptxPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fixture not found: ${testCase.pptxPath}`);
  }

  const { presentationFile } = await loadPptxFile(fullPath);
  const presentation = openPresentation(presentationFile, {
    renderOptions: LIBREOFFICE_RENDER_OPTIONS,
  });

  const slide = presentation.getSlide(testCase.slideNumber);
  const { svg } = renderSlideToSvg(slide);

  const options: CompareOptions = {
    maxDiffPercent: testCase.threshold,
  };

  return compareSvgToSnapshot({
    svg,
    snapshotName: testCase.name,
    slideNumber: testCase.slideNumber,
    options,
  });
}
