/** @file Browser coverage for Kiwi-backed component and section operations. */

import { expect, test, type Page } from "@playwright/test";

const COMPONENT_INSTANCE = { pageX: 760, pageY: 70, width: 180, height: 60 };
const SECTION = { pageX: 760, pageY: 170, width: 180, height: 90 };
const VARIANT_COMPONENT = { pageX: 960, pageY: 80, width: 150, height: 70 };
const COMPONENT_SET = { pageX: 1120, pageY: 170, width: 220, height: 90 };
const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };

test.describe("Fig editor Kiwi-backed component and section operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg&panel=property");
    await waitForEditor(page);
  });

  test("edits component text and instance-swap properties and reflects them in the rendered instance", async ({ page }) => {
    await clickNode(page, COMPONENT_INSTANCE);

    await expect(page.getByLabel("Component property Label")).toHaveValue("Default label");
    await page.getByLabel("Component property Label").fill("Edited label");
    await expect.poll(() => decodedSvgImage(page)).toContain("Edited label");

    await page.getByLabel("Component property Icon").selectOption("21:2");
    await expect.poll(() => renderedGreenFillCount(page)).toBeGreaterThan(0);

    await page.getByLabel("Component property Show icon").uncheck();
    await expect.poll(() => renderedGreenFillCount(page)).toBe(0);

    await clickNode(page, RECT);
    await clickNode(page, COMPONENT_INSTANCE);

    await expect(page.getByLabel("Component property Label")).toHaveValue("Edited label");
    await expect(page.getByLabel("Component property Icon")).toHaveValue("21:2");
    await expect(page.getByLabel("Component property Show icon")).not.toBeChecked();
  });

  test("edits instance self override opacity and reflects it in the rendered instance", async ({ page }) => {
    await clickNode(page, COMPONENT_INSTANCE);
    const svgBefore = await decodedSvgImage(page);

    await page.getByLabel("Instance override opacity").fill("50");
    await expect(page.getByLabel("Instance override opacity")).toHaveValue("50");

    await expect.poll(() => decodedSvgImage(page)).not.toBe(svgBefore);
    await expect.poll(() => decodedSvgImage(page)).toContain('opacity="0.5"');

    await clickNode(page, RECT);
    await clickNode(page, COMPONENT_INSTANCE);

    await expect(page.getByLabel("Instance override opacity")).toHaveValue("50");
  });

  test("edits descendant override opacity and reflects the override path in render", async ({ page }) => {
    await clickNode(page, COMPONENT_INSTANCE);
    const svgBefore = await decodedSvgImage(page);

    await page.getByLabel("Override Button Label opacity").fill("40");
    await expect(page.getByLabel("Override Button Label opacity")).toHaveValue("40");

    await expect.poll(() => decodedSvgImage(page)).not.toBe(svgBefore);
    await expect.poll(() => decodedSvgImage(page)).toContain('opacity="0.4"');

    await clickNode(page, RECT);
    await clickNode(page, COMPONENT_INSTANCE);

    await expect(page.getByLabel("Override Button Label opacity")).toHaveValue("40");
  });

  test("edits sectionContentsHidden through the property panel and persists across selection turns", async ({ page }) => {
    await clickNode(page, SECTION);
    const toggle = page.getByRole("switch", { name: "Hide section contents" });

    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await clickNode(page, RECT);
    await clickNode(page, SECTION);

    await expect(page.getByRole("switch", { name: "Hide section contents" })).toHaveAttribute("aria-checked", "true");
  });

  test("edits component variant metadata and persists across selection turns", async ({ page }) => {
    await clickNode(page, VARIANT_COMPONENT);

    await expect(page.getByLabel("Variant value 1")).toHaveValue("Default");
    await page.getByLabel("Variant value 1").fill("Pressed");

    await clickNode(page, RECT);
    await clickNode(page, VARIANT_COMPONENT);

    await expect(page.getByLabel("Variant value 1")).toHaveValue("Pressed");
  });

  test("edits component set variant definitions and child values", async ({ page }) => {
    await clickNode(page, COMPONENT_SET);

    await expect(page.getByLabel("Variant property name 1")).toHaveValue("State");
    await page.getByLabel("Variant property name 1").fill("Mode");
    await page.getByLabel("Variant Primary value 1").fill("Rest");

    await clickNode(page, RECT);
    await clickNode(page, COMPONENT_SET);

    await expect(page.getByLabel("Variant property name 1")).toHaveValue("Mode");
    await expect(page.getByLabel("Variant Primary value 1")).toHaveValue("Rest");
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

async function decodedSvgImage(page: Page): Promise<string> {
  await page.waitForSelector("img[src^='data:image/svg+xml']", { timeout: 5_000 });
  return page.evaluate(() => {
    const svgImage = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
    if (!svgImage?.src) {
      throw new Error("Rendered SVG image was not found");
    }
    return decodeURIComponent(svgImage.src.substring(svgImage.src.indexOf(",") + 1));
  });
}

async function renderedGreenFillCount(page: Page): Promise<number> {
  const svg = await decodedSvgImage(page);
  return Array.from(svg.matchAll(/fill="([^"]+)"/g)).filter((match) => {
    const fill = match[1]?.replace(/\s+/g, "").toLowerCase();
    return fill === "rgb(0,255,0)" || fill === "rgba(0,255,0,1)" || fill === "#00ff00";
  }).length;
}
