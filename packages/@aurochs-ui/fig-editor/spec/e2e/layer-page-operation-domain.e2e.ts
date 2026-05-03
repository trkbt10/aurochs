/** @file Browser coverage for layer/page panels consuming the operation domain. */

import { expect, test, type Page } from "@playwright/test";

const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };
const VECTOR = { pageX: 330, pageY: 310, width: 120, height: 100 };
const TEXT = { pageX: 50, pageY: 50, width: 200, height: 30 };

test.describe("Fig editor layer and page panels operation domain", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg&panel=all");
    await waitForEditor(page);
  });

  test("selects and renames layers when select intent allows panel mutations", async ({ page }) => {
    await page.getByRole("treeitem", { name: /Rectangle/ }).click();
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(RECT);

    await page.getByRole("treeitem", { name: /Rectangle/ }).dblclick();
    const renameInput = page.getByLabel("Rename Rectangle");
    await expect(renameInput).toBeVisible();
    await renameInput.fill("Panel Rect");
    await page.keyboard.press("Enter");

    await expect(page.getByRole("treeitem", { name: /Panel Rect/ })).toBeVisible();
  });

  test("disables page mutation and layer rename during text and vector edit intents", async ({ page }) => {
    await clickNode(page, TEXT);
    await doubleClickNode(page, TEXT);

    await expect(page.getByRole("button", { name: "Add Page" })).toBeDisabled();
    await page.getByRole("treeitem", { name: /Rectangle/ }).dblclick();
    await expect(page.getByLabel("Rename Rectangle")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await clickNode(page, VECTOR);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect(page.getByRole("button", { name: "Add Page" })).toBeDisabled();
    await page.getByRole("treeitem", { name: /Rectangle/ }).dblclick();
    await expect(page.getByLabel("Rename Rectangle")).toHaveCount(0);
  });

  test("keeps page mutation disabled while a canvas transform is active", async ({ page }) => {
    await clickNode(page, RECT);
    await expect(page.getByRole("button", { name: "Add Page" })).toBeEnabled();

    const point = await nodeScreenPoint(page, RECT, { x: 0.15, y: 0.5 });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 12, point.y + 4, { steps: 4 });

    await expect(page.getByRole("button", { name: "Add Page" })).toBeDisabled();

    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Add Page" })).toBeEnabled();
  });
});

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(document.querySelector("img[src^='data:image/svg+xml']") && document.querySelector("rect[fill='transparent']")),
    { timeout: 10_000 },
  );
}

async function clickNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<void> {
  const point = await nodeScreenPoint(page, node, { x: 0.5, y: 0.5 });
  await page.mouse.click(point.x, point.y);
}

async function doubleClickNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<void> {
  const point = await nodeScreenPoint(page, node, { x: 0.5, y: 0.5 });
  await page.mouse.dblclick(point.x, point.y);
}

async function nodeScreenPoint(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
  ratio: { readonly x: number; readonly y: number },
): Promise<{ readonly x: number; readonly y: number }> {
  const point = await page.evaluate(
    ({ pageX, pageY, width, height, ratioX, ratioY }) => {
      const rect = Array.from(document.querySelectorAll<SVGRectElement>("rect[fill='transparent']")).find((candidate) => {
        const x = Number(candidate.getAttribute("x"));
        const y = Number(candidate.getAttribute("y"));
        const candidateWidth = Number(candidate.getAttribute("width"));
        const candidateHeight = Number(candidate.getAttribute("height"));
        return (
          Math.abs(x - pageX) < 1 &&
          Math.abs(y - pageY) < 1 &&
          Math.abs(candidateWidth - width) < 1 &&
          Math.abs(candidateHeight - height) < 1
        );
      }) ?? null;
      if (!rect) {
        return null;
      }
      const bounds = rect.getBoundingClientRect();
      return { x: bounds.left + bounds.width * ratioX, y: bounds.top + bounds.height * ratioY };
    },
    { ...node, ratioX: ratio.x, ratioY: ratio.y },
  );
  if (!point) {
    throw new Error(`Hit-area rect not found for node at (${node.pageX}, ${node.pageY})`);
  }
  return point;
}

async function selectionBoxPageBounds(page: Page): Promise<{
  readonly pageX: number;
  readonly pageY: number;
  readonly width: number;
  readonly height: number;
}> {
  return page.evaluate(() => {
    const rect = Array.from(document.querySelectorAll<SVGRectElement>("rect[vector-effect='non-scaling-stroke']")).find((candidate) => {
      return candidate.getAttribute("fill") === "none" && candidate.getAttribute("stroke") !== "transparent";
    }) ?? null;
    if (!rect) {
      throw new Error("Selection box was not found");
    }
    return {
      pageX: Number(rect.getAttribute("x")),
      pageY: Number(rect.getAttribute("y")),
      width: Number(rect.getAttribute("width")),
      height: Number(rect.getAttribute("height")),
    };
  });
}
