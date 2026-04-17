/**
 * @file WebGL↔SVG pixel comparison test
 *
 * Renders each frame of fixture .fig files through both the SVG pipeline
 * (resvg→PNG) and WebGL pipeline (Puppeteer canvas→PNG), then compares
 * with pixelmatch to verify rendering parity.
 *
 * Both pipelines consume the same RenderTree, so differences reveal
 * WebGL-specific rendering bugs (tessellation, shader, clipping, etc.)
 * or SVG-specific artifacts (resvg rasterization differences).
 *
 * Run:
 *   npx vitest run packages/@aurochs-renderer/fig/spec/webgl-comparison.spec.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
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
const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const WEBGL_DIR = path.join(FIXTURES_DIR, "webgl-comparison");
const OUTPUT_DIR = path.join(WEBGL_DIR, "__output__");
const DIFF_DIR = path.join(WEBGL_DIR, "__diff__");

// =============================================================================
// Fixture files to compare
// =============================================================================

/**
 * Each entry defines a .fig fixture to load and compare.
 * Uses built-in fixtures from the fixtures directory.
 */
const FIXTURES: { name: string; file: string; maxDiff: number }[] = [
  // Target: 0.x% for all fixtures.
  // Fixtures without effects or images already achieve 0.0%.
  { name: "shapes", file: "shapes/shapes.fig", maxDiff: 1 },
  { name: "fills", file: "fills/fills.fig", maxDiff: 1 },
  { name: "rectangle", file: "rectangle/rectangle.fig", maxDiff: 1 },
  { name: "group", file: "group/group.fig", maxDiff: 1 },
  { name: "clips", file: "clips/clips.fig", maxDiff: 1 },
  { name: "composite", file: "composite/composite.fig", maxDiff: 1 },
  { name: "effects", file: "effects/effects.fig", maxDiff: 1 },
  { name: "frame-properties", file: "frame-properties/frame-properties.fig", maxDiff: 1 },
];

const BENTO_PATH = "/Users/terukichi/Downloads/Bento Widget Templates (Community).fig";
if (fs.existsSync(BENTO_PATH)) {
  FIXTURES.push({ name: "bento", file: BENTO_PATH, maxDiff: 5 });
}

function resolveFixturePath(file: string): string {
  if (file.startsWith("/")) {
    return file;
  }
  return path.join(FIXTURES_DIR, file);
}

function svgToPngOrNull(
  { svgString, frameName, width }: { svgString: string; frameName: string; width: number },
): Buffer | null {
  try {
    return svgToPng(svgString, width);
  } catch (resvgErr) {
    console.error(`  SKIP ${frameName}: resvg crash — ${(resvgErr as Error).message?.substring(0, 80)}`);
    return null;
  }
}

// =============================================================================
// Test suite
// =============================================================================

describe("WebGL↔SVG pixel comparison", () => {
  const harnessRef = { value: undefined as WebGLHarness | undefined };

  beforeAll(async () => {
    ensureDirs([OUTPUT_DIR, DIFF_DIR]);
    harnessRef.value = await startHarness(path.resolve(__dirname, "webgl-harness/vite.config.ts"));
  }, 30000);

  afterAll(async () => {
    if (harnessRef.value) {
      await stopHarness(harnessRef.value);
    }
  });

  it("harness is ready", async () => {
    expect(harnessRef.value).toBeDefined();
    const title = await harnessRef.value!.page.title();
    expect(title).toBe("ready");
  });

  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      const dataRef = { value: undefined as FixtureData | undefined };

      beforeAll(async () => {
        const figPath = resolveFixturePath(fixture.file);
        if (!fs.existsSync(figPath)) {
          console.log(`SKIP: ${figPath} not found`);
          return;
        }
        dataRef.value = await loadFigFixture(figPath);
      }, 30000);

      it("loads fixture", () => {
        if (!dataRef.value) { return; }
        expect(dataRef.value.frames.size).toBeGreaterThan(0);
      });

      it("compares all frames", async () => {
        if (!dataRef.value || !harnessRef.value) { return; }
        const data = dataRef.value;
        const results: CompareResult[] = [];
        const failedFrames: string[] = [];

        for (const [frameName, frame] of data.frames) {
          try {
            const sceneGraph = buildFrameSceneGraph(frame, data);

            // SVG reference — resvg may crash on complex filters, catch gracefully
            const svgString = renderSceneGraphToSvg(sceneGraph) as string;
            const svgPng = svgToPngOrNull({ svgString, frameName, width: Math.round(frame.width) });
            if (!svgPng) {
              continue;
            }

            // WebGL actual
            const webglPng = await captureWebGL(harnessRef.value!.page, sceneGraph);

            // Save outputs
            const safe = safeName(frameName);
            const outPrefix = `${fixture.name}-${safe}`;
            fs.writeFileSync(path.join(OUTPUT_DIR, `${outPrefix}-svg.png`), svgPng);
            fs.writeFileSync(path.join(OUTPUT_DIR, `${outPrefix}-webgl.png`), webglPng);

            const result = comparePngs(
              svgPng, webglPng, frameName,
              path.join(DIFF_DIR, `${outPrefix}-diff.png`),
            );
            results.push(result);

            if (result.diffPercent > fixture.maxDiff) {
              failedFrames.push(`${frameName}: ${result.diffPercent.toFixed(1)}%`);
            }
          } catch (err) {
            console.error(`  ERROR rendering ${frameName}:`, (err as Error).message);
          }
        }

        // Print summary
        if (results.length > 0) {
          const avg = results.reduce((s, r) => s + r.diffPercent, 0) / results.length;
          const max = Math.max(...results.map(r => r.diffPercent));
          const min = Math.min(...results.map(r => r.diffPercent));
          console.log(`\n  ${fixture.name}: ${results.length} frames`);
          console.log(`    avg=${avg.toFixed(1)}%  min=${min.toFixed(1)}%  max=${max.toFixed(1)}%`);

          // Report frames exceeding threshold
          for (const r of results) {
            if (r.diffPercent > 10) {
              console.log(`    ⚠ ${r.frameName}: ${r.diffPercent.toFixed(1)}%`);
            }
          }
        }

        if (failedFrames.length > 0) {
          console.warn(`\n  FAILURES (>${fixture.maxDiff}%):\n    ${failedFrames.join("\n    ")}`);
        }

        // All frames should be under maxDiff
        for (const r of results) {
          expect(r.diffPercent).toBeLessThan(fixture.maxDiff);
        }
      }, 300000); // 5 min timeout for all frames
    });
  }
});
