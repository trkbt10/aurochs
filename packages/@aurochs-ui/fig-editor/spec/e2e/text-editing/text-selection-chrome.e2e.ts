/** @file Text edit visual chrome and range selection behavior. */

import { expect, test } from "@playwright/test";
import {
  HELLO_TEXT,
  canvasTextareaSelection,
  countCarets,
  countSelectionRects,
  countTextEditFrameOutlines,
  doubleClickNode,
  focusCanvasTextarea,
  getCanvasTextareaValue,
  isCanvasTextEditActive,
  nodeScreenRect,
  openEditor,
} from "../shared/fig-editor-harness";

test.describe("fig editor text selection chrome", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("text edit mode shows caret, frame outline, and selection chrome", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);

    await expect.poll(() => countCarets(page)).toBe(1);
    await expect.poll(() => countTextEditFrameOutlines(page)).toBeGreaterThan(0);

    await focusCanvasTextarea(page);
    await page.keyboard.type("XY");

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);

    await expect.poll(() => countSelectionRects(page)).toBeGreaterThan(0);
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello WorldXY");
  });

  test("drag on text creates a selection range", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);

    const screenRect = await nodeScreenRect(page, HELLO_TEXT);
    const startX = screenRect.left + screenRect.width * 0.3;
    const endX = screenRect.left + screenRect.width * 0.7;
    const y = screenRect.top + screenRect.height / 2;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let i = 1; i <= 5; i += 1) {
      await page.mouse.move(startX + (endX - startX) * (i / 5), y);
    }
    await page.mouse.up();

    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);
    await expect.poll(async () => {
      const selection = await canvasTextareaSelection(page);
      return selection ? selection.end - selection.start : 0;
    }).toBeGreaterThan(0);
  });
});
