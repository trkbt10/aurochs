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
import type { PdfPath } from "../packages/@aurochs/pdf/src/domain/path";
import { spatialGrouping } from "../packages/@aurochs/pdf/src/services/block-segmentation/strategies/spatial-grouping";
import type { GroupedText } from "../packages/@aurochs/pdf/src/services/block-segmentation/contracts/types";
import { visualizeBlockSegmentation } from "../packages/@aurochs/pdf/src/services/block-segmentation/visualization/block-segmentation-visualizer";
import {
  inferTableFromGroupedText,
  type InferredTable,
  type TableInferenceOptions,
} from "../packages/@aurochs-converters/pdf-to-pptx/src/converter/table-inference";
import {
  detectTableRegionsFromPaths,
  type TableRegion,
} from "../packages/@aurochs-converters/pdf-to-pptx/src/converter/table-detection";

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

type TricolorDiffBreakdown = {
  readonly overlapPixelCount: number;
  readonly originalOnlyPixelCount: number;
  readonly runOnlyPixelCount: number;
  readonly emptyPixelCount: number;
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

type TableVisualizationCell = {
  readonly rowIndex: number;
  readonly colStart: number;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly alignment: "left" | "center" | "right";
  readonly lineCount: number;
  readonly runCount: number;
  readonly preview: string;
};

type TableVisualization = {
  readonly tableIndex: number;
  readonly source: "group" | "region";
  readonly groupIndex: number;
  readonly regionRuleCount: number | null;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly rowCount: number;
  readonly colCount: number;
  readonly cellCount: number;
  readonly mergedCellCount: number;
  readonly coveredRunCount: number;
  readonly groupRunCount: number;
  readonly runCoverage: number;
  readonly cells: readonly TableVisualizationCell[];
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
  readonly diffBreakdown: TricolorDiffBreakdown;
  readonly tableOverlaySvgPath: string;
  readonly tableJsonPath: string;
  readonly tableCount: number;
  readonly tableCellCount: number;
  readonly tableVisualizations: readonly TableVisualization[];
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
}): { readonly png: PNG; readonly breakdown: TricolorDiffBreakdown } {
  const { originalInkMask, runMask, width, height } = args;
  const png = new PNG({ width, height });
  const breakdown = {
    overlapPixelCount: 0,
    originalOnlyPixelCount: 0,
    runOnlyPixelCount: 0,
    emptyPixelCount: 0,
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      const hasInk = originalInkMask[p] === 1;
      const hasRun = runMask[p] === 1;

      if (hasInk && hasRun) {
        breakdown.overlapPixelCount += 1;
        png.data[i] = 59;
        png.data[i + 1] = 178;
        png.data[i + 2] = 115;
        png.data[i + 3] = 255;
        continue;
      }
      if (hasInk) {
        breakdown.originalOnlyPixelCount += 1;
        png.data[i] = 214;
        png.data[i + 1] = 40;
        png.data[i + 2] = 40;
        png.data[i + 3] = 255;
        continue;
      }
      if (hasRun) {
        breakdown.runOnlyPixelCount += 1;
        png.data[i] = 33;
        png.data[i + 1] = 102;
        png.data[i + 2] = 172;
        png.data[i + 3] = 255;
        continue;
      }

      breakdown.emptyPixelCount += 1;
      png.data[i] = 245;
      png.data[i + 1] = 245;
      png.data[i + 2] = 245;
      png.data[i + 3] = 255;
    }
  }

  return { png, breakdown };
}

function toDataUriPng(pngBuffer: Buffer): string {
  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) {
    return 0;
  }
  return part / whole;
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

function toCellPreview(inferredCellLines: readonly (readonly PdfText[])[]): string {
  return inferredCellLines
    .map((line) => line.map((run) => run.text).join(""))
    .join(" / ")
    .replace(/\s+/g, " ")
    .slice(0, 64);
}

function countGroupRuns(group: GroupedText): number {
  return group.paragraphs.reduce((sum, paragraph) => sum + paragraph.runs.length, 0);
}

function collectCoveredRuns(inferred: InferredTable): ReadonlySet<PdfText> {
  const covered = new Set<PdfText>();
  for (const row of inferred.rows) {
    for (const cell of row.cells) {
      for (const lineRuns of cell.runsByLine) {
        for (const run of lineRuns) {
          covered.add(run);
        }
      }
    }
  }
  return covered;
}

function xBoundariesFromTable(inferred: InferredTable): readonly number[] {
  const first = inferred.columns[0];
  if (!first) {
    return [inferred.bounds.x, inferred.bounds.x + inferred.bounds.width];
  }
  return [first.x0, ...inferred.columns.map((column) => column.x1)];
}

function toTableCells(inferred: InferredTable): readonly TableVisualizationCell[] {
  const xBounds = xBoundariesFromTable(inferred);
  const unique = new Set<string>();
  const rows = inferred.rows;

  return rows.flatMap((row, rowIndex) =>
    row.cells.flatMap((cell) => {
      const key = `${rowIndex}:${cell.colStart}:${cell.colSpan}:${cell.rowSpan}`;
      if (unique.has(key)) {
        return [];
      }
      unique.add(key);
      const colStart = Math.max(0, Math.min(inferred.columns.length - 1, cell.colStart));
      const colEnd = Math.max(colStart + 1, Math.min(inferred.columns.length, colStart + Math.max(1, cell.colSpan)));
      const spanEnd = Math.max(
        rowIndex,
        Math.min(rows.length - 1, rowIndex + Math.max(1, cell.rowSpan) - 1),
      );
      const x0 = xBounds[colStart] ?? inferred.bounds.x;
      const x1 = xBounds[colEnd] ?? inferred.bounds.x + inferred.bounds.width;
      const yTop = rows[rowIndex]?.y1 ?? row.y1;
      const yBottom = rows[spanEnd]?.y0 ?? row.y0;
      const runCount = cell.runsByLine.reduce((sum, lineRuns) => sum + lineRuns.length, 0);
      return [{
        rowIndex,
        colStart,
        colSpan: Math.max(1, cell.colSpan),
        rowSpan: Math.max(1, cell.rowSpan),
        x0,
        y0: Math.min(yBottom, yTop),
        x1,
        y1: Math.max(yBottom, yTop),
        alignment: cell.alignment,
        lineCount: cell.runsByLine.length,
        runCount,
        preview: toCellPreview(cell.runsByLine),
      }];
    })
  );
}

type TableSelectionArgs = {
  readonly group: GroupedText;
  readonly groupIndex: number;
  readonly source: "group" | "region";
  readonly regionRuleCount: number | null;
  readonly options: readonly TableInferenceOptions[];
};

function selectBestTableForGroup(args: TableSelectionArgs): TableVisualization | null {
  const { group, groupIndex, source, regionRuleCount, options } = args;
  const groupRunCount = countGroupRuns(group);
  const candidates = options.flatMap((option) => {
    const inferred = inferTableFromGroupedText(group, option);
    if (!inferred) {
      return [];
    }
    const rowCount = inferred.rows.length;
    const colCount = inferred.columns.length;
    if (rowCount < 2 || colCount < 2) {
      return [];
    }
    const cells = toTableCells(inferred);
    if (cells.length < 4) {
      return [];
    }
    const coveredRuns = collectCoveredRuns(inferred);
    const runCoverage = coveredRuns.size / Math.max(1, groupRunCount);
    if (runCoverage < 0.35) {
      return [];
    }
    const mergedCellCount = cells.filter((cell) => cell.colSpan > 1 || cell.rowSpan > 1).length;
    const score = rowCount * colCount + runCoverage * 10 + mergedCellCount * 0.5;
    return [{
      score,
      table: {
        tableIndex: -1,
        source,
        groupIndex,
        regionRuleCount,
        bounds: inferred.bounds,
        rowCount,
        colCount,
        cellCount: cells.length,
        mergedCellCount,
        coveredRunCount: coveredRuns.size,
        groupRunCount,
        runCoverage,
        cells,
      },
    }];
  });

  const best = [...candidates].sort((a, b) => b.score - a.score)[0];
  return best?.table ?? null;
}

type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

function toRectFromRegion(region: TableRegion): Rect {
  return {
    x: region.x0,
    y: region.y0,
    width: Math.max(0, region.x1 - region.x0),
    height: Math.max(0, region.y1 - region.y0),
  };
}

function intersectsRect(a: Rect, b: Rect): boolean {
  return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height;
}

function overlapArea(a: Rect, b: Rect): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  return w * h;
}

function overlapRatioBySmaller(a: Rect, b: Rect): number {
  const areaA = Math.max(0, a.width * a.height);
  const areaB = Math.max(0, b.width * b.height);
  const minArea = Math.max(1e-6, Math.min(areaA, areaB));
  return overlapArea(a, b) / minArea;
}

function mergeGroupsForRegion(args: {
  readonly region: TableRegion;
  readonly groups: readonly GroupedText[];
}): GroupedText | null {
  const regionRect = toRectFromRegion(args.region);
  const pad = 3;
  const paddedRegion = {
    x: regionRect.x - pad,
    y: regionRect.y - pad,
    width: regionRect.width + pad * 2,
    height: regionRect.height + pad * 2,
  };
  const selected = args.groups.filter((group) => intersectsRect(group.bounds, paddedRegion));
  if (selected.length === 0) {
    return null;
  }
  const paragraphs = selected
    .flatMap((group) => group.paragraphs)
    .sort((a, b) => {
      if (a.baselineY !== b.baselineY) {
        return b.baselineY - a.baselineY;
      }
      const leftA = Math.min(...a.runs.map((run) => run.x));
      const leftB = Math.min(...b.runs.map((run) => run.x));
      return leftA - leftB;
    });
  if (paragraphs.length < 2) {
    return null;
  }
  const mergedBounds = selected.reduce(
    (acc, group) => ({
      x: Math.min(acc.x, group.bounds.x),
      y: Math.min(acc.y, group.bounds.y),
      width: Math.max(acc.x + acc.width, group.bounds.x + group.bounds.width) - Math.min(acc.x, group.bounds.x),
      height: Math.max(acc.y + acc.height, group.bounds.y + group.bounds.height) - Math.min(acc.y, group.bounds.y),
    }),
    selected[0]!.bounds,
  );
  return {
    bounds: mergedBounds,
    paragraphs,
  };
}

function defaultTableOptions(pagePaths: readonly PdfPath[]): readonly TableInferenceOptions[] {
  return [
    {
      minRows: 6,
      minCols: 3,
      maxCols: 20,
      minRowCoverage: 0.6,
      minColumnSupport: 0.55,
      paths: pagePaths,
    },
    {
      minRows: 4,
      minCols: 2,
      maxCols: 20,
      minRowCoverage: 0.55,
      minColumnSupport: 0.5,
      paths: pagePaths,
    },
    {
      minRows: 2,
      minCols: 2,
      maxCols: 20,
      minRowCoverage: 0.45,
      minColumnSupport: 0.4,
      paths: pagePaths,
    },
  ];
}

function regionTableOptions(region: TableRegion, pagePaths: readonly PdfPath[]): readonly TableInferenceOptions[] {
  const hintedCols = Math.max(2, Math.min(20, region.colCountHint ?? 2));
  const hintedRows = Math.max(2, Math.min(20, region.rowCountHint ?? 2));
  const hintedMaxCols = Math.max(hintedCols, 20);
  return [
    {
      minRows: hintedRows,
      minCols: hintedCols,
      maxCols: hintedMaxCols,
      minRowCoverage: 0.4,
      minColumnSupport: 0.35,
      paths: pagePaths,
    },
    {
      minRows: 2,
      minCols: 2,
      maxCols: hintedMaxCols,
      minRowCoverage: 0.35,
      minColumnSupport: 0.3,
      paths: pagePaths,
    },
  ];
}

function inferTablesFromGroups(args: {
  readonly groups: readonly GroupedText[];
  readonly pagePaths: readonly PdfPath[];
  readonly pageWidth: number;
  readonly pageHeight: number;
}): readonly TableVisualization[] {
  const groupCandidates = args.groups.flatMap((group, groupIndex) => {
    const table = selectBestTableForGroup({
      group,
      groupIndex,
      source: "group",
      regionRuleCount: null,
      options: defaultTableOptions(args.pagePaths),
    });
    if (!table) {
      return [];
    }
    return [table];
  });

  const regions = detectTableRegionsFromPaths(args.pagePaths, {
    width: args.pageWidth,
    height: args.pageHeight,
  });
  const regionCandidates = regions.flatMap((region) => {
    const mergedGroup = mergeGroupsForRegion({ region, groups: args.groups });
    if (!mergedGroup) {
      return [];
    }
    const table = selectBestTableForGroup({
      group: mergedGroup,
      groupIndex: -1,
      source: "region",
      regionRuleCount: region.ruleCount,
      options: regionTableOptions(region, args.pagePaths),
    });
    if (!table) {
      return [];
    }
    return [table];
  });

  const ranked = [...groupCandidates, ...regionCandidates]
    .sort((a, b) => {
      const aScore = a.cellCount * (1 + a.runCoverage);
      const bScore = b.cellCount * (1 + b.runCoverage);
      return bScore - aScore;
    });

  const deduped: TableVisualization[] = [];
  for (const candidate of ranked) {
    const candidateRect = candidate.bounds;
    const isDuplicate = deduped.some((existing) => overlapRatioBySmaller(existing.bounds, candidateRect) >= 0.85);
    if (!isDuplicate) {
      deduped.push(candidate);
    }
  }

  const sorted = deduped.sort((a, b) => {
    const aTop = a.bounds.y + a.bounds.height;
    const bTop = b.bounds.y + b.bounds.height;
    if (aTop !== bTop) {
      return bTop - aTop;
    }
    return a.bounds.x - b.bounds.x;
  });

  return sorted.map((table, tableIndex) => ({
    ...table,
    tableIndex,
  }));
}

function drawTableRectangles(args: {
  readonly tables: readonly TableVisualization[];
  readonly pageHeight: number;
}): readonly string[] {
  const { tables, pageHeight } = args;
  return tables.flatMap((table) => {
    const color = GROUP_PALETTE[table.tableIndex % GROUP_PALETTE.length] ?? "#283593";
    const tableTopY = toSvgTopY(pageHeight, table.bounds.y, table.bounds.height);
    const sourceLabel = table.source === "region" ? `R${table.regionRuleCount ?? "?"}` : `G${table.groupIndex}`;
    const tableLabel = `T${table.tableIndex} ${sourceLabel} ${table.rowCount}x${table.colCount} cells=${table.cellCount} cover=${(
      table.runCoverage * 100
    ).toFixed(1)}%`;
    const tableRect = [
      `<rect x="${table.bounds.x}" y="${tableTopY}" width="${table.bounds.width}" height="${table.bounds.height}" fill="none" stroke="${color}" stroke-width="1.8">`,
      `<title>${escapeXml(tableLabel)}</title>`,
      `</rect>`,
      `<text x="${table.bounds.x + 2}" y="${Math.max(10, tableTopY - 2)}" font-size="8.5" font-family="monospace" fill="${color}">`,
      `${escapeXml(tableLabel)}`,
      `</text>`,
    ];

    const cellRects = table.cells.flatMap((cell) => {
      const cellHeight = Math.max(0.2, cell.y1 - cell.y0);
      const y = toSvgTopY(pageHeight, cell.y0, cellHeight);
      const isMerged = cell.colSpan > 1 || cell.rowSpan > 1;
      const fill = isMerged ? "rgba(255,193,7,0.18)" : "rgba(30,136,229,0.09)";
      const stroke = isMerged ? "#ff6f00" : color;
      const textY = Math.min(pageHeight - 2, Math.max(9, y + 9));
      const cellLabel = `r${cell.rowIndex} c${cell.colStart} rs${cell.rowSpan} cs${cell.colSpan} ${cell.alignment} runs=${cell.runCount}`;
      return [
        `<rect x="${cell.x0}" y="${y}" width="${Math.max(0.2, cell.x1 - cell.x0)}" height="${cellHeight}" fill="${fill}" stroke="${stroke}" stroke-width="0.8">`,
        `<title>${escapeXml(`${cellLabel} ${cell.preview}`)}</title>`,
        `</rect>`,
        `<text x="${cell.x0 + 1}" y="${textY}" font-size="6.8" font-family="monospace" fill="${stroke}">`,
        `${escapeXml(`r${cell.rowIndex}c${cell.colStart} ${cell.runCount}`)}`,
        `</text>`,
      ];
    });

    return [...tableRect, ...cellRects];
  });
}

function drawRunContextRectangles(args: {
  readonly texts: readonly PdfText[];
  readonly pageHeight: number;
}): readonly string[] {
  const { texts, pageHeight } = args;
  return texts
    .filter((run) => run.text.trim().length > 0)
    .map((run) => {
      const y = toSvgTopY(pageHeight, run.y, run.height);
      return `<rect x="${run.x}" y="${y}" width="${Math.max(0.2, run.width)}" height="${Math.max(0.2, run.height)}" fill="rgba(117,117,117,0.06)" stroke="rgba(117,117,117,0.2)" stroke-width="0.35"/>`;
    });
}

function buildTableOverlaySvg(args: {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly originalPngDataUri: string;
  readonly texts: readonly PdfText[];
  readonly tables: readonly TableVisualization[];
}): string {
  const { pageWidth, pageHeight, originalPngDataUri, texts, tables } = args;
  const runRects = drawRunContextRectangles({ texts, pageHeight });
  const tableRects = drawTableRectangles({ tables, pageHeight });
  const mergedCells = tables.reduce(
    (sum, table) => sum + table.cells.filter((cell) => cell.colSpan > 1 || cell.rowSpan > 1).length,
    0,
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" viewBox="0 0 ${pageWidth} ${pageHeight}">`,
    `<rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="#ffffff"/>`,
    `<image x="0" y="0" width="${pageWidth}" height="${pageHeight}" href="${originalPngDataUri}"/>`,
    `<text x="8" y="14" font-size="10" font-family="monospace" fill="#202124">Table grouping overlay tables=${tables.length} mergedCells=${mergedCells}</text>`,
    ...runRects,
    ...tableRects,
    `</svg>`,
  ].join("\n");
}

function buildOverlaySvg(args: {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly originalPngDataUri: string;
  readonly diffPngDataUri: string;
  readonly groups: readonly GroupedText[];
  readonly tables: readonly TableVisualization[];
  readonly scoredRuns: readonly ScoredRun[];
  readonly maxLabeledRuns: number;
  readonly calibration: CalibrationSummary;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly diffBreakdown: TricolorDiffBreakdown;
}): string {
  const {
    pageWidth,
    pageHeight,
    originalPngDataUri,
    diffPngDataUri,
    groups,
    tables,
    scoredRuns,
    maxLabeledRuns,
    calibration,
    precision,
    recall,
    f1,
    diffBreakdown,
  } = args;

  const gap = 24;
  const canvasWidth = pageWidth * 2 + gap;
  const canvasHeight = pageHeight;

  const groupRects = drawGroupRectangles(groups, pageHeight);
  const tableRects = drawTableRectangles({ tables, pageHeight });
  const mismatchRects = drawMismatchedRunRectangles({ runs: scoredRuns, pageHeight, maxLabels: maxLabeledRuns });

  const badCount = scoredRuns.filter((run) => run.status === "bad").length;
  const warnCount = scoredRuns.filter((run) => run.status === "warn").length;
  const totalPixels =
    diffBreakdown.overlapPixelCount + diffBreakdown.originalOnlyPixelCount + diffBreakdown.runOnlyPixelCount +
    diffBreakdown.emptyPixelCount;
  const overlapRate = pct(diffBreakdown.overlapPixelCount, totalPixels);
  const originalOnlyRate = pct(diffBreakdown.originalOnlyPixelCount, totalPixels);
  const runOnlyRate = pct(diffBreakdown.runOnlyPixelCount, totalPixels);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
    `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"/>`,
    `<text x="8" y="14" font-size="10" font-family="monospace" fill="#202124">Original + block/runs overlay</text>`,
    `<text x="${pageWidth + gap + 8}" y="14" font-size="10" font-family="monospace" fill="#202124">Tri-color diff: red=original only, blue=run only, green=overlap</text>`,
    `<image x="0" y="0" width="${pageWidth}" height="${pageHeight}" href="${originalPngDataUri}"/>`,
    `<image x="${pageWidth + gap}" y="0" width="${pageWidth}" height="${pageHeight}" href="${diffPngDataUri}"/>`,
    `<g id="left-overlay">`,
    ...groupRects,
    ...tableRects,
    ...mismatchRects,
    `</g>`,
    `<rect x="0" y="${Math.max(0, pageHeight - 18)}" width="${pageWidth}" height="18" fill="rgba(255,255,255,0.85)"/>`,
    `<text x="8" y="${Math.max(10, pageHeight - 6)}" font-size="9" font-family="monospace" fill="#111">bad=${badCount} warn=${warnCount} tables=${tables.length} precision=${precision.toFixed(3)} recall=${recall.toFixed(3)} f1=${f1.toFixed(3)} calibF1=${calibration.baseline.f1.toFixed(3)}→${calibration.calibrated.f1.toFixed(3)} t=(${calibration.transform.sx.toFixed(3)},${calibration.transform.sy.toFixed(3)},${calibration.transform.tx.toFixed(1)},${calibration.transform.ty.toFixed(1)})</text>`,
    `<rect x="${pageWidth + gap + 8}" y="${Math.max(16, pageHeight - 48)}" width="9" height="9" fill="#3bb273" stroke="#2f6d4f" stroke-width="0.6"/>`,
    `<text x="${pageWidth + gap + 20}" y="${Math.max(24, pageHeight - 40)}" font-size="8.5" font-family="monospace" fill="#111">overlap ${(overlapRate * 100).toFixed(2)}%</text>`,
    `<rect x="${pageWidth + gap + 8}" y="${Math.max(28, pageHeight - 36)}" width="9" height="9" fill="#d62828" stroke="#8c1a1a" stroke-width="0.6"/>`,
    `<text x="${pageWidth + gap + 20}" y="${Math.max(36, pageHeight - 28)}" font-size="8.5" font-family="monospace" fill="#111">original-only ${(originalOnlyRate * 100).toFixed(2)}%</text>`,
    `<rect x="${pageWidth + gap + 8}" y="${Math.max(40, pageHeight - 24)}" width="9" height="9" fill="#2166ac" stroke="#173d68" stroke-width="0.6"/>`,
    `<text x="${pageWidth + gap + 20}" y="${Math.max(48, pageHeight - 16)}" font-size="8.5" font-family="monospace" fill="#111">run-only ${(runOnlyRate * 100).toFixed(2)}%</text>`,
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
  const pagePaths = page.elements.filter((element): element is PdfPath => element.type === "path");
  const groups = spatialGrouping(texts, { pageWidth: page.width, pageHeight: page.height });
  const tableVisualizations = inferTablesFromGroups({
    groups,
    pagePaths,
    pageWidth: page.width,
    pageHeight: page.height,
  });

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
  const { png: diffPng, breakdown: diffBreakdown } = buildDiffMaskPng({
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

  const tableOverlaySvg = buildTableOverlaySvg({
    pageWidth: page.width,
    pageHeight: page.height,
    originalPngDataUri,
    texts,
    tables: tableVisualizations,
  });
  const tableOverlaySvgPath = path.resolve(cli.outDir, `${baseName}.tables.svg`);
  writeFileSync(tableOverlaySvgPath, tableOverlaySvg);
  const tableJsonPath = path.resolve(cli.outDir, `${baseName}.tables.json`);
  writeFileSync(tableJsonPath, `${JSON.stringify({ tables: tableVisualizations }, null, 2)}\n`);

  const overlaySvg = buildOverlaySvg({
    pageWidth: page.width,
    pageHeight: page.height,
    originalPngDataUri,
    diffPngDataUri,
    groups,
    tables: tableVisualizations,
    scoredRuns,
    maxLabeledRuns: cli.maxLabeledRuns,
    calibration: calibrationSummary,
    precision: maskPrecision,
    recall: maskRecall,
    f1: maskF1,
    diffBreakdown,
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
    overlapPixelCount: diffBreakdown.overlapPixelCount,
    diffBreakdown,
    tableOverlaySvgPath,
    tableJsonPath,
    tableCount: tableVisualizations.length,
    tableCellCount: tableVisualizations.reduce((sum, table) => sum + table.cellCount, 0),
    tableVisualizations,
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
  console.log(`tableSvg: ${overlay.tableOverlaySvgPath}`);
  console.log(`tableJson: ${overlay.tableJsonPath}`);
  console.log(`compareJson: ${overlay.compareJsonPath}`);
  console.log(
    `overlay: bad=${overlay.badRunCount} warn=${overlay.warnRunCount} good=${overlay.goodRunCount} ` +
      `precision=${overlay.maskPrecision.toFixed(3)} recall=${overlay.maskRecall.toFixed(3)} f1=${overlay.maskF1.toFixed(3)}`,
  );
  console.log(
    `tricolor: overlap=${overlay.diffBreakdown.overlapPixelCount} ` +
      `originalOnly=${overlay.diffBreakdown.originalOnlyPixelCount} runOnly=${overlay.diffBreakdown.runOnlyPixelCount}`,
  );
  console.log(`tables: count=${overlay.tableCount} cells=${overlay.tableCellCount}`);
  console.log(
    `calibration: sampleRuns=${overlay.calibration.sampleRunCount} trustedRuns=${overlay.calibration.trustedRunCount} ` +
      `suspiciousRuns=${overlay.calibration.suspiciousRunCount} ` +
      `f1=${overlay.calibration.baseline.f1.toFixed(3)}->${overlay.calibration.calibrated.f1.toFixed(3)} ` +
      `transform=(sx:${overlay.calibration.transform.sx.toFixed(3)},sy:${overlay.calibration.transform.sy.toFixed(3)},` +
      `tx:${overlay.calibration.transform.tx.toFixed(1)},ty:${overlay.calibration.transform.ty.toFixed(1)})`,
  );
}

await main();
