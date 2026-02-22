/**
 * @file CLI for block segmentation visualization with optional original overlay comparison.
 *
 * Usage:
 *   bun scripts/visualize-block-segmentation.ts \
 *     --pdf packages/@aurochs/pdf/fixtures/block-segmentation-corpus/20260219c000320001.pdf \
 *     --page 1 \
 *     --compare-original
 *
 * `--out-dir` is optional.
 * If omitted, outputs go to:
 *   <pdf-dir>/__viz__/<YYYYMMDD-HHmmss>/<pdf-basename>/
 */

import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { parsePdf } from "../packages/@aurochs/pdf/src/parser/core/pdf-parser";
import type { PdfText } from "../packages/@aurochs/pdf/src/domain/text";
import { spatialGrouping } from "../packages/@aurochs/pdf/src/services/block-segmentation/strategies/spatial-grouping";
import type { GroupedText } from "../packages/@aurochs/pdf/src/services/block-segmentation/contracts/types";
import { visualizeBlockSegmentation } from "../packages/@aurochs/pdf/src/services/block-segmentation/visualization/block-segmentation-visualizer";

type CliArgs = {
  readonly pdfPath: string;
  readonly outDir: string;
  readonly pageNumber: number;
  readonly compareOriginal: boolean;
  readonly enableCalibration: boolean;
  readonly maxCalibrationIterations: number;
  readonly dpi: number;
  readonly inkLumaThreshold: number;
  readonly badDensityThreshold: number;
  readonly warnDensityThreshold: number;
  readonly maxLabeledRuns: number;
};

type OverlayTransform = {
  readonly sx: number;
  readonly sy: number;
  readonly tx: number;
  readonly ty: number;
};

type PageRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type ScoredRun = {
  readonly run: PdfText;
  readonly rect: PageRect;
  readonly density: number;
  readonly status: "good" | "warn" | "bad";
};

type MaskMetrics = {
  readonly runMaskPixelCount: number;
  readonly originalInkPixelCount: number;
  readonly overlapPixelCount: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
};

type CalibrationIteration = {
  readonly iteration: number;
  readonly translationStep: number;
  readonly scaleStep: number;
  readonly sx: number;
  readonly sy: number;
  readonly tx: number;
  readonly ty: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
};

type CalibrationSummary = {
  readonly enabled: boolean;
  readonly sampleRunCount: number;
  readonly trustedRunCount: number;
  readonly suspiciousRunCount: number;
  readonly baseline: {
    readonly precision: number;
    readonly recall: number;
    readonly f1: number;
  };
  readonly calibrated: {
    readonly precision: number;
    readonly recall: number;
    readonly f1: number;
  };
  readonly transform: OverlayTransform;
  readonly iterations: readonly CalibrationIteration[];
};

type OverlaySummary = {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly originalPngPath: string;
  readonly overlaySvgPath: string;
  readonly diffPngPath: string;
  readonly compareJsonPath: string;
  readonly runCount: number;
  readonly scoredRunCount: number;
  readonly badRunCount: number;
  readonly warnRunCount: number;
  readonly goodRunCount: number;
  readonly meanRunDensity: number;
  readonly p50RunDensity: number;
  readonly p90RunDensity: number;
  readonly maskPrecision: number;
  readonly maskRecall: number;
  readonly maskF1: number;
  readonly originalInkPixelCount: number;
  readonly runMaskPixelCount: number;
  readonly overlapPixelCount: number;
  readonly calibration: CalibrationSummary;
  readonly worstRuns: readonly {
    readonly text: string;
    readonly density: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
};

type PixelRect = {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
};

const GROUP_PALETTE = [
  "#E63946",
  "#2A9D8F",
  "#457B9D",
  "#F4A261",
  "#8E44AD",
  "#1D3557",
  "#FF7F11",
  "#2B9348",
] as const;

const IDENTITY_TRANSFORM: OverlayTransform = {
  sx: 1,
  sy: 1,
  tx: 0,
  ty: 0,
};

function parseCliArgs(argv: readonly string[]): CliArgs {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const maybeValue = argv[i + 1];
    if (!maybeValue || maybeValue.startsWith("--")) {
      flags.add(token);
      continue;
    }
    args.set(token, maybeValue);
    i += 1;
  }

  const pdfPath = args.get("--pdf");
  const outDir = args.get("--out-dir");
  const pageRaw = args.get("--page");
  if (!pdfPath) {
    throw new Error("--pdf is required");
  }
  if (!pageRaw) {
    throw new Error("--page is required");
  }

  const pageNumber = Number(pageRaw);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error(`--page must be an integer >= 1 (got ${pageRaw})`);
  }

  const dpi = parseNumberArg({ args, name: "--dpi", fallback: 72, range: { min: 36, max: 600 } });
  const inkLumaThreshold = parseNumberArg({
    args,
    name: "--ink-luma-threshold",
    fallback: 20,
    range: { min: 1, max: 255 },
  });
  const badDensityThreshold = parseNumberArg({
    args,
    name: "--bad-density-threshold",
    fallback: 0.015,
    range: { min: 0, max: 1 },
  });
  const warnDensityThreshold = parseNumberArg({
    args,
    name: "--warn-density-threshold",
    fallback: 0.04,
    range: { min: 0, max: 1 },
  });
  if (warnDensityThreshold < badDensityThreshold) {
    throw new Error("--warn-density-threshold must be >= --bad-density-threshold");
  }

  const maxLabeledRuns = parseNumberArg({
    args,
    name: "--max-labeled-runs",
    fallback: 20,
    range: { min: 0, max: 200 },
  });
  const maxCalibrationIterations = parseNumberArg({
    args,
    name: "--max-calibration-iterations",
    fallback: 5,
    range: { min: 1, max: 12 },
  });

  const resolvedPdfPath = path.resolve(pdfPath);
  const resolvedOutDir = outDir ? path.resolve(outDir) : defaultOutDirForPdf(resolvedPdfPath);

  return {
    pdfPath: resolvedPdfPath,
    outDir: resolvedOutDir,
    pageNumber,
    compareOriginal: flags.has("--compare-original"),
    enableCalibration: !flags.has("--no-calibration"),
    maxCalibrationIterations: Math.round(maxCalibrationIterations),
    dpi,
    inkLumaThreshold,
    badDensityThreshold,
    warnDensityThreshold,
    maxLabeledRuns: Math.round(maxLabeledRuns),
  };
}

function formatTimestamp(value: Date): string {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  const hh = String(value.getHours()).padStart(2, "0");
  const min = String(value.getMinutes()).padStart(2, "0");
  const sec = String(value.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

function defaultOutDirForPdf(pdfPath: string): string {
  const base = path.basename(pdfPath, path.extname(pdfPath));
  return path.resolve(path.dirname(pdfPath), "__viz__", formatTimestamp(new Date()), base);
}

function parseNumberArg(args: {
  readonly args: ReadonlyMap<string, string>;
  readonly name: string;
  readonly fallback: number;
  readonly range: { readonly min: number; readonly max: number };
}): number {
  const {
    args: map,
    name,
    fallback,
    range,
  } = args;
  const raw = map.get(name);
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < range.min || value > range.max) {
    throw new Error(`${name} must be in [${range.min}, ${range.max}] (got ${raw})`);
  }
  return value;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toSvgTopY(pageHeight: number, y: number, height: number): number {
  return pageHeight - (y + height);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const qq = clamp(q, 0, 1);
  const pos = (sorted.length - 1) * qq;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next === undefined) {
    return sorted[base] ?? 0;
  }
  const current = sorted[base] ?? 0;
  return current + rest * (next - current);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function densityStatus(args: {
  readonly density: number;
  readonly badThreshold: number;
  readonly warnThreshold: number;
}): ScoredRun["status"] {
  const { density, badThreshold, warnThreshold } = args;
  if (density < badThreshold) {
    return "bad";
  }
  if (density < warnThreshold) {
    return "warn";
  }
  return "good";
}

function f1Score(precision: number, recall: number): number {
  if (precision + recall === 0) {
    return 0;
  }
  return (2 * precision * recall) / (precision + recall);
}

function isPrivateUseCodePoint(code: number): boolean {
  return (code >= 0xe000 && code <= 0xf8ff) || (code >= 0xf0000 && code <= 0xffffd) || (code >= 0x100000 && code <= 0x10fffd);
}

function isSuspiciousRunText(text: string): boolean {
  if (text.includes("\uFFFD")) {
    return true;
  }
  return Array.from(text).some((char) => {
    const code = char.codePointAt(0);
    if (code === undefined) {
      return false;
    }
    return isPrivateUseCodePoint(code);
  });
}

function textLength(text: string): number {
  return Math.max(Array.from(text).length, 1);
}

function toEffectiveRunRect(args: {
  readonly run: PdfText;
  readonly transform: OverlayTransform;
}): PageRect {
  const { run, transform } = args;
  const charCount = textLength(run.text);
  const sx = Math.abs(transform.sx);
  const sy = Math.abs(transform.sy);
  const nominalWidth = run.fontSize * 0.32 * charCount * sx;
  const nominalHeight = run.fontSize * 0.9 * sy;
  const width = Math.max(run.width * sx, nominalWidth);
  const height = Math.max(run.height * sy, nominalHeight);
  const padding = run.fontSize * 0.08;

  return {
    x: run.x * transform.sx + transform.tx - padding,
    y: run.y * transform.sy + transform.ty - padding,
    width: width + padding * 2,
    height: height + padding * 2,
  };
}

function estimatedRunAreaForCalibration(run: PdfText): number {
  const rect = toEffectiveRunRect({ run, transform: IDENTITY_TRANSFORM });
  return rect.width * rect.height;
}

function selectCalibrationRuns(runs: readonly PdfText[], maxRuns: number): readonly PdfText[] {
  if (runs.length <= maxRuns) {
    return runs;
  }
  return [...runs]
    .sort((a, b) => estimatedRunAreaForCalibration(b) - estimatedRunAreaForCalibration(a))
    .slice(0, maxRuns);
}

function outputBaseName(pdfPath: string, pageNumber: number): string {
  const basename = path.basename(pdfPath).replace(/\.pdf$/i, "");
  return `${basename}.p${pageNumber}.segmentation`;
}

function ensurePngRendered(args: {
  readonly pdfPath: string;
  readonly pageNumber: number;
  readonly dpi: number;
  readonly outputPrefix: string;
}): string {
  const { pdfPath, pageNumber, dpi, outputPrefix } = args;
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
    outputPrefix,
  ], { stdio: "ignore" });

  return `${outputPrefix}.png`;
}

function toImageRect(args: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
}): PixelRect {
  const { x, y, width, height, pageWidth, pageHeight, imageWidth, imageHeight } = args;
  const safeWidth = Math.max(width, 0.2);
  const safeHeight = Math.max(height, 0.2);

  const fx0 = (x / pageWidth) * imageWidth;
  const fx1 = ((x + safeWidth) / pageWidth) * imageWidth;
  const fyTop = ((pageHeight - (y + safeHeight)) / pageHeight) * imageHeight;
  const fyBottom = ((pageHeight - y) / pageHeight) * imageHeight;

  const x0 = clamp(Math.floor(Math.min(fx0, fx1)), 0, Math.max(imageWidth - 1, 0));
  const x1 = clamp(Math.ceil(Math.max(fx0, fx1)), x0 + 1, imageWidth);
  const y0 = clamp(Math.floor(Math.min(fyTop, fyBottom)), 0, Math.max(imageHeight - 1, 0));
  const y1 = clamp(Math.ceil(Math.max(fyTop, fyBottom)), y0 + 1, imageHeight);

  return { x0, y0, x1, y1 };
}

function fillMaskRect(mask: Uint8Array, imageWidth: number, rect: PixelRect): void {
  for (let y = rect.y0; y < rect.y1; y++) {
    const row = y * imageWidth;
    for (let x = rect.x0; x < rect.x1; x++) {
      mask[row + x] = 1;
    }
  }
}

function countOnPixels(mask: Uint8Array): number {
  // eslint-disable-next-line no-restricted-syntax -- tight loop over typed array
  let count = 0;
  for (const value of mask) {
    if (value === 1) {
      count += 1;
    }
  }
  return count;
}

function buildInkMask(png: PNG, inkLumaThreshold: number): Uint8Array {
  const mask = new Uint8Array(png.width * png.height);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i] ?? 255;
      const g = png.data[i + 1] ?? 255;
      const b = png.data[i + 2] ?? 255;
      const a = png.data[i + 3] ?? 255;
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      const isInk = a > 0 && luminance <= 255 - inkLumaThreshold;
      if (isInk) {
        mask[y * png.width + x] = 1;
      }
    }
  }
  return mask;
}

function scoreRunsAgainstOriginal(args: {
  readonly texts: readonly PdfText[];
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly originalInkMask: Uint8Array;
  readonly transform: OverlayTransform;
  readonly badDensityThreshold: number;
  readonly warnDensityThreshold: number;
}): { readonly scoredRuns: readonly ScoredRun[]; readonly runMask: Uint8Array } {
  const {
    texts,
    pageWidth,
    pageHeight,
    imageWidth,
    imageHeight,
    originalInkMask,
    transform,
    badDensityThreshold,
    warnDensityThreshold,
  } = args;

  const runMask = new Uint8Array(imageWidth * imageHeight);
  const scoredRuns: ScoredRun[] = [];

  for (const run of texts) {
    if (run.text.trim().length === 0) {
      continue;
    }

    const effectiveRect = toEffectiveRunRect({ run, transform });
    const rect = toImageRect({
      x: effectiveRect.x,
      y: effectiveRect.y,
      width: effectiveRect.width,
      height: effectiveRect.height,
      pageWidth,
      pageHeight,
      imageWidth,
      imageHeight,
    });

    fillMaskRect(runMask, imageWidth, rect);

    const area = Math.max((rect.x1 - rect.x0) * (rect.y1 - rect.y0), 1);
    // eslint-disable-next-line no-restricted-syntax -- tight loop over rectangle pixels
    let inkPixels = 0;
    for (let y = rect.y0; y < rect.y1; y++) {
      const row = y * imageWidth;
      for (let x = rect.x0; x < rect.x1; x++) {
        if (originalInkMask[row + x] === 1) {
          inkPixels += 1;
        }
      }
    }

    const density = inkPixels / area;
    const status = densityStatus({
      density,
      badThreshold: badDensityThreshold,
      warnThreshold: warnDensityThreshold,
    });

    scoredRuns.push({ run, rect: effectiveRect, density, status });
  }

  return { scoredRuns, runMask };
}

function buildRunMask(args: {
  readonly texts: readonly PdfText[];
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly transform: OverlayTransform;
}): Uint8Array {
  const { texts, pageWidth, pageHeight, imageWidth, imageHeight, transform } = args;
  const runMask = new Uint8Array(imageWidth * imageHeight);
  for (const run of texts) {
    if (run.text.trim().length === 0) {
      continue;
    }
    const effectiveRect = toEffectiveRunRect({ run, transform });
    const rect = toImageRect({
      x: effectiveRect.x,
      y: effectiveRect.y,
      width: effectiveRect.width,
      height: effectiveRect.height,
      pageWidth,
      pageHeight,
      imageWidth,
      imageHeight,
    });
    fillMaskRect(runMask, imageWidth, rect);
  }
  return runMask;
}

function maskMetrics(args: {
  readonly originalInkMask: Uint8Array;
  readonly runMask: Uint8Array;
}): MaskMetrics {
  const { originalInkMask, runMask } = args;
  const runMaskPixelCount = countOnPixels(runMask);
  const originalInkPixelCount = countOnPixels(originalInkMask);
  // eslint-disable-next-line no-restricted-syntax -- tight loop over raster
  let overlapPixelCount = 0;
  for (let i = 0; i < runMask.length; i++) {
    if (runMask[i] === 1 && originalInkMask[i] === 1) {
      overlapPixelCount += 1;
    }
  }
  const precision = runMaskPixelCount === 0 ? 0 : overlapPixelCount / runMaskPixelCount;
  const recall = originalInkPixelCount === 0 ? 0 : overlapPixelCount / originalInkPixelCount;
  return {
    runMaskPixelCount,
    originalInkPixelCount,
    overlapPixelCount,
    precision,
    recall,
    f1: f1Score(precision, recall),
  };
}

function clampTransform(transform: OverlayTransform): OverlayTransform {
  return {
    sx: clamp(transform.sx, 0.8, 1.2),
    sy: clamp(transform.sy, 0.8, 1.2),
    tx: clamp(transform.tx, -120, 120),
    ty: clamp(transform.ty, -120, 120),
  };
}

function transformNeighbors(args: {
  readonly base: OverlayTransform;
  readonly translationStep: number;
  readonly scaleStep: number;
}): readonly OverlayTransform[] {
  const { base, translationStep, scaleStep } = args;
  const candidates: OverlayTransform[] = [];
  const seen = new Set<string>();
  for (const dsx of [-scaleStep, 0, scaleStep]) {
    for (const dsy of [-scaleStep, 0, scaleStep]) {
      for (const dtx of [-translationStep, 0, translationStep]) {
        for (const dty of [-translationStep, 0, translationStep]) {
          const candidate = clampTransform({
            sx: base.sx + dsx,
            sy: base.sy + dsy,
            tx: base.tx + dtx,
            ty: base.ty + dty,
          });
          const key = `${candidate.sx.toFixed(6)}:${candidate.sy.toFixed(6)}:${candidate.tx.toFixed(6)}:${candidate.ty.toFixed(6)}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          candidates.push(candidate);
        }
      }
    }
  }
  return candidates;
}

function compareMetrics(a: MaskMetrics, b: MaskMetrics): number {
  if (a.f1 !== b.f1) {
    return a.f1 - b.f1;
  }
  if (a.recall !== b.recall) {
    return a.recall - b.recall;
  }
  return a.precision - b.precision;
}

function calibrateTransform(args: {
  readonly runs: readonly PdfText[];
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly originalInkMask: Uint8Array;
  readonly maxIterations: number;
}): {
  readonly transform: OverlayTransform;
  readonly baselineMetrics: MaskMetrics;
  readonly calibratedMetrics: MaskMetrics;
  readonly iterations: readonly CalibrationIteration[];
} {
  const {
    runs,
    pageWidth,
    pageHeight,
    imageWidth,
    imageHeight,
    originalInkMask,
    maxIterations,
  } = args;

  const baselineMask = buildRunMask({
    texts: runs,
    pageWidth,
    pageHeight,
    imageWidth,
    imageHeight,
    transform: IDENTITY_TRANSFORM,
  });
  const baselineMetrics = maskMetrics({ originalInkMask, runMask: baselineMask });

  // eslint-disable-next-line no-restricted-syntax -- calibration loop updates best state
  let bestTransform = IDENTITY_TRANSFORM;
  // eslint-disable-next-line no-restricted-syntax -- calibration loop updates best state
  let bestMetrics = baselineMetrics;
  const iterations: CalibrationIteration[] = [];

  const translationSteps = [36, 20, 12, 8, 4, 2, 1];
  const scaleSteps = [0.04, 0.025, 0.02, 0.015, 0.01, 0.006, 0.003];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const translationStep = translationSteps[iteration] ?? 1;
    const scaleStep = scaleSteps[iteration] ?? 0.003;
    const neighbors = transformNeighbors({
      base: bestTransform,
      translationStep,
      scaleStep,
    });

    // eslint-disable-next-line no-restricted-syntax -- neighbor search updates best state
    let iterationBestTransform = bestTransform;
    // eslint-disable-next-line no-restricted-syntax -- neighbor search updates best state
    let iterationBestMetrics = bestMetrics;

    for (const neighbor of neighbors) {
      const runMask = buildRunMask({
        texts: runs,
        pageWidth,
        pageHeight,
        imageWidth,
        imageHeight,
        transform: neighbor,
      });
      const neighborMetrics = maskMetrics({ originalInkMask, runMask });
      if (compareMetrics(neighborMetrics, iterationBestMetrics) > 0) {
        iterationBestMetrics = neighborMetrics;
        iterationBestTransform = neighbor;
      }
    }

    bestTransform = iterationBestTransform;
    bestMetrics = iterationBestMetrics;
    iterations.push({
      iteration: iteration + 1,
      translationStep,
      scaleStep,
      sx: bestTransform.sx,
      sy: bestTransform.sy,
      tx: bestTransform.tx,
      ty: bestTransform.ty,
      precision: bestMetrics.precision,
      recall: bestMetrics.recall,
      f1: bestMetrics.f1,
    });
  }

  return {
    transform: bestTransform,
    baselineMetrics,
    calibratedMetrics: bestMetrics,
    iterations,
  };
}

function identityCalibrationResult(args: {
  readonly runs: readonly PdfText[];
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly originalInkMask: Uint8Array;
}): {
  readonly transform: OverlayTransform;
  readonly baselineMetrics: MaskMetrics;
  readonly calibratedMetrics: MaskMetrics;
  readonly iterations: readonly CalibrationIteration[];
} {
  const { runs, pageWidth, pageHeight, imageWidth, imageHeight, originalInkMask } = args;
  const runMask = buildRunMask({
    texts: runs,
    pageWidth,
    pageHeight,
    imageWidth,
    imageHeight,
    transform: IDENTITY_TRANSFORM,
  });
  const metrics = maskMetrics({ originalInkMask, runMask });
  return {
    transform: IDENTITY_TRANSFORM,
    baselineMetrics: metrics,
    calibratedMetrics: metrics,
    iterations: [],
  };
}

function buildDiffMaskPng(args: {
  readonly originalInkMask: Uint8Array;
  readonly runMask: Uint8Array;
  readonly width: number;
  readonly height: number;
}): { readonly png: PNG; readonly overlapPixelCount: number } {
  const { originalInkMask, runMask, width, height } = args;
  const png = new PNG({ width, height });
  // eslint-disable-next-line no-restricted-syntax -- tight loop over raster
  let overlapPixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      const hasInk = originalInkMask[p] === 1;
      const hasRun = runMask[p] === 1;

      if (hasInk && hasRun) {
        overlapPixelCount += 1;
        png.data[i] = 59;
        png.data[i + 1] = 178;
        png.data[i + 2] = 115;
        png.data[i + 3] = 255;
        continue;
      }
      if (hasInk) {
        png.data[i] = 214;
        png.data[i + 1] = 40;
        png.data[i + 2] = 40;
        png.data[i + 3] = 255;
        continue;
      }
      if (hasRun) {
        png.data[i] = 33;
        png.data[i + 1] = 102;
        png.data[i + 2] = 172;
        png.data[i + 3] = 255;
        continue;
      }

      png.data[i] = 245;
      png.data[i + 1] = 245;
      png.data[i + 2] = 245;
      png.data[i + 3] = 255;
    }
  }

  return { png, overlapPixelCount };
}

function toDataUriPng(pngBuffer: Buffer): string {
  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

function drawGroupRectangles(groups: readonly GroupedText[], pageHeight: number): readonly string[] {
  return groups.flatMap((group, index) => {
    const color = GROUP_PALETTE[index % GROUP_PALETTE.length] ?? "#111111";
    const y = toSvgTopY(pageHeight, group.bounds.y, group.bounds.height);
    const line = `G${index} p=${group.paragraphs.length} r=${group.paragraphs.reduce((s, p) => s + p.runs.length, 0)}`;
    return [
      `<rect x="${group.bounds.x}" y="${y}" width="${group.bounds.width}" height="${group.bounds.height}" fill="none" stroke="${color}" stroke-width="1">`,
      `<title>${escapeXml(line)}</title>`,
      `</rect>`,
    ];
  });
}

function drawMismatchedRunRectangles(args: {
  readonly runs: readonly ScoredRun[];
  readonly pageHeight: number;
  readonly maxLabels: number;
}): readonly string[] {
  const { runs, pageHeight, maxLabels } = args;
  const warningRuns = runs
    .filter((run) => run.status !== "good")
    .sort((a, b) => a.density - b.density);

  const labeled = warningRuns.slice(0, maxLabels);
  const labeledSet = new Set(labeled.map((entry) => entry.run));

  const rectangles = warningRuns.flatMap((entry) => {
    const y = toSvgTopY(pageHeight, entry.rect.y, entry.rect.height);
    const color = entry.status === "bad" ? "#d00000" : "#ff8f00";
    const fill = entry.status === "bad" ? "rgba(208,0,0,0.2)" : "rgba(255,143,0,0.16)";
    const label = `${entry.status.toUpperCase()} density=${entry.density.toFixed(3)} text=${entry.run.text.slice(0, 24)}`;
    return [
      `<rect x="${entry.rect.x}" y="${y}" width="${Math.max(entry.rect.width, 0.2)}" height="${Math.max(entry.rect.height, 0.2)}" stroke="${color}" fill="${fill}" stroke-width="0.6">`,
      `<title>${escapeXml(label)}</title>`,
      `</rect>`,
    ];
  });

  const labels = labeled.map((entry) => {
    const y = toSvgTopY(pageHeight, entry.rect.y, entry.rect.height);
    const text = `${entry.status}:${entry.density.toFixed(3)} ${entry.run.text.replace(/\s+/g, " ").slice(0, 12)}`;
    const labelY = Math.max(10, y - 1);
    const color = entry.status === "bad" ? "#b00020" : "#d35400";

    return [
      `<text x="${entry.rect.x + 1}" y="${labelY}" font-size="7" fill="${color}" font-family="monospace">`,
      `${escapeXml(text)}`,
      `</text>`,
    ].join("");
  });

  const emphasized = warningRuns.map((entry) => {
    if (!labeledSet.has(entry.run)) {
      return "";
    }
    const y = toSvgTopY(pageHeight, entry.rect.y, entry.rect.height);
    const color = entry.status === "bad" ? "#8b0000" : "#cc7000";
    return `<rect x="${entry.rect.x}" y="${y}" width="${Math.max(entry.rect.width, 0.2)}" height="${Math.max(entry.rect.height, 0.2)}" fill="none" stroke="${color}" stroke-width="1.1"/>`;
  });

  return [...rectangles, ...emphasized, ...labels];
}

function buildOverlaySvg(args: {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly originalPngDataUri: string;
  readonly diffPngDataUri: string;
  readonly groups: readonly GroupedText[];
  readonly scoredRuns: readonly ScoredRun[];
  readonly maxLabeledRuns: number;
  readonly calibration: CalibrationSummary;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
}): string {
  const {
    pageWidth,
    pageHeight,
    originalPngDataUri,
    diffPngDataUri,
    groups,
    scoredRuns,
    maxLabeledRuns,
    calibration,
    precision,
    recall,
    f1,
  } = args;

  const gap = 24;
  const canvasWidth = pageWidth * 2 + gap;
  const canvasHeight = pageHeight;

  const groupRects = drawGroupRectangles(groups, pageHeight);
  const mismatchRects = drawMismatchedRunRectangles({ runs: scoredRuns, pageHeight, maxLabels: maxLabeledRuns });

  const badCount = scoredRuns.filter((run) => run.status === "bad").length;
  const warnCount = scoredRuns.filter((run) => run.status === "warn").length;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
    `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"/>`,
    `<text x="8" y="14" font-size="10" font-family="monospace" fill="#202124">Original + block/runs overlay</text>`,
    `<text x="${pageWidth + gap + 8}" y="14" font-size="10" font-family="monospace" fill="#202124">Mask diff (red=original only, blue=run only, green=overlap)</text>`,
    `<image x="0" y="0" width="${pageWidth}" height="${pageHeight}" href="${originalPngDataUri}"/>`,
    `<image x="${pageWidth + gap}" y="0" width="${pageWidth}" height="${pageHeight}" href="${diffPngDataUri}"/>`,
    `<g id="left-overlay">`,
    ...groupRects,
    ...mismatchRects,
    `</g>`,
    `<rect x="0" y="${Math.max(0, pageHeight - 18)}" width="${pageWidth}" height="18" fill="rgba(255,255,255,0.85)"/>`,
    `<text x="8" y="${Math.max(10, pageHeight - 6)}" font-size="9" font-family="monospace" fill="#111">bad=${badCount} warn=${warnCount} precision=${precision.toFixed(3)} recall=${recall.toFixed(3)} f1=${f1.toFixed(3)} calibF1=${calibration.baseline.f1.toFixed(3)}→${calibration.calibrated.f1.toFixed(3)} t=(${calibration.transform.sx.toFixed(3)},${calibration.transform.sy.toFixed(3)},${calibration.transform.tx.toFixed(1)},${calibration.transform.ty.toFixed(1)})</text>`,
    `</svg>`,
  ].join("\n");
}

async function buildOriginalComparisonArtifacts(cli: CliArgs): Promise<OverlaySummary> {
  const bytes = readFileSync(cli.pdfPath);
  const parsed = await parsePdf(bytes, { pages: [cli.pageNumber], encryption: { mode: "password", password: "" } });
  const page = parsed.pages[0];
  if (!page) {
    throw new Error(`Page ${cli.pageNumber} not found: ${cli.pdfPath}`);
  }

  const texts = page.elements.filter((element): element is PdfText => element.type === "text");
  const groups = spatialGrouping(texts, { pageWidth: page.width, pageHeight: page.height });

  const baseName = outputBaseName(cli.pdfPath, cli.pageNumber);
  const pngPrefix = path.resolve(cli.outDir, `${baseName}.original`);
  const originalPngPath = ensurePngRendered({
    pdfPath: cli.pdfPath,
    pageNumber: cli.pageNumber,
    dpi: cli.dpi,
    outputPrefix: pngPrefix,
  });

  const originalPng = PNG.sync.read(readFileSync(originalPngPath));
  const originalInkMask = buildInkMask(originalPng, cli.inkLumaThreshold);

  const nonEmptyRuns = texts.filter((run) => run.text.trim().length > 0);
  const trustedRuns = nonEmptyRuns.filter((run) => !isSuspiciousRunText(run.text));
  const calibrationRunPool = trustedRuns.length >= 80 ? trustedRuns : nonEmptyRuns;
  const calibrationRuns = selectCalibrationRuns(calibrationRunPool, 600);

  // eslint-disable-next-line no-restricted-syntax -- branch selects calibration strategy
  let calibrationResult = identityCalibrationResult({
    runs: calibrationRuns,
    pageWidth: page.width,
    pageHeight: page.height,
    imageWidth: originalPng.width,
    imageHeight: originalPng.height,
    originalInkMask,
  });
  if (cli.enableCalibration) {
    calibrationResult = calibrateTransform({
      runs: calibrationRuns,
      pageWidth: page.width,
      pageHeight: page.height,
      imageWidth: originalPng.width,
      imageHeight: originalPng.height,
      originalInkMask,
      maxIterations: cli.maxCalibrationIterations,
    });
  }

  const { scoredRuns, runMask } = scoreRunsAgainstOriginal({
    texts,
    pageWidth: page.width,
    pageHeight: page.height,
    imageWidth: originalPng.width,
    imageHeight: originalPng.height,
    originalInkMask,
    transform: calibrationResult.transform,
    badDensityThreshold: cli.badDensityThreshold,
    warnDensityThreshold: cli.warnDensityThreshold,
  });

  const overallMetrics = maskMetrics({ originalInkMask, runMask });
  const { png: diffPng, overlapPixelCount } = buildDiffMaskPng({
    originalInkMask,
    runMask,
    width: originalPng.width,
    height: originalPng.height,
  });

  const diffPngPath = path.resolve(cli.outDir, `${baseName}.compare-diff.png`);
  const diffPngBuffer = PNG.sync.write(diffPng);
  writeFileSync(diffPngPath, diffPngBuffer);

  const originalPngDataUri = toDataUriPng(readFileSync(originalPngPath));
  const diffPngDataUri = toDataUriPng(diffPngBuffer);

  const runMaskPixelCount = overallMetrics.runMaskPixelCount;
  const originalInkPixelCount = overallMetrics.originalInkPixelCount;
  const maskPrecision = overallMetrics.precision;
  const maskRecall = overallMetrics.recall;
  const maskF1 = overallMetrics.f1;

  const runDensities = scoredRuns.map((run) => run.density);
  const meanRunDensity = mean(runDensities);

  const badRuns = scoredRuns.filter((run) => run.status === "bad");
  const warnRuns = scoredRuns.filter((run) => run.status === "warn");
  const goodRuns = scoredRuns.filter((run) => run.status === "good");
  const worstRuns = [...scoredRuns]
    .sort((a, b) => a.density - b.density)
    .slice(0, 40)
    .map((run) => ({
      text: run.run.text,
      density: run.density,
      x: run.rect.x,
      y: run.rect.y,
      width: run.rect.width,
      height: run.rect.height,
    }));

  const calibrationSummary: CalibrationSummary = {
    enabled: cli.enableCalibration,
    sampleRunCount: calibrationRuns.length,
    trustedRunCount: trustedRuns.length,
    suspiciousRunCount: nonEmptyRuns.length - trustedRuns.length,
    baseline: {
      precision: calibrationResult.baselineMetrics.precision,
      recall: calibrationResult.baselineMetrics.recall,
      f1: calibrationResult.baselineMetrics.f1,
    },
    calibrated: {
      precision: calibrationResult.calibratedMetrics.precision,
      recall: calibrationResult.calibratedMetrics.recall,
      f1: calibrationResult.calibratedMetrics.f1,
    },
    transform: calibrationResult.transform,
    iterations: calibrationResult.iterations,
  };

  const overlaySvg = buildOverlaySvg({
    pageWidth: page.width,
    pageHeight: page.height,
    originalPngDataUri,
    diffPngDataUri,
    groups,
    scoredRuns,
    maxLabeledRuns: cli.maxLabeledRuns,
    calibration: calibrationSummary,
    precision: maskPrecision,
    recall: maskRecall,
    f1: maskF1,
  });

  const overlaySvgPath = path.resolve(cli.outDir, `${baseName}.compare.svg`);
  const compareJsonPath = path.resolve(cli.outDir, `${baseName}.compare.json`);
  writeFileSync(overlaySvgPath, overlaySvg);

  const summary: OverlaySummary = {
    pdfPath: cli.pdfPath,
    pageNumber: cli.pageNumber,
    pageWidth: page.width,
    pageHeight: page.height,
    originalPngPath,
    overlaySvgPath,
    diffPngPath,
    compareJsonPath,
    runCount: texts.length,
    scoredRunCount: scoredRuns.length,
    badRunCount: badRuns.length,
    warnRunCount: warnRuns.length,
    goodRunCount: goodRuns.length,
    meanRunDensity,
    p50RunDensity: quantile(runDensities, 0.5),
    p90RunDensity: quantile(runDensities, 0.9),
    maskPrecision,
    maskRecall,
    maskF1,
    originalInkPixelCount,
    runMaskPixelCount,
    overlapPixelCount,
    calibration: calibrationSummary,
    worstRuns,
  };

  writeFileSync(compareJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));
  mkdirSync(cli.outDir, { recursive: true });

  const summary = await visualizeBlockSegmentation({
    pdfPath: cli.pdfPath,
    outDir: cli.outDir,
    pageNumber: cli.pageNumber,
  });

  console.log(`svg: ${summary.outputSvgPath}`);
  console.log(`json: ${summary.outputJsonPath}`);
  console.log(
    `summary: texts=${summary.textCount} groups=${summary.groupCount} groupedRuns=${summary.groupedRunCount} ` +
      `ungroupedRuns=${summary.ungroupedRunCount}`,
  );
  if (summary.missingChars.length > 0 || summary.extraChars.length > 0) {
    console.log(`charDiff: missing=${summary.missingChars.length} extra=${summary.extraChars.length}`);
  } else {
    console.log("charDiff: none");
  }

  if (!cli.compareOriginal) {
    return;
  }

  const overlay = await buildOriginalComparisonArtifacts(cli);
  console.log(`originalPng: ${overlay.originalPngPath}`);
  console.log(`compareSvg: ${overlay.overlaySvgPath}`);
  console.log(`diffPng: ${overlay.diffPngPath}`);
  console.log(`compareJson: ${overlay.compareJsonPath}`);
  console.log(
    `overlay: bad=${overlay.badRunCount} warn=${overlay.warnRunCount} good=${overlay.goodRunCount} ` +
      `precision=${overlay.maskPrecision.toFixed(3)} recall=${overlay.maskRecall.toFixed(3)} f1=${overlay.maskF1.toFixed(3)}`,
  );
  console.log(
    `calibration: sampleRuns=${overlay.calibration.sampleRunCount} trustedRuns=${overlay.calibration.trustedRunCount} ` +
      `suspiciousRuns=${overlay.calibration.suspiciousRunCount} ` +
      `f1=${overlay.calibration.baseline.f1.toFixed(3)}->${overlay.calibration.calibrated.f1.toFixed(3)} ` +
      `transform=(sx:${overlay.calibration.transform.sx.toFixed(3)},sy:${overlay.calibration.transform.sy.toFixed(3)},` +
      `tx:${overlay.calibration.transform.tx.toFixed(1)},ty:${overlay.calibration.transform.ty.toFixed(1)})`,
  );
}

await main();
