/** @file Existing vector path editing operations. */

import { expect, test } from "@playwright/test";
import {
  VECTOR,
  anchorHandleCount,
  clickNode,
  controlLineCount,
  editablePathScreenPoint,
  firstAnchorHandleCenter,
  firstEditablePathData,
  openEditor,
  renderedSvgMarkup,
  rightClickAnchorHandle,
  topmostAt,
  vectorHandleCount,
} from "../shared/fig-editor-harness";

test.describe("existing vector path editing", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page, "?renderer=svg");
  });

  test("exposes vector edit from the toolbar and edits the selected path graphically", async ({ page }) => {
    await clickNode(page, VECTOR);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect.poll(() => vectorHandleCount(page)).toBeGreaterThan(0);
    const handleCountBeforeAdd = await vectorHandleCount(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    const firstAnchor = await firstAnchorHandleCenter(page);
    await expect.poll(() => topmostAt(page, firstAnchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(firstAnchor.x, firstAnchor.y);
    await page.mouse.down();
    await page.mouse.move(firstAnchor.x + 18, firstAnchor.y + 12, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);

    const addPoint = await editablePathScreenPoint(page, 0.62);
    await expect.poll(() => topmostAt(page, addPoint)).toMatchObject({ ariaLabel: "Editable vector path segment 1" });
    await page.mouse.click(addPoint.x, addPoint.y);

    await expect.poll(() => vectorHandleCount(page)).toBe(handleCountBeforeAdd + 1);
    const anchorCountAfterAdd = await anchorHandleCount(page);
    const controlLineCountBeforeConvert = await controlLineCount(page);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Convert Segment to Curve" }).click();

    await expect.poll(() => controlLineCount(page)).toBe(controlLineCountBeforeConvert + 2);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Convert Segment to Line" }).click();

    await expect.poll(() => controlLineCount(page)).toBe(controlLineCountBeforeConvert);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Delete Vector Point" }).click();

    await expect.poll(() => anchorHandleCount(page)).toBe(anchorCountAfterAdd - 1);
  });

  test("opens and closes an existing path through the vector context operation menu", async ({ page }) => {
    await clickNode(page, VECTOR);
    await page.locator('button[title="Vector Edit (P)"]').click();
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    await rightClickAnchorHandle(page, 1);
    await page.getByRole("menuitem", { name: "Open Vector Path" }).click();
    await expect.poll(() => firstEditablePathData(page)).not.toMatch(/ Z$/);

    await rightClickAnchorHandle(page, 1);
    await page.getByRole("menuitem", { name: "Close Vector Path" }).click();
    await expect.poll(() => firstEditablePathData(page)).toMatch(/ Z$/);
  });
});
