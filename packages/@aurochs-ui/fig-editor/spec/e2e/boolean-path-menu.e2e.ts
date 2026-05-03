/** @file Browser coverage for fig boolean path operations from the context menu. */

import { expect, test, type Page } from "@playwright/test";

const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };
const ELLIPSE = { pageX: 130, pageY: 330, width: 120, height: 80 };

test.describe("Fig editor boolean path context menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg");
    await waitForSvgEditor(page);
  });

  test("creates a live union node and renders the evaluated boolean path", async ({ page }) => {
    await clickNode(page, RECT);
    await clickNode(page, ELLIPSE, { shift: true });
    await contextMenuNode(page, ELLIPSE);
    await expect(page.getByRole("menuitem", { name: "Union Selection" })).toHaveCSS("opacity", "1");
    await page.getByRole("menuitem", { name: "Union Selection" }).click();
    await page.waitForFunction(() => {
      const svgImage = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
      const svg = svgImage?.src ? decodeURIComponent(svgImage.src.substring(svgImage.src.indexOf(",") + 1)) : "";
      return svg.includes("<path");
    });

    const result = await page.evaluate(() => {
      const svgImage = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
      const svg = svgImage?.src ? decodeURIComponent(svgImage.src.substring(svgImage.src.indexOf(",") + 1)) : "";
      const hitAreas = Array.from(document.querySelectorAll<SVGRectElement>("rect[fill='transparent']")).map((rect) => ({
        x: Number(rect.getAttribute("x")),
        y: Number(rect.getAttribute("y")),
        width: Number(rect.getAttribute("width")),
        height: Number(rect.getAttribute("height")),
      }));
      return { svg, hitAreas };
    });

    expect(result.svg).toContain("<path");
    expect(result.svg).not.toContain(">Rectangle<");
    expect(result.hitAreas.some((rect) => rect.x === 50 && rect.y === 310 && rect.width === 200 && rect.height === 100)).toBe(true);
  });
});

async function waitForSvgEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const image = document.querySelector("img[src^='data:image/svg+xml']");
      const hitArea = document.querySelector("rect[fill='transparent']");
      return Boolean(image && hitArea);
    },
    { timeout: 10_000 },
  );
}

async function clickNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
  options: { readonly shift?: boolean } = {},
): Promise<void> {
  const center = await nodeCenter(page, node);
  if (options.shift) {
    await page.keyboard.down("Shift");
    await page.mouse.click(center.x, center.y);
    await page.keyboard.up("Shift");
    return;
  }
  await page.mouse.click(center.x, center.y);
}

async function contextMenuNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<void> {
  const center = await nodeCenter(page, node);
  await page.mouse.click(center.x, center.y, { button: "right" });
}

async function nodeCenter(
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
