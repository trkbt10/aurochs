/**
 * @file Text rendering tests - SVG renderer vs Figma export pixel comparison
 *
 * Compares our SVG renderer output against Figma's actual SVG export
 * for various text rendering scenarios (sizes, alignment, clipping, etc.).
 *
 * Run:
 *   npx vitest run packages/@aurochs-renderer/figma/spec/text-webgl-figma.spec.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { renderSceneGraphToSvg } from "../src/svg/scene-renderer";
import {
  type FixtureData,
  type CompareResult,
  ensureDirs,
  safeName,
  svgToPng,
  comparePngs,
  loadFigFixture,
  buildFrameSceneGraph,
} from "./webgl-harness/test-utils";

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/text-webgl");
const FIG_FILE = path.join(FIXTURES_DIR, "text-webgl.fig");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const DIFF_DIR = path.join(FIXTURES_DIR, "__diff__");

// =============================================================================
// Test Configuration
// =============================================================================

const FRAME_NAMES = [
  "text-basic",
  "text-bold",
  "text-small",
  "text-large",
  "text-multiline",
  "text-colors",
  "text-align-left",
  "text-align-center",
  "text-align-right",
  "text-in-clip",
  "text-in-nested-clip",
  "text-with-shape",
];

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

describe("Text rendering (SVG renderer vs Figma export)", () => {
  beforeAll(async () => {
    ensureDirs([SNAPSHOTS_DIR, DIFF_DIR]);
  });

  for (const frameName of FRAME_NAMES) {
    it(`${frameName}`, async () => {
      const data = await loadFixtures();
      const frame = data.frames.get(frameName);
      if (!frame) {
        console.log(`SKIP: Frame "${frameName}" not found in .fig`);
        return;
      }

      const actualPath = path.join(ACTUAL_DIR, `${frameName}.svg`);
      if (!fs.existsSync(actualPath)) {
        console.log(`SKIP: No Figma export at ${actualPath}`);
        return;
      }

      // Render with our SVG renderer
      const sceneGraph = buildFrameSceneGraph(frame, data);
      const renderedSvg = renderSceneGraphToSvg(sceneGraph) as string;

      // Save snapshot
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${frameName}.svg`), renderedSvg);

      // Rasterize both
      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const actualPng = svgToPng(actualSvg, frame.width);
      const renderedPng = svgToPng(renderedSvg, frame.width);

      // Compare
      const safe = safeName(frameName);
      const result = comparePngs(actualPng, renderedPng, frameName, path.join(DIFF_DIR, `${safe}-diff.png`));

      console.log(`  ${frameName}: Figma↔SVGRenderer diff = ${result.diffPercent.toFixed(1)}%`);
      expect(result.diffPercent).toBeLessThan(15);
    });
  }

  it("summary", async () => {
    const data = await loadFixtures();
    const results: CompareResult[] = [];

    for (const frameName of FRAME_NAMES) {
      const frame = data.frames.get(frameName);
      if (!frame) continue;

      const actualPath = path.join(ACTUAL_DIR, `${frameName}.svg`);
      if (!fs.existsSync(actualPath)) continue;

      const sceneGraph = buildFrameSceneGraph(frame, data);
      const renderedSvg = renderSceneGraphToSvg(sceneGraph) as string;
      const actualSvg = fs.readFileSync(actualPath, "utf-8");

      const actualPng = svgToPng(actualSvg, frame.width);
      const renderedPng = svgToPng(renderedSvg, frame.width);

      results.push(comparePngs(actualPng, renderedPng, frameName));
    }

    console.log("\n=== Text Rendering: Figma vs SVG Renderer ===");
    let total = 0;
    for (const r of results) {
      console.log(`  ${r.frameName}: ${r.diffPercent.toFixed(1)}%`);
      total += r.diffPercent;
    }
    if (results.length > 0) {
      console.log(`  Average: ${(total / results.length).toFixed(1)}%`);
    }
  }, 60000);
});
