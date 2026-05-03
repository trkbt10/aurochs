/** @file Isolated browser coverage for the Bezier path tool UI contract. */

import { expect, test, type Page } from "@playwright/test";

test.describe("isolated bezier path tool UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bezier-path-tool/");
    await expect(page.getByRole("application", { name: "Bezier path tool harness" })).toBeVisible();
  });

  test("creates, exposes, edits, closes, and commits a dragged bezier path without editor selection state", async ({ page }) => {
    const first = await harnessPoint(page, { x: 120, y: 220 });
    const firstControl = await harnessPoint(page, { x: 158, y: 82 });
    const second = await harnessPoint(page, { x: 280, y: 220 });

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(firstControl.x, firstControl.y, { steps: 5 });
    await expect.poll(() => draftControlLineCount(page)).toBeGreaterThan(0);
    await page.mouse.up();

    await expect.poll(() => draftControlLineCount(page)).toBeGreaterThan(0);
    const controlCenter = await draftControlCenter(page);
    await expect.poll(() => topmostAt(page, controlCenter)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(controlCenter.x, controlCenter.y);
    await page.mouse.down();
    await page.mouse.move(controlCenter.x + 12, controlCenter.y + 10, { steps: 3 });
    await page.mouse.up();

    await page.mouse.click(second.x, second.y);
    await expect.poll(() => draftAnchorCount(page)).toBe(2);
    const startAnchor = await draftAnchorCenter(page, 0);
    await page.mouse.click(startAnchor.x, startAnchor.y);

    await expect(page.getByLabel("Committed bezier path")).toBeVisible();
    await expect.poll(() => draftAnchorCount(page)).toBe(0);
    await expect.poll(() => committedPathData(page)).toContain("C ");
    await expect.poll(() => committedPathData(page)).toMatch(/ Z$/);

    const bounds = await committedBounds(page);
    const movedControl = await harnessPoint(page, { x: 170, y: 92 });
    expect(bounds.y).toBeGreaterThan(movedControl.viewY + 8);
  });

  test("commits an open dragged bezier path through keyboard intent", async ({ page }) => {
    const first = await harnessPoint(page, { x: 80, y: 200 });
    const control = await harnessPoint(page, { x: 130, y: 90 });
    const second = await harnessPoint(page, { x: 300, y: 200 });

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(control.x, control.y, { steps: 4 });
    await page.mouse.up();
    await page.mouse.click(second.x, second.y);
    await page.keyboard.press("Escape");

    await expect(page.getByLabel("Committed bezier path")).toBeVisible();
    await expect.poll(() => committedPathData(page)).toContain("C ");
    await expect.poll(() => committedPathData(page)).not.toMatch(/ Z$/);
  });

  test("keeps the start anchor editable until a click explicitly closes the draft", async ({ page }) => {
    const first = await harnessPoint(page, { x: 110, y: 210 });
    const second = await harnessPoint(page, { x: 280, y: 180 });

    await page.mouse.click(first.x, first.y);
    await page.mouse.click(second.x, second.y);
    await expect.poll(() => draftAnchorCount(page)).toBe(2);

    const startBefore = await draftAnchorCenter(page, 0);
    await page.mouse.move(startBefore.x, startBefore.y);
    await page.mouse.down();
    await page.mouse.move(startBefore.x + 24, startBefore.y - 18, { steps: 4 });
    await page.mouse.up();

    await expect(page.getByLabel("Committed bezier path")).toBeHidden();
    await expect.poll(() => draftAnchorCount(page)).toBe(2);
    const startAfter = await draftAnchorCenter(page, 0);
    expect(startAfter.x).toBeGreaterThan(startBefore.x + 16);
    expect(startAfter.y).toBeLessThan(startBefore.y - 10);

    await page.mouse.click(startAfter.x, startAfter.y);
    await expect(page.getByLabel("Committed bezier path")).toBeVisible();
    await expect.poll(() => committedPathData(page)).toMatch(/ Z$/);
  });
});

async function harnessPoint(
  page: Page,
  point: { readonly x: number; readonly y: number },
): Promise<{ readonly x: number; readonly y: number; readonly viewX: number; readonly viewY: number }> {
  const bounds = await page.getByRole("application", { name: "Bezier path tool harness" }).boundingBox();
  if (!bounds) {
    throw new Error("Bezier harness bounds were not available");
  }
  return {
    x: bounds.x + bounds.width * point.x / 400,
    y: bounds.y + bounds.height * point.y / 300,
    viewX: point.x,
    viewY: point.y,
  };
}

async function draftAnchorCount(page: Page): Promise<number> {
  return page.locator("circle[role='button'][aria-label^='Draft bezier anchor']").count();
}

async function draftControlLineCount(page: Page): Promise<number> {
  return page.locator("line[aria-label='Draft bezier control line']").count();
}

async function draftAnchorCenter(page: Page, index: number): Promise<{ readonly x: number; readonly y: number }> {
  const handle = page.locator("circle[role='button'][aria-label^='Draft bezier anchor']").nth(index);
  await expect(handle).toBeVisible();
  const bounds = await handle.boundingBox();
  if (!bounds) {
    throw new Error("Draft bezier anchor bounds were not available");
  }
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

async function draftControlCenter(page: Page): Promise<{ readonly x: number; readonly y: number }> {
  const handle = page.locator("circle[role='button'][aria-label^='Draft bezier control']").first();
  await expect(handle).toBeVisible();
  const bounds = await handle.boundingBox();
  if (!bounds) {
    throw new Error("Draft bezier control bounds were not available");
  }
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

async function committedPathData(page: Page): Promise<string> {
  const data = await page.getByLabel("Committed bezier path").getAttribute("d");
  if (!data) {
    throw new Error("Committed bezier path data was not available");
  }
  return data;
}

async function committedBounds(page: Page): Promise<{ readonly x: number; readonly y: number; readonly width: number; readonly height: number }> {
  const rect = page.getByLabel("Committed bezier bounds");
  await expect(rect).toBeVisible();
  return {
    x: Number(await rect.getAttribute("x")),
    y: Number(await rect.getAttribute("y")),
    width: Number(await rect.getAttribute("width")),
    height: Number(await rect.getAttribute("height")),
  };
}

async function topmostAt(page: Page, point: { readonly x: number; readonly y: number }): Promise<{
  readonly tagName: string;
  readonly ariaLabel: string | null;
}> {
  return page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    if (!element) {
      throw new Error(`No element at (${x}, ${y})`);
    }
    return {
      tagName: element.tagName.toLowerCase(),
      ariaLabel: element.getAttribute("aria-label"),
    };
  }, point);
}
