/**
 * @file Clipboard tests
 */

import { describe, it, expect } from "vitest";
import { createClipboardContent, incrementPasteCount } from "./clipboard";
import type { Shape } from "@oxen/pptx/domain";
import { px, deg } from "@oxen/ooxml/domain/units";

const createTestShape = (id: string): Shape => ({
  type: "sp",
  nonVisual: {
    id,
    name: `Shape ${id}`,
  },
  properties: {
    transform: {
      x: px(0),
      y: px(0),
      width: px(100),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    fill: undefined,
  },
  textBody: undefined,
});

describe("createClipboardContent", () => {
  it("creates clipboard with shapes", () => {
    const shapes = [createTestShape("1"), createTestShape("2")];
    const clipboard = createClipboardContent(shapes);

    expect(clipboard.shapes).toEqual(shapes);
    expect(clipboard.pasteCount).toBe(0);
  });

  it("creates clipboard with empty shapes", () => {
    const clipboard = createClipboardContent([]);

    expect(clipboard.shapes).toEqual([]);
    expect(clipboard.pasteCount).toBe(0);
  });
});

describe("incrementPasteCount", () => {
  it("increments paste count", () => {
    const shapes = [createTestShape("1")];
    const c1 = createClipboardContent(shapes);
    const c2 = incrementPasteCount(c1);

    expect(c2.pasteCount).toBe(1);
    expect(c2.shapes).toBe(c1.shapes);
  });

  it("increments multiple times", () => {
    const shapes = [createTestShape("1")];
    const c1 = createClipboardContent(shapes);
    const c2 = incrementPasteCount(c1);
    const c3 = incrementPasteCount(c2);
    const c4 = incrementPasteCount(c3);

    expect(c4.pasteCount).toBe(3);
  });

  it("preserves shapes reference", () => {
    const shapes = [createTestShape("1")];
    const c1 = createClipboardContent(shapes);
    const c2 = incrementPasteCount(c1);

    expect(c2.shapes).toBe(shapes);
  });
});
