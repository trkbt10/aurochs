/**
 * @file Test helper for chart visual regression tests
 *
 * Provides utilities for rendering Chart domain objects to SVG
 * and comparing against baseline images.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Chart } from "@aurochs-office/chart/domain";
import { renderChart } from "../../src/svg/render-chart";
import { createTestChartRenderContext } from "../../src/svg/test-utils";
import { svgToPng, type CompareOptions, type CompareResult } from "./compare";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export type RenderedChartFixture = {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
};

export type RenderChartFixtureOptions = {
  readonly width?: number;
  readonly height?: number;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;

/**
 * Render a Chart domain object to SVG.
 */
export function renderChartFixture(
  chart: Chart,
  options?: RenderChartFixtureOptions
): RenderedChartFixture {
  const width = options?.width ?? DEFAULT_WIDTH;
  const height = options?.height ?? DEFAULT_HEIGHT;

  const { ctx, fillResolver } = createTestChartRenderContext();
  const svg = renderChart({ chart, width, height, ctx, fillResolver });

  return { svg, width, height };
}

/**
 * Get the fixture file path relative to the caller's directory.
 */
export function fixture(name: string, callerUrl: string): string {
  const callerDir = path.dirname(new URL(callerUrl).pathname);
  return path.join(callerDir, "fixtures", `${name}.ts`);
}

/**
 * Get the baseline PNG path for a fixture.
 */
export function baselinePath(fixtureName: string, callerUrl: string): string {
  const callerDir = path.dirname(new URL(callerUrl).pathname);
  return path.join(callerDir, "fixtures", `${fixtureName}.png`);
}

/**
 * Load PNG file and return PNG object
 */
function loadPng(filePath: string): PNG {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
}

/**
 * Resize PNG to match target dimensions using bilinear interpolation
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

  const sample = (
    sx: number,
    sy: number
  ): { r: number; g: number; b: number; a: number } => {
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
 * Resize PNG if dimensions don't match target.
 */
function ensureSize(png: PNG, targetWidth: number, targetHeight: number): PNG {
  if (png.width === targetWidth && png.height === targetHeight) {
    return png;
  }
  return resizePng(png, targetWidth, targetHeight);
}

/**
 * Compare rendered SVG against a baseline PNG.
 */
export function compareToBaseline(
  svg: string,
  baselinePngPath: string,
  options: CompareOptions = {}
): CompareResult {
  const { threshold = 0.1, maxDiffPercent = 1.0 } = options;

  if (!fs.existsSync(baselinePngPath)) {
    throw new Error(`Baseline not found: ${baselinePngPath}`);
  }

  const baseline = loadPng(baselinePngPath);
  const actualPng = svgToPng(svg, baseline.width, options);
  const actual = ensureSize(PNG.sync.read(actualPng), baseline.width, baseline.height);

  const diff = new PNG({ width: baseline.width, height: baseline.height });

  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold, includeAA: options.includeAA ?? false }
  );

  const totalPixels = baseline.width * baseline.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  return {
    match,
    diffPixels,
    diffPercent,
    totalPixels,
    diffImagePath: null,
  };
}

export type { CompareOptions, CompareResult };
