/**
 * @file WebGL text rendering visual regression test
 *
 * Evaluates WebGL text rendering quality per-frame using
 * text-comprehensive.fig (89 frames covering alignment, line height,
 * letter spacing, colors, font sizes, multiline, edge cases, etc.).
 *
 * Compares WebGL-rendered output against SVG-rendered output from the same
 * SceneGraph, per frame and per category.
 *
 * Run:
 *   npx vitest run packages/@oxen-renderer/figma/spec/webgl-text.spec.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { renderSceneGraphToSvg } from "../src/svg/scene-renderer";
import {
  type FixtureData,
  type CompareResult,
  type WebGLHarness,
  ensureDirs,
  safeName,
  svgToPng,
  comparePngs,
  loadFigFixture,
  buildFrameSceneGraph,
  captureWebGL,
  startHarness,
  stopHarness,
  printCategorySummary,
} from "./webgl-harness/test-utils";

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/text-comprehensive");
const FIG_FILE = path.join(FIXTURES_DIR, "text-comprehensive.fig");
const WEBGL_TEXT_DIR = path.join(__dirname, "../fixtures/webgl-text");
const OUTPUT_DIR = path.join(WEBGL_TEXT_DIR, "__output__");
const DIFF_DIR = path.join(WEBGL_TEXT_DIR, "__diff__");
const BASELINE_DIR = path.join(WEBGL_TEXT_DIR, "baseline");

// =============================================================================
// Test Configuration
// =============================================================================

/** Frame categories for organized reporting */
const CATEGORIES: Record<string, string[]> = {
  alignment: [
    "LEFT-TOP", "LEFT-CENTER", "LEFT-BOTTOM",
    "CENTER-TOP", "CENTER-CENTER", "CENTER-BOTTOM",
    "RIGHT-TOP", "RIGHT-CENTER", "RIGHT-BOTTOM",
    "JUSTIFIED-TOP", "JUSTIFIED-CENTER", "JUSTIFIED-BOTTOM",
  ],
  "line-height": [
    "lh-80pct", "lh-100pct", "lh-120pct", "lh-150pct", "lh-200pct",
    "lh-12px", "lh-16px", "lh-20px", "lh-24px", "lh-32px",
  ],
  "letter-spacing": [
    "ls-neg10pct", "ls-neg5pct", "ls-0pct", "ls-5pct",
    "ls-10pct", "ls-20pct", "ls-50pct", "ls-100pct",
  ],
  color: [
    "color-black", "color-red", "color-green", "color-blue",
    "color-yellow", "color-cyan", "color-magenta", "color-gray50",
  ],
  "font-size": [
    "size-8", "size-10", "size-12", "size-14", "size-16", "size-18",
    "size-20", "size-24", "size-28", "size-32", "size-40", "size-48", "size-64",
  ],
  multiline: [
    "2-lines", "3-lines", "5-lines", "empty-lines", "long-word", "wrap-narrow",
  ],
  "edge-cases": [
    "empty", "space-only", "single-char",
    "unicode-cjk", "unicode-emoji", "unicode-arabic",
  ],
  "case-variants": [
    "case-LOWER", "case-ORIGINAL", "case-SMALL_CAPS", "case-TITLE", "case-UPPER",
  ],
  decorations: [
    "UNDERLINE-12px", "UNDERLINE-16px", "UNDERLINE-24px", "UNDERLINE-32px",
    "STRIKETHROUGH-12px", "STRIKETHROUGH-16px", "STRIKETHROUGH-24px", "STRIKETHROUGH-32px",
  ],
  "text-height": [
    "HEIGHT-long", "HEIGHT-short",
    "NONE-12px", "NONE-16px", "NONE-24px", "NONE-32px",
    "NONE-long", "NONE-short",
  ],
  constraints: [
    "WIDTH_AND_HEIGHT-long", "WIDTH_AND_HEIGHT-short",
  ],
  misc: [
    "mixed", "numbers", "special",
  ],
};

/** Maximum SVG↔WebGL diff per frame */
const MAX_DIFF_PERCENT = 30;

// =============================================================================
// Data Loading
// =============================================================================

let cachedData: FixtureData | null = null;

async function loadFixtures() {
  if (cachedData) return cachedData;
  cachedData = await loadFigFixture(FIG_FILE);
  return cachedData;
}

// =============================================================================
// Tests
// =============================================================================

describe("WebGL text rendering", () => {
  let harness: WebGLHarness;

  beforeAll(async () => {
    ensureDirs([OUTPUT_DIR, DIFF_DIR, BASELINE_DIR]);
    harness = await startHarness(
      path.resolve(__dirname, "webgl-harness/vite.config.ts"),
    );
  }, 30000);

  afterAll(async () => {
    await stopHarness(harness);
  });

  it("loads fixtures and harness", async () => {
    const data = await loadFixtures();
    expect(data.frames.size).toBeGreaterThan(0);
    const title = await harness.page.title();
    expect(title).toBe("ready");
  });

  // ---- Per-category tests ----
  for (const [category, frameNames] of Object.entries(CATEGORIES)) {
    describe(category, () => {
      for (const frameName of frameNames) {
        it(`${frameName}`, async () => {
          const data = await loadFixtures();
          const frame = data.frames.get(frameName);
          if (!frame) {
            console.log(`SKIP: Frame "${frameName}" not found`);
            return;
          }

          const sceneGraph = buildFrameSceneGraph(frame, data);

          // SVG reference
          const svgString = renderSceneGraphToSvg(sceneGraph) as string;
          const svgPng = svgToPng(svgString, frame.width);

          // WebGL actual
          const webglPng = await captureWebGL(harness.page, sceneGraph);

          // Save outputs
          const safe = safeName(frameName);
          fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-svg.png`), svgPng);
          fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-webgl.png`), webglPng);

          const result = comparePngs(
            svgPng,
            webglPng,
            frameName,
            path.join(DIFF_DIR, `${safe}-diff.png`),
          );

          console.log(
            `  ${frameName}: SVG↔WebGL diff = ${result.diffPercent.toFixed(1)}%`,
          );
          expect(result.diffPercent).toBeLessThan(MAX_DIFF_PERCENT);
        }, 30000);
      }
    });
  }

  // ---- Summary ----
  it("summary", async () => {
    const data = await loadFixtures();
    const categoryResults = new Map<string, CompareResult[]>();

    for (const [category, frameNames] of Object.entries(CATEGORIES)) {
      const results: CompareResult[] = [];

      for (const frameName of frameNames) {
        const frame = data.frames.get(frameName);
        if (!frame) continue;

        const sceneGraph = buildFrameSceneGraph(frame, data);
        const svgString = renderSceneGraphToSvg(sceneGraph) as string;
        const svgPng = svgToPng(svgString, frame.width);
        const webglPng = await captureWebGL(harness.page, sceneGraph);

        results.push(comparePngs(svgPng, webglPng, frameName));
      }

      categoryResults.set(category, results);
    }

    printCategorySummary("WebGL Text Rendering Summary", categoryResults);
  }, 300000);
});
