/**
 * Visual regression test utilities
 * Provides image comparison functionality for PPTX rendering tests
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const VISUAL_DIR = path.dirname(new URL(import.meta.url).pathname);
const SNAPSHOT_DIR = path.join(VISUAL_DIR, "snapshots");
const OUTPUT_DIR = path.join(VISUAL_DIR, "__output__");
const DIFF_DIR = path.join(VISUAL_DIR, "__diff__");

export type CompareResult = {
  match: boolean;
  diffPixels: number;
  diffPercent: number;
  totalPixels: number;
  diffImagePath: string | null;
}

export type CompareOptions = {
  /** Threshold for color difference (0-1, default: 0.1) */
  threshold?: number;
  /** Maximum allowed diff percentage (0-100, default: 0.1) */
  maxDiffPercent?: number;
  /** Include anti-aliased pixels in diff (default: false) */
  includeAA?: boolean;
}

/**
 * Ensure output directories exist
 */
function ensureDirs(): void {
  for (const dir of [OUTPUT_DIR, DIFF_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Convert SVG string to PNG buffer
 */
export function svgToPng(svg: string, width?: number): Buffer {
  const opts: { fitTo?: { mode: "width"; value: number } } = {};
  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }

  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

/**
 * Load PNG file and return PNG object
 */
function loadPng(filePath: string): PNG {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
}

/**
 * Save PNG to file
 */
function savePng(png: PNG, filePath: string): void {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

/**
 * Resize PNG to match target dimensions
 * Uses simple nearest-neighbor for now
 */
function resizePng(png: PNG, targetWidth: number, targetHeight: number): PNG {
  const resized = new PNG({ width: targetWidth, height: targetHeight });

  const xRatio = png.width / targetWidth;
  const yRatio = png.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * png.width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;

      resized.data[dstIdx] = png.data[srcIdx];
      resized.data[dstIdx + 1] = png.data[srcIdx + 1];
      resized.data[dstIdx + 2] = png.data[srcIdx + 2];
      resized.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return resized;
}

/**
 * Compare SVG output against baseline PNG snapshot
 */
export function compareSvgToSnapshot(
  svg: string,
  snapshotName: string,
  slideNumber: number,
  options: CompareOptions = {}
): CompareResult {
  ensureDirs();

  const { threshold = 0.1, maxDiffPercent = 0.1, includeAA = false } = options;

  const snapshotPath = path.join(
    SNAPSHOT_DIR,
    snapshotName,
    `slide-${slideNumber}.png`
  );

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Baseline snapshot not found: ${snapshotPath}`);
  }

  // Load baseline
  const baseline = loadPng(snapshotPath);

  // Convert SVG to PNG at baseline dimensions
  const actualPng = svgToPng(svg, baseline.width);
  let actual: PNG = PNG.sync.read(actualPng);

  // Save actual output for debugging
  const actualPath = path.join(
    OUTPUT_DIR,
    `${snapshotName}-slide-${slideNumber}.png`
  );
  fs.writeFileSync(actualPath, actualPng);

  // Resize if dimensions don't match
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    actual = resizePng(actual, baseline.width, baseline.height);
  }

  // Create diff image
  const diff = new PNG({ width: baseline.width, height: baseline.height });

  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold, includeAA }
  );

  const totalPixels = baseline.width * baseline.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  // Save diff image if there are differences
  let diffImagePath: string | null = null;
  if (diffPixels > 0) {
    diffImagePath = path.join(
      DIFF_DIR,
      `${snapshotName}-slide-${slideNumber}-diff.png`
    );
    savePng(diff, diffImagePath);
  }

  return {
    match,
    diffPixels,
    diffPercent,
    totalPixels,
    diffImagePath,
  };
}

/**
 * Get snapshot path for a given presentation and slide
 */
export function getSnapshotPath(
  snapshotName: string,
  slideNumber: number
): string {
  return path.join(SNAPSHOT_DIR, snapshotName, `slide-${slideNumber}.png`);
}

/**
 * Check if baseline snapshot exists
 */
export function hasSnapshot(
  snapshotName: string,
  slideNumber: number
): boolean {
  return fs.existsSync(getSnapshotPath(snapshotName, slideNumber));
}

/**
 * List available snapshots for a presentation
 */
export function listSnapshots(snapshotName: string): number[] {
  const dir = path.join(SNAPSHOT_DIR, snapshotName);
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("slide-") && f.endsWith(".png"))
    .map((f) => {
      const match = f.match(/slide-(\d+)\.png/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
}

// =============================================================================
// PDF Comparison Test Helpers
// =============================================================================

export type DetailedCompareResult = {
  snapshotName: string;
  slideNumber: number;
  snapshotPath: string;
  actualPath: string;
  width: number;
  height: number;
} & CompareResult

/**
 * Compare SVG output against PDF-generated baseline with detailed reporting
 */
export function compareWithDetails(
  svg: string,
  snapshotName: string,
  slideNumber: number,
  options: CompareOptions = {}
): DetailedCompareResult {
  ensureDirs();

  const { threshold = 0.1, maxDiffPercent = 0.1, includeAA = false } = options;

  const snapshotPath = path.join(
    SNAPSHOT_DIR,
    snapshotName,
    `slide-${slideNumber}.png`
  );

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Baseline snapshot not found: ${snapshotPath}`);
  }

  // Load baseline
  const baseline = loadPng(snapshotPath);

  // Convert SVG to PNG at baseline dimensions
  const actualPng = svgToPng(svg, baseline.width);
  let actual: PNG = PNG.sync.read(actualPng);

  // Save actual output for debugging
  const actualPath = path.join(
    OUTPUT_DIR,
    `${snapshotName}-slide-${slideNumber}.png`
  );
  fs.writeFileSync(actualPath, actualPng);

  // Resize if dimensions don't match
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    actual = resizePng(actual, baseline.width, baseline.height);
  }

  // Create diff image
  const diff = new PNG({ width: baseline.width, height: baseline.height });

  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold, includeAA }
  );

  const totalPixels = baseline.width * baseline.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  // Save diff image if there are differences
  let diffImagePath: string | null = null;
  if (diffPixels > 0) {
    diffImagePath = path.join(
      DIFF_DIR,
      `${snapshotName}-slide-${slideNumber}-diff.png`
    );
    savePng(diff, diffImagePath);
  }

  return {
    match,
    diffPixels,
    diffPercent,
    totalPixels,
    diffImagePath,
    snapshotName,
    slideNumber,
    snapshotPath,
    actualPath,
    width: baseline.width,
    height: baseline.height,
  };
}

/**
 * Generate a comparison report for a set of slides
 */
export type CompareReport = {
  snapshotName: string;
  results: DetailedCompareResult[];
  passed: number;
  failed: number;
  totalDiffPercent: number;
}











export function generateCompareReport(
  results: DetailedCompareResult[]
): CompareReport {
  const passed = results.filter((r) => r.match).length;
  const failed = results.length - passed;
  const totalDiffPercent =
    results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;

  return {
    snapshotName: results[0]?.snapshotName ?? "",
    results,
    passed,
    failed,
    totalDiffPercent,
  };
}

/**
 * Print comparison report to console
 */
export function printCompareReport(report: CompareReport): void {
  console.log("\n" + "=".repeat(60));
  console.log(`Visual Comparison Report: ${report.snapshotName}`);
  console.log("=".repeat(60));
  console.log(`Passed: ${report.passed} / ${report.results.length}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Average diff: ${report.totalDiffPercent.toFixed(2)}%`);
  console.log("-".repeat(60));

  for (const result of report.results) {
    const status = result.match ? "✓" : "✗";
    const diffStr = result.diffPercent.toFixed(2).padStart(6);
    console.log(
      `${status} Slide ${result.slideNumber.toString().padStart(2)}: ${diffStr}% diff (${result.diffPixels} pixels)`
    );
    if (!result.match && result.diffImagePath) {
      console.log(`   Diff: ${result.diffImagePath}`);
    }
  }
  console.log("=".repeat(60) + "\n");
}

/**
 * Save comparison report as JSON
 */
export function saveCompareReport(
  report: CompareReport,
  outputPath?: string
): string {
  const filePath =
    outputPath ??
    path.join(DIFF_DIR, `${report.snapshotName}-report.json`);

  const jsonReport = {
    snapshotName: report.snapshotName,
    timestamp: new Date().toISOString(),
    summary: {
      passed: report.passed,
      failed: report.failed,
      total: report.results.length,
      averageDiffPercent: report.totalDiffPercent,
    },
    results: report.results.map((r) => ({
      slideNumber: r.slideNumber,
      match: r.match,
      diffPercent: r.diffPercent,
      diffPixels: r.diffPixels,
      totalPixels: r.totalPixels,
      snapshotPath: r.snapshotPath,
      actualPath: r.actualPath,
      diffImagePath: r.diffImagePath,
      dimensions: { width: r.width, height: r.height },
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(jsonReport, null, 2));
  return filePath;
}
