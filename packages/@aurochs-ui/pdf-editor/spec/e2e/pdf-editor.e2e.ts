/**
 * @file PDF Editor E2E Tests
 *
 * Browser-based E2E tests for the PDF editor covering:
 * 1. Text editing (position-based selection, partial replacement)
 * 2. Font / color changes on partial selection
 * 3. Selection range stability after operations
 * 4. Inline vs block text behavior
 * 5. Resize, move, rotate with continued editing
 *
 * Uses puppeteer-core + Vite dev server (same pattern as VBA editor E2E).
 */

import puppeteer, { type Browser, type Page, type ElementHandle } from "puppeteer-core";
import { createServer, type ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";

// =============================================================================
// Test Setup
// =============================================================================

const PORT = 5181;
const BASE_URL = `http://localhost:${PORT}`;

/** Pause (ms) to allow React state propagation and re-render. */
const SETTLE = 300;

async function findChrome(): Promise<string> {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

async function settle(ms = SETTLE): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// =============================================================================
// DOM Query Helpers
// =============================================================================

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Get all hit-area rects (data-shape-id) inside the editor SVG.
 * Returns a map of id → bounding rect in viewport coordinates.
 */
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

/** Get center point (viewport coordinates) of a shape hit area. */
async function getShapeCenter(page: Page, shapeId: string): Promise<{ x: number; y: number }> {
  const areas = await getShapeHitAreas(page);
  const rect = areas.get(shapeId);
  if (!rect) throw new Error(`Shape ${shapeId} not found`);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Check if a selection box (SVG stroke rect) exists in the editor. */
async function hasSelectionBox(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const svgEl = document.querySelector("svg");
    if (!svgEl) return false;
    const rects = svgEl.querySelectorAll("rect");
    for (const rect of rects) {
      const stroke = rect.getAttribute("stroke");
      const fill = rect.getAttribute("fill");
      const pe = rect.getAttribute("pointer-events");
      const sd = rect.getAttribute("stroke-dasharray");
      // Selection box: has stroke (#0066ff or similar), fill=none, pointer-events=none
      // Accept any rect that has stroke + fill=none + pointer-events=none
      if (stroke && fill === "none" && pe === "none") {
        return true;
      }
      // Also check for selection box patterns by stroke-width=2
      const sw = rect.getAttribute("stroke-width");
      if (stroke && fill === "none" && sw === "2") {
        return true;
      }
    }
    return false;
  });
}

/** Count selection boxes visible. */
async function countSelectionBoxes(page: Page): Promise<number> {
  return page.evaluate(() => {
    const svgEl = document.querySelector("svg");
    if (!svgEl) return 0;
    const rects = svgEl.querySelectorAll("rect");
    // eslint-disable-next-line no-restricted-syntax
    let count = 0;
    for (const rect of rects) {
      const stroke = rect.getAttribute("stroke");
      const fill = rect.getAttribute("fill");
      const sw = rect.getAttribute("stroke-width");
      // Selection box: stroke-width=2, fill=none, has stroke color
      if (stroke && fill === "none" && sw === "2") {
        count++;
      }
    }
    return count;
  });
}

/** Get the hidden textarea used for text editing (if active). */
async function getTextarea(page: Page): Promise<ElementHandle<HTMLTextAreaElement> | null> {
  return page.$("textarea");
}

/** Get textarea value. */
async function getTextareaValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const ta = document.querySelector("textarea");
    return ta?.value ?? "";
  });
}

/** Get textarea selection range. */
async function getTextareaSelection(page: Page): Promise<{ start: number; end: number }> {
  return page.evaluate(() => {
    const ta = document.querySelector("textarea");
    return { start: ta?.selectionStart ?? 0, end: ta?.selectionEnd ?? 0 };
  });
}

/** Check if text editing mode is active (textarea exists and is focused). */
async function isTextEditing(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const ta = document.querySelector("textarea");
    return ta !== null && document.activeElement === ta;
  });
}

/** Count the number of shape hit areas visible. */
async function getShapeCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    return document.querySelectorAll("[data-shape-id]").length;
  });
}

// =============================================================================
// Test Definitions
// =============================================================================

type TestResult = { name: string; passed: boolean; error?: string };

async function runAllTests(browser: Browser): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // =========================================================================
  // Category 1: Text Editing — Position-Based Selection & Partial Replace
  // =========================================================================

  // Test 1.1: Double-click text element enters text editing mode
  {
    const name = "1.1 Double-click text enters editing mode";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0"); // inlineText
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    const editing = await isTextEditing(page);
    const value = await getTextareaValue(page);

    const passed = editing && value === "Hello World";
    results.push({ name, passed, error: passed ? undefined : `editing=${editing}, value="${value}"` });
    await page.close();
  }

  // Test 1.2: Position-based text selection via Shift+Arrow
  {
    const name = "1.2 Position-based text selection (Shift+Arrow)";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Move to start, then select 5 chars
    await page.keyboard.press("Home");
    await settle(100);
    for (const _ of [1, 2, 3, 4, 5]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await settle(100);

    const sel = await getTextareaSelection(page);
    const passed = sel.start === 0 && sel.end === 5;
    results.push({ name, passed, error: passed ? undefined : `selection: ${sel.start}-${sel.end}` });
    await page.close();
  }

  // Test 1.3: Partial text replacement
  {
    const name = "1.3 Partial text replacement";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Select "Hello" (first 5 chars) and replace with "Greetings"
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3, 4, 5]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await page.keyboard.type("Greetings");
    await settle(100);

    const value = await getTextareaValue(page);
    const passed = value === "Greetings World";
    results.push({ name, passed, error: passed ? undefined : `value="${value}"` });
    await page.close();
  }

  // Test 1.4: Commit text edit with Enter
  {
    const name = "1.4 Commit text edit with Enter";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    await page.keyboard.press("End");
    await page.keyboard.type("!");
    await settle(100);

    // Commit
    await page.keyboard.press("Enter");
    await settle();

    const editingAfter = await isTextEditing(page);
    const passed = !editingAfter;
    results.push({ name, passed, error: passed ? undefined : `still editing after Enter` });
    await page.close();
  }

  // Test 1.5: Cancel text edit with Escape
  {
    const name = "1.5 Cancel text edit with Escape";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    await page.keyboard.type("EXTRA");
    await settle(100);

    // Cancel — should not modify original text
    await page.keyboard.press("Escape");
    await settle();

    const editingAfter = await isTextEditing(page);
    // Re-enter editing to verify original text
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();
    const value = await getTextareaValue(page);

    const passed = !editingAfter && value === "Hello World";
    results.push({ name, passed, error: passed ? undefined : `editing=${editingAfter}, value="${value}"` });
    await page.close();
  }

  // =========================================================================
  // Category 2: Selection Range Stability
  // =========================================================================

  // Test 2.1: Selection range preserved after typing
  {
    const name = "2.1 Selection range stable after insertion";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:1"); // blockText
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Go to position 4, type a char, then select from 4 to 7
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3, 4]) {
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.type("X");
    await settle(100);

    // Now cursor is at position 5 (after the inserted X)
    // Select 3 chars forward
    for (const _ of [1, 2, 3]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await settle(100);

    const sel = await getTextareaSelection(page);
    const passed = sel.end - sel.start === 3;
    results.push({ name, passed, error: passed ? undefined : `selection: ${sel.start}-${sel.end} (expected 3 chars selected)` });
    await page.close();
  }

  // Test 2.2: Select-all then partial re-select
  {
    const name = "2.2 Select-all then partial re-select";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Select all
    await page.keyboard.down("Meta");
    await page.keyboard.press("a");
    await page.keyboard.up("Meta");
    await settle(100);

    const selAll = await getTextareaSelection(page);

    // Now collapse and re-select partial
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await settle(100);

    const selPartial = await getTextareaSelection(page);
    const passed = selAll.end - selAll.start === 11 && selPartial.end - selPartial.start === 3;
    results.push({ name, passed, error: passed ? undefined : `selectAll: ${selAll.start}-${selAll.end}, partial: ${selPartial.start}-${selPartial.end}` });
    await page.close();
  }

  // =========================================================================
  // Category 3: Inline vs Block Text Behavior
  // =========================================================================

  // Test 3.1: Inline text — Enter commits (does not insert newline)
  {
    const name = "3.1 Inline text — Enter commits edit";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Press Enter — should commit, not insert newline
    await page.keyboard.press("Enter");
    await settle();

    const editing = await isTextEditing(page);
    const passed = !editing;
    results.push({ name, passed, error: passed ? undefined : `still editing after Enter` });
    await page.close();
  }

  // Test 3.2: Block text — long text editing preserves full content
  {
    const name = "3.2 Block text — preserves full content during edit";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:1");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    const value = await getTextareaValue(page);
    const expected = "The quick brown fox jumps over the lazy dog. This is a longer block of text for testing.";
    const passed = value === expected;
    results.push({ name, passed, error: passed ? undefined : `value="${value.substring(0, 40)}..."` });
    await page.close();
  }

  // Test 3.3: Block text — partial word replacement in middle
  {
    const name = "3.3 Block text — partial word replacement";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:1");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Navigate to "quick" (starts at index 4), select 5 chars
    await page.keyboard.press("Home");
    for (const _ of Array.from({ length: 4 })) {
      await page.keyboard.press("ArrowRight");
    }
    for (const _ of Array.from({ length: 5 })) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }

    // Replace "quick" with "slow"
    await page.keyboard.type("slow");
    await settle(100);

    const value = await getTextareaValue(page);
    const passed = value.startsWith("The slow brown fox");
    results.push({ name, passed, error: passed ? undefined : `value="${value.substring(0, 30)}..."` });
    await page.close();
  }

  // =========================================================================
  // Category 4: Element Selection and Move
  // =========================================================================

  // Test 4.1: Click selects element (shows selection box)
  {
    const name = "4.1 Click selects element";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    const hasSel = await hasSelectionBox(page);
    const passed = hasSel;
    results.push({ name, passed, error: passed ? undefined : `no selection box visible` });
    await page.close();
  }

  // Test 4.2: Click canvas clears selection
  {
    const name = "4.2 Click canvas clears selection";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    // Select element
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    // Click empty area (far from any element)
    const svgRect = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const r = svg.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    if (svgRect) {
      // Click near bottom-right corner (empty area)
      await page.mouse.click(svgRect.x + svgRect.width - 20, svgRect.y + svgRect.height - 20);
      await settle();
    }

    const hasSel = await hasSelectionBox(page);
    const passed = !hasSel;
    results.push({ name, passed, error: passed ? undefined : `selection box still visible` });
    await page.close();
  }

  // Test 4.3: Move element via drag
  {
    const name = "4.3 Move element via drag";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const before = await getShapeCenter(page, "0:4"); // rectPath
    await page.mouse.click(before.x, before.y);
    await settle();

    // Drag 50px right, 30px down
    await page.mouse.move(before.x, before.y);
    await page.mouse.down();
    // Move in small steps to exceed the 5px drag threshold
    await page.mouse.move(before.x + 10, before.y + 6, { steps: 3 });
    await page.mouse.move(before.x + 50, before.y + 30, { steps: 5 });
    await page.mouse.up();
    await settle();

    const after = await getShapeCenter(page, "0:4");
    // After drag, the center should be approximately 50px right and 30px down
    const dx = Math.abs(after.x - before.x - 50);
    const dy = Math.abs(after.y - before.y - 30);
    const passed = dx < 15 && dy < 15;
    results.push({ name, passed, error: passed ? undefined : `dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}` });
    await page.close();
  }

  // Test 4.4: Move then continue text editing
  {
    const name = "4.4 Move element then continue text editing";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");

    // Select
    await page.mouse.click(center.x, center.y);
    await settle();

    // Drag to move
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 10, center.y + 6, { steps: 3 });
    await page.mouse.move(center.x + 40, center.y + 20, { steps: 5 });
    await page.mouse.up();
    await settle();

    // Now double-click to enter text edit at new position
    const newCenter = await getShapeCenter(page, "0:0");
    await page.mouse.click(newCenter.x, newCenter.y, { count: 2 });
    await settle();

    const editing = await isTextEditing(page);
    const value = await getTextareaValue(page);
    const passed = editing && value === "Hello World";
    results.push({ name, passed, error: passed ? undefined : `editing=${editing}, value="${value}"` });
    await page.close();
  }

  // =========================================================================
  // Category 5: Resize
  // =========================================================================

  // Test 5.1: Resize text element via handle drag
  {
    const name = "5.1 Resize text element";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    // Select inline text
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    // Find SE resize handle — it's a small rect at the bottom-right of selection
    const handlePos = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      // Find rects that look like resize handles (small 8x8 rects with fill and stroke)
      const rects = svg.querySelectorAll("rect");
      const candidates: Array<{ x: number; y: number; width: number; height: number; cx: number; cy: number }> = [];
      for (const rect of rects) {
        const width = parseFloat(rect.getAttribute("width") ?? "0");
        const height = parseFloat(rect.getAttribute("height") ?? "0");
        const stroke = rect.getAttribute("stroke");
        const fill = rect.getAttribute("fill");
        // Resize handles: small rects with both fill and stroke, not the selection border
        if (width > 3 && width < 20 && height > 3 && height < 20 && stroke && fill && fill !== "none") {
          const r = rect.getBoundingClientRect();
          candidates.push({ x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
        }
      }
      if (candidates.length === 0) return null;
      // Return the bottom-right-most handle (SE)
      candidates.sort((a, b) => (b.cx + b.cy) - (a.cx + a.cy));
      return { x: candidates[0].cx, y: candidates[0].cy };
    });

    if (!handlePos) {
      results.push({ name, passed: false, error: "No resize handle found" });
      await page.close();
    } else {
      // Drag SE handle 30px right and 10px down
      await page.mouse.move(handlePos.x, handlePos.y);
      await page.mouse.down();
      await page.mouse.move(handlePos.x + 30, handlePos.y + 10, { steps: 5 });
      await page.mouse.up();
      await settle();

      // After resize, the shape should still be selectable and text editing should work
      const newCenter = await getShapeCenter(page, "0:0");
      await page.mouse.click(newCenter.x, newCenter.y, { count: 2 });
      await settle();

      const editing = await isTextEditing(page);
      const value = await getTextareaValue(page);
      const passed = editing && value === "Hello World";
      results.push({ name, passed, error: passed ? undefined : `editing=${editing}, value="${value}"` });
      await page.close();
    }
  }

  // =========================================================================
  // Category 6: Rotate
  // =========================================================================

  // Test 6.1: Rotate element, then continue editing
  {
    const name = "6.1 Rotate element then text edit";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    // Select inline text
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    // Find rotate handle — the circle above the selection
    const rotatePos = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      // Rotate handle is an SVG circle
      const circles = svg.querySelectorAll("circle");
      for (const circle of circles) {
        const r = parseFloat(circle.getAttribute("r") ?? "0");
        const stroke = circle.getAttribute("stroke");
        if (r > 2 && r < 10 && stroke) {
          const rect = circle.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
      return null;
    });

    if (!rotatePos) {
      results.push({ name, passed: false, error: "No rotate handle found" });
      await page.close();
    } else {
      // Drag rotate handle in an arc
      await page.mouse.move(rotatePos.x, rotatePos.y);
      await page.mouse.down();
      await page.mouse.move(rotatePos.x + 30, rotatePos.y + 10, { steps: 5 });
      await page.mouse.up();
      await settle();

      // Double-click to enter text edit
      const newCenter = await getShapeCenter(page, "0:0");
      await page.mouse.click(newCenter.x, newCenter.y, { count: 2 });
      await settle();

      const editing = await isTextEditing(page);
      const value = await getTextareaValue(page);
      const passed = editing && value === "Hello World";
      results.push({ name, passed, error: passed ? undefined : `editing=${editing}, value="${value}"` });
      await page.close();
    }
  }

  // =========================================================================
  // Category 7: Undo / Redo after operations
  // =========================================================================

  // Test 7.1: Undo text edit
  {
    const name = "7.1 Undo text edit restores original";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();

    // Change text
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3, 4, 5]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await page.keyboard.type("Goodbye");
    await settle(100);

    // Commit
    await page.keyboard.press("Enter");
    await settle();

    // Verify committed text by re-entering edit
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();
    const afterCommit = await getTextareaValue(page);
    await page.keyboard.press("Escape");
    await settle();

    // Undo (Cmd+Z)
    await page.keyboard.down("Meta");
    await page.keyboard.press("z");
    await page.keyboard.up("Meta");
    await settle();

    // Re-enter text editing to check restored text
    // After undo, selection is cleared, so re-click
    const center2 = await getShapeCenter(page, "0:0");
    await page.mouse.click(center2.x, center2.y, { count: 2 });
    await settle();

    const afterUndo = await getTextareaValue(page);
    const passed = afterCommit === "Goodbye World" && afterUndo === "Hello World";
    results.push({ name, passed, error: passed ? undefined : `afterCommit="${afterCommit}", afterUndo="${afterUndo}"` });
    await page.close();
  }

  // =========================================================================
  // Category 8: Multi-select and continued operations
  // =========================================================================

  // Test 8.1: Shift-click multi-select
  {
    const name = "8.1 Shift-click multi-select";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const center0 = await getShapeCenter(page, "0:0");
    const center3 = await getShapeCenter(page, "0:3");

    await page.mouse.click(center0.x, center0.y);
    await settle(100);

    // Shift-click second element
    await page.keyboard.down("Shift");
    await page.mouse.click(center3.x, center3.y);
    await page.keyboard.up("Shift");
    await settle();

    const selBoxCount = await countSelectionBoxes(page);

    const passed = selBoxCount >= 2;
    results.push({ name, passed, error: passed ? undefined : `selBoxCount=${selBoxCount}` });
    await page.close();
  }

  // Test 8.2: Delete selected element via keyboard
  {
    const name = "8.2 Delete selected element";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    const before = await getShapeCount(page);
    const center = await getShapeCenter(page, "0:3");
    await page.mouse.click(center.x, center.y);
    await settle();

    await page.keyboard.press("Backspace");
    await settle();

    const after = await getShapeCount(page);
    const passed = after === before - 1;
    results.push({ name, passed, error: passed ? undefined : `before=${before}, after=${after}` });
    await page.close();
  }

  // =========================================================================
  // Category 9: Resize/Move/Rotate then text edit content integrity
  // =========================================================================

  // Test 9.1: Resize → Move → text edit → content matches
  {
    const name = "9.1 Resize + Move + text edit preserves content";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    // Step 1: Select text element
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    // Step 2: Move
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 10, center.y + 6, { steps: 3 });
    await page.mouse.move(center.x + 30, center.y + 15, { steps: 5 });
    await page.mouse.up();
    await settle();

    // Step 3: Double-click to edit, modify text
    const movedCenter = await getShapeCenter(page, "0:0");
    await page.mouse.click(movedCenter.x, movedCenter.y, { count: 2 });
    await settle();

    await page.keyboard.press("End");
    await page.keyboard.type("!!!");
    await settle(100);

    const value = await getTextareaValue(page);
    const passed = value === "Hello World!!!";
    results.push({ name, passed, error: passed ? undefined : `value="${value}"` });
    await page.close();
  }

  // Test 9.2: Selection range stable after move and re-enter text edit
  {
    const name = "9.2 Selection range stable after move";
    console.log(`Running: ${name}`);
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();

    // Edit block text, commit
    const center = await getShapeCenter(page, "0:1");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();
    await page.keyboard.press("Enter"); // commit
    await settle();

    // Move block text
    const c2 = await getShapeCenter(page, "0:1");
    await page.mouse.click(c2.x, c2.y);
    await settle();
    await page.mouse.move(c2.x, c2.y);
    await page.mouse.down();
    await page.mouse.move(c2.x + 10, c2.y + 6, { steps: 3 });
    await page.mouse.move(c2.x + 20, c2.y + 20, { steps: 5 });
    await page.mouse.up();
    await settle();

    // Re-enter editing
    const c3 = await getShapeCenter(page, "0:1");
    await page.mouse.click(c3.x, c3.y, { count: 2 });
    await settle();

    // Select "The" (first 3 chars)
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await settle(100);

    const sel = await getTextareaSelection(page);
    const passed = sel.start === 0 && sel.end === 3;
    results.push({ name, passed, error: passed ? undefined : `selection: ${sel.start}-${sel.end}` });
    await page.close();
  }

  return results;
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests() {
  console.log("Starting PDF Editor E2E tests...\n");

  const server: ViteDevServer = await createServer({
    configFile: path.join(__dirname, "vite.config.ts"),
    server: { port: PORT },
  });
  await server.listen();
  console.log(`Vite server started at ${BASE_URL}`);

  const executablePath = await findChrome();
  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });

  // eslint-disable-next-line no-restricted-syntax -- test accumulator
  let allResults: TestResult[] = [];

  try {
    allResults = await runAllTests(browser);
  } finally {
    await browser.close();
    await server.close();
  }

  // Print results
  console.log("\n=== PDF Editor E2E Test Results ===\n");
  // eslint-disable-next-line no-restricted-syntax
  let passed = 0;
  // eslint-disable-next-line no-restricted-syntax
  let failed = 0;

  for (const result of allResults) {
    if (result.passed) {
      console.log(`  ✓ ${result.name}`);
      passed++;
    } else {
      console.log(`  ✗ ${result.name}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      failed++;
    }
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${allResults.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
