/** @file Text edit focus ownership and shortcut isolation. */

import { expect, test } from "@playwright/test";
import {
  HELLO_TEXT,
  activeElementDiagnostics,
  countCanvasHitAreas,
  doubleClickNode,
  focusCanvasTextarea,
  getCanvasTextareaValue,
  isCanvasTextEditActive,
  openEditor,
} from "../shared/fig-editor-harness";

test.describe("fig editor text edit focus ownership", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("Backspace immediately after double-click does not delete the node", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);
    await expect.poll(() => activeElementDiagnostics(page)).toMatchObject({ tag: "TEXTAREA", opacity: "0" });

    await page.keyboard.press("Backspace");

    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello Worl");
  });

  test("full user flow keeps text input focused without manual focus calls", async ({ page }) => {
    const hitAreasBefore = await countCanvasHitAreas(page);

    await doubleClickNode(page, HELLO_TEXT);
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(true);

    await page.keyboard.type("AB");
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello WorldAB");

    await page.keyboard.press("Backspace");
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello WorldA");

    await page.keyboard.press("Escape");
    await expect.poll(() => isCanvasTextEditActive(page)).toBe(false);
    await expect.poll(() => countCanvasHitAreas(page)).toBe(hitAreasBefore);
  });

  test("active element after double-click is the hidden canvas textarea", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);

    await expect.poll(() => activeElementDiagnostics(page)).toEqual({
      tag: "TEXTAREA",
      opacity: "0",
      textareaValue: "Hello World",
    });
  });

  test("typing in canvas textarea does not trigger editor shortcuts", async ({ page }) => {
    await doubleClickNode(page, HELLO_TEXT);
    await focusCanvasTextarea(page);
    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello World");

    await page.keyboard.type("r");
    await page.keyboard.type("v");

    await expect.poll(() => getCanvasTextareaValue(page)).toBe("Hello Worldrv");
  });
});
