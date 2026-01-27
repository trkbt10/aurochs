/**
 * @file DocxTextOverlay selection fill token test
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { render } from "@testing-library/react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import { DocxTextOverlay } from "./DocxTextOverlay";

function ensureDom(): void {
  if (typeof document !== "undefined") {
    return;
  }

  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  const jsdomWindow = dom.window as unknown as Window & typeof globalThis;

  Object.defineProperty(globalThis, "window", { value: jsdomWindow, writable: true });
  Object.defineProperty(globalThis, "document", { value: jsdomWindow.document, writable: true });
  Object.defineProperty(globalThis, "self", { value: jsdomWindow, writable: true });
  Object.defineProperty(globalThis, "HTMLElement", { value: jsdomWindow.HTMLElement, writable: true });
  Object.defineProperty(globalThis, "getComputedStyle", { value: jsdomWindow.getComputedStyle, writable: true });
}

ensureDom();

/**
 * Create a DOMRect-like object for testing.
 * jsdom doesn't have DOMRect constructor, so we create a compatible object.
 */
function createBounds(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return { x: left, y: top, width, height };
    },
  } as DOMRect;
}

function createParagraph(text: string): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties: undefined,
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

describe("DocxTextOverlay selection fill", () => {
  it("uses the selection primary design token", () => {
    const { container } = render(
      <DocxTextOverlay
        paragraph={createParagraph("Hello world")}
        bounds={createBounds(0, 0, 400, 80)}
        selectionStart={0}
        selectionEnd={5}
      />,
    );

    const rect = container.querySelector("rect");
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute("fill")).toBe(
      "color-mix(in srgb, var(--selection-primary) 30%, transparent)",
    );
  });
});

