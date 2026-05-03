/** @file Browser coverage for property panel operation-domain gating and edits. */

import { expect, test, type Locator, type Page } from "@playwright/test";

const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };
const VECTOR = { pageX: 330, pageY: 310, width: 120, height: 100 };
const TEXT = { pageX: 50, pageY: 50, width: 200, height: 30 };

test.describe("Fig editor property panel operation domain", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg&panel=property");
    await waitForEditor(page);
  });

  test("edits transform fields when select intent allows property mutation", async ({ page }) => {
    await clickNode(page, RECT);
    const xInput = page.getByRole("spinbutton", { name: "X", exact: true });

    await expect(xInput).toBeEnabled();
    await xInput.fill("70");
    await expect.poll(() => selectionBoxPageBounds(page)).toMatchObject({ pageX: 70, pageY: 310, width: 150, height: 80 });
  });

  test("applies fill color edits to every selected node, not only the primary node", async ({ page }) => {
    await clickNode(page, RECT);
    await shiftClickNode(page, VECTOR);

    await setColorInput(page.getByLabel("Fill color 1"), "#ff0000");

    await expect.poll(() => countRenderedRedFills(page)).toBeGreaterThanOrEqual(2);
  });

  test("disables inspector property mutation during text and vector edit intents", async ({ page }) => {
    await clickNode(page, TEXT);
    await doubleClickNode(page, TEXT);
    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toBeDisabled();

    await page.keyboard.press("Escape");
    await clickNode(page, RECT);
    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toBeEnabled();

    await page.locator('button[title="Vector Edit (P)"]').click();
    await expect(page.getByRole("spinbutton", { name: "X", exact: true })).toBeDisabled();
  });

  test("disables inspector property mutation while a canvas transform is active", async ({ page }) => {
    await clickNode(page, RECT);
    const xInput = page.getByRole("spinbutton", { name: "X", exact: true });
    await expect(xInput).toBeEnabled();

    const center = await nodeScreenPoint(page, RECT, { x: 0.15, y: 0.5 });
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 14, center.y + 6, { steps: 4 });

    await expect(xInput).toBeDisabled();

    await page.mouse.up();
    await expect(xInput).toBeEnabled();
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

async function shiftClickNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<void> {
  const point = await nodeScreenPoint(page, node, { x: 0.5, y: 0.5 });
  await page.keyboard.down("Shift");
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up("Shift");
}

async function setColorInput(locator: Locator, value: string): Promise<void> {
  await locator.evaluate((input, nextValue) => {
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected a color input");
    }
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function countRenderedRedFills(page: Page): Promise<number> {
  return page.evaluate(() => {
    const img = Array.from(document.querySelectorAll<HTMLImageElement>("img[src^='data:image/svg+xml']")).reduce<HTMLImageElement | null>((best, candidate) => {
      const rect = candidate.getBoundingClientRect();
      if (!best) {
        return candidate;
      }
      const bestRect = best.getBoundingClientRect();
      return rect.width * rect.height > bestRect.width * bestRect.height ? candidate : best;
    }, null);
    if (!img) {
      throw new Error("SVG renderer image was not found");
    }
    const svg = decodeURIComponent(img.src.substring(img.src.indexOf(",") + 1));
    const fills = Array.from(svg.matchAll(/fill="([^"]+)"/g)).map((match) => match[1]?.replace(/\s+/g, "").toLowerCase());
    return fills.filter((fill) => fill === "rgb(255,0,0)" || fill === "rgba(255,0,0,1)" || fill === "#ff0000").length;
  });
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
