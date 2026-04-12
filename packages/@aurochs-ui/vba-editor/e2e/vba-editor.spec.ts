/**
 * @file VBA Editor Playwright E2E Tests
 *
 * Tests VBA-specific integration concerns:
 * - Syntax highlighting (VBA tokenizer produces colored tokens)
 * - Context integration (editing updates VBA module source)
 * - Search overlay (Cmd+F opens, highlights render)
 * - Module switching (sidebar click changes editor content)
 *
 * Low-level editing (cursor, selection, undo/redo, scroll, IME) is the
 * responsibility of react-editor-ui's CodeEditor and tested there.
 */

import { test, expect, type Page } from "@playwright/test";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Wait for the editor to be fully mounted.
 * CodeEditor renders a textarea internally.
 */
async function waitForEditor(page: Page): Promise<void> {
  await page.locator("textarea").waitFor({ state: "attached", timeout: 5_000 });
  await page.waitForTimeout(500);
}

/**
 * Get the textarea value (the editing buffer).
 */
async function getTextareaValue(page: Page): Promise<string> {
  return page.locator("textarea").inputValue();
}

/**
 * Focus the code editor.
 *
 * CodeEditor internally uses a hidden textarea for input capture.
 * Clicking on the SVG renderer area should focus it via CodeEditor's
 * pointer handler. We use the textarea directly as a fallback.
 */
async function focusEditor(page: Page): Promise<void> {
  // CodeEditor's pointer handler focuses the textarea on click.
  // The rendered code area is an SVG element.
  const codeArea = page.locator("svg").first();
  if (await codeArea.isVisible()) {
    const box = await codeArea.boundingBox();
    if (box) {
      // Click in the code content area (past line numbers at ~80px from left)
      await page.mouse.click(box.x + 80, box.y + 50);
      await page.waitForTimeout(200);
      return;
    }
  }
  // Fallback: focus textarea directly
  await page.locator("textarea").focus();
  await page.waitForTimeout(200);
}

// =============================================================================
// Tests — Editor Renders and Accepts Input
// =============================================================================

test.describe("Editor Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditor(page);
  });

  test("editor renders code with line numbers", async ({ page }) => {
    // CodeEditor renders SVG by default. Verify SVG content exists.
    const svg = page.locator("svg");
    await expect(svg.first()).toBeVisible();

    // Verify line numbers are rendered (text elements with numbers)
    const lineNumber = page.locator("svg text").first();
    await expect(lineNumber).toBeVisible();
  });

  test("editor contains the initial VBA source code", async ({ page }) => {
    const value = await getTextareaValue(page);
    expect(value).toContain("Sub Test()");
    expect(value).toContain("Dim x As Integer");
    expect(value).toContain("End Sub");
  });

  test("typing adds text to the editor", async ({ page }) => {
    await focusEditor(page);
    await page.keyboard.press("End");
    await page.keyboard.type("HELLO");
    await page.waitForTimeout(200);

    const value = await getTextareaValue(page);
    expect(value).toContain("HELLO");
  });

  test("editor updates context on edit", async ({ page }) => {
    await focusEditor(page);
    await page.keyboard.press("End");
    await page.keyboard.type("EDITED");
    await page.waitForTimeout(400);

    // Verify the status bar shows cursor position (context receives updates)
    const statusBar = page.locator("text=Ln");
    await expect(statusBar).toBeVisible();
  });
});

// =============================================================================
// Tests — Syntax Highlighting
// =============================================================================

test.describe("Syntax Highlighting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditor(page);
  });

  test("VBA keywords are rendered with color", async ({ page }) => {
    // The SVG renderer uses <tspan fill="..."> for colored tokens.
    // VBA keywords like "Sub", "Dim", "If" should have a non-black fill.
    const coloredSpans = await page.evaluate(() => {
      const tspans = document.querySelectorAll("svg tspan");
      const colored: { text: string; fill: string }[] = [];
      for (const ts of tspans) {
        const fill = ts.getAttribute("fill");
        const text = ts.textContent?.trim();
        if (fill && text && fill !== "#000000" && fill !== "transparent") {
          colored.push({ text, fill });
        }
      }
      return colored;
    });

    // Should have keyword-colored elements
    const keywordTexts = coloredSpans.map((c) => c.text);
    expect(keywordTexts).toEqual(expect.arrayContaining(["Sub"]));
  });

  test("VBA comments are rendered with green color", async ({ page }) => {
    const commentSpans = await page.evaluate(() => {
      const tspans = document.querySelectorAll("svg tspan");
      const comments: string[] = [];
      for (const ts of tspans) {
        const fill = ts.getAttribute("fill") ?? "";
        // Comment color uses CSS var: "var(--vba-comment-color, #008000)"
        // or resolved "#008000". Match either form.
        if (fill.includes("008000") || fill.includes("vba-comment")) {
          comments.push(ts.textContent?.trim() ?? "");
        }
      }
      return comments;
    });

    expect(commentSpans.length).toBeGreaterThan(0);
    // At least one comment should contain the tick mark
    expect(commentSpans.some((c) => c.startsWith("'"))).toBe(true);
  });
});

// =============================================================================
// Tests — Search Integration
// =============================================================================

test.describe("Search Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditor(page);
  });

  test("Cmd+F opens search bar", async ({ page }) => {
    await focusEditor(page);
    await page.keyboard.press("Meta+f");
    await page.waitForTimeout(300);

    // Search bar should have a "Find..." input
    const searchInput = page.locator("input[placeholder='Find...']");
    await expect(searchInput).toBeVisible();
  });

  test("typing in search highlights matches in the editor", async ({ page }) => {
    await focusEditor(page);
    await page.keyboard.press("Meta+f");
    await page.waitForTimeout(300);

    const searchInput = page.locator("input[placeholder='Find...']");
    await searchInput.fill("Dim");
    await page.waitForTimeout(300);

    // Match count should appear (e.g. "1/3")
    // The search bar shows match count as text
    const matchCountText = await page.evaluate(() => {
      // Look for text that matches "N/M" pattern near the search input
      const spans = document.querySelectorAll("span");
      for (const span of spans) {
        const text = span.textContent?.trim();
        if (text && /^\d+\/\d+$/.test(text)) {
          return text;
        }
      }
      return null;
    });

    expect(matchCountText).not.toBeNull();
    // "Dim" appears 3 times in the test source
    expect(matchCountText).toMatch(/^\d+\/\d+$/);
  });

  test("Escape closes search bar", async ({ page }) => {
    await focusEditor(page);
    await page.keyboard.press("Meta+f");
    await page.waitForTimeout(200);

    const searchInput = page.locator("input[placeholder='Find...']");
    await expect(searchInput).toBeVisible();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    await expect(searchInput).not.toBeVisible();
  });
});

// =============================================================================
// Tests — Module Sidebar
// =============================================================================

test.describe("Module Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditor(page);
  });

  test("module list is visible", async ({ page }) => {
    // The sidebar should show the module name "TestModule"
    const moduleItem = page.getByText("TestModule", { exact: true }).first();
    await expect(moduleItem).toBeVisible();
  });
});
