/**
 * @file PDF Editor Performance E2E Tests
 *
 * Measures actual wall-clock times for key editing operations
 * on a large (50-page) PDF document to identify bottlenecks.
 *
 * == Measured operations ==
 *
 * 1. Initial render time (React mount + first paint)
 * 2. Element selection (click on element)
 * 3. Element move (drag an element)
 * 4. Page switching (navigate to different page)
 * 5. Text editing enter/exit (double-click → type → commit)
 * 6. Undo/Redo responsiveness
 * 7. Multi-select (shift-click multiple elements)
 * 8. Delete selected elements
 *
 * Each operation is timed via Performance API marks measured
 * through puppeteer page.evaluate().
 */

import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { createServer, type ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";

// =============================================================================
// Config
// =============================================================================

const PORT = 5182;
const BASE_URL = `http://localhost:${PORT}/perf-index.html`;
const SETTLE = 400;

async function findChrome(): Promise<string> {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[];
  for (const p of paths) { if (fs.existsSync(p)) { return p; } }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

async function settle(ms = SETTLE): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// =============================================================================
// DOM Helpers
// =============================================================================

type Rect = { x: number; y: number; width: number; height: number };

async function getShapeHitAreas(page: Page): Promise<Map<string, Rect>> {
  const entries = await page.evaluate(() => {
    const rects = document.querySelectorAll<SVGRectElement>("[data-shape-id]");
    return Array.from(rects).map((r) => {
      const id = r.getAttribute("data-shape-id") ?? "";
      const rect = r.getBoundingClientRect();
      return { id, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
  });
  const map = new Map<string, Rect>();
  for (const e of entries) {
    map.set(e.id, { x: e.x, y: e.y, width: e.width, height: e.height });
  }
  return map;
}

async function getShapeCenter(page: Page, shapeId: string): Promise<{ x: number; y: number }> {
  const areas = await getShapeHitAreas(page);
  const rect = areas.get(shapeId);
  if (!rect) { throw new Error(`Shape ${shapeId} not found`); }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

async function getShapeCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll("[data-shape-id]").length);
}

async function isTextEditing(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector("textarea") !== null);
}

async function getCanvasBackgroundClickTarget(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const svgs = document.querySelectorAll("svg");
    for (const svg of svgs) {
      if (svg.style.backgroundColor) {
        const r = svg.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height - 30 };
      }
    }
    return null;
  });
}

// =============================================================================
// Timing Helpers
// =============================================================================

/**
 * Measure a browser-side operation by injecting performance marks.
 * Returns elapsed time in milliseconds.
 */
async function measureOperation(
  page: Page,
  name: string,
  operation: () => Promise<void>,
): Promise<number> {
  // Clear marks
  await page.evaluate((n) => {
    performance.clearMarks(`${n}-start`);
    performance.clearMarks(`${n}-end`);
  }, name);

  // Mark start
  await page.evaluate((n) => performance.mark(`${n}-start`), name);

  // Execute operation
  await operation();

  // Wait for React to flush + browser to paint
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  // Mark end
  await page.evaluate((n) => performance.mark(`${n}-end`), name);

  // Measure
  const elapsed = await page.evaluate((n) => {
    const measure = performance.measure(n, `${n}-start`, `${n}-end`);
    return measure.duration;
  }, name);

  return elapsed;
}

/**
 * Measure a higher-level operation that includes settle time.
 * Uses Date.now() on the Node side for simplicity.
 */
function timedOperation(name: string, operation: () => Promise<void>): Promise<{ name: string; ms: number }> {
  return (async () => {
    const start = Date.now();
    await operation();
    const ms = Date.now() - start;
    return { name, ms };
  })();
}

// =============================================================================
// Performance Tests
// =============================================================================

type PerfResult = { name: string; ms: number; note?: string };

async function runPerfTests(browser: Browser): Promise<PerfResult[]> {
  const results: PerfResult[] = [];

  function record(name: string, ms: number, note?: string) {
    results.push({ name, ms, note });
    console.log(`  [perf] ${name}: ${ms.toFixed(1)}ms${note ? ` (${note})` : ""}`);
  }

  // =========================================================================
  // 1. Initial render time
  // =========================================================================
  {
    console.log("\n--- 1. Initial Render ---");
    const page = await browser.newPage();
    const navStart = Date.now();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);
    const navEnd = Date.now();

    const initialRenderMs = await page.evaluate(() => (window as Record<string, unknown>).__initialRenderMs as number | undefined);
    record("Initial render (50 pages)", initialRenderMs ?? (navEnd - navStart), `nav total: ${navEnd - navStart}ms`);

    const docInfo = await page.evaluate(() => (window as Record<string, unknown>).__perfDocumentInfo as Record<string, number>);
    console.log(`  Document: ${docInfo?.pageCount} pages, ${docInfo?.elementsPerPage} elements/page, ${docInfo?.totalElements} total`);

    await page.close();
  }

  // =========================================================================
  // 2. Element selection
  // =========================================================================
  {
    console.log("\n--- 2. Element Selection ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    // Select first element
    const ms1 = await measureOperation(page, "select-first", async () => {
      const center = await getShapeCenter(page, "0:0");
      await page.mouse.click(center.x, center.y);
    });
    record("Select element (first click)", ms1);

    // Clear selection by clicking background
    const bg = await getCanvasBackgroundClickTarget(page);
    if (bg) { await page.mouse.click(bg.x, bg.y); }
    await settle(200);

    // Select another element
    const ms2 = await measureOperation(page, "select-second", async () => {
      const center = await getShapeCenter(page, "0:3");
      await page.mouse.click(center.x, center.y);
    });
    record("Select element (second element)", ms2);

    await page.close();
  }

  // =========================================================================
  // 3. Element move (drag)
  // =========================================================================
  {
    console.log("\n--- 3. Element Move ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    // Select element first
    const center = await getShapeCenter(page, "0:4");
    await page.mouse.click(center.x, center.y);
    await settle(200);

    // Measure drag operation
    const dragMs = await measureOperation(page, "drag-move", async () => {
      await page.mouse.move(center.x, center.y);
      await page.mouse.down();
      // Exceed drag threshold
      await page.mouse.move(center.x + 10, center.y + 6, { steps: 3 });
      // Move to destination
      await page.mouse.move(center.x + 50, center.y + 30, { steps: 5 });
      await page.mouse.up();
    });
    record("Drag move (element)", dragMs);

    await page.close();
  }

  // =========================================================================
  // 4. Page switching
  // =========================================================================
  {
    console.log("\n--- 4. Page Switching ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    // Find page thumbnails in the left panel and click them
    // Pages are rendered in a PdfPageListPanel — find clickable page items
    const pageItems = await page.evaluate(() => {
      // Look for thumbnail items — they have page content or numbered items
      const items = document.querySelectorAll("[data-page-index]");
      return Array.from(items).map((item) => {
        const rect = item.getBoundingClientRect();
        const index = item.getAttribute("data-page-index");
        return { index, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      });
    });

    if (pageItems.length >= 2) {
      // Switch to page 2
      const ms1 = await measureOperation(page, "page-switch-1", async () => {
        await page.mouse.click(pageItems[1].x, pageItems[1].y);
      });
      record("Switch to page 2 (via thumbnail)", ms1);
      await settle(200);

      // Switch to page 5 if available
      if (pageItems.length >= 5) {
        const ms2 = await measureOperation(page, "page-switch-5", async () => {
          await page.mouse.click(pageItems[4].x, pageItems[4].y);
        });
        record("Switch to page 5 (via thumbnail)", ms2);
      }
    } else {
      // Fallback: page switching may use different mechanism
      record("Page switch (thumbnails not found)", 0, "SKIPPED — no [data-page-index] found");

      // Try alternative: keyboard or other UI
      console.log("  Looking for alternative page navigation...");
      const altNav = await page.evaluate(() => {
        // Log all data attributes for debugging
        const all = document.querySelectorAll("[data-testid], [data-page-index], [role='listitem']");
        return Array.from(all).map((el) => ({
          tag: el.tagName,
          attrs: Array.from(el.attributes).map((a) => `${a.name}=${a.value}`),
        })).slice(0, 20);
      });
      console.log("  Found elements:", JSON.stringify(altNav, null, 2));
    }

    await page.close();
  }

  // =========================================================================
  // 5. Text editing enter/exit
  // =========================================================================
  {
    console.log("\n--- 5. Text Editing ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    // Enter text editing (double-click)
    const enterMs = await measureOperation(page, "text-edit-enter", async () => {
      const center = await getShapeCenter(page, "0:0");
      await page.mouse.click(center.x, center.y, { count: 2 });
    });
    record("Enter text editing (double-click)", enterMs);

    await settle(200);
    const editing = await isTextEditing(page);
    if (!editing) {
      record("Text editing FAILED to enter", 0, "SKIPPED");
    } else {
      // Type some text
      const typeMs = await measureOperation(page, "text-type", async () => {
        await page.keyboard.type("ABC");
      });
      record("Type 3 characters", typeMs);
      await settle(100);

      // Commit (Enter)
      const commitMs = await measureOperation(page, "text-commit", async () => {
        await page.keyboard.press("Enter");
      });
      record("Commit text edit (Enter)", commitMs);
    }

    await page.close();
  }

  // =========================================================================
  // 6. Undo / Redo
  // =========================================================================
  {
    console.log("\n--- 6. Undo / Redo ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    // Make a change first: select and delete
    const center = await getShapeCenter(page, "0:3");
    await page.mouse.click(center.x, center.y);
    await settle(200);
    await page.keyboard.press("Backspace");
    await settle(200);

    // Undo
    const undoMs = await measureOperation(page, "undo", async () => {
      await page.keyboard.down("Meta");
      await page.keyboard.press("z");
      await page.keyboard.up("Meta");
    });
    record("Undo", undoMs);
    await settle(200);

    // Redo
    const redoMs = await measureOperation(page, "redo", async () => {
      await page.keyboard.down("Meta");
      await page.keyboard.down("Shift");
      await page.keyboard.press("z");
      await page.keyboard.up("Shift");
      await page.keyboard.up("Meta");
    });
    record("Redo", redoMs);

    await page.close();
  }

  // =========================================================================
  // 7. Multi-select
  // =========================================================================
  {
    console.log("\n--- 7. Multi-Select ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    const c0 = await getShapeCenter(page, "0:0");
    await page.mouse.click(c0.x, c0.y);
    await settle(100);

    const multiMs = await measureOperation(page, "multi-select", async () => {
      const c1 = await getShapeCenter(page, "0:1");
      const c2 = await getShapeCenter(page, "0:2");
      const c3 = await getShapeCenter(page, "0:3");
      await page.keyboard.down("Shift");
      await page.mouse.click(c1.x, c1.y);
      await page.mouse.click(c2.x, c2.y);
      await page.mouse.click(c3.x, c3.y);
      await page.keyboard.up("Shift");
    });
    record("Multi-select (4 elements)", multiMs);

    await page.close();
  }

  // =========================================================================
  // 8. Delete selected
  // =========================================================================
  {
    console.log("\n--- 8. Delete ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    const before = await getShapeCount(page);
    const center = await getShapeCenter(page, "0:3");
    await page.mouse.click(center.x, center.y);
    await settle(200);

    const deleteMs = await measureOperation(page, "delete", async () => {
      await page.keyboard.press("Backspace");
    });
    const after = await getShapeCount(page);
    record("Delete element", deleteMs, `shapes: ${before} → ${after}`);

    await page.close();
  }

  // =========================================================================
  // 9. Scale comparison: 5 pages vs 50 pages vs 200 pages
  // =========================================================================
  {
    console.log("\n--- 9. Scale Comparison (initial render) ---");
    for (const count of [5, 50, 200]) {
      const page = await browser.newPage();
      const start = Date.now();
      await page.goto(`${BASE_URL}?pages=${count}`, { waitUntil: "networkidle0" });
      await settle(800);
      const navMs = Date.now() - start;
      const renderMs = await page.evaluate(() => (window as Record<string, unknown>).__initialRenderMs as number | undefined);
      record(`Render ${count} pages`, renderMs ?? navMs, `nav: ${navMs}ms`);
      await page.close();
    }
  }

  // =========================================================================
  // 10. Repeated selection — measures if there's accumulating slowness
  // =========================================================================
  {
    console.log("\n--- 10. Repeated Operations (accumulation test) ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    const timings: number[] = [];
    for (let i = 0; i < 10; i++) {
      const ms = await measureOperation(page, `select-repeat-${i}`, async () => {
        const center = await getShapeCenter(page, "0:0");
        await page.mouse.click(center.x, center.y);
      });
      timings.push(ms);

      // Clear selection
      const bg = await getCanvasBackgroundClickTarget(page);
      if (bg) { await page.mouse.click(bg.x, bg.y); }
      await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const max = Math.max(...timings);
    const min = Math.min(...timings);
    const trend = timings[timings.length - 1] - timings[0];
    record("Repeated select (10x avg)", avg, `min=${min.toFixed(1)}, max=${max.toFixed(1)}, trend=${trend > 0 ? "+" : ""}${trend.toFixed(1)}ms`);

    await page.close();
  }

  // =========================================================================
  // 11. React Profiler — measure component render times
  // =========================================================================
  {
    console.log("\n--- 11. JS Profiling (element selection with tracing) ---");
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}?pages=50`, { waitUntil: "networkidle0" });
    await settle(800);

    // Inject performance observer to catch long tasks
    await page.evaluate(() => {
      (window as Record<string, unknown>).__longTasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          ((window as Record<string, unknown>).__longTasks as Array<{ duration: number; startTime: number }>).push({
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    });

    // Start CPU profiling via CDP
    const client = await page.createCDPSession();
    await client.send("Profiler.enable");
    await client.send("Profiler.start");

    // Perform operation: select, move, deselect × 3
    for (let i = 0; i < 3; i++) {
      const center = await getShapeCenter(page, "0:0");
      await page.mouse.click(center.x, center.y);
      await settle(100);

      await page.mouse.move(center.x, center.y);
      await page.mouse.down();
      await page.mouse.move(center.x + 10, center.y + 6, { steps: 3 });
      await page.mouse.move(center.x + 30, center.y + 15, { steps: 5 });
      await page.mouse.up();
      await settle(100);

      const bg = await getCanvasBackgroundClickTarget(page);
      if (bg) { await page.mouse.click(bg.x, bg.y); }
      await settle(100);
    }

    const { profile } = await client.send("Profiler.stop");

    // Analyze profile: find hotspots
    type ProfileNode = { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount: number; children?: number[] };
    const nodes = profile.nodes as ProfileNode[];
    const totalSamples = profile.samples?.length ?? 0;

    // Aggregate by function name
    const hitsByFunction = new Map<string, { hits: number; url: string; line: number }>();
    for (const node of nodes) {
      const fn = node.callFrame.functionName || "(anonymous)";
      const key = `${fn}@${node.callFrame.url}:${node.callFrame.lineNumber}`;
      const existing = hitsByFunction.get(key) ?? { hits: 0, url: node.callFrame.url, line: node.callFrame.lineNumber };
      existing.hits += node.hitCount;
      hitsByFunction.set(key, existing);
    }

    // Sort by hits descending
    const sorted = [...hitsByFunction.entries()].sort((a, b) => b[1].hits - a[1].hits);

    console.log(`\n  CPU Profile: ${totalSamples} samples`);
    console.log("  Top 20 hotspots:");
    for (const [key, info] of sorted.slice(0, 20)) {
      const pct = ((info.hits / totalSamples) * 100).toFixed(1);
      console.log(`    ${pct}% (${info.hits} hits) — ${key}`);
    }

    // Check for long tasks
    const longTasks = await page.evaluate(() => (window as Record<string, unknown>).__longTasks as Array<{ duration: number; startTime: number }>);
    if (longTasks.length > 0) {
      const totalLong = longTasks.reduce((sum, t) => sum + t.duration, 0);
      record("Long tasks during select+move×3", totalLong, `${longTasks.length} tasks, max=${Math.max(...longTasks.map((t) => t.duration)).toFixed(0)}ms`);
    } else {
      record("Long tasks during select+move×3", 0, "none detected");
    }

    await client.detach();
    await page.close();
  }

  return results;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log("=== PDF Editor Performance E2E Tests ===\n");

  const server: ViteDevServer = await createServer({
    configFile: path.join(__dirname, "perf-vite.config.ts"),
    server: { port: PORT },
  });
  await server.listen();
  console.log(`Vite server started at ${BASE_URL}`);

  const executablePath = await findChrome();
  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  try {
    const results = await runPerfTests(browser);

    // Print summary
    console.log("\n\n========================================");
    console.log("=== Performance Summary ===");
    console.log("========================================\n");

    const maxNameLen = Math.max(...results.map((r) => r.name.length));
    for (const r of results) {
      const bar = "█".repeat(Math.min(50, Math.round(r.ms / 10)));
      const padded = r.name.padEnd(maxNameLen + 2);
      console.log(`  ${padded} ${r.ms.toFixed(1).padStart(8)}ms  ${bar}${r.note ? `  (${r.note})` : ""}`);
    }

    // Flag potential bottlenecks
    console.log("\n--- Bottleneck Analysis ---");
    const slowOps = results.filter((r) => r.ms > 100);
    if (slowOps.length === 0) {
      console.log("  No operations exceeded 100ms threshold.");
    } else {
      console.log(`  ${slowOps.length} operation(s) exceeded 100ms:`);
      for (const op of slowOps) {
        console.log(`  ⚠  ${op.name}: ${op.ms.toFixed(1)}ms`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
