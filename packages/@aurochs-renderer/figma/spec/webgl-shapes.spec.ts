/**
 * @file WebGL shape rendering visual regression test
 *
 * Per-shape SVG↔WebGL comparison using shapes.fig fixture.
 * Tests individual shape types: ellipse, star, polygon, rect, line, mixed.
 *
 * Run:
 *   npx vitest run packages/@aurochs-renderer/figma/spec/webgl-shapes.spec.ts
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
const FIG_FILE = path.join(__dirname, "../fixtures/shapes/shapes.fig");
const WEBGL_DIR = path.join(__dirname, "../fixtures/webgl-shapes");
const OUTPUT_DIR = path.join(WEBGL_DIR, "__output__");
const DIFF_DIR = path.join(WEBGL_DIR, "__diff__");
const BASELINE_DIR = path.join(WEBGL_DIR, "baseline");

// =============================================================================
// Test Configuration
// =============================================================================

const CATEGORIES: Record<string, string[]> = {
  ellipse: ["ellipse-basic", "ellipse-circle", "ellipse-arc", "ellipse-donut"],
  star: ["star-5point", "star-8point", "star-sharp"],
  polygon: ["polygon-triangle", "polygon-hexagon", "polygon-octagon"],
  rect: ["rect-rounded", "rect-pill"],
  line: ["line-horizontal", "line-diagonal", "line-styled"],
  mixed: ["shapes-mixed"],
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

describe("WebGL shape rendering", () => {
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

          const result = comparePngs(svgPng, webglPng, frameName, path.join(DIFF_DIR, `${safe}-diff.png`));

          console.log(`  ${frameName}: SVG↔WebGL diff = ${result.diffPercent.toFixed(1)}%`);
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

    printCategorySummary("WebGL Shape Rendering Summary", categoryResults);
  }, 120000);
});
