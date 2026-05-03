/** @file Browser coverage for selecting elements inside frames. */

import { expect, test, type Page } from "@playwright/test";

const FRAME = { pageX: 520, pageY: 300, width: 220, height: 150 };
const INNER_FRAME = { pageX: 548, pageY: 322, width: 160, height: 110 };
const FRAME_CHILD = { pageX: 582, pageY: 350, width: 92, height: 58 };

test.describe("Fig editor frame hit testing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg");
    await waitForEditor(page);
  });

  test("selects a child element inside a frame instead of letting the frame absorb the click", async ({ page }) => {
    await clickNodeAt(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await clickNodeAt(page, INNER_FRAME, { x: 0.9, y: 0.86 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(INNER_FRAME);

    await clickNodeAt(page, FRAME_CHILD, { x: 0.5, y: 0.5 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD);
  });
});

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(document.querySelector("img[src^='data:image/svg+xml']") && document.querySelector("rect[fill='transparent']")),
    { timeout: 10_000 },
  );
}

async function clickNodeAt(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
  ratio: { readonly x: number; readonly y: number },
): Promise<void> {
  const point = await nodeScreenPoint(page, node, ratio);
  await page.mouse.click(point.x, point.y);
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
