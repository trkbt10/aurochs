/**
 * @file Visual regression test utilities
 *
 * Provides image comparison functionality for PPTX rendering tests.
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
 * Normalize non-XML named entities that resvg (XML parser) does not accept.
 */
function normalizeSvgForResvg(svg: string): string {
  return svg.replaceAll("&nbsp;", "&#160;");
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

  const normalizedSvg = normalizeSvgForResvg(svg);
  const resvg = new Resvg(normalizedSvg, opts);
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

function parsePngAndResizeIfNeeded(args: {
  readonly pngBytes: Uint8Array | Buffer;
  readonly targetWidth: number;
  readonly targetHeight: number;
}): PNG {
  const decoded = PNG.sync.read(args.pngBytes);
  if (decoded.width === args.targetWidth && decoded.height === args.targetHeight) {
    return decoded;
  }
  return resizePng(decoded, args.targetWidth, args.targetHeight);
}

/**
 * Compare SVG output against baseline PNG snapshot
 */
export function compareSvgToSnapshot(
  args: {
    readonly svg: string;
    readonly snapshotName: string;
    readonly slideNumber: number;
    readonly options?: CompareOptions;
  }
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
  const actual = parsePngAndResizeIfNeeded({
    pngBytes: actualPng,
    targetWidth: baseline.width,
    targetHeight: baseline.height,
  });

  // Save actual output for debugging
  const actualPath = path.join(
    OUTPUT_DIR,
    `${snapshotName}-slide-${slideNumber}.png`
  );
  fs.writeFileSync(actualPath, actualPng);

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
  const diffImagePath = diffPixels > 0 ? path.join(DIFF_DIR, `${snapshotName}-slide-${slideNumber}-diff.png`) : null;
  if (diffImagePath) {
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
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
}

function renderPdfPageToPngPath(
  args: {
    readonly pdfPath: string;
    readonly pageNumber: number;
    readonly dpi: number;
    readonly outPrefix: string;
  }
): string {
  const { pdfPath, pageNumber, dpi, outPrefix } = args;
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

function blitPng(args: { readonly src: PNG; readonly dst: PNG; readonly dx: number; readonly dy: number }): void {
  const { src, dst, dx, dy } = args;
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

function renderPdfBaselineToTarget(
  args: {
    readonly pdfPng: PNG;
    readonly targetWidth: number;
    readonly targetHeight: number;
    readonly bg: { r: number; g: number; b: number; a: number };
  }
): PNG {
  const { pdfPng, targetWidth, targetHeight, bg } = args;
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

export type MaskRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type Rgba = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

export type TextRegionMaskCompareResult = {
  readonly baselinePath: string;
  readonly actualPath: string;
  readonly diffPath: string;
  readonly width: number;
  readonly height: number;
  readonly baselinePixelCount: number;
  readonly actualPixelCount: number;
  readonly overlapPixelCount: number;
  readonly symmetricDiffPixelCount: number;
  readonly symmetricDiffPercent: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly iou: number;
};

function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite: ${value}`);
  }
}

function assertRect(rect: MaskRect, index: number): void {
  assertFiniteNumber(`rect[${index}].x`, rect.x);
  assertFiniteNumber(`rect[${index}].y`, rect.y);
  assertFiniteNumber(`rect[${index}].width`, rect.width);
  assertFiniteNumber(`rect[${index}].height`, rect.height);
}

function writePixel(args: {
  readonly data: Buffer | Uint8Array;
  readonly width: number;
  readonly x: number;
  readonly y: number;
  readonly color: Rgba;
}): void {
  const { data, width, x, y, color } = args;
  const idx = (y * width + x) * 4;
  data[idx] = color.r;
  data[idx + 1] = color.g;
  data[idx + 2] = color.b;
  data[idx + 3] = color.a;
}

function buildBinaryMask(args: { readonly width: number; readonly height: number; readonly rects: readonly MaskRect[] }): Uint8Array {
  const { width, height, rects } = args;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]!;
    assertRect(rect, i);
    if (!(rect.width > 0) || !(rect.height > 0)) {
      continue;
    }

    const x0 = Math.max(0, Math.floor(rect.x));
    const y0 = Math.max(0, Math.floor(rect.y));
    const x1 = Math.min(width, Math.ceil(rect.x + rect.width));
    const y1 = Math.min(height, Math.ceil(rect.y + rect.height));
    if (!(x1 > x0) || !(y1 > y0)) {
      continue;
    }

    for (let y = y0; y < y1; y++) {
      const row = y * width;
      for (let x = x0; x < x1; x++) {
        mask[row + x] = 1;
      }
    }
  }
  return mask;
}

function renderMaskPng(args: {
  readonly width: number;
  readonly height: number;
  readonly mask: Uint8Array;
  readonly onColor: Rgba;
  readonly offColor: Rgba;
}): PNG {
  const { width, height, mask, onColor, offColor } = args;
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = mask[y * width + x] === 1 ? onColor : offColor;
      writePixel({ data: png.data, width, x, y, color });
    }
  }
  return png;
}

/**
 * Compare text-region masks generated from baseline and actual rectangle sets.
 *
 * This comparison is glyph-independent and focuses purely on area placement.
 * It writes baseline/actual/diff mask PNG files for visual inspection.
 */
export function compareTextRegionMasks(args: {
  readonly snapshotName: string;
  readonly slideNumber: number;
  readonly width: number;
  readonly height: number;
  readonly baselineRects: readonly MaskRect[];
  readonly actualRects: readonly MaskRect[];
  readonly colors?: {
    readonly background?: Rgba;
    readonly baselineOnly?: Rgba;
    readonly actualOnly?: Rgba;
    readonly overlap?: Rgba;
  };
}): TextRegionMaskCompareResult {
  ensureDirs();
  const { snapshotName, slideNumber, baselineRects, actualRects } = args;
  const width = Math.round(args.width);
  const height = Math.round(args.height);

  if (!snapshotName) {
    throw new Error("snapshotName is required");
  }
  if (!Number.isFinite(slideNumber) || slideNumber < 1) {
    throw new Error(`Invalid slideNumber: ${slideNumber}`);
  }
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`Invalid width: ${args.width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`Invalid height: ${args.height}`);
  }

  const baselineMask = buildBinaryMask({ width, height, rects: baselineRects });
  const actualMask = buildBinaryMask({ width, height, rects: actualRects });

  const counters = {
    baselinePixelCount: 0,
    actualPixelCount: 0,
    overlapPixelCount: 0,
    symmetricDiffPixelCount: 0,
  };
  for (const [i, baselineValue] of baselineMask.entries()) {
    const baseline = baselineValue === 1;
    const actual = actualMask[i] === 1;
    if (baseline) {
      counters.baselinePixelCount += 1;
    }
    if (actual) {
      counters.actualPixelCount += 1;
    }
    if (baseline && actual) {
      counters.overlapPixelCount += 1;
    }
    if (baseline !== actual) {
      counters.symmetricDiffPixelCount += 1;
    }
  }

  const baselinePixelCount = counters.baselinePixelCount;
  const actualPixelCount = counters.actualPixelCount;
  const overlapPixelCount = counters.overlapPixelCount;
  const symmetricDiffPixelCount = counters.symmetricDiffPixelCount;

  const precision = actualPixelCount > 0 ? overlapPixelCount / actualPixelCount : 0;
  const recall = baselinePixelCount > 0 ? overlapPixelCount / baselinePixelCount : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const union = baselinePixelCount + actualPixelCount - overlapPixelCount;
  const iou = union > 0 ? overlapPixelCount / union : 0;
  const totalPixels = width * height;
  const symmetricDiffPercent = totalPixels > 0 ? (symmetricDiffPixelCount / totalPixels) * 100 : 0;

  const colorBackground = args.colors?.background ?? { r: 255, g: 255, b: 255, a: 255 };
  const colorBaselineOnly = args.colors?.baselineOnly ?? { r: 57, g: 106, b: 177, a: 255 };
  const colorActualOnly = args.colors?.actualOnly ?? { r: 242, g: 142, b: 43, a: 255 };
  const colorOverlap = args.colors?.overlap ?? { r: 89, g: 161, b: 79, a: 255 };

  const baselinePng = renderMaskPng({
    width,
    height,
    mask: baselineMask,
    onColor: colorBaselineOnly,
    offColor: colorBackground,
  });
  const actualPng = renderMaskPng({
    width,
    height,
    mask: actualMask,
    onColor: colorActualOnly,
    offColor: colorBackground,
  });

  const diffPng = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const baseline = baselineMask[y * width + x] === 1;
      const actual = actualMask[y * width + x] === 1;
      const color = baseline && actual ? colorOverlap : baseline ? colorBaselineOnly : actual ? colorActualOnly : colorBackground;
      writePixel({ data: diffPng.data, width, x, y, color });
    }
  }

  const baselinePath = path.join(OUTPUT_DIR, `${snapshotName}-slide-${slideNumber}-text-mask-baseline.png`);
  const actualPath = path.join(OUTPUT_DIR, `${snapshotName}-slide-${slideNumber}-text-mask-actual.png`);
  const diffPath = path.join(DIFF_DIR, `${snapshotName}-slide-${slideNumber}-text-mask-diff.png`);
  savePng(baselinePng, baselinePath);
  savePng(actualPng, actualPath);
  savePng(diffPng, diffPath);

  return {
    baselinePath,
    actualPath,
    diffPath,
    width,
    height,
    baselinePixelCount,
    actualPixelCount,
    overlapPixelCount,
    symmetricDiffPixelCount,
    symmetricDiffPercent,
    precision,
    recall,
    f1,
    iou,
  };
}

/**
 * Compare rendered SVG against a PDF page baseline (pdftoppm), fit to a target canvas.
 *
 * This avoids LibreOffice and compares directly to the original PDF page raster.
 */
export function compareSvgToPdfBaseline(
  args: {
    readonly svg: string;
    readonly snapshotName: string;
    readonly slideNumber: number;
    readonly baseline: PdfBaselineOptions;
    readonly options?: CompareOptions;
  }
): PdfCompareResult {
  const { svg, snapshotName, slideNumber, baseline, options = {} } = args;
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
  const fittedBaselineHigh = renderPdfBaselineToTarget({ pdfPng, targetWidth: scaledTargetWidth, targetHeight: scaledTargetHeight, bg });
  const fittedBaseline = scaleInt === 1 ? fittedBaselineHigh : resizePng(fittedBaselineHigh, baseline.targetWidth, baseline.targetHeight);

  const baselinePath = path.join(OUTPUT_DIR, `${snapshotName}-baseline.png`);
  savePng(fittedBaseline, baselinePath);

  const actualPngHigh = svgToPng(svg, scaledTargetWidth, options);
  const actualHigh = parsePngAndResizeIfNeeded({
    pngBytes: actualPngHigh,
    targetWidth: scaledTargetWidth,
    targetHeight: scaledTargetHeight,
  });
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

  const diffImagePath = diffPixels > 0 ? path.join(DIFF_DIR, `${snapshotName}-slide-${slideNumber}-diff.png`) : null;
  if (diffImagePath) {
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
export function compareWithDetails(
  args: {
    readonly svg: string;
    readonly snapshotName: string;
    readonly slideNumber: number;
    readonly options?: CompareOptions;
  }
): DetailedCompareResult {
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
  const actualPng = svgToPng(svg, baseline.width);
  const actual = parsePngAndResizeIfNeeded({
    pngBytes: actualPng,
    targetWidth: baseline.width,
    targetHeight: baseline.height,
  });

  // Save actual output for debugging
  const actualPath = path.join(
    OUTPUT_DIR,
    `${snapshotName}-slide-${slideNumber}.png`
  );
  fs.writeFileSync(actualPath, actualPng);

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
  const diffImagePath = diffPixels > 0 ? path.join(DIFF_DIR, `${snapshotName}-slide-${slideNumber}-diff.png`) : null;
  if (diffImagePath) {
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









































/**
 * Generate a comparison report from visual comparison results.
 */
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
