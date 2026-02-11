/**
 * @file Visual Regression Compare Utilities
 *
 * Provides SVG-to-PNG comparison against baseline images.
 */

import * as fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

// =============================================================================
// Types
// =============================================================================

export type CompareResult = {
  /** Whether the comparison passed */
  readonly match: boolean;
  /** Number of different pixels */
  readonly diffPixels: number;
  /** Percentage of different pixels */
  readonly diffPercent: number;
  /** Total pixels */
  readonly totalPixels: number;
  /** Baseline dimensions */
  readonly width: number;
  readonly height: number;
};

export type CompareOptions = {
  /** Pixel matching threshold (0-1, default: 0.1) */
  readonly threshold?: number;
  /** Maximum allowed diff percentage (default: 1.0) */
  readonly maxDiffPercent?: number;
};

// =============================================================================
// SVG to PNG Conversion
// =============================================================================

/**
 * Convert SVG string to PNG buffer using resvg.
 */
export function svgToPng(svg: string, width?: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: width !== undefined ? { mode: "width", value: width } : undefined,
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

// =============================================================================
// PNG Utilities
// =============================================================================

function loadPng(filePath: string): PNG {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
}

function resizePng(png: PNG, targetWidth: number, targetHeight: number): PNG {
  const resized = new PNG({ width: targetWidth, height: targetHeight });
  const xScale = png.width / targetWidth;
  const yScale = png.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.min(Math.floor(x * xScale), png.width - 1);
      const srcY = Math.min(Math.floor(y * yScale), png.height - 1);
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

// =============================================================================
// Compare API
// =============================================================================

/**
 * Compare rendered SVG against a baseline PNG file.
 *
 * @param svg - SVG string from renderer
 * @param baselinePath - Path to baseline PNG file
 * @param options - Comparison options
 */
export function compareToBaseline(
  svg: string,
  baselinePath: string,
  options: CompareOptions = {},
): CompareResult {
  const { threshold = 0.1, maxDiffPercent = 1.0 } = options;

  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline not found: ${baselinePath}`);
  }

  // Load baseline
  const baseline = loadPng(baselinePath);

  // Convert SVG to PNG at baseline width
  const pngBuffer = svgToPng(svg, baseline.width);
  const rawActual = PNG.sync.read(pngBuffer);

  // Resize if needed
  const needsResize = rawActual.width !== baseline.width || rawActual.height !== baseline.height;
  const actual = needsResize ? resizePng(rawActual, baseline.width, baseline.height) : rawActual;

  // Compare
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold },
  );

  const totalPixels = baseline.width * baseline.height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  return {
    match: diffPercent <= maxDiffPercent,
    diffPixels,
    diffPercent,
    totalPixels,
    width: baseline.width,
    height: baseline.height,
  };
}

/**
 * Get baseline path for a fixture.
 * Assumes baseline PNG is alongside the DOCX with same name.
 */
export function getBaselinePath(docxPath: string): string {
  return docxPath.replace(/\.docx$/, ".png");
}
