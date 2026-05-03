/** @file E2E tests for selection chrome under zoom. */

import { expect, test, type Page } from "@playwright/test";

const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };

test.describe("Fig editor selection box zoom invariance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg");
    await waitForEditor(page);
  });

  test("keeps selection stroke screen-sized while zooming", async ({ page }) => {
    await clickNode(page, RECT);
    const before = await selectionChromeMetrics(page);

    await zoomAtCanvasCenter(page, 5);
    const after = await selectionChromeMetrics(page);

    expect(before.strokeWidth).toBe("2");
    expect(after.strokeWidth).toBe("2");
    expect(after.selectionRectWidth).toBeGreaterThan(before.selectionRectWidth * 1.2);
  });
});

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(document.querySelector("rect[fill='transparent']")),
    { timeout: 10_000 },
  );
}

async function clickNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<void> {
  const center = await nodeScreenCenter(page, node);
  await page.mouse.click(center.x, center.y);
}

async function nodeScreenCenter(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<{ readonly x: number; readonly y: number }> {
  const center = await page.evaluate(
    ({ pageX, pageY, width, height }) => {
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
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    },
    node,
  );
  if (!center) {
    throw new Error(`Hit-area rect not found for node at (${node.pageX}, ${node.pageY})`);
  }
  return center;
}

async function selectionChromeMetrics(page: Page): Promise<{
  readonly strokeWidth: string | null;
  readonly selectionRectWidth: number;
}> {
  return page.evaluate(() => {
    const selectionRect = Array.from(document.querySelectorAll<SVGRectElement>("rect[vector-effect='non-scaling-stroke']")).find((rect) => {
      return rect.getAttribute("fill") === "none" && rect.getAttribute("stroke") !== "transparent";
    }) ?? null;
    if (!selectionRect) {
      throw new Error("Selection rect was not found");
    }
    const selectionBounds = selectionRect.getBoundingClientRect();
    return {
      strokeWidth: selectionRect.getAttribute("stroke-width"),
      selectionRectWidth: selectionBounds.width,
    };
  });
}

async function zoomAtCanvasCenter(page: Page, steps: number): Promise<void> {
  const point = await page.evaluate(() => {
    const hitArea = document.querySelector<SVGRectElement>("rect[fill='transparent']");
    const svg = hitArea?.ownerSVGElement ?? null;
    if (!svg) {
      throw new Error("Canvas SVG was not found");
    }
    const rect = svg.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.move(point.x, point.y);
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.down(modifier);
    await page.mouse.wheel(0, -240);
    await page.keyboard.up(modifier);
  }
}
