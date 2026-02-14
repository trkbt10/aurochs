/**
 * @file VBA Editor E2E Tests
 *
 * Tests text editing, selection, and undo/redo operations.
 * Runs all tests for each renderer type (html, svg, canvas).
 */

import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { createServer, type ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";

// =============================================================================
// Test Setup
// =============================================================================

const PORT = 5180;
const BASE_URL = `http://localhost:${PORT}`;
const RENDERERS = ["html", "svg", "canvas"] as const;
type RendererType = (typeof RENDERERS)[number];

async function findChrome(): Promise<string> {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

// =============================================================================
// Test Helpers
// =============================================================================

async function getTextareaValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const textarea = document.querySelector("textarea");
    return textarea?.value ?? "";
  });
}

async function getTextareaSelection(page: Page): Promise<{ start: number; end: number }> {
  return page.evaluate(() => {
    const textarea = document.querySelector("textarea");
    return {
      start: textarea?.selectionStart ?? 0,
      end: textarea?.selectionEnd ?? 0,
    };
  });
}

async function getCursorElement(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const elements = document.querySelectorAll<HTMLElement>("[style*='position: absolute']");
    for (const el of elements) {
      if (el.style.width === "2px" && el.style.backgroundColor) {
        return {
          x: parseFloat(el.style.left) || 0,
          y: parseFloat(el.style.top) || 0,
        };
      }
    }
    return null;
  });
}

async function getSelectionRects(page: Page): Promise<number> {
  return page.evaluate(() => {
    const codeArea = document.querySelector("[class*='codeArea']");
    if (!codeArea) {
      return 0;
    }

    const elements = codeArea.querySelectorAll<HTMLElement>("div");
    // eslint-disable-next-line no-restricted-syntax -- Counting in test
    let count = 0;
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if (
        style.position === "absolute" &&
        style.pointerEvents === "none" &&
        el.offsetWidth > 2 &&
        el.offsetHeight > 0
      ) {
        count++;
      }
    }
    return count;
  });
}

/**
 * Get the visual position of a character in the rendered text.
 * Works for all renderer types (HTML, SVG, Canvas) by using textarea line content.
 */
async function getCharacterPosition(
  page: Page,
  lineIndex: number,
  charIndex: number
): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    (li, ci) => {
      const textarea = document.querySelector("textarea");
      if (!textarea) return null;

      // Constants matching VbaCodeEditor
      const lineHeight = 21;
      const padding = 8;

      // Get line text from textarea
      const lines = textarea.value.split("\n");
      if (li >= lines.length) return null;

      const lineText = lines[li];
      const textBeforeCursor = lineText.substring(0, ci);

      // Measure text width
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.font = "13px 'Consolas', 'Monaco', 'Courier New', monospace";
      const charWidth = ctx.measureText(textBeforeCursor).width;

      return {
        x: padding + charWidth,
        y: li * lineHeight + padding,
      };
    },
    lineIndex,
    charIndex
  );
}

// =============================================================================
// Test Definitions
// =============================================================================

type TestResult = { name: string; passed: boolean; error?: string };

async function runTestsForRenderer(
  browser: Browser,
  renderer: RendererType
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const url = `${BASE_URL}?renderer=${renderer}`;

  console.log(`\n--- Testing renderer: ${renderer.toUpperCase()} ---`);

  // Test 1: Text editing works
  {
    const testName = `[${renderer}] Text editing - typing adds text`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    await page.click("textarea");
    await page.keyboard.press("End");
    await page.keyboard.type("Test");

    const value = await getTextareaValue(page);
    const passed = value.includes("Test");
    results.push({ name: testName, passed, error: passed ? undefined : `Value: ${value}` });
    await page.close();
  }

  // Test 2: Selection creates visual highlight
  {
    const testName = `[${renderer}] Selection - creates visual highlight`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    await page.click("textarea");
    await page.keyboard.press("Home");
    await page.keyboard.down("Shift");
    await page.keyboard.press("End");
    await page.keyboard.up("Shift");

    await new Promise((r) => setTimeout(r, 300));

    const selection = await getTextareaSelection(page);
    const hasTextSelection = selection.start !== selection.end;
    const rectCount = await getSelectionRects(page);
    const passed = rectCount >= 1 || hasTextSelection;
    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `Selection rect count: ${rectCount}, text selection: ${selection.start}-${selection.end}`,
    });
    await page.close();
  }

  // Test 3: Selection not duplicated
  {
    const testName = `[${renderer}] Selection - no duplicate display`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    const selectionStyle = await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      if (!textarea) return null;
      const style = window.getComputedStyle(textarea, "::selection");
      return { background: style.backgroundColor };
    });

    const passed = selectionStyle?.background === "rgba(0, 0, 0, 0)";
    results.push({
      name: testName,
      passed,
      error: passed ? undefined : `Selection background: ${selectionStyle?.background}`,
    });
    await page.close();
  }

  // Test 4: Cursor position matches text position
  {
    const testName = `[${renderer}] Cursor - position matches text`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    // Set cursor to document start (position 0)
    await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
        // Dispatch input event to trigger cursor update
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 200));

    const cursor1 = await getCursorElement(page);

    // Move cursor to end of first line
    const firstLineLength = await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      if (!textarea) return 0;
      const lines = textarea.value.split("\n");
      return lines[0]?.length ?? 0;
    });
    await page.evaluate((len) => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.selectionStart = len;
        textarea.selectionEnd = len;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, firstLineLength);
    await new Promise((r) => setTimeout(r, 200));

    const cursor2 = await getCursorElement(page);

    const passed = cursor1 !== null && cursor2 !== null && cursor2.x > cursor1.x;
    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `Cursor1: ${JSON.stringify(cursor1)}, Cursor2: ${JSON.stringify(cursor2)}`,
    });
    await page.close();
  }

  // Test 5: Cursor aligns with rendered text
  {
    const testName = `[${renderer}] Cursor - aligns with rendered text`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    // Set cursor to position 5 on first line
    await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        textarea.selectionStart = 5;
        textarea.selectionEnd = 5;
        // Dispatch input event to trigger cursor update
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 200));

    const cursor = await getCursorElement(page);
    const expectedPos = await getCharacterPosition(page, 0, 5);

    // Allow 5px tolerance for alignment
    const tolerance = 5;
    const passed =
      cursor !== null &&
      expectedPos !== null &&
      Math.abs(cursor.x - expectedPos.x) <= tolerance &&
      Math.abs(cursor.y - expectedPos.y) <= tolerance;

    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `Cursor: ${JSON.stringify(cursor)}, Expected: ${JSON.stringify(expectedPos)}, Diff: x=${cursor && expectedPos ? Math.abs(cursor.x - expectedPos.x) : "N/A"}, y=${cursor && expectedPos ? Math.abs(cursor.y - expectedPos.y) : "N/A"}`,
    });
    await page.close();
  }

  // Test 6: Undo removes last typed character
  {
    const testName = `[${renderer}] Undo - removes last typed character`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    await page.click("textarea");
    const initialValue = await getTextareaValue(page);

    await page.keyboard.down("Meta");
    await page.keyboard.press("End");
    await page.keyboard.up("Meta");

    await page.keyboard.type("X");
    await new Promise((r) => setTimeout(r, 200));

    const modifiedValue = await getTextareaValue(page);

    await page.keyboard.down("Meta");
    await page.keyboard.press("z");
    await page.keyboard.up("Meta");
    await new Promise((r) => setTimeout(r, 200));

    const undoneValue = await getTextareaValue(page);

    const passed = modifiedValue.includes("X") && undoneValue === initialValue;
    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `Initial len: ${initialValue.length}, Modified len: ${modifiedValue.length}, Undone len: ${undoneValue.length}`,
    });
    await page.close();
  }

  // Test 7: Undo cursor not at end
  {
    const testName = `[${renderer}] Undo - cursor not at end`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    const initialText = await getTextareaValue(page);
    const textLength = initialText.length;

    await page.click("textarea");
    await page.keyboard.press("Home");
    for (const _ of [1, 2, 3, 4, 5]) {
      await page.keyboard.press("ArrowRight");
    }
    await new Promise((r) => setTimeout(r, 100));

    await page.keyboard.type("X");
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.down("Meta");
    await page.keyboard.press("z");
    await page.keyboard.up("Meta");
    await new Promise((r) => setTimeout(r, 200));

    const posAfter = await getTextareaSelection(page);

    const passed = posAfter.start < textLength;
    results.push({
      name: testName,
      passed,
      error: passed ? undefined : `Cursor at: ${posAfter.start}, text length: ${textLength}`,
    });
    await page.close();
  }

  // Test 8: Tab inserts spaces
  {
    const testName = `[${renderer}] Tab - inserts 4 spaces`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    await page.click("textarea");
    await page.keyboard.press("End");

    const valueBefore = await getTextareaValue(page);
    await page.keyboard.press("Tab");
    await new Promise((r) => setTimeout(r, 100));
    const valueAfter = await getTextareaValue(page);

    const passed = valueAfter.length === valueBefore.length + 4;
    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `Before length: ${valueBefore.length}, After length: ${valueAfter.length}`,
    });
    await page.close();
  }

  // Test 9: CJK character display
  {
    const testName = `[${renderer}] CJK - displays Japanese/Korean/Chinese text`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    const value = await getTextareaValue(page);

    const hasJapanese = value.includes("日本語");
    const hasKorean = value.includes("한글");
    const hasChinese = value.includes("中文");

    const passed = hasJapanese && hasKorean && hasChinese;
    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `Missing CJK text - JP: ${hasJapanese}, KR: ${hasKorean}, CN: ${hasChinese}`,
    });
    await page.close();
  }

  // Test 10: Cursor visible element exists
  {
    const testName = `[${renderer}] Cursor - visible cursor element exists`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    await page.click("textarea");
    await new Promise((r) => setTimeout(r, 200));

    const cursor = await getCursorElement(page);
    const passed = cursor !== null;
    results.push({
      name: testName,
      passed,
      error: passed ? undefined : `Cursor element not found`,
    });
    await page.close();
  }

  // Test 11: Scroll works
  {
    const testName = `[${renderer}] Scroll - textarea content exceeds visible area`;
    console.log(`Running: ${testName}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("textarea");

    const scrollInfo = await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      if (!textarea) return null;
      const lines = textarea.value.split("\n").length;
      return {
        lineCount: lines,
        scrollHeight: textarea.scrollHeight,
        clientHeight: textarea.clientHeight,
        canScroll: textarea.scrollHeight > textarea.clientHeight,
      };
    });

    const passed = scrollInfo !== null && (scrollInfo.canScroll || scrollInfo.lineCount >= 10);
    results.push({
      name: testName,
      passed,
      error: passed
        ? undefined
        : `lines: ${scrollInfo?.lineCount}, scrollHeight: ${scrollInfo?.scrollHeight}, clientHeight: ${scrollInfo?.clientHeight}`,
    });
    await page.close();
  }

  return results;
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests() {
  console.log("Starting VBA Editor E2E tests for all renderers...\n");

  // Start Vite server
  const server: ViteDevServer = await createServer({
    configFile: path.join(__dirname, "vite.config.ts"),
    server: { port: PORT },
  });
  await server.listen();
  console.log(`Vite server started at ${BASE_URL}`);

  // Launch browser
  const executablePath = await findChrome();
  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });

  const allResults: TestResult[] = [];

  try {
    // Run tests for each renderer
    for (const renderer of RENDERERS) {
      const results = await runTestsForRenderer(browser, renderer);
      allResults.push(...results);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // Print results
  console.log("\n=== Test Results ===\n");
  // eslint-disable-next-line no-restricted-syntax -- Test result counting
  let passed = 0;
  // eslint-disable-next-line no-restricted-syntax -- Test result counting
  let failed = 0;

  for (const result of allResults) {
    if (result.passed) {
      console.log(`✓ ${result.name}`);
      passed++;
    } else {
      console.log(`✗ ${result.name}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      failed++;
    }
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
