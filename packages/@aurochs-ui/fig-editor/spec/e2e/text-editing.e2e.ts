/**
 * @file E2E tests for fig-editor text editing
 *
 * Tests the complete text editing lifecycle using mouse and keyboard
 * operations on the canvas, exactly as a user would interact:
 *
 * 1. Double-click a text node on canvas → enters text edit mode
 * 2. Type characters → text content updates
 * 3. Backspace → deletes characters (does NOT delete the node)
 * 4. Select all (Cmd+A) → selects all text
 * 5. Escape → exits text edit mode
 * 6. Delete key outside text edit → deletes selected node
 *
 * The test harness (main.tsx) places nodes at known page coordinates.
 * We locate hit-area rects by matching their SVG x/y/width/height
 * attributes against the known node bounds, then use getBoundingClientRect
 * to get screen coordinates for mouse operations.
 *
 * The canvas text edit textarea is distinguished from the PropertyPanel
 * textarea by its opacity:0 style (hidden textarea pattern from
 * TextEditInputFrame).
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

// =============================================================================
// Constants matching main.tsx node positions (page coordinates)
// =============================================================================

const HELLO_TEXT = { pageX: 50, pageY: 50, width: 200, height: 30 };
const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };

// =============================================================================
// Helpers
// =============================================================================

async function waitForEditor(page: Page): Promise<void> {
  // Wait for the canvas SVG to render with content (hit-area rects)
  await page.waitForFunction(
    () => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      const canvasSvg = svgs.find((s) => s.getBoundingClientRect().width > 400);
      if (!canvasSvg) {return false;}
      // Wait for hit-area rects to appear (transparent rects with fill="transparent")
      return canvasSvg.querySelectorAll("rect[fill='transparent']").length > 0;
    },
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

/**
 * Find the screen position of a node's hit-area rect on the canvas.
 *
 * Hit-area rects are transparent SVG rects rendered by EditorCanvas.
 * Each rect's x/y/width/height SVG attributes match the node's absolute
 * page coordinates (set by flattenAllNodeBounds). We find the rect by
 * matching these attributes, then use getBoundingClientRect for the
 * actual screen position.
 */
async function getNodeScreenCenter(
  page: Page,
  node: { pageX: number; pageY: number; width: number; height: number },
): Promise<{ x: number; y: number }> {
  const result = await page.evaluate(
    ({ px, py, w, h }) => {
      // Find the canvas SVG (largest by area)
      const allSvgs = Array.from(document.querySelectorAll("svg"));
      const svg = allSvgs.reduce<SVGSVGElement | null>((best, curr) => {
        const r = curr.getBoundingClientRect();
        if (!best) {return curr;}
        const br = best.getBoundingClientRect();
        return r.width * r.height > br.width * br.height ? curr : best;
      }, null);
      if (!svg) {return null;}

      // Find hit-area rect matching the node's bounds
      for (const rect of Array.from(svg.querySelectorAll("rect[fill='transparent']"))) {
        const rx = parseFloat(rect.getAttribute("x") ?? "");
        const ry = parseFloat(rect.getAttribute("y") ?? "");
        const rw = parseFloat(rect.getAttribute("width") ?? "");
        const rh = parseFloat(rect.getAttribute("height") ?? "");
        if (Math.abs(rx - px) < 1 && Math.abs(ry - py) < 1 &&
            Math.abs(rw - w) < 1 && Math.abs(rh - h) < 1) {
          const bbox = rect.getBoundingClientRect();
          return { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 };
        }
      }
      return null;
    },
    { px: node.pageX, py: node.pageY, w: node.width, h: node.height },
  );

  if (!result) {
    throw new Error(`Hit-area rect not found for node at (${node.pageX},${node.pageY})`);
  }
  return result;
}

async function clickNode(page: Page, node: typeof HELLO_TEXT): Promise<void> {
  const { x, y } = await getNodeScreenCenter(page, node);
  await page.mouse.click(x, y);
}

async function doubleClickNode(page: Page, node: typeof HELLO_TEXT): Promise<void> {
  const { x, y } = await getNodeScreenCenter(page, node);
  await page.mouse.dblclick(x, y);
}

/**
 * Get the canvas text-editing textarea (hidden, opacity:0).
 *
 * TextEditInputFrame renders a textarea with opacity:0 for capturing
 * keyboard input. This is distinct from the PropertyPanel's visible
 * textarea which has normal opacity.
 *
 * We identify the canvas textarea by checking computed opacity === 0.
 */
async function _getCanvasTextarea(page: Page): Promise<Locator> {
  // Find textarea with opacity 0 (the hidden input from TextEditInputFrame)
  return page.locator("textarea").filter({
    has: page.locator("xpath=self::*[contains(@style, 'opacity')]"),
  }).first();
}

/**
 * Check if the canvas text edit textarea exists and is focused.
 */
async function isCanvasTextEditActive(page: Page): Promise<boolean> {
  const count = await page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    return textareas.filter((ta) => {
      const style = window.getComputedStyle(ta);
      return style.opacity === "0";
    }).length;
  });
  return count > 0;
}

/**
 * Get the value of the canvas text-editing textarea.
 */
async function getCanvasTextareaValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    const hidden = textareas.find((ta) => {
      const style = window.getComputedStyle(ta);
      return style.opacity === "0";
    });
    return hidden?.value ?? "";
  });
}

/**
 * Focus the canvas text-editing textarea so keyboard input goes to it.
 */
async function focusCanvasTextarea(page: Page): Promise<void> {
  await page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    const hidden = textareas.find((ta) => {
      const style = window.getComputedStyle(ta);
      return style.opacity === "0";
    });
    hidden?.focus();
  });
}

// =============================================================================
// Tests
// =============================================================================

test.describe("Fig editor text editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditor(page);
  });

  test("double-click on text node enters text edit mode on the canvas", async ({ page }) => {
    // Before: no canvas textarea
    expect(await isCanvasTextEditActive(page)).toBe(false);

    // Double-click the "Hello World" text node
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);

    // Canvas textarea should now exist (TextEditInputFrame's hidden textarea)
    expect(await isCanvasTextEditActive(page)).toBe(true);

    // Its value should be the node's text content
    expect(await getCanvasTextareaValue(page)).toBe("Hello World");
  });

  test("typing into the canvas textarea updates the text", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);

    // Ensure the canvas textarea is focused
    await focusCanvasTextarea(page);

    expect(await getCanvasTextareaValue(page)).toBe("Hello World");

    // Type additional text
    await page.keyboard.type("!!!");
    await page.waitForTimeout(100);

    expect(await getCanvasTextareaValue(page)).toBe("Hello World!!!");
  });

  test("Backspace in canvas textarea deletes characters, NOT the node", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);
    await focusCanvasTextarea(page);

    expect(await getCanvasTextareaValue(page)).toBe("Hello World");

    // Press Backspace 5 times to delete "World"
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Backspace");
    }
    await page.waitForTimeout(100);

    // Text should be shortened
    expect(await getCanvasTextareaValue(page)).toBe("Hello ");

    // Canvas textarea should still exist (node was NOT deleted)
    expect(await isCanvasTextEditActive(page)).toBe(true);
  });

  test("Cmd+A in canvas textarea selects all text", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);
    await focusCanvasTextarea(page);

    // Select all
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);

    // Verify selection covers the full text
    const selection = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      const hidden = textareas.find((ta) => {
        const style = window.getComputedStyle(ta);
        return style.opacity === "0";
      });
      if (!hidden) {return null;}
      return { start: hidden.selectionStart, end: hidden.selectionEnd };
    });

    expect(selection).not.toBeNull();
    expect(selection!.start).toBe(0);
    expect(selection!.end).toBe("Hello World".length);
  });

  test("Escape exits text editing mode", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);

    expect(await isCanvasTextEditActive(page)).toBe(true);

    // Focus the canvas textarea and press Escape
    await focusCanvasTextarea(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Canvas textarea should be gone
    expect(await isCanvasTextEditActive(page)).toBe(false);
  });

  test.skip("Delete key outside text edit deletes the selected node (requires useFigKeyboard, not canvas-only)", async ({ page }) => {
    // Single-click to select the rectangle
    await clickNode(page, RECT);
    await page.waitForTimeout(200);

    // No canvas text edit should be active
    expect(await isCanvasTextEditActive(page)).toBe(false);

    // Count hit-area rects before deletion
    const hitAreasBefore = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      const canvasSvg = svgs.find((s) => s.getBoundingClientRect().width > 400);
      return canvasSvg?.querySelectorAll("rect[fill='transparent']").length ?? 0;
    });

    // Press Delete
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Hit-area count should decrease (node was removed)
    const hitAreasAfter = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      const canvasSvg = svgs.find((s) => s.getBoundingClientRect().width > 400);
      return canvasSvg?.querySelectorAll("rect[fill='transparent']").length ?? 0;
    });
    expect(hitAreasAfter).toBeLessThan(hitAreasBefore);
  });

  test("double-click on rectangle does NOT enter text edit", async ({ page }) => {
    await doubleClickNode(page, RECT);
    await page.waitForTimeout(300);

    // No canvas textarea should appear
    expect(await isCanvasTextEditActive(page)).toBe(false);
  });

  test("Backspace immediately after double-click does NOT delete the node", async ({ page }) => {
    // This tests the real user scenario: double-click text, then press Backspace
    // WITHOUT manually focusing the hidden textarea.
    // If the hidden textarea doesn't auto-focus, Backspace hits the global
    // keyboard handler and deletes the entire node.
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);

    // Verify text edit mode is active
    expect(await isCanvasTextEditActive(page)).toBe(true);

    // Check what element has focus RIGHT NOW (without manual focusCanvasTextarea)
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    const focusedOpacity = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) {return "no-focus";}
      return window.getComputedStyle(el).opacity;
    });

    // The hidden textarea (opacity:0) MUST have focus after double-click.
    // If it doesn't, Backspace will delete the node instead of text.
    expect(focusedTag).toBe("TEXTAREA");
    expect(focusedOpacity).toBe("0");

    // Now press Backspace — should delete the last character, not the node
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);

    // Canvas text edit should still be active
    expect(await isCanvasTextEditActive(page)).toBe(true);

    // Text should have one character removed
    expect(await getCanvasTextareaValue(page)).toBe("Hello Worl");
  });

  test("full user flow: double-click, type, backspace, escape without manual focus", async ({ page }) => {
    // This test simulates the exact user flow with NO manual focus calls.
    // Every keyboard action uses whatever element the browser naturally focuses.

    // Step 1: Double-click text node
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);

    // Verify we're in text edit mode
    expect(await isCanvasTextEditActive(page)).toBe(true);

    // Step 2: Type without manually focusing — whatever has focus receives input
    await page.keyboard.type("AB");
    await page.waitForTimeout(100);

    // Check which textarea has the value
    const canvasVal = await getCanvasTextareaValue(page);

    // CRITICAL: If the canvas textarea got "AB", the auto-focus worked.
    // If it still shows "Hello World" (unchanged), the typing went elsewhere.
    expect(canvasVal).toBe("Hello WorldAB");

    // Step 3: Backspace
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);

    // Should remove "B", not delete the node
    expect(await isCanvasTextEditActive(page)).toBe(true);
    expect(await getCanvasTextareaValue(page)).toBe("Hello WorldA");

    // Step 4: Screenshot for visual verification
    await page.screenshot({ path: "test-results/full-flow-after-backspace.png" });

    // Step 5: Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    expect(await isCanvasTextEditActive(page)).toBe(false);

    // Step 6: Verify the node still exists (hit-area count unchanged)
    // All 4 nodes should still have hit areas
    const hitAreas = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      const canvasSvg = svgs.find((s) => s.getBoundingClientRect().width > 400);
      return canvasSvg?.querySelectorAll("rect[fill='transparent']").length ?? 0;
    });
    expect(hitAreas).toBe(4);
  });

  test("visual: text edit mode shows correct caret and frame outline", async ({ page }) => {
    // Double-click to enter text edit
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(500);

    // Screenshot to visually verify:
    // 1. Blue frame outline around the text node
    // 2. Blinking caret at end of text
    // 3. Text content unchanged (same rendering as non-edit mode)
    await page.screenshot({ path: "test-results/text-edit-active.png" });

    // Type some text
    await focusCanvasTextarea(page);
    await page.keyboard.type("XY");
    await page.waitForTimeout(300);

    // Screenshot after typing — text should update on canvas
    await page.screenshot({ path: "test-results/text-edit-after-type.png" });

    // Select all text
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);
    await page.waitForTimeout(200);

    // Screenshot with selection — should show highlight over text
    await page.screenshot({ path: "test-results/text-edit-select-all.png" });

    // Just verify the basic state is correct
    expect(await getCanvasTextareaValue(page)).toBe("Hello WorldXY");
  });

  test("focus diagnostics: activeElement after double-click is the hidden textarea", async ({ page }) => {
    // Diagnostic test: after double-click, what element has focus?
    // This catches the scenario where PropertyPanel's textarea steals focus.
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(500);

    const diagnostics = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) {return { tag: "none", opacity: "n/a", parentInfo: "n/a" };}

      const style = window.getComputedStyle(active);
      const _parentClasses = active.parentElement?.className ?? "";
      const parentStyle = active.parentElement ? window.getComputedStyle(active.parentElement) : null;

      return {
        tag: active.tagName,
        opacity: style.opacity,
        position: style.position,
        parentPosition: parentStyle?.position ?? "n/a",
        isInViewportOverlay: !!active.closest("[style*='position: absolute']"),
        textareaValue: active instanceof HTMLTextAreaElement ? active.value.substring(0, 30) : "not-textarea",
        allTextareaCount: document.querySelectorAll("textarea").length,
      };
    });

    console.log("Focus diagnostics:", JSON.stringify(diagnostics, null, 2));

    // The active element MUST be a textarea with opacity 0 (the hidden canvas textarea)
    expect(diagnostics.tag).toBe("TEXTAREA");
    expect(diagnostics.opacity).toBe("0");
    expect(diagnostics.textareaValue).toBe("Hello World");
  });

  test("typing in canvas textarea does not trigger editor shortcuts", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);
    await focusCanvasTextarea(page);

    expect(await getCanvasTextareaValue(page)).toBe("Hello World");

    // Type 'r' (normally switches to Rectangle tool)
    await page.keyboard.type("r");
    // Type 'v' (normally switches to Select tool)
    await page.keyboard.type("v");
    await page.waitForTimeout(100);

    // Characters should be typed into text, not consumed as shortcuts
    expect(await getCanvasTextareaValue(page)).toBe("Hello Worldrv");
  });

  test("drag on text creates a selection range", async ({ page }) => {
    // Double-click to enter text edit mode
    await doubleClickNode(page, HELLO_TEXT);
    await page.waitForTimeout(300);

    expect(await isCanvasTextEditActive(page)).toBe(true);

    // Get the SCREEN bounding rect of the text node's hit-area rect.
    // We need actual screen coordinates (not page coordinates) for mouse operations.
    const screenRect = await page.evaluate(
      ({ px, py, w, h }) => {
        const allSvgs = Array.from(document.querySelectorAll("svg"));
        const svg = allSvgs.reduce<SVGSVGElement | null>((best, curr) => {
          const r = curr.getBoundingClientRect();
          if (!best) {return curr;}
          return r.width * r.height > best.getBoundingClientRect().width * best.getBoundingClientRect().height ? curr : best;
        }, null);
        if (!svg) {return null;}
        for (const rect of Array.from(svg.querySelectorAll("rect[fill='transparent']"))) {
          const rx = parseFloat(rect.getAttribute("x") ?? "");
          const ry = parseFloat(rect.getAttribute("y") ?? "");
          const rw = parseFloat(rect.getAttribute("width") ?? "");
          const rh = parseFloat(rect.getAttribute("height") ?? "");
          if (Math.abs(rx - px) < 1 && Math.abs(ry - py) < 1 &&
              Math.abs(rw - w) < 1 && Math.abs(rh - h) < 1) {
            const bbox = rect.getBoundingClientRect();
            return { left: bbox.left, top: bbox.top, width: bbox.width, height: bbox.height };
          }
        }
        return null;
      },
      { px: HELLO_TEXT.pageX, py: HELLO_TEXT.pageY, w: HELLO_TEXT.width, h: HELLO_TEXT.height },
    );
    expect(screenRect).not.toBeNull();

    // Drag from 30% to 70% of the SCREEN width of the node, at vertical center.
    // Using screen coords ensures we stay within the overlay container.
    const startX = screenRect!.left + screenRect!.width * 0.3;
    const endX = screenRect!.left + screenRect!.width * 0.7;
    const y = screenRect!.top + screenRect!.height / 2;

    // Perform a drag
    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(startX + (endX - startX) * (i / 5), y);
    }
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Text editing should still be active (not exited by the drag)
    expect(await isCanvasTextEditActive(page)).toBe(true);

    // The hidden textarea should now have a non-collapsed selection
    const selection = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      const hidden = textareas.find((ta) => {
        const style = window.getComputedStyle(ta);
        return style.opacity === "0";
      });
      if (!hidden) {return null;}
      return { start: hidden.selectionStart, end: hidden.selectionEnd };
    });

    expect(selection).not.toBeNull();
    // Selection must be a range (start !== end), meaning drag selection worked
    expect(selection!.end - selection!.start).toBeGreaterThan(0);
  });
});
