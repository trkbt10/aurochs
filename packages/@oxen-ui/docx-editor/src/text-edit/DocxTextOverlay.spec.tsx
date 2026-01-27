/**
 * @file DocxTextOverlay unit tests
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

function createParagraphFromRuns(
  runs: ReadonlyArray<{
    readonly text: string;
    readonly properties?: {
      readonly b?: boolean;
      readonly i?: boolean;
      readonly strike?: boolean;
      readonly dstrike?: boolean;
      readonly u?: { readonly val: "none" | "single" };
      readonly color?: { readonly val: string };
    };
  }>,
): DocxParagraph {
  return {
    type: "paragraph",
    content: runs.map((run) => ({
      type: "run",
      properties: run.properties,
      content: [{ type: "text", value: run.text }],
    })),
  };
}

describe("DocxTextOverlay", () => {
  it("renders paragraph text as SVG <text>", () => {
    const paragraph = createParagraphFromRuns([{ text: "Hello" }]);
    const { container } = render(
      <DocxTextOverlay
        paragraph={paragraph}
        bounds={createBounds(0, 0, 200, 50)}
        selectionStart={0}
        selectionEnd={0}
      />,
    );

    const texts = container.querySelectorAll("text");
    expect(texts.length).toBe(1);
    expect(texts[0]?.textContent).toBe("Hello");
  });

  it("applies basic run formatting (bold/italic/decoration/fill)", () => {
    const paragraph = createParagraphFromRuns([
      { text: "Bold", properties: { b: true } },
      { text: "Italic", properties: { i: true } },
      { text: "Under", properties: { u: { val: "single" } } },
      { text: "Strike", properties: { strike: true } },
      { text: "Red", properties: { color: { val: "FF0000" } } },
    ]);

    const { container } = render(
      <DocxTextOverlay
        paragraph={paragraph}
        bounds={createBounds(0, 0, 800, 60)}
        selectionStart={0}
        selectionEnd={0}
      />,
    );

    const texts = Array.from(container.querySelectorAll("text"));
    expect(texts.length).toBeGreaterThanOrEqual(5);

    expect(texts[0]?.getAttribute("style") ?? "").toContain("font-weight: bold");
    expect(texts[1]?.getAttribute("style") ?? "").toContain("font-style: italic");
    expect(texts[2]?.getAttribute("style") ?? "").toContain("text-decoration: underline");
    expect(texts[3]?.getAttribute("style") ?? "").toContain("text-decoration: line-through");
    expect(texts[4]?.getAttribute("style") ?? "").toContain("fill: #FF0000");
  });

  it("renders selection highlight rects", () => {
    const paragraph = createParagraphFromRuns([{ text: "Hello world" }]);
    const { container } = render(
      <DocxTextOverlay
        paragraph={paragraph}
        bounds={createBounds(0, 0, 400, 80)}
        selectionStart={0}
        selectionEnd={5}
      />,
    );

    const rects = Array.from(container.querySelectorAll("rect"));
    expect(rects.length).toBeGreaterThan(0);
    expect(rects[0]?.getAttribute("fill")).toBe(
      "color-mix(in srgb, var(--selection-primary) 30%, transparent)",
    );
  });

  it("wraps long text into multiple lines when width is constrained", () => {
    const paragraph = createParagraphFromRuns([{ text: "HelloHelloHelloHelloHello" }]);
    const { container } = render(
      <DocxTextOverlay
        paragraph={paragraph}
        bounds={createBounds(0, 0, 40, 200)}
        selectionStart={0}
        selectionEnd={0}
      />,
    );

    const ys = new Set(
      Array.from(container.querySelectorAll("text"))
        .map((el) => el.getAttribute("y"))
        .filter((v): v is string => v !== null),
    );
    expect(ys.size).toBeGreaterThan(1);
  });

  it("does not crash on an empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    const { container } = render(
      <DocxTextOverlay
        paragraph={paragraph}
        bounds={createBounds(0, 0, 200, 50)}
        selectionStart={0}
        selectionEnd={0}
      />,
    );

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll("text").length).toBe(0);
  });
});
