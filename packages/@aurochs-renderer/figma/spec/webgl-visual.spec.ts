/**
 * @file WebGL visual regression test
 *
 * Compares WebGL-rendered output against SVG-rendered output from the same
 * SceneGraph. Detects tessellation regressions (e.g. broken glyph paths).
 *
 * Flow:
 *   .fig → SceneGraph → SVG (resvg rasterize) → "reference PNG"
 *                      → WebGL (Puppeteer canvas)  → "actual PNG"
 *   Compare with pixelmatch.
 *
 * Run:
 *   npx vitest run packages/@aurochs-renderer/figma/spec/webgl-visual.spec.ts
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
} from "./webgl-harness/test-utils";

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TWITTER_FIXTURES_DIR = path.join(__dirname, "../fixtures/twitter-ui");
const FIG_FILE = path.join(TWITTER_FIXTURES_DIR, "twitter_ui.fig");
const WEBGL_FIXTURES_DIR = path.join(__dirname, "../fixtures/webgl-visual");
const OUTPUT_DIR = path.join(WEBGL_FIXTURES_DIR, "__output__");
const DIFF_DIR = path.join(WEBGL_FIXTURES_DIR, "__diff__");
const BASELINE_DIR = path.join(WEBGL_FIXTURES_DIR, "baseline");

// =============================================================================
// Test Configuration
// =============================================================================

/** Frames to test (subset with text content for targeted comparison) */
const TEST_FRAMES = ["Twitter Home", "Twitter Profile (Tweets)", "Twitter Search", "Twitter Menu"];

/** Maximum allowed diff between SVG and WebGL rendering */
const MAX_SVG_WEBGL_DIFF_PERCENT = 30;

/** Maximum allowed diff between WebGL baseline and current render */
const MAX_BASELINE_DIFF_PERCENT = 2;

// =============================================================================
// Data Loading
// =============================================================================

let cachedData: FixtureData | null = null;

async function loadFixtures() {
  if (cachedData) return cachedData;
  cachedData = await loadFigFixture(FIG_FILE, "Twitter");
  return cachedData;
}

// =============================================================================
// Tests
// =============================================================================

describe("WebGL visual regression", () => {
  let harness: WebGLHarness;

  beforeAll(async () => {
    ensureDirs([OUTPUT_DIR, DIFF_DIR, BASELINE_DIR]);
    harness = await startHarness(path.resolve(__dirname, "webgl-harness/vite.config.ts"));
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

  describe("SVG vs WebGL cross-renderer comparison", () => {
    for (const frameName of TEST_FRAMES) {
      it(`renders "${frameName}" similarly to SVG`, async () => {
        const data = await loadFixtures();
        const frame = data.frames.get(frameName);
        if (!frame) {
          console.log(`SKIP: Frame "${frameName}" not found`);
          return;
        }

        const sceneGraph = buildFrameSceneGraph(frame, data);

        // SVG reference: render scene graph → SVG → rasterize
        const svgString = renderSceneGraphToSvg(sceneGraph) as string;
        const svgPng = svgToPng(svgString, frame.width);

        // WebGL actual: render via Puppeteer
        const webglPng = await captureWebGL(harness.page, sceneGraph);

        // Save outputs
        const safe = safeName(frameName);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-svg.png`), svgPng);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-webgl.png`), webglPng);

        // Compare
        const result = comparePngs(svgPng, webglPng, frameName, path.join(DIFF_DIR, `${safe}-svg-vs-webgl.png`));

        console.log(`  ${frameName}: SVG↔WebGL diff = ${result.diffPercent.toFixed(1)}%`);
        expect(result.diffPercent).toBeLessThan(MAX_SVG_WEBGL_DIFF_PERCENT);
      }, 30000);
    }
  });

  describe("WebGL baseline regression", () => {
    for (const frameName of TEST_FRAMES) {
      it(`"${frameName}" matches baseline`, async () => {
        const data = await loadFixtures();
        const frame = data.frames.get(frameName);
        if (!frame) {
          console.log(`SKIP: Frame "${frameName}" not found`);
          return;
        }

        const sceneGraph = buildFrameSceneGraph(frame, data);
        const webglPng = await captureWebGL(harness.page, sceneGraph);

        const safe = safeName(frameName);
        const baselinePath = path.join(BASELINE_DIR, `${safe}.png`);

        if (!fs.existsSync(baselinePath)) {
          // First run: save as baseline
          fs.writeFileSync(baselinePath, webglPng);
          console.log(`  ${frameName}: baseline created (${baselinePath})`);
          return;
        }

        // Compare against baseline
        const baseline = fs.readFileSync(baselinePath);
        const result = comparePngs(baseline, webglPng, frameName, path.join(DIFF_DIR, `${safe}-baseline-diff.png`));

        console.log(`  ${frameName}: baseline diff = ${result.diffPercent.toFixed(2)}%`);
        expect(result.diffPercent).toBeLessThan(MAX_BASELINE_DIFF_PERCENT);
      }, 30000);
    }
  });

  it("summary", async () => {
    const data = await loadFixtures();
    const results: CompareResult[] = [];

    for (const frameName of TEST_FRAMES) {
      const frame = data.frames.get(frameName);
      if (!frame) continue;

      const sceneGraph = buildFrameSceneGraph(frame, data);
      const svgString = renderSceneGraphToSvg(sceneGraph) as string;
      const svgPng = svgToPng(svgString, frame.width);
      const webglPng = await captureWebGL(harness.page, sceneGraph);

      results.push(comparePngs(svgPng, webglPng, frameName));
    }

    const avgDiff = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;

    console.log("\n=== WebGL Visual Regression Summary ===");
    for (const r of results) {
      console.log(`  ${r.frameName}: ${r.diffPercent.toFixed(1)}% diff`);
    }
    console.log(`  Average SVG↔WebGL diff: ${avgDiff.toFixed(1)}%`);
  }, 60000);
});
