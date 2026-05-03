/** @file Browser coverage for paint/effect property operations. */

import { expect, test, type Page } from "@playwright/test";

const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };
const VECTOR = { pageX: 330, pageY: 310, width: 120, height: 100 };

test.describe("Fig editor paint and effect property operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg&panel=property");
    await waitForEditor(page);
  });

  test("edits fill gradient stops through the property panel and persists across selection turns", async ({ page }) => {
    await clickNode(page, RECT);
    const svgBefore = await decodedSvgImage(page);

    await page.getByLabel("Fill paint type 1").selectOption("GRADIENT_LINEAR");
    await page.getByLabel("Fill gradient stop 1 color 1").fill("#00ff00");
    await page.getByLabel("Fill gradient stop 2 color 1").fill("#0000ff");
    await page.getByLabel("Fill gradient stop 1 opacity 1").fill("50");
    await page.getByLabel("Fill gradient stop 2 position 1").fill("75");
    await page.getByLabel("Fill gradient handle 1 x 1").fill("10");
    await page.getByLabel("Fill gradient handle 1 y 1").fill("20");
    await page.getByLabel("Fill gradient add stop 1").click();
    await page.getByLabel("Fill gradient stop 2 color 1").fill("#ffffff");
    await page.getByLabel("Fill gradient remove stop 2 1").click();

    await expect.poll(() => gradientStopColors(decodedSvgImage(page))).toEqual(["#00ff00", "#0000ff"]);
    await expect.poll(() => gradientStopOpacities(decodedSvgImage(page))).toContain("0.5");

    await page.getByLabel("Fill gradient stop 1 color 1").fill("#ff0000");
    await expect.poll(() => gradientStopColors(decodedSvgImage(page))).toEqual(["#ff0000", "#0000ff"]);
    await expect.poll(() => decodedSvgImage(page)).not.toBe(svgBefore);

    await clickNode(page, VECTOR);
    await clickNode(page, RECT);

    await expect(page.getByLabel("Fill paint type 1")).toHaveValue("GRADIENT_LINEAR");
    await expect(page.getByLabel("Fill gradient stop 1 color 1")).toHaveValue("#ff0000");
    await expect(page.getByLabel("Fill gradient stop 1 opacity 1")).toHaveValue("50");
    await expect(page.getByLabel("Fill gradient stop 2 color 1")).toHaveValue("#0000ff");
    await expect(page.getByLabel("Fill gradient stop 2 position 1")).toHaveValue("75");
    await expect(page.getByLabel("Fill gradient handle 1 x 1")).toHaveValue("10");
    await expect(page.getByLabel("Fill gradient handle 1 y 1")).toHaveValue("20");
  });

  test("edits stroke gradient and effect fields through labeled controls over multiple turns", async ({ page }) => {
    await clickNode(page, RECT);

    await page.getByRole("button", { name: "Add stroke" }).click();
    await page.getByLabel("Stroke weight").fill("6");
    await page.getByLabel("Stroke align").selectOption("OUTSIDE");
    await page.getByLabel("Stroke cap").selectOption("ROUND");
    await page.getByLabel("Stroke join").selectOption("BEVEL");
    await page.getByLabel("Stroke dash pattern").fill("4 2");
    await page.getByLabel("Stroke paint type 1").selectOption("GRADIENT_LINEAR");
    await page.getByLabel("Stroke gradient stop 1 color 1").fill("#ffff00");
    await page.getByLabel("Stroke gradient stop 2 color 1").fill("#000000");
    await page.getByLabel("Stroke gradient stop 2 opacity 1").fill("70");
    await page.getByLabel("Stroke gradient stop 1 position 1").fill("10");
    await page.getByLabel("Stroke gradient handle 2 x 1").fill("90");

    await expect.poll(() => decodedSvgImage(page)).toContain("stroke=\"url(#");
    await expect.poll(() => gradientStopColors(decodedSvgImage(page))).toEqual(["#ffff00", "#000000"]);

    await page.getByRole("button", { name: "Add effect" }).click();
    const svgBeforeEffectEdit = await decodedSvgImage(page);
    await page.getByLabel("Effect visible 1").click();
    await page.getByLabel("Effect visible 1").click();
    await page.getByLabel("Drop Shadow blend mode").selectOption("MULTIPLY");
    await page.getByLabel("Drop Shadow radius").fill("14");
    await page.getByLabel("Drop Shadow offset x").fill("7");
    await page.getByLabel("Drop Shadow offset y").fill("9");
    await page.getByLabel("Drop Shadow spread").fill("3");
    await page.getByLabel("Drop Shadow color").fill("#ff00ff");
    await page.getByLabel("Drop Shadow opacity").fill("60");
    await page.getByLabel("Drop Shadow show behind node").click();

    await expect.poll(() => decodedSvgImage(page)).not.toBe(svgBeforeEffectEdit);

    await clickNode(page, VECTOR);
    await clickNode(page, RECT);

    await expect(page.getByLabel("Stroke weight")).toHaveValue("6");
    await expect(page.getByLabel("Stroke align")).toHaveValue("OUTSIDE");
    await expect(page.getByLabel("Stroke cap")).toHaveValue("ROUND");
    await expect(page.getByLabel("Stroke join")).toHaveValue("BEVEL");
    await expect(page.getByLabel("Stroke dash pattern")).toHaveValue("4 2");
    await expect(page.getByLabel("Stroke paint type 1")).toHaveValue("GRADIENT_LINEAR");
    await expect(page.getByLabel("Stroke gradient stop 1 color 1")).toHaveValue("#ffff00");
    await expect(page.getByLabel("Stroke gradient stop 1 position 1")).toHaveValue("10");
    await expect(page.getByLabel("Stroke gradient stop 2 color 1")).toHaveValue("#000000");
    await expect(page.getByLabel("Stroke gradient stop 2 opacity 1")).toHaveValue("70");
    await expect(page.getByLabel("Stroke gradient handle 2 x 1")).toHaveValue("90");
    await expect(page.getByLabel("Drop Shadow blend mode")).toHaveValue("MULTIPLY");
    await expect(page.getByLabel("Drop Shadow radius")).toHaveValue("14");
    await expect(page.getByLabel("Drop Shadow offset x")).toHaveValue("7");
    await expect(page.getByLabel("Drop Shadow offset y")).toHaveValue("9");
    await expect(page.getByLabel("Drop Shadow spread")).toHaveValue("3");
    await expect(page.getByLabel("Drop Shadow color")).toHaveValue("#ff00ff");
    await expect(page.getByLabel("Drop Shadow opacity")).toHaveValue("60");
    await expect(page.getByLabel("Drop Shadow show behind node")).toHaveAttribute("aria-checked", "false");
  });

  test("renders stroke gradient decoration through the WebGL renderer instead of a flat stroke color", async ({ page }) => {
    await page.goto("/?renderer=webgl&panel=property");
    await waitForEditor(page);

    await clickNode(page, RECT);
    await page.getByRole("button", { name: "Add stroke" }).click();
    await page.getByLabel("Stroke weight").fill("18");
    await page.getByLabel("Stroke align").selectOption("CENTER");
    await page.getByLabel("Stroke paint type 1").selectOption("GRADIENT_LINEAR");
    await page.getByLabel("Stroke gradient stop 1 color 1").fill("#ff0000");
    await page.getByLabel("Stroke gradient stop 2 color 1").fill("#0000ff");

    await expect.poll(() => webglStrokeGradientSample(page, RECT)).toMatchObject({
      leftDominant: "red",
      rightDominant: "blue",
    });
  });
});

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean((document.querySelector("img[src^='data:image/svg+xml']") || document.querySelector("canvas")) && document.querySelector("rect[fill='transparent']")),
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
  return page.evaluate(() => {
    const svgImage = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
    if (!svgImage?.src) {
      throw new Error("Rendered SVG image was not found");
    }
    return decodeURIComponent(svgImage.src.substring(svgImage.src.indexOf(",") + 1));
  });
}

async function gradientStopColors(svgPromise: Promise<string>): Promise<readonly string[]> {
  const svg = await svgPromise;
  const gradient = svg.match(/<(linearGradient|radialGradient)\b[\s\S]*?<\/\1>/)?.[0] ?? "";
  return Array.from(gradient.matchAll(/stop-color="([^"]+)"/g)).map((match) => match[1] ?? "");
}

async function gradientStopOpacities(svgPromise: Promise<string>): Promise<readonly string[]> {
  const svg = await svgPromise;
  const gradient = svg.match(/<(linearGradient|radialGradient)\b[\s\S]*?<\/\1>/)?.[0] ?? "";
  return Array.from(gradient.matchAll(/stop-opacity="([^"]+)"/g)).map((match) => match[1] ?? "");
}

async function webglStrokeGradientSample(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
): Promise<{
  readonly leftDominant: "red" | "blue" | "other";
  readonly rightDominant: "red" | "blue" | "other";
}> {
  const left = await nodeScreenPoint(page, node, { x: 0.12, y: 0.03 });
  const right = await nodeScreenPoint(page, node, { x: 0.88, y: 0.03 });
  return page.evaluate(({ leftPoint, rightPoint }) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error("WebGL canvas was not found");
    }
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
      throw new Error("WebGL context was not available");
    }
    const canvasRect = canvas.getBoundingClientRect();
    const readPixel = (point: { readonly x: number; readonly y: number }): readonly number[] => {
      const pixel = new Uint8Array(4);
      const pixelX = Math.floor((point.x - canvasRect.left) * (canvas.width / canvasRect.width));
      const pixelY = Math.floor((canvasRect.bottom - point.y) * (canvas.height / canvasRect.height));
      gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0, pixel[3] ?? 0];
    };
    const dominant = (pixel: readonly number[]): "red" | "blue" | "other" => {
      const [red, green, blue, alpha] = pixel;
      if ((alpha ?? 0) < 180) { return "other"; }
      if ((red ?? 0) > (blue ?? 0) + 35 && (red ?? 0) > (green ?? 0) + 35) { return "red"; }
      if ((blue ?? 0) > (red ?? 0) + 35 && (blue ?? 0) > (green ?? 0) + 35) { return "blue"; }
      return "other";
    };
    return {
      leftDominant: dominant(readPixel(leftPoint)),
      rightDominant: dominant(readPixel(rightPoint)),
    };
  }, { leftPoint: left, rightPoint: right });
}
