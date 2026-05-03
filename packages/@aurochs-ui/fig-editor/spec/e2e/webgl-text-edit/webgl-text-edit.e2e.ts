/**
 * @file WebGL fig-editor text editing smoke tests.
 *
 * Verifies that the React editor shell can edit text while the rendered
 * pixels come from the WebGL backend.
 */

import { expect, test, type Page } from "@playwright/test";

const HELLO_TEXT = { pageX: 50, pageY: 50, width: 200, height: 30 };
const WRAPPED_TEXT = { pageX: 260, pageY: 50, width: 60, height: 80 };

test.use({ deviceScaleFactor: 2 });

test.describe("Fig editor WebGL text editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=webgl");
    await waitForWebGLEditor(page);
  });

  test("uses a WebGL canvas and transparent text-edit input", async ({ page }) => {
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveCount(1);

    const canvasMetrics = await canvas.evaluate((node) => ({
      ratio: node.width / node.clientWidth,
      backingPixels: node.width * node.height,
      beforeEditPixels: node.toDataURL("image/png"),
    }));
    expect(canvasMetrics.ratio).toBeGreaterThan(0);
    expect(canvasMetrics.backingPixels).toBeLessThanOrEqual(4_100_000);

    await doubleClickNode(page, HELLO_TEXT);
    await page.locator("textarea").waitFor({ state: "attached" });
    await fillHiddenCanvasTextarea(page, "WebGL text\nwrap parity");
    await expect.poll(
      () => canvas.evaluate((node) => node.toDataURL("image/png")),
      { timeout: 5_000 },
    ).not.toBe(canvasMetrics.beforeEditPixels);

    const editorState = await page.evaluate(() => {
      const textarea = Array.from(document.querySelectorAll("textarea")).find((ta) => {
        return window.getComputedStyle(ta).opacity === "0";
      });
      if (!textarea) {
        return null;
      }
      const style = window.getComputedStyle(textarea);
      const textRect = textarea.getBoundingClientRect();
      const canvas = document.querySelector("canvas");
      const canvasRect = canvas?.getBoundingClientRect();
      const serializeRect = (rect: DOMRect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      return {
        text: textarea.value,
        textareaBackground: style.backgroundColor,
        textareaOpacity: style.opacity,
        canvasWidth: canvas?.width ?? 0,
        canvasClientWidth: canvas?.clientWidth ?? 0,
        textRect: serializeRect(textRect),
        canvasRect: canvasRect ? serializeRect(canvasRect) : null,
      };
    });

    expect(editorState).not.toBeNull();
    expect(editorState?.text).toBe("WebGL text\nwrap parity");
    expect(editorState?.textareaBackground).toBe("rgba(0, 0, 0, 0)");
    expect(editorState?.textareaOpacity).toBe("0");
    expect(editorState?.canvasWidth).toBeGreaterThan(editorState?.canvasClientWidth ?? 0);
    expect(editorState?.textRect.width).toBeGreaterThan(0);
    expect(editorState?.canvasRect?.width).toBeGreaterThan(0);
  });

  test("uses shared wrapped text selection layout over WebGL", async ({ page }) => {
    await doubleClickNode(page, WRAPPED_TEXT);
    await page.locator("textarea").waitFor({ state: "attached" });
    await setHiddenCanvasTextareaSelection(page, 6, 11);
    await page.waitForFunction(() => document.querySelectorAll("svg rect[fill-opacity='0.3']").length === 1);

    const selectionRects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<SVGRectElement>("svg rect[fill-opacity='0.3']")).map((rect) => ({
        x: Number(rect.getAttribute("x")),
        y: Number(rect.getAttribute("y")),
        width: Number(rect.getAttribute("width")),
      }));
    });

    expect(selectionRects).toHaveLength(1);
    expect(selectionRects[0].x).toBeCloseTo(0, 1);
    expect(selectionRects[0].width).toBeGreaterThan(30);
    expect(selectionRects[0].y).toBeGreaterThan(15);
  });
});

async function waitForWebGLEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas");
      const hitArea = document.querySelector("rect[fill='transparent']");
      return Boolean(canvas && hitArea);
    },
    { timeout: 10_000 },
  );
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
}
