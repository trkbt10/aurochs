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
  controlHandleCenter,
  controlLineCount,
  clickNode,
  clickNodeAt,
  clickNodeAtPagePosition,
  editablePathScreenPoint,
  firstEditablePathData,
  firstAnchorHandleCenter,
  openEditor,
  renderedSvgMarkup,
  selectionBoxPageBounds,
  shiftClickNode,
  topmostAt,
  rightClickAnchorHandle,
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
    const pathBefore = await firstEditablePathData(page);
    const anchor = await firstAnchorHandleCenter(page);
    await expect.poll(async () => {
      const target = await topmostAt(page, anchor);
      return target.tagName === "circle" && target.ariaLabel?.startsWith("Vector path anchor handle") === true;
    }).toBe(true);

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 8, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(boundsBefore);
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
    const pathBefore = await firstEditablePathData(page);
    const anchor = await firstAnchorHandleCenter(page);
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 8, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(boundsBefore);
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

  test("does not enter frame path editing when tapping a child vector inside an imported-geometry frame", async ({ page }) => {
    await clickNodeAt(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await expect.poll(() => anchorHandleCount(page)).toBe(0);

    await clickNodeAtPagePosition(page, FRAME_CHILD_VECTOR, { x: 0.35, y: 0.35 });

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const anchor = await firstAnchorHandleCenter(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 9, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
  });

  test("screen-coordinate path operations mutate the existing vector inside nested frames instead of the frame", async ({ page }) => {
    await clickNodeAtPagePosition(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNodeAtPagePosition(page, FRAME_CHILD_VECTOR, { x: 0.62, y: 0.58 });

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const pathBeforeBezier = await firstEditablePathData(page);
    const control = await controlHandleCenter(page, 0);
    await page.mouse.move(control.x, control.y);
    await page.mouse.down();
    await page.mouse.move(control.x + 12, control.y - 10, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBeforeBezier);
    await expect.poll(() => firstEditablePathData(page)).toContain("C ");
    await expect.poll(() => controlLineCount(page)).toBeGreaterThan(0);

    const anchorsBeforeAdd = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.52);
    const pathBeforeAdd = await firstEditablePathData(page);
    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(anchorsBeforeAdd + 1);
    await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBeforeAdd);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Delete Vector Point" }).click();

    await expect.poll(() => anchorHandleCount(page)).toBe(anchorsBeforeAdd);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
  });

  test("screen-coordinate path operations mutate a basic shape inside nested frames instead of the frame", async ({ page }) => {
    await clickNodeAtPagePosition(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNodeAtPagePosition(page, FRAME_CHILD, { x: 0.5, y: 0.5 });

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const anchorsBeforeAdd = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.25);
    const pathBeforeAdd = await firstEditablePathData(page);
    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(anchorsBeforeAdd + 1);
    await expect.poll(() => firstEditablePathData(page)).not.toBe(pathBeforeAdd);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Delete Vector Point" }).click();

    await expect.poll(() => anchorHandleCount(page)).toBe(anchorsBeforeAdd);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD);
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

    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const anchor = await firstAnchorHandleCenter(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 11, anchor.y + 9, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);
  });
});
