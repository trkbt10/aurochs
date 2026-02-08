/**
 * @file Constraint combination visual regression tests
 *
 * Compares rendered SVG against Figma-exported SVG using pixel comparison.
 *
 * Setup:
 *   1. bun packages/@aurochs-renderer/figma/scripts/generate-constraint-fixtures.ts
 *   2. Open fixtures/constraints/constraints.fig in Figma
 *   3. Export all frames as SVG → fixtures/constraints/actual/
 *
 * Run:
 *   npx vitest run packages/@aurochs-renderer/figma/spec/constraints.spec.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  getNodeType,
  type FigBlob,
  type FigImage,
} from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/constraints");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const OUTPUT_DIR = path.join(FIXTURES_DIR, "__output__");
const DIFF_DIR = path.join(FIXTURES_DIR, "__diff__");
const FIG_FILE = path.join(FIXTURES_DIR, "constraints.fig");

// =============================================================================
// Types
// =============================================================================

type LayerInfo = {
  name: string;
  node: FigNode;
  size: { width: number; height: number };
};

type ParsedData = {
  canvases: readonly FigNode[];
  layers: Map<string, LayerInfo>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

type CompareResult = {
  frameName: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

// =============================================================================
// Utilities
// =============================================================================

function ensureDirs(dirs: string[]): void {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function svgToPng(svg: string, width?: number): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number };
    font?: { loadSystemFonts: boolean };
    shapeRendering?: 0 | 1 | 2;
    textRendering?: 0 | 1 | 2;
  } = {
    font: { loadSystemFonts: true },
    shapeRendering: 2,
    textRendering: 2,
  };
  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }
  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

function comparePngs(a: Buffer, b: Buffer, frameName: string, diffPath?: string): CompareResult {
  const imgA = PNG.sync.read(a);
  let imgB = PNG.sync.read(b);

  if (imgB.width !== imgA.width || imgB.height !== imgA.height) {
    const resized = new PNG({ width: imgA.width, height: imgA.height });
    for (let y = 0; y < imgA.height; y++) {
      const sy = Math.floor((y / imgA.height) * imgB.height);
      for (let x = 0; x < imgA.width; x++) {
        const sx = Math.floor((x / imgA.width) * imgB.width);
        const srcIdx = (sy * imgB.width + sx) * 4;
        const dstIdx = (y * imgA.width + x) * 4;
        resized.data[dstIdx] = imgB.data[srcIdx];
        resized.data[dstIdx + 1] = imgB.data[srcIdx + 1];
        resized.data[dstIdx + 2] = imgB.data[srcIdx + 2];
        resized.data[dstIdx + 3] = imgB.data[srcIdx + 3];
      }
    }
    imgB = resized;
  }

  const diff = new PNG({ width: imgA.width, height: imgA.height });
  const diffPixels = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, {
    threshold: 0.1,
    includeAA: false,
  });

  if (diffPath && diffPixels > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  const totalPixels = imgA.width * imgA.height;
  return {
    frameName,
    diffPercent: (diffPixels / totalPixels) * 100,
    diffPixels,
    totalPixels,
  };
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

// =============================================================================
// Data Loading
// =============================================================================

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) return parsedDataCache;

  if (!fs.existsSync(FIG_FILE)) {
    throw new Error(`Fixture file not found: ${FIG_FILE}`);
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const canvases = findNodesByType(roots, "CANVAS");

  const layers = new Map<string, LayerInfo>();
  for (const canvas of canvases) {
    if ((canvas as Record<string, unknown>).internalOnly) continue;
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      layers.set(name, {
        name,
        node: child,
        size: {
          width: size?.x ?? 100,
          height: size?.y ?? 100,
        },
      });
    }
  }

  parsedDataCache = {
    canvases,
    layers,
    blobs: parsed.blobs,
    images: parsed.images,
    nodeMap,
  };
  return parsedDataCache;
}

// =============================================================================
// Debug Tests
// =============================================================================

describe("Constraints Fixture Debug", () => {
  it("lists available layers in constraints.fig", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - constraints.fig not found");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Layers in constraints.fig ===");
    for (const [name, info] of data.layers) {
      const nodeType = getNodeType(info.node);
      console.log(`  "${name}" (${nodeType}) - ${info.size.width}x${info.size.height}`);
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });
});

// =============================================================================
// Visual Regression Tests
// =============================================================================

describe("Constraints Visual Regression", () => {
  const WRITE_SNAPSHOTS = true;
  const MAX_DIFF_PERCENT = 5;

  beforeAll(async () => {
    try {
      await loadFigFile();
    } catch {
      console.log("Skipping constraint tests - fixture file not found");
    }
    ensureDirs([SNAPSHOTS_DIR, OUTPUT_DIR, DIFF_DIR]);
  });

  it("renders each layer and compares against actual SVG", { timeout: 60_000 }, async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("SKIP: constraints.fig not found");
      return;
    }

    const data = await loadFigFile();
    const results: CompareResult[] = [];

    const actualFiles = fs.existsSync(ACTUAL_DIR) ? fs.readdirSync(ACTUAL_DIR).filter((f) => f.endsWith(".svg")) : [];

    // Build layer name → actual file mapping
    const layerToActual = new Map<string, string>();
    for (const file of actualFiles) {
      const baseName = file.replace(".svg", "");
      for (const [layerName] of data.layers) {
        if (layerName === baseName || layerName.toLowerCase() === baseName.toLowerCase()) {
          layerToActual.set(layerName, file);
        }
      }
    }

    for (const [layerName, layer] of data.layers) {
      const actualFile = layerToActual.get(layerName);

      // Render
      const wrapperCanvas: FigNode = {
        type: "CANVAS",
        name: layerName,
        children: [layer.node],
      };

      const result = await renderCanvas(wrapperCanvas, {
        width: layer.size.width,
        height: layer.size.height,
        blobs: data.blobs,
        images: data.images,
        symbolMap: data.nodeMap,
      });

      const safe = safeName(layerName);

      // Write snapshot
      if (WRITE_SNAPSHOTS) {
        fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${safe}.svg`), result.svg);
      }

      if (!actualFile) {
        console.log(`  ${layerName}: no actual SVG for comparison`);
        expect(result.svg).toContain("<svg");
        continue;
      }

      // Pixel comparison
      const actualSvg = fs.readFileSync(path.join(ACTUAL_DIR, actualFile), "utf-8");
      const actualPng = svgToPng(actualSvg);
      const renderedPng = svgToPng(result.svg, PNG.sync.read(actualPng).width);

      // Save PNGs
      fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-actual.png`), actualPng);
      fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-rendered.png`), renderedPng);

      const compareResult = comparePngs(actualPng, renderedPng, layerName, path.join(DIFF_DIR, `${safe}-diff.png`));

      results.push(compareResult);

      console.log(`  ${layerName}: diff = ${compareResult.diffPercent.toFixed(1)}%`);
    }

    // Summary
    if (results.length > 0) {
      const avgDiff = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;
      console.log(
        `\n=== Constraints Visual Summary ===\n  ${results.length} frames compared, avg diff = ${avgDiff.toFixed(1)}%`,
      );
      for (const r of results) {
        const status = r.diffPercent < MAX_DIFF_PERCENT ? "PASS" : "FAIL";
        console.log(`  [${status}] ${r.frameName}: ${r.diffPercent.toFixed(1)}%`);
      }

      for (const r of results) {
        expect(
          r.diffPercent,
          `${r.frameName} diff ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%`,
        ).toBeLessThan(MAX_DIFF_PERCENT);
      }
    } else {
      console.log("\n  No actual/ SVGs found — export frames from Figma to fixtures/constraints/actual/");
    }
  });
});
