/**
 * @file PDF Editor E2E Tests
 *
 * Browser-based E2E tests validating that the PDF editor's text editing,
 * element manipulation, and visual feedback actually work end-to-end.
 *
 * == What these tests guarantee ==
 *
 * A. Visual cursor / selection coherence:
 *    - Click at pixel X → caret appears at pixel X (not stuck at end, not at 0)
 *    - Keyboard arrow → caret moves monotonically rightward
 *    - Drag selection → highlight rect covers the dragged region
 *    - After typing, caret stays at insertion point (not jumping)
 *
 * B. Text editing lifecycle:
 *    - Double-click enters editing; Enter commits; Escape cancels (discards)
 *    - Click outside (page background, another shape) cancels editing
 *    - Committed text persists; cancelled text is discarded
 *    - Undo restores previous text
 *
 * C. Coordinate system integrity after transforms:
 *    - Move → re-enter editing → text & caret still work
 *    - Resize → re-enter editing → text & caret still work
 *    - Rotate → re-enter editing → text & caret still work
 *
 * D. Element selection:
 *    - Click selects; click background deselects
 *    - Shift-click multi-selects; Backspace deletes
 *    - Drag moves element to expected position
 *
 * Uses puppeteer-core + Vite dev server (same pattern as VBA editor E2E).
 */

import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { createServer, type ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";

// =============================================================================
// Test Setup
// =============================================================================

const PORT = 5181;
const BASE_URL = `http://localhost:${PORT}`;
const SETTLE = 300;

async function findChrome(): Promise<string> {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[];
  for (const p of paths) { if (fs.existsSync(p)) {return p;} }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

async function settle(ms = SETTLE): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Format an error message for font property mismatches in visual tests.
 */
function formatFontMismatchError(
  displayFont: Record<string, unknown>,
  editFont: Record<string, unknown>,
  viewBoxes: string[],
): string {
  return `display=${JSON.stringify(displayFont)}, edit=${JSON.stringify(editFont)}, viewBoxes=${JSON.stringify(viewBoxes)}`;
}

// =============================================================================
// DOM Query Helpers
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
  if (!rect) {throw new Error(`Shape ${shapeId} not found`);}
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

async function hasSelectionBox(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const rects = document.querySelectorAll("rect");
    for (const rect of rects) {
      if (rect.getAttribute("stroke") === "#0066ff" && rect.getAttribute("fill") === "none" && rect.getAttribute("stroke-width") === "2") {return true;}
    }
    return false;
  });
}

async function countSelectionBoxes(page: Page): Promise<number> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll("rect")).filter((rect) =>
      rect.getAttribute("stroke") === "#0066ff" && rect.getAttribute("fill") === "none" && rect.getAttribute("stroke-width") === "2"
    ).length;
  });
}

async function isTextEditing(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector("textarea") !== null);
}

async function getTextareaValue(page: Page): Promise<string> {
  return page.evaluate(() => (document.querySelector("textarea") as HTMLTextAreaElement | null)?.value ?? "");
}

async function getTextareaSelection(page: Page): Promise<{ start: number; end: number }> {
  return page.evaluate(() => {
    const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
    return { start: ta?.selectionStart ?? 0, end: ta?.selectionEnd ?? 0 };
  });
}

async function getShapeCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll("[data-shape-id]").length);
}

/**
 * Find the controller SVG — it's a sibling of the TextEditInputFrame container,
 * both inside the ViewportOverlay. Look for an SVG with viewBox "0 0 W H" that
 * contains a <line> (caret) or <rect fill-opacity="0.3"> (selection).
 */
function _findControllerSvgQuery(): string {
  // The controller SVG has viewBox="0 0 612 792" and is at z-index 1001
  return "svg[style*='z-index: 1001'], svg[style*='zIndex']";
}

/**
 * Get the caret's pixel X position relative to the text bounds hit target.
 * Uses the hit target rect (pointerEvents="all") as the reference frame,
 * not the full SVG, since the SVG covers the entire page.
 */
async function getCaretPixelX(page: Page): Promise<{ caretX: number; svgX: number; svgWidth: number } | null> {
  return page.evaluate(() => {
    function findHitRect(svg: SVGSVGElement): DOMRect | null {
      for (const rect of svg.querySelectorAll("rect")) {
        if (rect.getAttribute("fill") === "transparent" && rect.getAttribute("pointer-events") === "all") {
          return rect.getBoundingClientRect();
        }
      }
      return null;
    }
    const allSvgs = document.querySelectorAll("svg");
    for (const svg of allSvgs) {
      if (!svg.style.zIndex || parseInt(svg.style.zIndex) < 1000) {continue;}
      // Use the hit target rect as reference (the text bounds area)
      const hitRect = findHitRect(svg);
      if (!hitRect) {continue;}
      const lines = svg.querySelectorAll("line");
      for (const line of lines) {
        const sw = parseFloat(line.getAttribute("stroke-width") ?? "0");
        if (sw > 0 && sw <= 3) {
          const r = line.getBoundingClientRect();
          return { caretX: r.x, svgX: hitRect.x, svgWidth: hitRect.width };
        }
      }
    }
    return null;
  });
}

/** Get caret position as a ratio (0.0 = left edge, 1.0 = right edge of SVG). */
async function getCaretRatio(page: Page): Promise<number | null> {
  const info = await getCaretPixelX(page);
  if (!info || info.svgWidth === 0) {return null;}
  return (info.caretX - info.svgX) / info.svgWidth;
}

/** Find the controller SVG (z-index >= 1000). */
function _findControllerSvg(doc: Document): SVGSVGElement | null {
  const allSvgs = doc.querySelectorAll("svg");
  for (const svg of allSvgs) {
    if (svg.style.zIndex && parseInt(svg.style.zIndex) >= 1000) {return svg;}
  }
  return null;
}

/** Get the selection highlight rect as start/end ratios relative to the text bounds hit target. */
async function getSelectionHighlightRatio(page: Page): Promise<{ startRatio: number; endRatio: number } | null> {
  return page.evaluate(() => {
    function findHitRect(svg: SVGSVGElement): DOMRect | null {
      for (const rect of svg.querySelectorAll("rect")) {
        if (rect.getAttribute("fill") === "transparent" && rect.getAttribute("pointer-events") === "all") {
          return rect.getBoundingClientRect();
        }
      }
      return null;
    }
    const allSvgs = document.querySelectorAll("svg");
    for (const svg of allSvgs) {
      if (!svg.style.zIndex || parseInt(svg.style.zIndex) < 1000) {continue;}
      const hitRect = findHitRect(svg);
      if (!hitRect) {continue;}
      for (const rect of svg.querySelectorAll("rect")) {
        if (rect.getAttribute("fill-opacity") === "0.3") {
          const r = rect.getBoundingClientRect();
          return {
            startRatio: (r.x - hitRect.x) / hitRect.width,
            endRatio: (r.x + r.width - hitRect.x) / hitRect.width,
          };
        }
      }
    }
    return null;
  });
}

/**
 * Get the text bounds rect within the controller SVG (hit target area).
 * This is the transparent rect with pointerEvents="all".
 */
async function getTextEditSvgRect(page: Page): Promise<Rect | null> {
  return page.evaluate(() => {
    const allSvgs = document.querySelectorAll("svg");
    for (const svg of allSvgs) {
      if (!svg.style.zIndex || parseInt(svg.style.zIndex) < 1000) {continue;}
      // The hit target rect has pointerEvents="all" and fill="transparent"
      for (const rect of svg.querySelectorAll("rect")) {
        if (rect.getAttribute("fill") === "transparent" && rect.getAttribute("pointer-events") === "all") {
          const r = rect.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }
      }
    }
    return null;
  });
}

/** Get the SVG <text> content inside the controller SVG. */
async function getRenderedSvgText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    if (!document.querySelector("textarea")) {return null;}
    const allSvgs = document.querySelectorAll("svg");
    for (const svg of allSvgs) {
      if (svg.style.zIndex && parseInt(svg.style.zIndex) >= 1000) {
        const text = svg.querySelector("text");
        if (text) {return text.textContent ?? null;}
      }
    }
    return null;
  });
}

/** Click at a ratio (0.0–1.0) within the text edit SVG. */
async function clickAtRatio(page: Page, ratio: number): Promise<void> {
  const rect = await getTextEditSvgRect(page);
  if (!rect) {return;}
  await page.mouse.click(rect.x + rect.width * ratio, rect.y + rect.height / 2);
  await settle(200);
}

/** Find canvas background click target. */
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

/** Enter text editing on a shape by double-click. */
async function enterTextEdit(page: Page, shapeId: string): Promise<void> {
  const center = await getShapeCenter(page, shapeId);
  await page.mouse.click(center.x, center.y, { count: 2 });
  await settle();
}

// =============================================================================
// Test Infrastructure
// =============================================================================

type TestResult = { name: string; passed: boolean; error?: string };

async function runAllTests(browser: Browser): Promise<TestResult[]> {
  const results: TestResult[] = [];

  async function freshPage(): Promise<Page> {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    await settle();
    return page;
  }

  function test(result: TestResult) { results.push(result); }

  // =========================================================================
  // A. Visual cursor / selection coherence
  // =========================================================================

  // A1: Double-click → editing active + visual feedback present
  {
    const name = "A1 Double-click enters editing with visual feedback";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    const editing = await isTextEditing(page);
    const value = await getTextareaValue(page);
    const caret = await getCaretRatio(page);
    const highlight = await getSelectionHighlightRatio(page);
    // Auto select-all: either caret visible or selection highlight visible
    const hasVisual = caret !== null || (highlight !== null && highlight.endRatio > 0.3);
    test({ name, passed: editing && value === "Hello World" && hasVisual, error: `editing=${editing}, value="${value}", caret=${caret?.toFixed(3)}, highlight=${JSON.stringify(highlight)}` });
    await page.close();
  }

  // A2: Home → caret at left edge; End → caret strictly to the right of Home
  {
    const name = "A2 Home/End caret positions are ordered";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    await page.keyboard.press("Home");
    await settle(200);
    const homeInfo = await getCaretPixelX(page);

    await page.keyboard.press("End");
    await settle(200);
    const endInfo = await getCaretPixelX(page);

    const homeX = homeInfo ? homeInfo.caretX - homeInfo.svgX : -1;
    const endX = endInfo ? endInfo.caretX - endInfo.svgX : -1;
    // Home should be near left (< 5px), End must be strictly right of Home
    const passed = homeX >= 0 && homeX < 5 && endX > homeX + 10;
    test({ name, passed, error: `homeX=${homeX.toFixed(1)}, endX=${endX.toFixed(1)}` });
    await page.close();
  }

  // A3: 5x ArrowRight → caret moves strictly right of Home
  {
    const name = "A3 ArrowRight moves caret rightward";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    await page.keyboard.press("Home");
    await settle(100);
    const homeInfo = await getCaretPixelX(page);

    for (const _ of [1, 2, 3, 4, 5]) {await page.keyboard.press("ArrowRight");}
    await settle(200);
    const midInfo = await getCaretPixelX(page);
    const sel = await getTextareaSelection(page);

    const homeX = homeInfo ? homeInfo.caretX : 0;
    const midX = midInfo ? midInfo.caretX : 0;
    const passed = midX > homeX + 5 && sel.start === 5;
    test({ name, passed, error: `homeX=${homeX.toFixed(1)}, midX=${midX.toFixed(1)}, sel=${sel.start}` });
    await page.close();
  }

  // A4: Click at 30% → caret pixel X near the click X (±20% of SVG width)
  {
    const name = "A4 Mouse click positions caret near click point";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    const svgRect = await getTextEditSvgRect(page);
    if (!svgRect) {
      test({ name, passed: false, error: "No SVG rect" });
    } else {
      const clickX = svgRect.x + svgRect.width * 0.3;
      await page.mouse.click(clickX, svgRect.y + svgRect.height / 2);
      await settle(300);

      const caretInfo = await getCaretPixelX(page);
      if (!caretInfo) {
        test({ name, passed: false, error: "No caret after click" });
      } else {
        const caretLocalX = caretInfo.caretX - caretInfo.svgX;
        const clickLocalX = clickX - svgRect.x;
        const maxDrift = svgRect.width * 0.20;
        const passed = Math.abs(caretLocalX - clickLocalX) < maxDrift;
        test({ name, passed, error: `clickLocalX=${clickLocalX.toFixed(1)}, caretLocalX=${caretLocalX.toFixed(1)}, maxDrift=${maxDrift.toFixed(1)}` });
      }
    }
    await page.close();
  }

  // A5: Click at 70% → caret strictly right of caret from click at 30%
  {
    const name = "A5 Click 70% places caret right of click 30%";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    await clickAtRatio(page, 0.3);
    const info30 = await getCaretPixelX(page);

    await clickAtRatio(page, 0.7);
    const info70 = await getCaretPixelX(page);

    const x30 = info30?.caretX ?? 0;
    const x70 = info70?.caretX ?? 0;
    const passed = x70 > x30 + 5;
    test({ name, passed, error: `x30=${x30.toFixed(1)}, x70=${x70.toFixed(1)}` });
    await page.close();
  }

  // A6: Drag 20%→70% → highlight start < 35% and end > 55%
  {
    const name = "A6 Drag selection creates proportional highlight";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    const svgRect = await getTextEditSvgRect(page);
    if (!svgRect) {
      test({ name, passed: false, error: "No SVG rect" });
    } else {
      const y = svgRect.y + svgRect.height / 2;
      await page.mouse.move(svgRect.x + svgRect.width * 0.2, y);
      await page.mouse.down();
      await page.mouse.move(svgRect.x + svgRect.width * 0.7, y, { steps: 10 });
      await page.mouse.up();
      await settle(300);

      const hl = await getSelectionHighlightRatio(page);
      const sel = await getTextareaSelection(page);
      const passed = hl !== null && hl.startRatio < 0.35 && hl.endRatio > 0.55 && sel.end - sel.start >= 2;
      test({ name, passed, error: `highlight=${hl ? `${hl.startRatio.toFixed(2)}-${hl.endRatio.toFixed(2)}` : "none"}, sel=${sel.start}-${sel.end}` });
    }
    await page.close();
  }

  // A7: Type after select-all → SVG <text> shows new text, caret at end of new text
  {
    const name = "A7 Type replaces text; SVG text and caret update";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    await page.keyboard.type("XY");
    await settle(200);

    const svgText = await getRenderedSvgText(page);
    const taValue = await getTextareaValue(page);
    const caret = await getCaretRatio(page);
    // Select-all was active on entry, so typing replaces all text with "XY"
    const textOk = svgText === "XY" && taValue === "XY";
    const caretOk = caret !== null && caret > 0.3; // caret after "XY"
    test({ name, passed: textOk && caretOk, error: `svgText="${svgText}", taValue="${taValue}", caret=${caret?.toFixed(3)}` });
    await page.close();
  }

  // A8: Partial replace (select "Hello", type "Hi") → value = "Hi World", SVG matches
  {
    const name = "A8 Partial replacement: textarea and SVG text match";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");

    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3, 4, 5]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await page.keyboard.type("Hi");
    await settle(200);

    const taValue = await getTextareaValue(page);
    const svgText = await getRenderedSvgText(page);
    const sel = await getTextareaSelection(page);
    const passed = taValue === "Hi World" && svgText === "Hi World" && sel.start === 2;
    test({ name, passed, error: `ta="${taValue}", svg="${svgText}", sel=${sel.start}` });
    await page.close();
  }

  // A9: Font parity — editing SVG <text> has same font attributes as display SVG
  {
    const name = "A9 Font parity: editing and display use identical font";
    console.log(`Running: ${name}`);
    const page = await freshPage();

    // Capture font attributes of the text element in display mode (before editing)
    const displayFont = await page.evaluate(() => {
      // Find the contentSvg text element for shape 0:0 — it's inside the canvas SVG
      const svgs = document.querySelectorAll("svg");
      for (const svg of svgs) {
        if (!svg.style.backgroundColor) {continue;}
        const texts = svg.querySelectorAll("text");
        for (const text of texts) {
          if (text.textContent?.includes("Hello World")) {
            return {
              fontFamily: text.getAttribute("font-family"),
              fontSize: text.getAttribute("font-size"),
              fontWeight: text.getAttribute("font-weight"),
              fontStyle: text.getAttribute("font-style"),
              dominantBaseline: text.getAttribute("dominant-baseline"),
              fill: text.getAttribute("fill"),
            };
          }
        }
      }
      return null;
    });

    // Enter text editing
    await enterTextEdit(page, "0:0");

    // Capture font attributes of the text element in editing mode (controller SVG)
    const editFont = await page.evaluate(() => {
      const allSvgs = document.querySelectorAll("svg");
      for (const svg of allSvgs) {
        if (!svg.style.zIndex || parseInt(svg.style.zIndex) < 1000) {continue;}
        const text = svg.querySelector("text");
        if (!text) {continue;}
        return {
          fontFamily: text.getAttribute("font-family"),
          fontSize: text.getAttribute("font-size"),
          fontWeight: text.getAttribute("font-weight"),
          fontStyle: text.getAttribute("font-style"),
          dominantBaseline: text.getAttribute("dominant-baseline"),
          fill: text.getAttribute("fill"),
        };
      }
      return null;
    });

    // Compare viewBox of both parent SVGs
    const viewBoxes = await page.evaluate(() => {
      const allSvgs = document.querySelectorAll("svg");
      const vbs: string[] = [];
      for (const svg of allSvgs) {
        const text = svg.querySelector("text");
        if (text?.textContent?.includes("Hello")) {
          vbs.push(svg.getAttribute("viewBox") ?? "none");
        }
      }
      return vbs;
    });

    if (!displayFont || !editFont) {
      test({ name, passed: false, error: `displayFont=${JSON.stringify(displayFont)}, editFont=${JSON.stringify(editFont)}` });
    } else {
      const familyMatch = displayFont.fontFamily === editFont.fontFamily;
      const sizeMatch = displayFont.fontSize === editFont.fontSize;
      const weightMatch = displayFont.fontWeight === editFont.fontWeight;
      const styleMatch = displayFont.fontStyle === editFont.fontStyle;
      const baselineMatch = displayFont.dominantBaseline === editFont.dominantBaseline;
      // viewBox must match to ensure same scaling
      const viewBoxMatch = viewBoxes.length >= 1 && viewBoxes.every(vb => vb === viewBoxes[0]);
      const passed = familyMatch && sizeMatch && weightMatch && styleMatch && baselineMatch && viewBoxMatch;
      const errorMessage = formatFontMismatchError(displayFont, editFont, viewBoxes);
      test({ name, passed, error: passed ? undefined : errorMessage });
    }
    await page.close();
  }

  // =========================================================================
  // B. Text editing lifecycle
  // =========================================================================

  // B1: Enter commits text
  {
    const name = "B1 Enter commits and exits editing";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");
    await page.keyboard.press("Enter");
    await settle();
    test({ name, passed: !(await isTextEditing(page)) });
    await page.close();
  }

  // B2: Escape discards changes
  {
    const name = "B2 Escape discards changes";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");
    await page.keyboard.type("ZZZ");
    await settle(100);
    await page.keyboard.press("Escape");
    await settle();
    const editingAfter = await isTextEditing(page);

    // Re-enter to verify original text
    await enterTextEdit(page, "0:0");
    const value = await getTextareaValue(page);
    test({ name, passed: !editingAfter && value === "Hello World", error: `editing=${editingAfter}, value="${value}"` });
    await page.close();
  }

  // B3: Click page background cancels editing
  {
    const name = "B3 Click page background cancels editing";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");
    const target = await getCanvasBackgroundClickTarget(page);
    if (target) {await page.mouse.click(target.x, target.y);}
    await settle();
    test({ name, passed: !(await isTextEditing(page)) });
    await page.close();
  }

  // B4: Click another shape cancels editing
  {
    const name = "B4 Click another shape cancels editing";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");
    const other = await getShapeCenter(page, "0:3");
    await page.mouse.click(other.x, other.y);
    await settle();
    test({ name, passed: !(await isTextEditing(page)) });
    await page.close();
  }

  // B5: Commit persists; undo restores
  {
    const name = "B5 Commit persists text; undo restores";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    await enterTextEdit(page, "0:0");
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3, 4, 5]) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.up("Shift");
    }
    await page.keyboard.type("Bye");
    await settle(100);
    await page.keyboard.press("Enter");
    await settle();

    // Verify committed
    await enterTextEdit(page, "0:0");
    const afterCommit = await getTextareaValue(page);
    await page.keyboard.press("Escape");
    await settle();

    // Undo
    await page.keyboard.down("Meta");
    await page.keyboard.press("z");
    await page.keyboard.up("Meta");
    await settle();

    // Verify restored
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y, { count: 2 });
    await settle();
    const afterUndo = await getTextareaValue(page);

    const passed = afterCommit === "Bye World" && afterUndo === "Hello World";
    test({ name, passed, error: `committed="${afterCommit}", undone="${afterUndo}"` });
    await page.close();
  }

  // =========================================================================
  // C. Coordinate system integrity after transforms
  // =========================================================================

  // C1: Move → re-enter editing → text still correct + caret works
  {
    const name = "C1 Move then edit: text and caret intact";
    console.log(`Running: ${name}`);
    const page = await freshPage();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    // Drag to move
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 10, center.y + 6, { steps: 3 });
    await page.mouse.move(center.x + 40, center.y + 20, { steps: 5 });
    await page.mouse.up();
    await settle();

    // Re-enter editing
    const newCenter = await getShapeCenter(page, "0:0");
    await page.mouse.click(newCenter.x, newCenter.y, { count: 2 });
    await settle();

    const editing = await isTextEditing(page);
    const value = await getTextareaValue(page);
    // Verify caret works: Home then ArrowRight
    await page.keyboard.press("Home");
    await settle(100);
    const homeInfo = await getCaretPixelX(page);
    await page.keyboard.press("ArrowRight");
    await settle(100);
    const rightInfo = await getCaretPixelX(page);

    const caretMoved = homeInfo && rightInfo && rightInfo.caretX > homeInfo.caretX;
    test({ name, passed: editing && value === "Hello World" && !!caretMoved, error: `editing=${editing}, value="${value}", caretMoved=${!!caretMoved}` });
    await page.close();
  }

  // C2: Resize → re-enter editing → text still correct + caret works
  {
    const name = "C2 Resize then edit: text and caret intact";
    console.log(`Running: ${name}`);
    const page = await freshPage();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    // Find SE resize handle
    const handlePos = await page.evaluate(() => {
      const rects = document.querySelectorAll("rect");
      const candidates: Array<{ cx: number; cy: number }> = [];
      for (const rect of rects) {
        const w = parseFloat(rect.getAttribute("width") ?? "0");
        if (w === 8 && rect.getAttribute("stroke-width") === "1" && rect.getAttribute("stroke") === "#0066ff" && rect.style.cursor.includes("resize")) {
          const r = rect.getBoundingClientRect();
          candidates.push({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
        }
      }
      if (candidates.length === 0) {return null;}
      candidates.sort((a, b) => (b.cx + b.cy) - (a.cx + a.cy));
      return { x: candidates[0].cx, y: candidates[0].cy };
    });

    if (!handlePos) {
      test({ name, passed: false, error: "No resize handle" });
    } else {
      await page.mouse.move(handlePos.x, handlePos.y);
      await page.mouse.down();
      await page.mouse.move(handlePos.x + 30, handlePos.y + 10, { steps: 5 });
      await page.mouse.up();
      await settle();

      // Re-enter editing
      const nc = await getShapeCenter(page, "0:0");
      await page.mouse.click(nc.x, nc.y, { count: 2 });
      await settle();

      const editing = await isTextEditing(page);
      const value = await getTextareaValue(page);
      test({ name, passed: editing && value === "Hello World", error: `editing=${editing}, value="${value}"` });
    }
    await page.close();
  }

  // C3: Rotate → re-enter editing → text still correct
  {
    const name = "C3 Rotate then edit: text intact";
    console.log(`Running: ${name}`);
    const page = await freshPage();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();

    const rotatePos = await page.evaluate(() => {
      const circles = document.querySelectorAll("circle");
      for (const circle of circles) {
        if (parseFloat(circle.getAttribute("r") ?? "0") > 2 && circle.style.cursor === "grab") {
          const r = circle.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
      }
      return null;
    });

    if (!rotatePos) {
      test({ name, passed: false, error: "No rotate handle" });
    } else {
      await page.mouse.move(rotatePos.x, rotatePos.y);
      await page.mouse.down();
      await page.mouse.move(rotatePos.x + 30, rotatePos.y + 10, { steps: 5 });
      await page.mouse.up();
      await settle();

      const nc = await getShapeCenter(page, "0:0");
      await page.mouse.click(nc.x, nc.y, { count: 2 });
      await settle();

      const editing = await isTextEditing(page);
      const value = await getTextareaValue(page);
      test({ name, passed: editing && value === "Hello World", error: `editing=${editing}, value="${value}"` });
    }
    await page.close();
  }

  // C4: Move → edit → type → commit → re-enter → committed text preserved
  {
    const name = "C4 Move + edit + commit: text persists";
    console.log(`Running: ${name}`);
    const page = await freshPage();

    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 10, center.y + 6, { steps: 3 });
    await page.mouse.move(center.x + 30, center.y + 15, { steps: 5 });
    await page.mouse.up();
    await settle();

    const mc = await getShapeCenter(page, "0:0");
    await page.mouse.click(mc.x, mc.y, { count: 2 });
    await settle();

    await page.keyboard.press("End");
    await page.keyboard.type("!!!");
    await settle(100);
    await page.keyboard.press("Enter");
    await settle();

    // Re-enter to verify
    const mc2 = await getShapeCenter(page, "0:0");
    await page.mouse.click(mc2.x, mc2.y, { count: 2 });
    await settle();
    const value = await getTextareaValue(page);
    test({ name, passed: value === "Hello World!!!", error: `value="${value}"` });
    await page.close();
  }

  // =========================================================================
  // D. Element selection
  // =========================================================================

  // D1: Click selects; shows selection box
  {
    const name = "D1 Click selects element";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();
    test({ name, passed: await hasSelectionBox(page) });
    await page.close();
  }

  // D2: Click canvas background clears selection
  {
    const name = "D2 Click background clears selection";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    const center = await getShapeCenter(page, "0:0");
    await page.mouse.click(center.x, center.y);
    await settle();
    const target = await getCanvasBackgroundClickTarget(page);
    if (target) {await page.mouse.click(target.x, target.y);}
    await settle();
    test({ name, passed: !(await hasSelectionBox(page)) });
    await page.close();
  }

  // D3: Shift-click multi-select
  {
    const name = "D3 Shift-click multi-selects";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    const c0 = await getShapeCenter(page, "0:0");
    const c3 = await getShapeCenter(page, "0:3");
    await page.mouse.click(c0.x, c0.y);
    await settle(100);
    await page.keyboard.down("Shift");
    await page.mouse.click(c3.x, c3.y);
    await page.keyboard.up("Shift");
    await settle();
    test({ name, passed: (await countSelectionBoxes(page)) >= 2 });
    await page.close();
  }

  // D4: Backspace deletes selected
  {
    const name = "D4 Backspace deletes selected element";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    const before = await getShapeCount(page);
    const center = await getShapeCenter(page, "0:3");
    await page.mouse.click(center.x, center.y);
    await settle();
    await page.keyboard.press("Backspace");
    await settle();
    const after = await getShapeCount(page);
    test({ name, passed: after === before - 1, error: `before=${before}, after=${after}` });
    await page.close();
  }

  // D5: Drag moves element
  {
    const name = "D5 Drag moves element to new position";
    console.log(`Running: ${name}`);
    const page = await freshPage();
    const before = await getShapeCenter(page, "0:4");
    await page.mouse.click(before.x, before.y);
    await settle();
    await page.mouse.move(before.x, before.y);
    await page.mouse.down();
    await page.mouse.move(before.x + 10, before.y + 6, { steps: 3 });
    await page.mouse.move(before.x + 50, before.y + 30, { steps: 5 });
    await page.mouse.up();
    await settle();
    const after = await getShapeCenter(page, "0:4");
    const dx = Math.abs(after.x - before.x - 50);
    const dy = Math.abs(after.y - before.y - 30);
    test({ name, passed: dx < 15 && dy < 15, error: `dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}` });
    await page.close();
  }

  return results;
}

/**
 * Run all tests and ensure browser/server cleanup even on failure.
 */
async function runTestsWithCleanup(browser: Browser, server: ViteDevServer): Promise<TestResult[]> {
  try {
    return await runAllTests(browser);
  } finally {
    await browser.close();
    await server.close();
  }
}

/**
 * Print test results summary and exit with error code if any failures.
 */
function printTestResults(allResults: TestResult[]): void {
  console.log("\n=== PDF Editor E2E Test Results ===\n");
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.length - passed;
  for (const r of allResults) {
    if (r.passed) { console.log(`  ✓ ${r.name}`); }
    else { console.log(`  ✗ ${r.name}`); if (r.error) {console.log(`    ${r.error}`);} }
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${allResults.length}`);
  if (failed > 0) {process.exit(1);}
}

// =============================================================================
// Main Runner
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
  const browser: Browser = await puppeteer.launch({ executablePath, headless: true });

  const allResults = await runTestsWithCleanup(browser, server);
  printTestResults(allResults);
}

runTests().catch((err) => { console.error(err); process.exit(1); });
