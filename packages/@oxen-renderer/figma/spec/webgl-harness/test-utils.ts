/**
 * @file Shared utilities for WebGL visual regression tests
 *
 * Common functions for loading .fig fixtures, rendering SVG/WebGL,
 * and comparing output images via pixelmatch.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  type FigBlob,
  type FigImage,
} from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { buildSceneGraph } from "../../src/scene-graph/builder";
import { renderSceneGraphToSvg } from "../../src/svg/scene-renderer";
import type { SceneGraph } from "../../src/scene-graph/types";

// =============================================================================
// Types
// =============================================================================

export type FrameInfo = {
  name: string;
  node: FigNode;
  width: number;
  height: number;
};

export type CompareResult = {
  frameName: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

export type FixtureData = {
  frames: Map<string, FrameInfo>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

export type WebGLHarness = {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
};

// =============================================================================
// File Utilities
// =============================================================================

export function ensureDirs(dirs: string[]): void {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

// =============================================================================
// SVG Rendering
// =============================================================================

export function svgToPng(svg: string, width?: number): Buffer {
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

// =============================================================================
// Image Comparison
// =============================================================================

export function comparePngs(
  a: Buffer,
  b: Buffer,
  frameName: string,
  diffPath?: string,
): CompareResult {
  const imgA = PNG.sync.read(a);
  let imgB = PNG.sync.read(b);

  // Resize if dimensions don't match
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
  const diffPixels = pixelmatch(
    imgA.data,
    imgB.data,
    diff.data,
    imgA.width,
    imgA.height,
    { threshold: 0.1, includeAA: false },
  );

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

// =============================================================================
// Node Normalization
// =============================================================================

/**
 * Normalize root frame transform to (0,0) for consistent rendering
 */
export function normalizeRootNode(node: FigNode): FigNode {
  const nodeData = node as Record<string, unknown>;
  const transform = nodeData.transform as
    | { m02?: number; m12?: number }
    | undefined;
  if (!transform) return node;
  return { ...node, transform: { ...transform, m02: 0, m12: 0 } } as FigNode;
}

// =============================================================================
// Fixture Loading
// =============================================================================

/**
 * Load and parse a .fig fixture file into frames.
 *
 * @param figPath - Absolute path to the .fig file
 * @param canvasFilter - Optional canvas name to filter (e.g. "Twitter")
 */
export async function loadFigFixture(
  figPath: string,
  canvasFilter?: string,
): Promise<FixtureData> {
  const data = fs.readFileSync(figPath);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const frames = new Map<string, FrameInfo>();

  const canvases = findNodesByType(roots, "CANVAS");
  const targetCanvases = canvasFilter
    ? canvases.filter((c) => c.name === canvasFilter)
    : canvases;

  for (const canvas of targetCanvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      frames.set(name, {
        name,
        node: child,
        width: size?.x ?? 100,
        height: size?.y ?? 100,
      });
    }
  }

  return { frames, blobs: parsed.blobs, images: parsed.images, nodeMap };
}

/**
 * Build a SceneGraph from a single frame
 */
export function buildFrameSceneGraph(
  frame: FrameInfo,
  data: FixtureData,
): SceneGraph {
  const normalizedNode = normalizeRootNode(frame.node);
  return buildSceneGraph([normalizedNode], {
    blobs: data.blobs,
    images: data.images,
    canvasSize: { width: frame.width, height: frame.height },
    symbolMap: data.nodeMap,
    showHiddenNodes: false,
  });
}

// =============================================================================
// WebGL Capture
// =============================================================================

/**
 * JSON replacer that converts Uint8Array to `{ __base64: "..." }` for transport
 */
function uint8ArrayReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return { __base64: Buffer.from(value).toString("base64") };
  }
  return value;
}

/**
 * Capture WebGL-rendered output from a SceneGraph via Puppeteer
 */
export async function captureWebGL(
  page: Page,
  sceneGraph: SceneGraph,
): Promise<Buffer> {
  const json = JSON.stringify(sceneGraph, uint8ArrayReplacer);
  const dataUrl = await page.evaluate(async (sgJson: string) => {
    return await window.renderSceneGraph(sgJson);
  }, json);
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

// =============================================================================
// Harness Lifecycle
// =============================================================================

/**
 * Start the WebGL test harness (Vite dev server + Puppeteer browser)
 */
export async function startHarness(harnessConfigPath: string): Promise<WebGLHarness> {
  const server = await createServer({
    configFile: harnessConfigPath,
    server: { port: 0, strictPort: false },
  });
  const info = await server.listen();
  const address = info.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }
  const serverUrl = `http://localhost:${(address as { port: number }).port}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(serverUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.title === "ready", {
    timeout: 15000,
  });

  return { server, browser, page };
}

/**
 * Stop the WebGL test harness
 */
export async function stopHarness(harness: WebGLHarness): Promise<void> {
  await harness.browser?.close();
  await harness.server?.close();
}

// =============================================================================
// Summary Printing
// =============================================================================

/**
 * Print a categorized summary of comparison results
 */
export function printCategorySummary(
  title: string,
  categoryResults: Map<string, CompareResult[]>,
): void {
  console.log(`\n=== ${title} ===\n`);

  const allResults: CompareResult[] = [];

  for (const [category, results] of categoryResults) {
    if (results.length === 0) continue;
    const avg =
      results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;
    const max = Math.max(...results.map((r) => r.diffPercent));
    const min = Math.min(...results.map((r) => r.diffPercent));

    console.log(`  ${category}:`);
    console.log(
      `    avg=${avg.toFixed(1)}%  min=${min.toFixed(1)}%  max=${max.toFixed(1)}%`,
    );
    for (const r of results) {
      console.log(`      ${r.frameName}: ${r.diffPercent.toFixed(1)}%`);
    }
    allResults.push(...results);
  }

  if (allResults.length > 0) {
    const overallAvg =
      allResults.reduce((sum, r) => sum + r.diffPercent, 0) / allResults.length;
    console.log(
      `\n  Overall: ${allResults.length} frames, avg=${overallAvg.toFixed(1)}%`,
    );
  }
}
