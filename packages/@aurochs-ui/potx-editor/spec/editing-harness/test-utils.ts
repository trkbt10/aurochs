/**
 * @file Shared utilities for potx-editor editing E2E tests
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";

/**
 * Window API exposed by the editing harness (main.tsx).
 * Declared globally so page.evaluate callbacks can access these without casts.
 */
declare global {
  // eslint-disable-next-line no-var -- global augmentation requires var
  var getShapeIds: () => string[];
  // eslint-disable-next-line no-var
  var getShapeBounds: (id: string) => ShapeBounds | null;
  // eslint-disable-next-line no-var
  var getSelectedIds: () => string[];
  // eslint-disable-next-line no-var
  var getDragType: () => string;
  // eslint-disable-next-line no-var
  var getShapeCount: () => number;
  // eslint-disable-next-line no-var
  var getTextEditState: () => { active: boolean; shapeId: string | undefined };
  // eslint-disable-next-line no-var
  var addShape: (type: string, preset?: string, x?: number, y?: number) => string | null;
  // eslint-disable-next-line no-var
  var deleteSelectedShapes: () => void;
}

export type EditingHarness = {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
};

export type ShapeBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

/**
 * Start the editing harness (Vite dev server + Puppeteer)
 */
export async function startHarness(): Promise<EditingHarness> {
  const port = 39999;

  const server = await createServer({
    configFile: path.resolve(__dirname, "vite.config.ts"),
    server: { port, strictPort: true },
  });

  const info = await server.listen();
  const address = info.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }
  const serverUrl = `http://localhost:${(address as { port: number }).port}`;

  const chromePath = path.join(
    process.env.HOME ?? "",
    ".cache/puppeteer/chrome/mac_arm-145.0.7632.76/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  );
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    protocolTimeout: 60000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });
  await page.goto(serverUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.title === "ready", { timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { server, browser, page };
}

/**
 * Stop the harness
 */
export async function stopHarness(harness: EditingHarness): Promise<void> {
  await harness.browser?.close();
  await harness.server?.close();
}

/**
 * Get all shape IDs from the harness
 */
export async function getShapeIds(page: Page): Promise<string[]> {
  return page.evaluate(() => window.getShapeIds());
}

/**
 * Get shape bounds by ID
 */
export async function getShapeBounds(page: Page, id: string): Promise<ShapeBounds | null> {
  return page.evaluate((shapeId: string) => window.getShapeBounds(shapeId), id);
}

/**
 * Get selected shape IDs
 */
export async function getSelectedIds(page: Page): Promise<string[]> {
  return page.evaluate(() => window.getSelectedIds());
}

/**
 * Get current drag state type
 */
export async function getDragType(page: Page): Promise<string> {
  return page.evaluate(() => window.getDragType());
}

/**
 * Get the screen bounding box of a hit area rect
 */
export async function getHitAreaScreenBox(page: Page, id: string) {
  const el = await page.$(`rect[data-shape-id="${id}"]`);
  if (!el) return null;
  return el.boundingBox();
}

/**
 * Click on a shape (center of its hit area)
 */
export async function clickShape(page: Page, id: string): Promise<void> {
  const box = await getHitAreaScreenBox(page, id);
  if (!box) throw new Error(`Shape ${id} not found in DOM`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await new Promise((r) => setTimeout(r, 200));
}

/**
 * Drag a shape from its center by (dx, dy) pixels on screen
 */
export async function dragShape(
  page: Page,
  id: string,
  dx: number,
  dy: number,
  steps = 10,
): Promise<void> {
  const box = await getHitAreaScreenBox(page, id);
  if (!box) throw new Error(`Shape ${id} not found in DOM`);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (dx * i) / steps, startY + (dy * i) / steps);
    await new Promise((r) => setTimeout(r, 16));
  }

  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 300));
}

/**
 * Get total shape count
 */
export async function getShapeCount(page: Page): Promise<number> {
  return page.evaluate(() => window.getShapeCount());
}

/**
 * Get text edit state
 */
export async function getTextEditState(page: Page): Promise<{ active: boolean; shapeId: string | undefined }> {
  return page.evaluate(() => window.getTextEditState());
}

/**
 * Add a shape programmatically, returns the new shape ID
 */
export async function addShape(page: Page, type: string, preset?: string, x?: number, y?: number): Promise<string | null> {
  return page.evaluate(
    (t: string, p: string | undefined, cx: number | undefined, cy: number | undefined) =>
      window.addShape(t, p, cx, cy),
    type,
    preset,
    x,
    y,
  );
}

/**
 * Delete currently selected shapes
 */
export async function deleteSelectedShapes(page: Page): Promise<void> {
  return page.evaluate(() => window.deleteSelectedShapes());
}
