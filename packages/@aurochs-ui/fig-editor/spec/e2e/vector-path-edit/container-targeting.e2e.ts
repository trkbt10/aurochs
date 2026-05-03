/** @file Container and multi-selection targeting for vector path editing. */

import { expect, test } from "@playwright/test";
import {
  COVERING_GROUP,
  FRAME,
  FRAME_CHILD,
  FRAME_CHILD_VECTOR,
  GROUP_CHILD,
  RECT,
  VECTOR,
  anchorHandleCount,
  clickNode,
  clickNodeAt,
  editablePathScreenPoint,
  firstAnchorHandleCenter,
  openEditor,
  renderedSvgMarkup,
  selectionBoxPageBounds,
  shiftClickNode,
  topmostAt,
} from "../shared/fig-editor-harness";

test.describe("vector path edit targeting under containers", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page, "?renderer=svg");
  });

  test("switches from a selected covering container to the deepest editable child in vector edit mode", async ({ page }) => {
    await clickNodeAt(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, FRAME_CHILD);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const boundsBefore = await selectionBoxPageBounds(page);
    const anchor = await firstAnchorHandleCenter(page);
    await expect.poll(async () => {
      const target = await topmostAt(page, anchor);
      return target.tagName === "circle" && target.ariaLabel?.startsWith("Vector path anchor handle") === true;
    }).toBe(true);

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 8, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(boundsBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
  });

  test("does not special-case frame when resolving editable descendants under containers", async ({ page }) => {
    await clickNodeAt(page, COVERING_GROUP, { x: 0.92, y: 0.88 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(COVERING_GROUP);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, GROUP_CHILD);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(GROUP_CHILD);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const boundsBefore = await selectionBoxPageBounds(page);
    const anchor = await firstAnchorHandleCenter(page);
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 8, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(boundsBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(COVERING_GROUP);
  });

  test("switches from a selected covering container to an existing child vector in vector edit mode", async ({ page }) => {
    await clickNodeAt(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, FRAME_CHILD_VECTOR);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const anchor = await firstAnchorHandleCenter(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 10, anchor.y + 7, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);

    const before = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.42);
    await expect.poll(() => topmostAt(page, pathPoint)).toMatchObject({
      ariaLabel: "Editable vector path segment 1",
      role: "button",
    });

    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(before + 1);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
  });

  test("edits an existing vector path inside a frame without mutating the containing frame", async ({ page }) => {
    await clickNode(page, FRAME_CHILD_VECTOR);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const before = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.42);
    await expect.poll(() => topmostAt(page, pathPoint)).toMatchObject({
      ariaLabel: "Editable vector path segment 1",
      role: "button",
    });

    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(before + 1);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
  });

  test("resolves a path-edit click from multi-selection to the clicked vector target", async ({ page }) => {
    await clickNode(page, RECT);
    await shiftClickNode(page, VECTOR);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, VECTOR);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(VECTOR);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const anchor = await firstAnchorHandleCenter(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 11, anchor.y + 9, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(VECTOR);
  });
});
