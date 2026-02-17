/**
 * @file Shared utilities for PPTX visual regression tests
 *
 * Common functions for rendering slides, capturing screenshots,
 * and comparing with baseline images.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { Slide, SlideSize } from "@aurochs-office/pptx/domain";

// =============================================================================
// Types
// =============================================================================

export type CompareResult = {
  name: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

export type PptxHarness = {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
};

export type CaptureConfig = {
  width: number;
  height: number;
};

export type SlideData = {
  slide: Slide;
  slideSize: SlideSize;
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
 * Start the PPTX visual test harness (Vite dev server + Puppeteer browser)
 */
export async function startHarness(): Promise<PptxHarness> {
  // Use fixed port for consistency (same as debug script that worked)
  const port = 39998;

  // Use vite.config.ts from the same directory
  const server = await createServer({
    configFile: path.resolve(__dirname, "vite.config.ts"),
    server: {
      port,
      strictPort: true,
    },
  });

  const info = await server.listen();
  const address = info.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }
  const serverUrl = `http://localhost:${(address as { port: number }).port}`;

  // Use specific Chrome version to avoid version mismatch issues
  const chromePath = path.join(
    process.env.HOME ?? "",
    ".cache/puppeteer/chrome/mac_arm-145.0.7632.76/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  );
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    protocolTimeout: 60000, // 60 second timeout for protocol operations
  });
  const page = await browser.newPage();
  await page.goto(serverUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.title === "ready", {
    timeout: 30000,
  });

  // Small delay to ensure page is fully stable
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { server, browser, page };
}

/**
 * Stop the PPTX visual test harness
 */
export async function stopHarness(harness: PptxHarness): Promise<void> {
  await harness.browser?.close();
  await harness.server?.close();
}

// =============================================================================
// Screenshot Capture
// =============================================================================

/**
 * Capture a screenshot of the PPTX slide rendering
 */
export async function captureSlide(
  page: Page,
  slideData: SlideData,
  config: CaptureConfig
): Promise<Buffer> {
  const json = JSON.stringify(slideData);

  // Note: setViewport was causing issues, skip for now - use default viewport
  // await page.setViewport({
  //   width: config.width,
  //   height: config.height,
  //   deviceScaleFactor: 1,
  // });

  // Render the slide (pass JSON directly like the working minimal test)
  await page.evaluate(async (jsonStr: string) => {
    // @ts-expect-error -- window.renderSlide is defined in main.tsx
    await window.renderSlide(jsonStr, { width: 960, height: 540 });
  }, json);

  // Wait for React to complete rendering (fixed timeout like minimal test)
  await new Promise((resolve) => setTimeout(resolve, 500));

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
    jsonDir: path.join(fixturesDir, "json"),
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
  console.log("\n=== PPTX Visual Regression Summary ===\n");

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
