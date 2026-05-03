/** @file Text editing lifecycle through human mouse and keyboard operations. */

import { expect, test } from "@playwright/test";
import {
  HELLO_TEXT,
  RECT,
  canvasTextareaSelection,
  clickNode,
  countCanvasHitAreas,
  doubleClickNode,
  focusCanvasTextarea,
  getCanvasTextareaValue,
  isCanvasTextEditActive,
  openEditor,
} from "../shared/fig-editor-harness";

test.describe("fig editor text edit lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("double-click on text node enters text edit mode on the canvas", async ({ page }) => {
    expect(await isCanvasTextEditActive(page)).toBe(false);

    await doubleClickNode(page, HELLO_TEXT);

    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello World");
  });

  test("typing into the canvas textarea updates the text", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello World");

    await focusCanvasTextarea(page);
    await page.keyboard.type("!!!");

    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello World!!!");
  });

  test("Backspace in canvas textarea deletes characters, not the node", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await focusCanvasTextarea(page);
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello World");

    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press("Backspace");
    }

    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello ");
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);
  });

  test("Cmd+A in canvas textarea selects all text", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await focusCanvasTextarea(page);

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);

    await expect.poll(() => canvasTextareaSelection(page)).toEqual({ start: 0, end: "Hello World".length });
  });

  test("Escape exits text editing mode", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);

    await focusCanvasTextarea(page);
    await page.keyboard.press("Escape");

    await expect.poll(() => isCanvasTextEditActive(page)).toBe(false);
  });

  test("Delete key outside text edit deletes the selected node", async ({ page }) => {
    await clickNode(page, RECT);
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(false);
    const hitAreasBefore = await countCanvasHitAreas(page);

    await page.keyboard.press("Delete");

    await expect.poll(() => countCanvasHitAreas(page)).toBeLessThan(hitAreasBefore);
  });

  test("double-click on rectangle does not enter text edit", async ({ page }) => {
    await doubleClickNode(page, RECT);

    await expect.poll(() => isCanvasTextEditActive(page)).toBe(false);
  });
});
