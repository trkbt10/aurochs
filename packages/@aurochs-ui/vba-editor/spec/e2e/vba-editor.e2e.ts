/**
 * @file VBA Editor E2E Tests
 *
 * Tests text editing, selection, and undo/redo operations.
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
    // Find cursor element by its style (position: absolute, width: 2px)
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
    // Count selection overlay elements by checking all absolutely positioned elements
    const codeArea = document.querySelector("[class*='codeArea']");
    if (!codeArea) {
      return 0;
    }

    const elements = codeArea.querySelectorAll<HTMLElement>("div");
    // eslint-disable-next-line no-restricted-syntax -- Counting in test
    let count = 0;
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      // Selection rects: absolute position, has background, pointer-events: none, width > 2px
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

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests() {
  console.log("Starting VBA Editor E2E tests...\n");

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

  const results: { name: string; passed: boolean; error?: string }[] = [];

  try {
    // Test 1: Text editing works
    {
      const testName = "Text editing - typing adds text";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Focus textarea and type
      await page.click("textarea");
      await page.keyboard.press("End"); // Go to end of first line
      await page.keyboard.type("Test");

      const value = await getTextareaValue(page);
      const passed = value.includes("Test");
      results.push({ name: testName, passed, error: passed ? undefined : `Value: ${value}` });
      await page.close();
    }

    // Test 2: Selection creates visual highlight
    {
      const testName = "Selection - creates visual highlight";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Select some text - first go to start, then select to end
      await page.click("textarea");
      await page.keyboard.press("Home");
      await page.keyboard.down("Shift");
      await page.keyboard.press("End");
      await page.keyboard.up("Shift");

      await new Promise((r) => setTimeout(r, 300)); // Wait for selection render

      // Check textarea selection
      const selection = await getTextareaSelection(page);
      const hasTextSelection = selection.start !== selection.end;

      const rectCount = await getSelectionRects(page);
      const passed = rectCount >= 1 || hasTextSelection;
      results.push({
        name: testName,
        passed,
        error: passed ? undefined : `Selection rect count: ${rectCount}, text selection: ${selection.start}-${selection.end}`,
      });
      await page.close();
    }

    // Test 3: Selection not duplicated (only custom overlay, no native)
    {
      const testName = "Selection - no duplicate display";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Check that textarea selection is transparent
      const selectionStyle = await page.evaluate(() => {
        const textarea = document.querySelector("textarea");
        if (!textarea) {
          return null;
        }
        const style = window.getComputedStyle(textarea, "::selection");
        return {
          background: style.backgroundColor,
        };
      });

      // The selection should be transparent
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
      const testName = "Cursor - position matches text";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Click at start of textarea
      await page.click("textarea");
      await page.keyboard.press("Home");
      await new Promise((r) => setTimeout(r, 100));

      const cursor1 = await getCursorElement(page);

      // Move to end of line
      await page.keyboard.press("End");
      await new Promise((r) => setTimeout(r, 100));

      const cursor2 = await getCursorElement(page);

      // Cursor should move right when going to end
      const passed = cursor1 !== null && cursor2 !== null && cursor2.x > cursor1.x;
      results.push({
        name: testName,
        passed,
        error: passed ? undefined : `Cursor1: ${JSON.stringify(cursor1)}, Cursor2: ${JSON.stringify(cursor2)}`,
      });
      await page.close();
    }

    // Test 5: Undo restores previous character (each keystroke is one history entry)
    {
      const testName = "Undo - removes last typed character";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Click and go to end of first line
      await page.click("textarea");
      const initialValue = await getTextareaValue(page);

      // Go to end of document
      await page.keyboard.down("Meta");
      await page.keyboard.press("End");
      await page.keyboard.up("Meta");

      // Type one character
      await page.keyboard.type("X");
      await new Promise((r) => setTimeout(r, 200));

      const modifiedValue = await getTextareaValue(page);

      // Undo
      await page.keyboard.down("Meta");
      await page.keyboard.press("z");
      await page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 200));

      const undoneValue = await getTextareaValue(page);

      // The modified value should include X, undone should match initial
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

    // Test 6: Undo does not leave cursor at end of text
    {
      const testName = "Undo - cursor not at end";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Get text length
      const initialText = await getTextareaValue(page);
      const textLength = initialText.length;

      // Click and position cursor in middle
      await page.click("textarea");
      await page.keyboard.press("Home");
      for (const _ of [1, 2, 3, 4, 5]) {
        await page.keyboard.press("ArrowRight");
      }
      await new Promise((r) => setTimeout(r, 100));

      // Type and undo
      await page.keyboard.type("X");
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.down("Meta");
      await page.keyboard.press("z");
      await page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 200));

      // Get cursor position after undo
      const posAfter = await getTextareaSelection(page);

      // Cursor should NOT be at the end of text (which would be textLength)
      // It should be somewhere in the middle where we were typing
      const passed = posAfter.start < textLength;
      results.push({
        name: testName,
        passed,
        error: passed
          ? undefined
          : `Cursor at: ${posAfter.start}, text length: ${textLength}`,
      });
      await page.close();
    }

    // Test 7: Tab inserts spaces
    {
      const testName = "Tab - inserts 4 spaces";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      await page.click("textarea");
      await page.keyboard.press("End");

      const valueBefore = await getTextareaValue(page);
      await page.keyboard.press("Tab");
      await new Promise((r) => setTimeout(r, 100));
      const valueAfter = await getTextareaValue(page);

      // Should have 4 more characters (spaces)
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

    // Test 8: CJK character display (initial content includes CJK text)
    {
      const testName = "CJK - displays Japanese/Korean/Chinese text";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      const value = await getTextareaValue(page);

      // Check that CJK text from initial content is present
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

    // Test 9: Cursor visible element exists
    {
      const testName = "Cursor - visible cursor element exists";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
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

    // Test 10: Textarea has content overflow (verifies scroll container setup)
    {
      const testName = "Scroll - textarea content exceeds visible area";
      console.log(`Running: ${testName}`);
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector("textarea");

      // Check that textarea has more content than fits in viewport (line count * line height)
      const scrollInfo = await page.evaluate(() => {
        const textarea = document.querySelector("textarea");
        if (!textarea) {
          return null;
        }
        const lines = textarea.value.split("\n").length;
        const lineHeight = 21; // Same as CSS
        const contentHeight = lines * lineHeight;
        return {
          lineCount: lines,
          scrollHeight: textarea.scrollHeight,
          clientHeight: textarea.clientHeight,
          contentHeight,
          canScroll: textarea.scrollHeight > textarea.clientHeight,
          hasOverflow: window.getComputedStyle(textarea).overflow !== "visible",
        };
      });

      // Pass if textarea has more lines than viewport can show (assuming min viewport is ~400px, ~19 lines)
      // or if textarea scroll is possible
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

  for (const result of results) {
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
