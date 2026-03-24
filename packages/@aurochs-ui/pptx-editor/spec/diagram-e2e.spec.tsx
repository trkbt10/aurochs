/**
 * @file Diagram e2e: throw-first verification
 *
 * All diagram fallback paths have been replaced with throws.
 * If this test passes without error, no fallback is hit.
 * If it throws, the error message identifies which path failed.
 */

// @vitest-environment jsdom

/* eslint-disable custom/no-as-outside-guard -- Test file */

// jsdom lacks SVG text measurement APIs
if (typeof globalThis.SVGElement !== "undefined") {
  const proto = globalThis.SVGElement.prototype as Record<string, unknown>;
  if (!proto.getComputedTextLength) { proto.getComputedTextLength = function () { return 0; }; }
  if (!proto.getSubStringLength) { proto.getSubStringLength = function () { return 0; }; }
  if (!proto.getNumberOfChars) { proto.getNumberOfChars = function () { return 0; }; }
  if (!proto.getBBox) { proto.getBBox = function () { return { x: 0, y: 0, width: 0, height: 0 }; }; }
}

import { render } from "@testing-library/react/pure";
import { describe, it, expect } from "vitest";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import type { Slide } from "@aurochs-office/pptx/domain";
import type { ShapeId, ResourceId } from "@aurochs-office/pptx/domain/types";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { PresentationEditor } from "../src/presentation/PresentationEditor";

function createDocumentWithDiagram(): PresentationDocument {
  const diagramSlide: Slide = {
    shapes: [
      {
        type: "graphicFrame",
        nonVisual: { id: "diag-1" as ShapeId, name: "Diagram 1" },
        transform: {
          x: px(100), y: px(100), width: px(400), height: px(300),
          rotation: deg(0), flipH: false, flipV: false,
        },
        content: {
          type: "diagram",
          data: {
            dataResourceId: "diagram-diag-1" as ResourceId,
            diagramType: "process",
          },
        },
      },
    ],
  };

  return {
    presentation: { slideSize: { width: px(960), height: px(540) } },
    slides: [{ id: "slide-1", slide: diagramSlide }],
    slideWidth: px(960),
    slideHeight: px(540),
    colorContext: { colorScheme: {}, colorMap: {} },
    resourceStore: createResourceStore(),
    fontScheme: EMPTY_FONT_SCHEME,
  };
}

describe("Diagram E2E: throw-first verification", () => {
  it("PresentationEditor with diagram must not hit any fallback path", () => {
    const doc = createDocumentWithDiagram();

    // render() will throw if any diagram fallback path is hit
    // (we replaced all [Diagram] fallbacks with throws)
    const { container } = render(
      <PresentationEditor initialDocument={doc} showPropertyPanel={false} showLayerPanel={false} showToolbar={false} />,
    );

    expect(container).toBeDefined();

    // Verify no [Diagram] text exists
    expect(container.innerHTML).not.toContain("[Diagram]");

    // Verify diagram content was rendered
    const diagramContent = container.querySelector("[data-diagram-content]");
    expect(diagramContent).not.toBeNull();
  });
});
