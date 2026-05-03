/**
 * @file SVG fig-editor text editing visual parity tests.
 *
 * Guards against text appearance changing during edit. Text pixels must keep
 * coming from the selected renderer backend; the inline overlay may only draw
 * caret/selection chrome.
 */

import { expect, test, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { createPngImage, readPng } from "@aurochs/png";

const HELLO_TEXT = { pageX: 50, pageY: 50, width: 200, height: 30 };
const WRAPPED_TEXT = { pageX: 260, pageY: 50, width: 60, height: 80 };

test.describe("Fig editor SVG text editing visual parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg");
    await waitForSvgEditor(page);
  });

  test("keeps text rendering in the SVG backend while overlay text is not duplicated", async ({ page }) => {
    expect(await decodedSvgImage(page)).toContain("Hello World");
    const textClip = await textInteriorClip(page, HELLO_TEXT);
    const beforeEdit = readPng(await page.screenshot({ clip: textClip }));

    await doubleClickNode(page, HELLO_TEXT);
    await page.locator("textarea").waitFor({ state: "attached" });
    const duringEdit = readPng(await page.screenshot({ clip: textClip }));

    const editingState = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
      const svg = img?.src ? decodeURIComponent(img.src.substring(img.src.indexOf(",") + 1)) : "";
      const overlayTexts = Array.from(document.querySelectorAll<SVGTextElement>("svg text"))
        .map((text) => text.textContent ?? "")
        .filter((text) => text.includes("Hello World"));
      return { svg, overlayTextCount: overlayTexts.length };
    });

    expect(editingState.svg).toContain("Hello World");
    expect(editingState.overlayTextCount).toBe(0);
    expect(countDifferentPixels(beforeEdit, duringEdit)).toBeLessThanOrEqual(25);

    await fillHiddenCanvasTextarea(page, "Edited SVG text");
    const afterEditState = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
      const svg = img?.src ? decodeURIComponent(img.src.substring(img.src.indexOf(",") + 1)) : "";
      const overlayTexts = Array.from(document.querySelectorAll<SVGTextElement>("svg text"))
        .map((text) => text.textContent ?? "")
        .filter((text) => text.includes("Edited SVG text"));
      return { svg, overlayTextCount: overlayTexts.length };
    });

    expect(afterEditState.svg).toContain("Edited SVG text");
    expect(afterEditState.overlayTextCount).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.locator("textarea")).toHaveCount(0);
    expect(await decodedSvgImage(page)).toContain("Edited SVG text");
  });

  test("maps wrapped source selection to the rendered visual line", async ({ page }) => {
    const svgBeforeEdit = await decodedSvgImage(page);
    expect(svgBeforeEdit).toContain(">Hello<");
    expect(svgBeforeEdit).toContain(">World<");

    await doubleClickNode(page, WRAPPED_TEXT);
    await page.locator("textarea").waitFor({ state: "attached" });
    await setHiddenCanvasTextareaSelection(page, 6, 11);
    await page.waitForFunction(() => document.querySelectorAll("svg rect[fill-opacity='0.3']").length === 1);

    const selectionRects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<SVGRectElement>("svg rect[fill-opacity='0.3']")).map((rect) => ({
        x: Number(rect.getAttribute("x")),
        y: Number(rect.getAttribute("y")),
        width: Number(rect.getAttribute("width")),
        height: Number(rect.getAttribute("height")),
      }));
    });

    expect(selectionRects).toHaveLength(1);
    expect(selectionRects[0].x).toBeCloseTo(0, 1);
    expect(selectionRects[0].width).toBeGreaterThan(30);
    expect(selectionRects[0].y).toBeGreaterThan(15);

    await setHiddenCanvasTextareaSelection(page, 5, 6);
    await page.waitForFunction(() => document.querySelectorAll("svg rect[fill-opacity='0.3']").length === 0);
    const suppressedWhitespaceRects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<SVGRectElement>("svg rect[fill-opacity='0.3']")).map((rect) => ({
        width: Number(rect.getAttribute("width")),
      }));
    });
    expect(suppressedWhitespaceRects).toHaveLength(0);
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

async function decodedSvgImage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
    if (!img) {
      throw new Error("SVG renderer image was not found");
    }
    return decodeURIComponent(img.src.substring(img.src.indexOf(",") + 1));
  });
}

async function doubleClickNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<void> {
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
  await page.mouse.dblclick(center.x, center.y);
}

async function textInteriorClip(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await page.evaluate(
    ({ pageX, pageY, width, height }) => {
      const hit = Array.from(document.querySelectorAll<SVGRectElement>("rect[fill='transparent']")).find((candidate) => {
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
      if (!hit) {
        return null;
      }
      const bounds = hit.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    },
    node,
  );
  if (!rect) {
    throw new Error(`Hit-area rect not found for node at (${node.pageX}, ${node.pageY})`);
  }
  return {
    x: rect.x + 6,
    y: rect.y + 6,
    width: Math.min(92, rect.width - 12),
    height: Math.min(18, rect.height - 12),
  };
}

function countDifferentPixels(before: ReturnType<typeof readPng>, after: ReturnType<typeof readPng>): number {
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error(`Screenshot sizes differ: ${before.width}x${before.height} vs ${after.width}x${after.height}`);
  }
  const diff = createPngImage({ width: before.width, height: before.height });
  return pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.05, includeAA: true });
}

async function fillHiddenCanvasTextarea(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    const textarea = Array.from(document.querySelectorAll("textarea")).find((ta) => {
      return window.getComputedStyle(ta).opacity === "0";
    });
    if (!textarea) {
      throw new Error("Canvas text edit textarea was not found");
    }
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    textarea.focus();
    valueSetter?.call(textarea, value);
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  }, text);
}

async function setHiddenCanvasTextareaSelection(page: Page, start: number, end: number): Promise<void> {
  await page.evaluate(({ startOffset, endOffset }) => {
    const textarea = Array.from(document.querySelectorAll("textarea")).find((ta) => {
      return window.getComputedStyle(ta).opacity === "0";
    });
    if (!textarea) {
      throw new Error("Canvas text edit textarea was not found");
    }
    textarea.focus();
    textarea.setSelectionRange(startOffset, endOffset);
    textarea.dispatchEvent(new Event("select", { bubbles: true }));
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  }, { startOffset: start, endOffset: end });
  await page.waitForFunction(
    ({ startOffset, endOffset }) => {
      const textarea = Array.from(document.querySelectorAll("textarea")).find((ta) => {
        return window.getComputedStyle(ta).opacity === "0";
      });
      return textarea?.selectionStart === startOffset && textarea.selectionEnd === endOffset;
    },
    { startOffset: start, endOffset: end },
  );
}
