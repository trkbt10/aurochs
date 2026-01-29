/**
 * @file Diagram (SmartArt) visual regression test utilities
 *
 * Provides shared types and utilities for ECMA-376 Part 1, Section 21.4
 * (DrawingML Diagrams) visual regression tests within @oxen-renderer/diagram.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "@oxen-office/pptx";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { loadPptxFile } from "../../../../../scripts/lib/pptx-loader";
import { compareSvgToSnapshot, type CompareOptions, type CompareResult } from "../../../../../spec/visual-regression/compare";

/**
 * Threshold levels for diagram visual tests based on implementation maturity.
 */
export const DIAGRAM_THRESHOLDS = {
  /** New/experimental implementations (25-35%) */
  experimental: 30,
  /** Stabilizing implementations (15-20%) */
  stabilizing: 20,
  /** Mature implementations (5-10%) */
  mature: 10,
  /** Pixel-perfect implementations (1-3%) */
  pixelPerfect: 3,
} as const;

/**
 * Diagram types based on ECMA-376 Part 1, Section 21.4.
 */
export type DiagramType =
  | "list"
  | "process"
  | "cycle"
  | "hierarchy"
  | "relationship"
  | "matrix"
  | "pyramid"
  | "custom";

/**
 * Diagram test case definition with ECMA-376 section references.
 */
export type DiagramTestCase = {
  /** Test name (used for snapshot directory) */
  readonly name: string;
  /** Path to PPTX fixture file (relative to project root) */
  readonly pptxPath: string;
  /** Slide number containing the diagram */
  readonly slideNumber: number;
  /** Diagram type */
  readonly diagramType: DiagramType;
  /** ECMA-376 section references (e.g., ["21.4.2.19"]) */
  readonly ecmaSections: readonly string[];
  /** Maximum allowed diff percentage */
  readonly threshold: number;
  /** Optional description */
  readonly description?: string;
};

/**
 * Run a diagram visual test case.
 */
export async function runDiagramTest(testCase: DiagramTestCase): Promise<CompareResult> {
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

  return compareSvgToSnapshot(svg, testCase.name, testCase.slideNumber, options);
}
