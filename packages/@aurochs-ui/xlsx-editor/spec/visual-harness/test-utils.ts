/**
 * @file Shared utilities for XLSX visual regression tests
 *
 * Common functions for rendering workbooks, capturing screenshots,
 * and comparing with LibreOffice baseline images.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";

// =============================================================================
// Types
// =============================================================================

export type CompareResult = {
  name: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

export type XlsxHarness = {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
};

export type CaptureConfig = {
  width: number;
  height: number;
  sheetIndex?: number;
  scrollTop?: number;
  scrollLeft?: number;
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
// Image Comparison
// =============================================================================

/**
 * Compare two PNG buffers and return diff statistics.
 * Optionally writes a diff image to the specified path.
 *
 * @param options.contentOnly - If true, only compare the cell content area (exclude headers)
 * @param options.headerOffset - Offset for headers { top, left }
 */
export function comparePngs(
  actual: Buffer,
  baseline: Buffer,
  name: string,
  diffPath?: string,
  options?: {
    contentOnly?: boolean;
    headerOffset?: { top: number; left: number };
  }
): CompareResult {
  const imgA = PNG.sync.read(actual);
  let imgB = PNG.sync.read(baseline);

  // Resize if dimensions don't match (use nearest-neighbor scaling)
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

  // Determine comparison region
  const contentOnly = options?.contentOnly ?? false;
  const headerTop = options?.headerOffset?.top ?? 22;  // Default col header height
  const headerLeft = options?.headerOffset?.left ?? 56; // Default row header width

  let regionX = 0;
  let regionY = 0;
  let regionW = imgA.width;
  let regionH = imgA.height;

  if (contentOnly) {
    regionX = headerLeft;
    regionY = headerTop;
    regionW = imgA.width - headerLeft;
    regionH = imgA.height - headerTop;
  }

  // Extract region from both images
  const extractRegion = (img: PNG, x: number, y: number, w: number, h: number): PNG => {
    const region = new PNG({ width: w, height: h });
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const srcIdx = ((y + py) * img.width + (x + px)) * 4;
        const dstIdx = (py * w + px) * 4;
        region.data[dstIdx] = img.data[srcIdx];
        region.data[dstIdx + 1] = img.data[srcIdx + 1];
        region.data[dstIdx + 2] = img.data[srcIdx + 2];
        region.data[dstIdx + 3] = img.data[srcIdx + 3];
      }
    }
    return region;
  };

  const regionA = contentOnly ? extractRegion(imgA, regionX, regionY, regionW, regionH) : imgA;
  const regionB = contentOnly ? extractRegion(imgB, regionX, regionY, regionW, regionH) : imgB;

  const diff = new PNG({ width: regionA.width, height: regionA.height });
  const diffPixels = pixelmatch(regionA.data, regionB.data, diff.data, regionA.width, regionA.height, {
    threshold: 0.1,
    includeAA: false,
  });

  if (diffPath && diffPixels > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  const totalPixels = regionA.width * regionA.height;
  return {
    name,
    diffPercent: (diffPixels / totalPixels) * 100,
    diffPixels,
    totalPixels,
  };
}

// =============================================================================
// Harness Lifecycle
// =============================================================================

/**
 * Start the XLSX visual test harness (Vite dev server + Puppeteer browser)
 */
export async function startHarness(): Promise<XlsxHarness> {
  const harnessRoot = path.resolve(__dirname);
  // Random port between 30000-40000 to avoid conflicts
  const port = 30000 + Math.floor(Math.random() * 10000);

  // Use inline config to avoid conflicts with other Vite servers
  const server = await createServer({
    configFile: false, // Disable config file loading
    root: harnessRoot,
    server: {
      port,
      strictPort: false, // Try next port if occupied
    },
    plugins: [
      // @ts-expect-error -- dynamic import
      (await import("@vitejs/plugin-react")).default(),
    ],
    resolve: {
      alias: {
        "@aurochs-ui/xlsx-editor": path.resolve(__dirname, "../../src"),
        "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
        "@aurochs-office/xlsx": path.resolve(__dirname, "../../../../@aurochs-office/xlsx/src"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    logLevel: "warn",
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
 * Stop the XLSX visual test harness
 */
export async function stopHarness(harness: XlsxHarness): Promise<void> {
  await harness.browser?.close();
  await harness.server?.close();
}

// =============================================================================
// Screenshot Capture
// =============================================================================

/**
 * Capture a screenshot of the XLSX editor rendering a workbook
 */
export async function captureWorkbook(
  page: Page,
  workbook: XlsxWorkbook,
  config: CaptureConfig
): Promise<Buffer> {
  const json = JSON.stringify(workbook);

  // Set viewport to match config dimensions
  await page.setViewport({
    width: config.width,
    height: config.height,
    deviceScaleFactor: 1,
  });

  // Render the workbook
  await page.evaluate(
    async (wbJson: string, cfg: CaptureConfig) => {
      await window.renderWorkbook(wbJson, cfg);
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

/**
 * Capture a screenshot with scroll position applied
 */
export async function captureWorkbookScrolled(
  page: Page,
  workbook: XlsxWorkbook,
  config: CaptureConfig & { scrollTop: number; scrollLeft: number }
): Promise<Buffer> {
  // First render at initial position
  await captureWorkbook(page, workbook, config);

  // Now scroll to desired position
  await page.evaluate(
    (scrollTop: number, scrollLeft: number) => {
      const scrollContainer = document.querySelector('[data-virtual-scroll-root="true"]') as HTMLElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
        scrollContainer.scrollLeft = scrollLeft;
      }
    },
    config.scrollTop,
    config.scrollLeft
  );

  // Wait for scroll to settle
  await new Promise((resolve) => setTimeout(resolve, 200));

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

export function getFixturePaths(fixtureName: string) {
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

export function printSummary(results: CompareResult[]): void {
  console.log("\n=== XLSX Visual Regression Summary ===\n");

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
