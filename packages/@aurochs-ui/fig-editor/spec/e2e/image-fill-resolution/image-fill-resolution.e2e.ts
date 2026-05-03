/** @file Browser regression coverage for fig image asset resolution. */

import { expect, test, type Page } from "@playwright/test";

const IMAGE_FILL_RECT = { pageX: 960, pageY: 310, width: 90, height: 70 };

test.describe("Fig editor image fill resolution", () => {
  test("renders image fills from the document image map in SVG renderer", async ({ page }) => {
    await page.goto("/?renderer=svg");
    await waitForEditor(page);

    await expect.poll(() => renderedSvgMarkup(page)).toContain("data:image/png;base64,");
  });

  test("uploads image fills into the WebGL texture pipeline", async ({ page }) => {
    await page.goto("/?renderer=webgl");
    await waitForEditor(page);

    await expect.poll(() => webglNonWhitePixelCountInNode(page, IMAGE_FILL_RECT)).toBeGreaterThan(0);
  });
});

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(
      (document.querySelector("img[src^='data:image/svg+xml']") || document.querySelector("canvas")) &&
      document.querySelector("rect[fill='transparent']"),
    ),
    { timeout: 10_000 },
  );
}

async function renderedSvgMarkup(page: Page): Promise<string> {
  return page.evaluate(() => {
    const svgImage = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
    if (!svgImage?.src) {
      throw new Error("Rendered SVG image was not found");
    }
    return decodeURIComponent(svgImage.src.substring(svgImage.src.indexOf(",") + 1));
  });
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

async function webglNonWhitePixelCountInNode(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<number> {
  const center = await nodeScreenPoint(page, node, { x: 0.5, y: 0.5 });
  return page.evaluate(({ x, y }) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error("WebGL canvas was not found");
    }
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
      throw new Error("WebGL context was not available");
    }
    const canvasRect = canvas.getBoundingClientRect();
    const sampleOffsets = [-12, -6, 0, 6, 12];
    return sampleOffsets.reduce((matchingPixels, offsetX) => {
      return matchingPixels + sampleOffsets.reduce((rowMatches, offsetY) => {
        const pixel = new Uint8Array(4);
        const pixelX = Math.floor((x + offsetX - canvasRect.left) * (canvas.width / canvasRect.width));
        const pixelY = Math.floor((canvasRect.bottom - (y + offsetY)) * (canvas.height / canvasRect.height));
        gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        const isOpaque = (pixel[3] ?? 0) > 200;
        const isWhite = (pixel[0] ?? 0) > 245 && (pixel[1] ?? 0) > 245 && (pixel[2] ?? 0) > 245;
        if (isOpaque && !isWhite) {
          return rowMatches + 1;
        }
        return rowMatches;
      }, 0);
    }, 0);
  }, center);
}
