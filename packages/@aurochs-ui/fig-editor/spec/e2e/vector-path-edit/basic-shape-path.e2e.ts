/** @file Basic shape path editing without outline conversion. */

import { expect, test } from "@playwright/test";
import {
  ELLIPSE,
  FRAME,
  FRAME_CHILD,
  LINE,
  RECT,
  anchorHandleCount,
  clickNode,
  editablePathScreenPoint,
  firstEditablePathData,
  firstAnchorHandleCenter,
  openEditor,
  renderedSvgMarkup,
  selectionBoxPageBounds,
  topmostAt,
  vectorHandleCount,
} from "../shared/fig-editor-harness";

test.describe("basic shape path editing", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page, "?renderer=svg");
  });

  test("edits basic shape paths without converting them on vector edit entry", async ({ page }) => {
    for (const shape of [RECT, ELLIPSE, LINE]) {
      await page.locator('button[title="Select (V)"]').click();
      await clickNode(page, shape);
      const svgBefore = await renderedSvgMarkup(page);
      await page.locator('button[title="Vector Edit (P)"]').click();
      await expect.poll(() => vectorHandleCount(page)).toBeGreaterThan(0);
      await expect.poll(() => renderedSvgMarkup(page)).toBe(svgBefore);

      const anchor = await firstAnchorHandleCenter(page);
      const boundsBefore = await selectionBoxPageBounds(page);
      const pathBefore = await firstEditablePathData(page);
      await expect.poll(async () => {
        const target = await topmostAt(page, anchor);
        return target.tagName === "circle" && target.ariaLabel?.startsWith("Vector path anchor handle") === true;
      }).toBe(true);
      await page.mouse.move(anchor.x, anchor.y);
      await page.mouse.down();
      await page.mouse.move(anchor.x + 10, anchor.y + 8, { steps: 3 });
      await page.mouse.up();

      await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
      await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBefore);
      await expect.poll(() => selectionBoxPageBounds(page)).toEqual(boundsBefore);
    }
  });

  test("adds topology points on a basic shape instead of only resizing its bounding box", async ({ page }) => {
    await clickNode(page, RECT);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);
    const before = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.33);
    await expect.poll(() => topmostAt(page, pathPoint)).toMatchObject({
      ariaLabel: "Editable vector path segment 1",
      role: "button",
    });

    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(before + 1);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
  });

  test("edits a basic shape path inside frame-in-frame without frame hit areas absorbing the operation", async ({ page }) => {
    await clickNode(page, FRAME_CHILD);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);
    const svgBefore = await renderedSvgMarkup(page);
    const boundsBefore = await selectionBoxPageBounds(page);
    const pathBefore = await firstEditablePathData(page);
    const anchor = await firstAnchorHandleCenter(page);

    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ ariaLabel: "Vector path anchor handle 1" });
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 12, anchor.y + 9, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(boundsBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
  });
});
