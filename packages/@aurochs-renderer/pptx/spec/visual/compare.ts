/**
 * Visual regression test utilities
 * Provides image comparison functionality for PPTX rendering tests
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
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
  /**
   * Extra font files to load into resvg.
   *
   * resvg-js does not support @font-face sources inside SVG/CSS, so if your SVG
   * depends on embedded or non-system fonts you must provide them explicitly.
   */
  resvgFontFiles?: readonly string[];
  /** Whether to load system fonts (default: true). */
  resvgLoadSystemFonts?: boolean;
}

type CompareSvgToSnapshotArgs = {
  readonly svg: string;
  readonly snapshotName: string;
  readonly slideNumber: number;
  readonly options?: CompareOptions;
};

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
export function svgToPng(svg: string, width?: number, options: Pick<CompareOptions, "resvgFontFiles" | "resvgLoadSystemFonts"> = {}): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number };
    font?: { loadSystemFonts?: boolean; fontFiles?: string[] };
  } = {};
  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }
  if (options.resvgFontFiles && options.resvgFontFiles.length > 0) {
    opts.font = {
      loadSystemFonts: options.resvgLoadSystemFonts ?? true,
      fontFiles: [...options.resvgFontFiles],
    };
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
 * Uses bilinear sampling (good default for downscale/upscale).
 */
function resizePng(png: PNG, targetWidth: number, targetHeight: number): PNG {
  const resized = new PNG({ width: targetWidth, height: targetHeight });

  if (targetWidth <= 0 || targetHeight <= 0) {
    throw new Error(`Invalid target size: ${targetWidth}x${targetHeight}`);
  }
  if (png.width <= 0 || png.height <= 0) {
    throw new Error(`Invalid source size: ${png.width}x${png.height}`);
  }

  const xScale = png.width / targetWidth;
  const yScale = png.height / targetHeight;

  const sample = (sx: number, sy: number): { r: number; g: number; b: number; a: number } => {
    const x0 = Math.max(0, Math.min(png.width - 1, Math.floor(sx)));
    const y0 = Math.max(0, Math.min(png.height - 1, Math.floor(sy)));
    const x1 = Math.max(0, Math.min(png.width - 1, x0 + 1));
    const y1 = Math.max(0, Math.min(png.height - 1, y0 + 1));

    const tx = sx - x0;
    const ty = sy - y0;

    const idx00 = (y0 * png.width + x0) * 4;
    const idx10 = (y0 * png.width + x1) * 4;
    const idx01 = (y1 * png.width + x0) * 4;
    const idx11 = (y1 * png.width + x1) * 4;

    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

    const r0 = lerp(png.data[idx00], png.data[idx10], tx);
    const r1 = lerp(png.data[idx01], png.data[idx11], tx);
    const g0 = lerp(png.data[idx00 + 1], png.data[idx10 + 1], tx);
    const g1 = lerp(png.data[idx01 + 1], png.data[idx11 + 1], tx);
    const b0 = lerp(png.data[idx00 + 2], png.data[idx10 + 2], tx);
    const b1 = lerp(png.data[idx01 + 2], png.data[idx11 + 2], tx);
    const a0 = lerp(png.data[idx00 + 3], png.data[idx10 + 3], tx);
    const a1 = lerp(png.data[idx01 + 3], png.data[idx11 + 3], tx);

    return {
      r: lerp(r0, r1, ty),
      g: lerp(g0, g1, ty),
      b: lerp(b0, b1, ty),
      a: lerp(a0, a1, ty),
    };
  };

  for (let y = 0; y < targetHeight; y++) {
    // sample at pixel center
    const sy = (y + 0.5) * yScale - 0.5;
    for (let x = 0; x < targetWidth; x++) {
      const sx = (x + 0.5) * xScale - 0.5;
      const c = sample(sx, sy);
      const dstIdx = (y * targetWidth + x) * 4;
      resized.data[dstIdx] = Math.round(c.r);
      resized.data[dstIdx + 1] = Math.round(c.g);
      resized.data[dstIdx + 2] = Math.round(c.b);
      resized.data[dstIdx + 3] = Math.round(c.a);
    }
  }

  return resized;
}

/**
 * Compare SVG output against baseline PNG snapshot
 */
export function compareSvgToSnapshot(
  args: CompareSvgToSnapshotArgs
): CompareResult {
  const { svg, snapshotName, slideNumber, options = {} } = args;
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
  const actualPng = svgToPng(svg, baseline.width, options);
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

export type PdfBaselineOptions = {
  readonly pdfPath: string;
  /** 1-based page number */
  readonly pageNumber: number;
  /** Render DPI for `pdftoppm` (default: 144) */
  readonly dpi?: number;
  /** Target output dimensions (e.g. slide size) */
  readonly targetWidth: number;
  readonly targetHeight: number;
  /**
   * Oversampling factor for both baseline and actual before downscaling to target.
   *
   * This reduces false-positive diffs caused by different rasterization/downscale
   * implementations between `pdftoppm` and `resvg`.
   *
   * Use `1` to disable.
   */
  readonly renderScale?: number;
  /** Fit mode for baseline into target (default: contain) */
  readonly fit?: "contain";
  /** Background for the target canvas (default: white) */
  readonly background?: { r: number; g: number; b: number; a: number };
};

function fileExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

type RenderPdfPageToPngPathOptions = {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly dpi: number;
  readonly outPrefix: string;
};

function renderPdfPageToPngPath({ pdfPath, pageNumber, dpi, outPrefix }: RenderPdfPageToPngPathOptions): string {
  try {
    execFileSync("pdftoppm", [
      "-png",
      "-r",
      String(dpi),
      "-f",
      String(pageNumber),
      "-l",
      String(pageNumber),
      "-singlefile",
      pdfPath,
      outPrefix,
    ], { stdio: "ignore" });
  } catch (err) {
    throw new Error(`pdftoppm failed (install poppler). pdf=${pdfPath}`, { cause: err as Error });
  }

  const outPath = `${outPrefix}.png`;
  if (!fileExists(outPath)) {
    throw new Error(`pdftoppm did not produce output: ${outPath}`);
  }
  return outPath;
}

function fillPng(png: PNG, bg: { r: number; g: number; b: number; a: number }): void {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      png.data[i] = bg.r;
      png.data[i + 1] = bg.g;
      png.data[i + 2] = bg.b;
      png.data[i + 3] = bg.a;
    }
  }
}

type BlitPngOptions = {
  readonly src: PNG;
  readonly dst: PNG;
  readonly dx: number;
  readonly dy: number;
};

function blitPng({ src, dst, dx, dy }: BlitPngOptions): void {
  for (let y = 0; y < src.height; y++) {
    const ty = y + dy;
    if (ty < 0 || ty >= dst.height) {continue;}
    for (let x = 0; x < src.width; x++) {
      const tx = x + dx;
      if (tx < 0 || tx >= dst.width) {continue;}
      const si = (y * src.width + x) * 4;
      const di = (ty * dst.width + tx) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

type RenderPdfBaselineToTargetOptions = {
  readonly pdfPng: PNG;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly bg: { r: number; g: number; b: number; a: number };
};

function renderPdfBaselineToTarget({ pdfPng, targetWidth, targetHeight, bg }: RenderPdfBaselineToTargetOptions): PNG {
  const canvas = new PNG({ width: targetWidth, height: targetHeight });
  fillPng(canvas, bg);

  const scale = Math.min(targetWidth / pdfPng.width, targetHeight / pdfPng.height);
  const w = Math.max(1, Math.round(pdfPng.width * scale));
  const h = Math.max(1, Math.round(pdfPng.height * scale));

  const resized = resizePng(pdfPng, w, h);
  const dx = Math.round((targetWidth - w) / 2);
  const dy = Math.round((targetHeight - h) / 2);
  blitPng({ src: resized, dst: canvas, dx, dy });
  return canvas;
}

export type PdfCompareResult = {
  baselinePath: string;
} & Omit<DetailedCompareResult, "snapshotPath">

/**
 * Compare rendered SVG against a PDF page baseline (pdftoppm), fit to a target canvas.
 *
 * This avoids LibreOffice and compares directly to the original PDF page raster.
 */
export type CompareSvgToPdfBaselineOptions = {
  readonly svg: string;
  readonly snapshotName: string;
  readonly slideNumber: number;
  readonly baseline: PdfBaselineOptions;
  readonly options?: CompareOptions;
};





















export function compareSvgToPdfBaseline({
  svg,
  snapshotName,
  slideNumber,
  baseline,
  options = {},
}: CompareSvgToPdfBaselineOptions): PdfCompareResult {
  ensureDirs();

  const { threshold = 0.1, maxDiffPercent = 0.1, includeAA = false } = options;
  const dpi = baseline.dpi ?? 144;
  const bg = baseline.background ?? { r: 255, g: 255, b: 255, a: 255 };
  const renderScale = baseline.renderScale ?? 1;
  if (!Number.isFinite(renderScale) || renderScale <= 0) {
    throw new Error(`Invalid renderScale: ${renderScale}`);
  }
  const scaleInt = Math.max(1, Math.round(renderScale));
  const scaledTargetWidth = Math.max(1, Math.round(baseline.targetWidth * scaleInt));
  const scaledTargetHeight = Math.max(1, Math.round(baseline.targetHeight * scaleInt));

  const pdfPngPath = renderPdfPageToPngPath({
    pdfPath: baseline.pdfPath,
    pageNumber: baseline.pageNumber,
    dpi,
    outPrefix: path.join(OUTPUT_DIR, `${snapshotName}-pdf-page-${baseline.pageNumber}-dpi${dpi}`),
  });

  const pdfPng = loadPng(pdfPngPath);
  const fittedBaselineHigh = renderPdfBaselineToTarget({
    pdfPng,
    targetWidth: scaledTargetWidth,
    targetHeight: scaledTargetHeight,
    bg,
  });
  const fittedBaseline = scaleInt === 1 ? fittedBaselineHigh : resizePng(fittedBaselineHigh, baseline.targetWidth, baseline.targetHeight);

  const baselinePath = path.join(OUTPUT_DIR, `${snapshotName}-baseline.png`);
  savePng(fittedBaseline, baselinePath);

  const actualPngHigh = svgToPng(svg, scaledTargetWidth, options);
  let actualHigh: PNG = PNG.sync.read(actualPngHigh);
  if (actualHigh.width !== scaledTargetWidth || actualHigh.height !== scaledTargetHeight) {
    actualHigh = resizePng(actualHigh, scaledTargetWidth, scaledTargetHeight);
  }
  const actual = scaleInt === 1 ? actualHigh : resizePng(actualHigh, baseline.targetWidth, baseline.targetHeight);

  const actualPath = path.join(OUTPUT_DIR, `${snapshotName}-slide-${slideNumber}.png`);
  savePng(actual, actualPath);

  const diff = new PNG({ width: baseline.targetWidth, height: baseline.targetHeight });

  const diffPixels = pixelmatch(
    fittedBaseline.data,
    actual.data,
    diff.data,
    baseline.targetWidth,
    baseline.targetHeight,
    { threshold, includeAA },
  );

  const totalPixels = baseline.targetWidth * baseline.targetHeight;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  let diffImagePath: string | null = null;
  if (diffPixels > 0) {
    diffImagePath = path.join(DIFF_DIR, `${snapshotName}-slide-${slideNumber}-diff.png`);
    savePng(diff, diffImagePath);
  }

  return {
    snapshotName,
    slideNumber,
    baselinePath,
    actualPath,
    width: baseline.targetWidth,
    height: baseline.targetHeight,
    match,
    diffPixels,
    diffPercent,
    totalPixels,
    diffImagePath,
  };
}

/**
 * Compare SVG output against PDF-generated baseline with detailed reporting
 */
export type CompareWithDetailsOptions = {
  readonly svg: string;
  readonly snapshotName: string;
  readonly slideNumber: number;
  readonly options?: CompareOptions;
};





















export function compareWithDetails({
  svg,
  snapshotName,
  slideNumber,
  options = {},
}: CompareWithDetailsOptions): DetailedCompareResult {
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
