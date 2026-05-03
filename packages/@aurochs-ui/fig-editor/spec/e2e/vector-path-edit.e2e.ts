/** @file Browser coverage for first-class vector path editing. */

import { expect, test, type Page } from "@playwright/test";

const VECTOR = { pageX: 330, pageY: 310, width: 120, height: 100 };
const RECT = { pageX: 50, pageY: 310, width: 150, height: 80 };
const ELLIPSE = { pageX: 130, pageY: 330, width: 120, height: 80 };
const LINE = { pageX: 280, pageY: 455, width: 120, height: 40 };
const FRAME = { pageX: 520, pageY: 300, width: 220, height: 150 };
const FRAME_CHILD = { pageX: 582, pageY: 350, width: 92, height: 58 };
const FRAME_CHILD_VECTOR = { pageX: 646, pageY: 340, width: 58, height: 42 };
const COVERING_GROUP = { pageX: 760, pageY: 300, width: 170, height: 120 };
const GROUP_CHILD = { pageX: 784, pageY: 326, width: 90, height: 54 };

test.describe("Fig editor vector path edit tool", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?renderer=svg");
    await waitForEditor(page);
  });

  test("exposes vector edit from the toolbar and edits the selected path graphically", async ({ page }) => {
    await clickNode(page, VECTOR);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect.poll(() => vectorHandleCount(page)).toBeGreaterThan(0);
    const handleCountBeforeAdd = await vectorHandleCount(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    const firstAnchor = await firstAnchorHandleCenter(page);
    await expect.poll(() => topmostAt(page, firstAnchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(firstAnchor.x, firstAnchor.y);
    await page.mouse.down();
    await page.mouse.move(firstAnchor.x + 18, firstAnchor.y + 12, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);

    const addPoint = await editablePathScreenPoint(page, 0.62);
    await expect.poll(() => topmostAt(page, addPoint)).toMatchObject({ ariaLabel: "Editable vector path segment 1" });
    await page.mouse.click(addPoint.x, addPoint.y);

    await expect.poll(() => vectorHandleCount(page)).toBe(handleCountBeforeAdd + 1);
    const anchorCountAfterAdd = await anchorHandleCount(page);
    const controlLineCountBeforeConvert = await controlLineCount(page);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Convert Segment to Curve" }).click();

    await expect.poll(() => controlLineCount(page)).toBe(controlLineCountBeforeConvert + 2);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Convert Segment to Line" }).click();

    await expect.poll(() => controlLineCount(page)).toBe(controlLineCountBeforeConvert);

    await rightClickAnchorHandle(page, 2);
    await page.getByRole("menuitem", { name: "Delete Vector Point" }).click();

    await expect.poll(() => anchorHandleCount(page)).toBe(anchorCountAfterAdd - 1);
  });

  test("edits basic shape paths without converting them on vector edit entry", async ({ page }) => {
    for (const shape of [RECT, ELLIPSE, LINE]) {
      await page.locator('button[title="Select (V)"]').click();
      await clickNode(page, shape);
      const svgBefore = await renderedSvgMarkup(page);
      await page.locator('button[title="Vector Edit (P)"]').click();
      await expect.poll(() => vectorHandleCount(page)).toBeGreaterThan(0);
      await expect.poll(() => renderedSvgMarkup(page)).toBe(svgBefore);

      const anchor = await firstAnchorHandleCenter(page);
      const boundsBefore = await selectionBoxPageBounds(page);
      await expect.poll(async () => {
        const target = await topmostAt(page, anchor);
        return target.tagName === "circle" && target.ariaLabel?.startsWith("Vector path anchor handle") === true;
      }).toBe(true);
      await page.mouse.move(anchor.x, anchor.y);
      await page.mouse.down();
      await page.mouse.move(anchor.x + 10, anchor.y + 8, { steps: 3 });
      await page.mouse.up();

      await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
      await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(boundsBefore);
    }
  });

  test("adds topology points on a basic shape instead of only resizing its bounding box", async ({ page }) => {
    await clickNode(page, RECT);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);
    const before = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.33);
    await expect.poll(() => topmostAt(page, pathPoint)).toMatchObject({
      ariaLabel: "Editable vector path segment 1",
      role: "button",
    });

    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(before + 1);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
  });

  test("draws a continuous vector path inside a frame without the frame absorbing the pointer operation", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.72, y: 0.78 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.86, y: 0.70 });
    const third = await nodeScreenPoint(page, FRAME, { x: 0.80, y: 0.88 });
    const svgBefore = await renderedSvgMarkup(page);

    await page.mouse.click(first.x, first.y);
    await page.mouse.move(second.x, second.y);
    await page.mouse.click(second.x, second.y);
    await page.mouse.move(third.x, third.y);
    await page.mouse.click(third.x, third.y);
    await page.keyboard.press("Enter");

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
    await expect.poll(() => anchorHandleCount(page)).toBe(3);
    await expect.poll(() => committedPathUnitSummary(page)).toEqual({ commandCount: 3, hasNegativeCoordinate: false });
  });

  test("draws bezier handles and closes the path from the first anchor", async ({ page }) => {
    await page.locator('button[title="Vector Edit (P)"]').click();
    const first = await nodeScreenPoint(page, FRAME, { x: 0.58, y: 0.84 });
    const second = await nodeScreenPoint(page, FRAME, { x: 0.74, y: 0.64 });
    const third = await nodeScreenPoint(page, FRAME, { x: 0.88, y: 0.84 });
    const svgBefore = await renderedSvgMarkup(page);

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 26, first.y - 4, { steps: 3 });
    await page.mouse.up();
    await page.mouse.click(second.x, second.y);
    await page.mouse.move(third.x, third.y);
    await page.mouse.down();
    await page.mouse.move(third.x - 18, third.y + 16, { steps: 3 });
    await page.mouse.up();
    await page.mouse.click(first.x + 2, first.y + 1);

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    await expect.poll(() => firstEditablePathData(page)).toContain("C ");
    await expect.poll(() => firstEditablePathData(page)).toMatch(/ Z$/);
    await expect.poll(() => anchorHandleCount(page)).toBe(3);
  });

  test("edits a basic shape path inside frame-in-frame without frame hit areas absorbing the operation", async ({ page }) => {
    await clickNode(page, FRAME_CHILD);
    await page.locator('button[title="Vector Edit (P)"]').click();

    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);
    const svgBefore = await renderedSvgMarkup(page);
    const boundsBefore = await selectionBoxPageBounds(page);
    const anchor = await firstAnchorHandleCenter(page);

    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ ariaLabel: "Vector path anchor handle 1" });
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 12, anchor.y + 9, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(boundsBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual({ pageX: 520, pageY: 300, width: 220, height: 150 });
  });

  test("switches from a selected covering container to the deepest editable child in vector edit mode", async ({ page }) => {
    await clickNodeAt(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, FRAME_CHILD);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const boundsBefore = await selectionBoxPageBounds(page);
    const anchor = await firstAnchorHandleCenter(page);
    await expect.poll(async () => {
      const target = await topmostAt(page, anchor);
      return target.tagName === "circle" && target.ariaLabel?.startsWith("Vector path anchor handle") === true;
    }).toBe(true);

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 8, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(boundsBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(FRAME);
  });

  test("does not special-case frame when resolving editable descendants under containers", async ({ page }) => {
    await clickNodeAt(page, COVERING_GROUP, { x: 0.92, y: 0.88 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(COVERING_GROUP);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, GROUP_CHILD);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(GROUP_CHILD);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const boundsBefore = await selectionBoxPageBounds(page);
    const anchor = await firstAnchorHandleCenter(page);
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 8, anchor.y + 6, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(boundsBefore);
    await expect.poll(() => selectionBoxPageBounds(page)).not.toEqual(COVERING_GROUP);
  });

  test("switches from a selected covering container to an existing child vector in vector edit mode", async ({ page }) => {
    await clickNodeAt(page, FRAME, { x: 0.86, y: 0.84 });
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, FRAME_CHILD_VECTOR);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);
    await expect.poll(() => accessibleAnchorHandleCount(page)).toBeGreaterThan(0);

    const anchor = await firstAnchorHandleCenter(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 10, anchor.y + 7, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);

    const before = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.42);
    await expect.poll(() => topmostAt(page, pathPoint)).toMatchObject({
      ariaLabel: "Editable vector path segment 1",
      role: "button",
    });

    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(before + 1);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
  });

  test("edits an existing vector path inside a frame without mutating the containing frame", async ({ page }) => {
    await clickNode(page, FRAME_CHILD_VECTOR);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const before = await anchorHandleCount(page);
    const pathPoint = await editablePathScreenPoint(page, 0.42);
    await expect.poll(() => topmostAt(page, pathPoint)).toMatchObject({
      ariaLabel: "Editable vector path segment 1",
      role: "button",
    });

    await page.mouse.click(pathPoint.x, pathPoint.y);

    await expect.poll(() => anchorHandleCount(page)).toBe(before + 1);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(FRAME_CHILD_VECTOR);
  });

  test("resolves a path-edit click from multi-selection to the clicked vector target", async ({ page }) => {
    await clickNode(page, RECT);
    await shiftClickNode(page, VECTOR);

    await page.locator('button[title="Vector Edit (P)"]').click();
    await clickNode(page, VECTOR);

    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(VECTOR);
    await expect.poll(() => anchorHandleCount(page)).toBeGreaterThan(0);

    const anchor = await firstAnchorHandleCenter(page);
    const svgBeforeDrag = await renderedSvgMarkup(page);
    await expect.poll(() => topmostAt(page, anchor)).toMatchObject({ tagName: "circle" });

    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + 11, anchor.y + 9, { steps: 3 });
    await page.mouse.up();

    await expect.poll(() => renderedSvgMarkup(page)).not.toBe(svgBeforeDrag);
    await expect.poll(() => selectionBoxPageBounds(page)).toEqual(VECTOR);
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
  const center = await nodeScreenPoint(page, node, { x: 0.5, y: 0.5 });
  await page.mouse.click(center.x, center.y);
}

async function clickNodeAt(
  page: Page,
  node: { readonly pageX: number; readonly pageY: number; readonly width: number; readonly height: number },
  ratio: { readonly x: number; readonly y: number },
): Promise<void> {
  const point = await nodeScreenPoint(page, node, ratio);
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

async function vectorHandleCount(page: Page): Promise<number> {
  return page.locator("circle[role='button'][aria-label^='Vector path']").count();
}

async function anchorHandleCount(page: Page): Promise<number> {
  return accessibleAnchorHandleCount(page);
}

async function accessibleAnchorHandleCount(page: Page): Promise<number> {
  return page.locator("circle[role='button'][aria-label^='Vector path anchor handle']").count();
}

async function firstAnchorHandleCenter(page: Page): Promise<{ readonly x: number; readonly y: number }> {
  return anchorHandleCenter(page, 0);
}

async function anchorHandleCenter(page: Page, index: number): Promise<{ readonly x: number; readonly y: number }> {
  const handle = page.locator("circle[role='button'][aria-label^='Vector path anchor handle']").nth(index);
  await expect(handle).toBeVisible();
  const bounds = await handle.boundingBox();
  if (!bounds) {
    throw new Error("Vector anchor handle had no visible bounding box");
  }
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

async function controlLineCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll("line[stroke-dasharray]").length);
}

async function rightClickAnchorHandle(page: Page, index: number): Promise<void> {
  const center = await anchorHandleCenter(page, index);
  await expect.poll(() => topmostAt(page, center)).toMatchObject({ tagName: "circle" });
  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Convert Segment to Curve" })).toBeVisible();
}

async function editablePathScreenPoint(page: Page, ratio: number): Promise<{ readonly x: number; readonly y: number }> {
  const point = await page.evaluate((pathRatio) => {
    const path = document.querySelector<SVGPathElement>("[aria-label='Editable vector path segment 1']");
    if (!path) {
      return null;
    }
    const length = path.getTotalLength();
    const ctm = path.getScreenCTM();
    if (!ctm) {
      return null;
    }
    const candidateRatios = [
      pathRatio,
      0.08,
      0.14,
      0.22,
      0.31,
      0.39,
      0.48,
      0.57,
      0.66,
      0.74,
      0.83,
      0.91,
    ];
    for (const candidateRatio of candidateRatios) {
      const svgPoint = path.getPointAtLength(length * candidateRatio);
      const domPoint = new DOMPoint(svgPoint.x, svgPoint.y).matrixTransform(ctm);
      const topmost = document.elementFromPoint(domPoint.x, domPoint.y);
      if (topmost?.getAttribute("aria-label") === "Editable vector path segment 1") {
        return { x: domPoint.x, y: domPoint.y };
      }
    }
    return null;
  }, ratio);
  if (!point) {
    throw new Error("Clickable editable vector path segment point was not found");
  }
  return point;
}

async function firstEditablePathData(page: Page): Promise<string> {
  return page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>("[aria-label='Editable vector path segment 1']");
    const data = path?.getAttribute("d");
    if (!data) {
      throw new Error("Editable vector path segment data was not found");
    }
    return data;
  });
}

async function committedPathUnitSummary(page: Page): Promise<{
  readonly commandCount: number;
  readonly hasNegativeCoordinate: boolean;
}> {
  const data = await firstEditablePathData(page);
  const coordinates = data.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return {
    commandCount: data.match(/[MLC]/g)?.length ?? 0,
    hasNegativeCoordinate: coordinates.some((coordinate) => coordinate < 0),
  };
}

async function topmostAt(page: Page, point: { readonly x: number; readonly y: number }): Promise<{
  readonly tagName: string;
  readonly ariaLabel: string | null;
  readonly role: string | null;
}> {
  return page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    if (!element) {
      throw new Error(`No element at (${x}, ${y})`);
    }
    return {
      tagName: element.tagName.toLowerCase(),
      ariaLabel: element.getAttribute("aria-label"),
      role: element.getAttribute("role"),
    };
  }, point);
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

async function renderedSvgMarkup(page: Page): Promise<string> {
  return page.evaluate(() => {
    const svgImage = document.querySelector<HTMLImageElement>("img[src^='data:image/svg+xml']");
    if (!svgImage?.src) {
      throw new Error("Rendered SVG image was not found");
    }
    return decodeURIComponent(svgImage.src.substring(svgImage.src.indexOf(",") + 1));
  });
}
