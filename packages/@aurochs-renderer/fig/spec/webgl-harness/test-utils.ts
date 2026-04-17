/**
 * @file Shared utilities for WebGL visual regression tests
 *
 * Common functions for loading .fig fixtures, rendering SVG/WebGL,
 * and comparing output images via pixelmatch.
 *
 * Uses the correct pipeline:
 *   loadFigFile → buildNodeTree → treeToDocument → FigDesignDocument
 *   → buildSceneGraph (FigDesignNode[]) → RenderTree → SVG/WebGL
 */
import * as fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { readPng, writePng, createPngImage } from "@aurochs/png";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { loadFigFile } from "@aurochs/fig/roundtrip";
import { buildNodeTree } from "@aurochs/fig/parser";
import { treeToDocument } from "@aurochs-builder/fig/context";
import type { FigDesignNode, FigDesignDocument } from "@aurochs/fig/domain";
import { buildSceneGraph } from "../../src/scene-graph/builder";
import type { SceneGraph } from "../../src/scene-graph/types";

// =============================================================================
// Types
// =============================================================================

export type FrameInfo = {
  name: string;
  node: FigDesignNode;
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
  document: FigDesignDocument;
};

export type WebGLHarness = {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
};

// =============================================================================
// File Utilities
// =============================================================================

/** Ensure directories exist, creating them if necessary */
export function ensureDirs(dirs: string[]): void {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/** Convert a frame name to a safe filename */
export function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

// =============================================================================
// SVG Rendering
// =============================================================================

/** Convert SVG string to PNG buffer using resvg */
export function svgToPng(svg: string, width?: number): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number };
    font?: { loadSystemFonts: boolean };
    shapeRendering?: 0 | 1 | 2;
    textRendering?: 0 | 1 | 2;
    background?: string;
  } = {
    font: { loadSystemFonts: true },
    shapeRendering: 2,
    textRendering: 2,
    // White background to match WebGL canvas clear color.
    // Without this, resvg renders transparent areas as (0,0,0,0),
    // while WebGL clears to white (255,255,255,255), causing
    // pixelmatch to report 100% diff on any empty region.
    background: "#ffffff",
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

/** Compare two PNG buffers and return difference percentage */
export function comparePngs(
  a: Buffer, b: Buffer, frameName: string, diffPath?: string,
): CompareResult {
  const imgA = readPng(a);
  const imgBRef = { value: readPng(b) };
  // Resize if dimensions don't match
  if (imgBRef.value.width !== imgA.width || imgBRef.value.height !== imgA.height) {
    const resized = createPngImage({ width: imgA.width, height: imgA.height });
    for (let y = 0; y < imgA.height; y++) {
      const sy = Math.floor((y / imgA.height) * imgBRef.value.height);
      for (let x = 0; x < imgA.width; x++) {
        const sx = Math.floor((x / imgA.width) * imgBRef.value.width);
        const srcIdx = (sy * imgBRef.value.width + sx) * 4;
        const dstIdx = (y * imgA.width + x) * 4;
        resized.data[dstIdx] = imgBRef.value.data[srcIdx];
        resized.data[dstIdx + 1] = imgBRef.value.data[srcIdx + 1];
        resized.data[dstIdx + 2] = imgBRef.value.data[srcIdx + 2];
        resized.data[dstIdx + 3] = imgBRef.value.data[srcIdx + 3];
      }
    }
    imgBRef.value = resized;
  }
  const diff = createPngImage({ width: imgA.width, height: imgA.height });
  const diffPixels = pixelmatch(imgA.data, imgBRef.value.data, diff.data, imgA.width, imgA.height, {
    threshold: 0.1,
    includeAA: false,
  });
  if (diffPath && diffPixels > 0) {
    fs.writeFileSync(diffPath, writePng(diff));
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
// Fixture Loading — correct pipeline via FigDesignDocument
// =============================================================================

/**
 * Load and parse a .fig fixture file into frames via the full domain pipeline.
 *
 * Pipeline: loadFigFile → buildNodeTree → treeToDocument → FigDesignDocument
 *
 * @param figPath - Absolute path to the .fig file
 * @param canvasFilter - Optional canvas name to filter (e.g. "Twitter")
 */
export async function loadFigFixture(figPath: string, canvasFilter?: string): Promise<FixtureData> {
  const data = fs.readFileSync(figPath);
  const loaded = await loadFigFile(new Uint8Array(data));
  const tree = buildNodeTree(loaded.nodeChanges);
  const document = treeToDocument(tree, loaded);

  const frames = new Map<string, FrameInfo>();
  const targetPages = canvasFilter
    ? document.pages.filter((p) => p.name === canvasFilter)
    : document.pages;

  for (const page of targetPages) {
    for (const child of page.children) {
      const name = child.name ?? "unnamed";
      const size = child.size;
      frames.set(name, {
        name,
        node: child,
        width: size?.x ?? 100,
        height: size?.y ?? 100,
      });
    }
  }

  return { frames, document };
}

/**
 * Normalize a root frame's transform to (0,0) for consistent rendering.
 */
function normalizeRootNode(node: FigDesignNode): FigDesignNode {
  if (!node.transform) { return node; }
  return {
    ...node,
    transform: { ...node.transform, m02: 0, m12: 0 },
  };
}

/**
 * Build a SceneGraph from a single frame (FigDesignNode).
 *
 * Uses the correct domain pipeline — FigDesignNode carries properly
 * resolved fills, strokes, effects, etc.
 */
export function buildFrameSceneGraph(frame: FrameInfo, data: FixtureData): SceneGraph {
  const normalizedNode = normalizeRootNode(frame.node);
  return buildSceneGraph([normalizedNode], {
    blobs: data.document.blobs,
    images: data.document.images,
    canvasSize: { width: frame.width, height: frame.height },
    symbolMap: data.document.components,
    styleRegistry: data.document.styleRegistry,
    showHiddenNodes: false,
    warnings: [],
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
export async function captureWebGL(page: Page, sceneGraph: SceneGraph): Promise<Buffer> {
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
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  const info = await server.listen();
  const address = info.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }
  const serverUrl = `http://127.0.0.1:${(address as { port: number }).port}`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.on("console", msg => {
    if (msg.type() === "error" || msg.type() === "warn") {
      console.error(`  [browser ${msg.type()}] ${msg.text()}`);
    }
  });
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
export function printCategorySummary(title: string, categoryResults: Map<string, CompareResult[]>): void {
  console.log(`\n=== ${title} ===\n`);
  const allResults: CompareResult[] = [];
  for (const [category, results] of categoryResults) {
    if (results.length === 0) { continue; }
    const avg = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;
    const max = Math.max(...results.map((r) => r.diffPercent));
    const min = Math.min(...results.map((r) => r.diffPercent));
    console.log(`  ${category}:`);
    console.log(`    avg=${avg.toFixed(1)}%  min=${min.toFixed(1)}%  max=${max.toFixed(1)}%`);
    for (const r of results) {
      console.log(`      ${r.frameName}: ${r.diffPercent.toFixed(1)}%`);
    }
    allResults.push(...results);
  }
  if (allResults.length > 0) {
    const overallAvg = allResults.reduce((sum, r) => sum + r.diffPercent, 0) / allResults.length;
    console.log(`\n  Overall: ${allResults.length} frames, avg=${overallAvg.toFixed(1)}%`);
  }
}
