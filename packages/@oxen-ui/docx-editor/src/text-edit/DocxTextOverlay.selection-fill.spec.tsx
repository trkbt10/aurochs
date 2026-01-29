/**
 * @file DocxTextOverlay selection fill token test
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { DocxParagraph } from "@oxen-office/docx/domain/paragraph";
import { DocxTextOverlay } from "./DocxTextOverlay";

/**
 * Create a DOMRect-like object for testing.
 * jsdom doesn't have DOMRect constructor, so we create a compatible object.
 */
function createBounds(...args: readonly [left: number, top: number, width: number, height: number]): DOMRect {
  const [left, top, width, height] = args;
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
