/**
 * @file Shared utilities for DOCX visual regression tests
 *
 * Common functions for rendering documents, capturing screenshots,
 * and comparing with baseline images.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { DocxParagraph, DocxNumbering, DocxSectionProperties } from "@aurochs-office/docx/domain";

// =============================================================================
// Types
// =============================================================================

export type CompareResult = {
  name: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

export type DocxHarness = {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
};

export type CaptureConfig = {
  width: number;
  height: number;
  pageIndex?: number;
};

export type DocumentData = {
  paragraphs: DocxParagraph[];
  numbering?: DocxNumbering;
  sectPr?: DocxSectionProperties;
};

// =============================================================================
// File Utilities
// =============================================================================

/**
 * Ensure directories exist, creating them recursively if needed.
 */
export function ensureDirs(dirs: string[]): void {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Convert a name to a safe filename by replacing invalid characters.
 */
export function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

// =============================================================================
// Image Comparison
// =============================================================================

export type ComparePngsOptions = {
  actual: Buffer;
  baseline: Buffer;
  name: string;
  diffPath?: string;
};

/**
 * Compare two PNG buffers and return diff statistics.
 * Optionally writes a diff image to the specified path.
 */
export function comparePngs(options: ComparePngsOptions): CompareResult {
  const { actual, baseline, name, diffPath } = options;
  const imgA = PNG.sync.read(actual);
  const imgBOriginal = PNG.sync.read(baseline);

  // Resize if dimensions don't match (use nearest-neighbor scaling)
  const imgB = resizeIfNeeded(imgBOriginal, imgA.width, imgA.height);

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
    name,
    diffPercent: (diffPixels / totalPixels) * 100,
    diffPixels,
    totalPixels,
  };
}

/**
 * Resize a PNG to target dimensions using nearest-neighbor scaling.
 */
function resizeIfNeeded(img: PNG, targetWidth: number, targetHeight: number): PNG {
  if (img.width === targetWidth && img.height === targetHeight) {
    return img;
  }

  const resized = new PNG({ width: targetWidth, height: targetHeight });
  const srcDim = { width: img.width, height: img.height };
  const dstDim = { width: targetWidth, height: targetHeight };
  for (const [dstIdx, srcIdx] of generateResizeMapping({ src: srcDim, dst: dstDim })) {
    resized.data[dstIdx] = img.data[srcIdx];
    resized.data[dstIdx + 1] = img.data[srcIdx + 1];
    resized.data[dstIdx + 2] = img.data[srcIdx + 2];
    resized.data[dstIdx + 3] = img.data[srcIdx + 3];
  }
  return resized;
}

type ImageDimensions = { width: number; height: number };

/**
 * Generate source/destination index pairs for image resizing.
 */
function* generateResizeMapping(options: {
  src: ImageDimensions;
  dst: ImageDimensions;
}): Generator<[number, number]> {
  const { src, dst } = options;
  for (const y of Array.from({ length: dst.height }, (_, i) => i)) {
    const sy = Math.floor((y / dst.height) * src.height);
    for (const x of Array.from({ length: dst.width }, (_, i) => i)) {
      const sx = Math.floor((x / dst.width) * src.width);
      const srcIdx = (sy * src.width + sx) * 4;
      const dstIdx = (y * dst.width + x) * 4;
      yield [dstIdx, srcIdx];
    }
  }
}

// =============================================================================
// Harness Lifecycle
// =============================================================================

/**
 * Start the DOCX visual test harness (Vite dev server + Puppeteer browser)
 */
export async function startHarness(): Promise<DocxHarness> {
  // Random port between 30000-40000 to avoid conflicts
  const port = 30000 + Math.floor(Math.random() * 10000);

  // Use vite.config.ts from the same directory
  const server = await createServer({
    configFile: path.resolve(__dirname, "vite.config.ts"),
    server: {
      port,
      strictPort: false, // Try next port if occupied
    },
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
    timeout: 30000,
  });

  return { server, browser, page };
}

/**
 * Stop the DOCX visual test harness
 */
export async function stopHarness(harness: DocxHarness): Promise<void> {
  await harness.browser?.close();
  await harness.server?.close();
}

// =============================================================================
// Screenshot Capture
// =============================================================================

/**
 * Capture a screenshot of the DOCX editor rendering a document
 */
export async function captureDocument(
  page: Page,
  documentData: DocumentData,
  config: CaptureConfig
): Promise<Buffer> {
  const json = JSON.stringify(documentData);

  // Set viewport to match config dimensions
  await page.setViewport({
    width: config.width,
    height: config.height,
    deviceScaleFactor: 1,
  });

  // Render the document
  await page.evaluate(
    async (docJson: string, cfg: CaptureConfig) => {
      await window.renderDocument(docJson, cfg);
    },
    json,
    config
  );

  // Wait for render to complete
  await page.evaluate(async () => {
    await window.waitForRender();
  });

  // Additional wait for any animations/transitions
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Capture screenshot
  const screenshot = await page.screenshot({
    type: "png",
    clip: {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
    },
  });

  return Buffer.from(screenshot);
}

// =============================================================================
// Fixture Paths
// =============================================================================

/**
 * Get paths for visual regression test fixtures.
 */
export function getFixturePaths() {
  // __dirname is spec/visual-harness, so go up two levels to package root
  const fixturesDir = path.resolve(__dirname, "../../fixtures/visual");
  return {
    baselineDir: path.join(fixturesDir, "baseline"),
    outputDir: path.join(fixturesDir, "__output__"),
    diffDir: path.join(fixturesDir, "__diff__"),
    baselinePath: (name: string) => path.join(fixturesDir, "baseline", `${safeName(name)}.png`),
    outputPath: (name: string) => path.join(fixturesDir, "__output__", `${safeName(name)}.png`),
    diffPath: (name: string) => path.join(fixturesDir, "__diff__", `${safeName(name)}.png`),
  };
}

// =============================================================================
// Summary Printing
// =============================================================================

/**
 * Print a summary of visual regression test results.
 */
export function printSummary(results: CompareResult[]): void {
  console.log("\n=== DOCX Visual Regression Summary ===\n");

  if (results.length === 0) {
    console.log("  No results to display.");
    return;
  }

  const avg = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;
  const max = Math.max(...results.map((r) => r.diffPercent));
  const min = Math.min(...results.map((r) => r.diffPercent));

  console.log(`  Total: ${results.length} comparisons`);
  console.log(`  avg=${avg.toFixed(1)}%  min=${min.toFixed(1)}%  max=${max.toFixed(1)}%\n`);

  for (const r of results) {
    const status = r.diffPercent < 5 ? "PASS" : r.diffPercent < 15 ? "WARN" : "FAIL";
    console.log(`  [${status}] ${r.name}: ${r.diffPercent.toFixed(1)}%`);
  }
}
