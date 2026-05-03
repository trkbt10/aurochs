/** @file Pen-tool draft path creation and commit behavior. */

import { expect, test } from "@playwright/test";
import {
  FRAME,
  anchorHandleCount,
  committedPathUnitSummary,
  committedVectorPathStrokeCount,
  draftAnchorHandleCenter,
  draftAnchorHandleCount,
  draftControlHandleCenter,
  draftControlHandleCount,
  draftControlLineCount,
  draftControlLineStrokeWidth,
  draftSegmentStrokeWidth,
  firstEditablePathData,
  nodeScreenPoint,
  openEditor,
  renderedSvgMarkup,
  selectionBoxPageBounds,
  topmostAt,
} from "../shared/fig-editor-harness";

test.describe("vector pen draft editing", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page, "?renderer=svg");
  });

  test("draws a continuous vector path inside a frame without the frame absorbing the pointer operation", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.72, y: 0.78 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.86, y: 0.70 });
    const third = await nodeScreenPoint(page, FRAME, { x: 0.80, y: 0.88 });
    const svgBefore = await renderedSvgMarkup(page);

    await page.mouse.click(first.x, first.y);
    await page.mouse.move(second.x, second.y);
    await page.mouse.click(second.x, second.y);
    await page.mouse.move(third.x, third.y);
    await page.mouse.click(third.x, third.y);
    await expect.poll(() => draftAnchorHandleCount(page)).toBe(3);
    const draftAnchor = await draftAnchorHandleCenter(page, 1);
    await page.mouse.move(draftAnchor.x, draftAnchor.y);
    await page.mouse.down();
    await page.mouse.move(draftAnchor.x + 9, draftAnchor.y - 7, { steps: 3 });
    await page.mouse.up();
    await page.keyboard.press("Enter");

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
    await expect.poll(() => anchorHandleCount(page)).toBe(3);
    await expect.poll(() => committedPathUnitSummary(page)).toEqual({ commandCount: 3, hasNegativeCoordinate: false });
  });

  test("draws bezier handles and closes the path from the first anchor", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.58, y: 0.84 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.74, y: 0.64 });
    const third = await nodeScreenPoint(page, FRAME, { x: 0.88, y: 0.84 });
    const svgBefore = await renderedSvgMarkup(page);

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 26, first.y - 4, { steps: 3 });
    await page.mouse.up();
    await expect.poll(() => draftControlHandleCount(page)).toBeGreaterThan(0);
    await expect.poll(() => draftControlLineCount(page)).toBeGreaterThan(0);
    const draftControl = await draftControlHandleCenter(page, 0);
    await expect.poll(() => topmostAt(page, draftControl)).toMatchObject({ tagName: "circle" });
    await page.mouse.move(draftControl.x, draftControl.y);
    await page.mouse.down();
    await page.mouse.move(draftControl.x + 8, draftControl.y + 10, { steps: 3 });
    await page.mouse.up();
    await page.mouse.click(second.x, second.y);
    await expect.poll(() => draftControlHandleCount(page)).toBeGreaterThan(0);
    await page.mouse.move(third.x, third.y);
    await page.mouse.down();
    await page.mouse.move(third.x - 18, third.y + 16, { steps: 3 });
    await expect.poll(() => draftControlLineCount(page)).toBeGreaterThan(0);
    await expect.poll(() => draftControlHandleCount(page)).toBeGreaterThan(0);
    await page.mouse.up();
    const startAnchor = await draftAnchorHandleCenter(page, 0);
    await expect.poll(() => topmostAt(page, startAnchor)).toMatchObject({
      ariaLabel: "Draft vector path anchor handle 1",
      tagName: "circle",
    });
    await page.mouse.click(startAnchor.x, startAnchor.y);

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    await expect.poll(() => firstEditablePathData(page)).toContain("C ");
    await expect.poll(() => firstEditablePathData(page)).toMatch(/ Z$/);
    await expect.poll(async () => (await firstEditablePathData(page)).match(/C/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    await expect.poll(() => anchorHandleCount(page)).toBe(3);
  });

  test("does not include bezier control handles in the committed vector bounding box", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.54, y: 0.88 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.86, y: 0.88 });
    const svgBefore = await renderedSvgMarkup(page);

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 18, first.y - 110, { steps: 5 });
    await page.mouse.up();
    const control = await draftControlHandleCenter(page, 0);
    await expect.poll(() => topmostAt(page, control)).toMatchObject({ tagName: "circle" });
    await page.mouse.click(second.x, second.y);
    await page.keyboard.press("Enter");

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    const bounds = await selectionBoxPageBounds(page);
    expect(bounds.pageY).toBeGreaterThan(control.y + 8);
  });

  test("commits an in-progress bezier draft when leaving the pen tool with Escape or toolbar selection", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.52, y: 0.78 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.68, y: 0.64 });
    const third = await nodeScreenPoint(page, FRAME, { x: 0.84, y: 0.78 });
    const svgBeforeEscapeCommit = await renderedSvgMarkup(page);
    const pathStrokeCountBeforeEscapeCommit = committedVectorPathStrokeCount(svgBeforeEscapeCommit);

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 24, first.y - 12, { steps: 3 });
    await page.mouse.up();
    await expect.poll(() => draftControlLineCount(page)).toBeGreaterThan(0);
    await page.mouse.click(second.x, second.y);
    await page.mouse.click(third.x, third.y);
    await page.keyboard.press("Escape");

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeEscapeCommit);
    await expect.poll(() => draftAnchorHandleCount(page)).toBe(0);
    await expect.poll(async () => committedVectorPathStrokeCount(await renderedSvgMarkup(page))).toBe(pathStrokeCountBeforeEscapeCommit + 1);

    await page.locator('button[title="Vector Edit (P)"]').click();
    const nextFirst = await nodeScreenPoint(page, FRAME, { x: 0.54, y: 0.86 });
    const nextSecond = await nodeScreenPoint(page, FRAME, { x: 0.70, y: 0.90 });
    const svgBeforeToolCommit = await renderedSvgMarkup(page);
    const pathStrokeCountBeforeToolCommit = committedVectorPathStrokeCount(svgBeforeToolCommit);
    await page.mouse.click(nextFirst.x, nextFirst.y);
    await page.mouse.click(nextSecond.x, nextSecond.y);
    await page.locator('button[title="Select (V)"]').click();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeToolCommit);
    await expect.poll(() => draftAnchorHandleCount(page)).toBe(0);
    await expect.poll(async () => committedVectorPathStrokeCount(await renderedSvgMarkup(page))).toBe(pathStrokeCountBeforeToolCommit + 1);
  });

  test("moves the first draft anchor instead of closing until the user clicks it", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.56, y: 0.80 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.78, y: 0.74 });
    const svgBefore = await renderedSvgMarkup(page);
    const pathStrokeCountBefore = committedVectorPathStrokeCount(svgBefore);

    await page.mouse.click(first.x, first.y);
    await page.mouse.click(second.x, second.y);
    await expect.poll(() => draftAnchorHandleCount(page)).toBe(2);

    const startBefore = await draftAnchorHandleCenter(page, 0);
    await expect.poll(() => topmostAt(page, startBefore)).toMatchObject({ tagName: "circle" });
    await page.mouse.move(startBefore.x, startBefore.y);
    await page.mouse.down();
    await page.mouse.move(startBefore.x + 16, startBefore.y - 12, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => draftAnchorHandleCount(page)).toBe(2);
    await expect.poll(async () => committedVectorPathStrokeCount(await renderedSvgMarkup(page))).toBe(pathStrokeCountBefore);
    const startAfter = await draftAnchorHandleCenter(page, 0);
    expect(startAfter.x).toBeGreaterThan(startBefore.x + 8);
    expect(startAfter.y).toBeLessThan(startBefore.y - 6);

    await page.mouse.click(startAfter.x, startAfter.y);
    await expect.poll(() => draftAnchorHandleCount(page)).toBe(0);
    await expect.poll(async () => committedVectorPathStrokeCount(await renderedSvgMarkup(page))).toBe(pathStrokeCountBefore + 1);
    await expect.poll(() => firstEditablePathData(page)).toMatch(/ Z$/);
  });

  test("keeps vector edit overlay stroke sizes stable across viewport zoom", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.50, y: 0.88 });

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 24, first.y - 12, { steps: 3 });
    await page.mouse.up();
    await expect.poll(() => draftControlLineCount(page)).toBeGreaterThan(0);

    const lineStrokeBefore = await draftControlLineStrokeWidth(page);
    const hitStrokeBefore = await draftSegmentStrokeWidth(page);
    await page.keyboard.down("Meta");
    await page.mouse.wheel(0, -600);
    await page.keyboard.up("Meta");

    await expect.poll(() => draftControlLineStrokeWidth(page)).toBe(lineStrokeBefore);
    await expect.poll(() => draftSegmentStrokeWidth(page)).toBe(hitStrokeBefore);
  });
});
