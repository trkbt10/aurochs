/** @file Corner radius property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { createPropertyMutationTarget } from "../../properties/property-mutation-target";
import { CornerRadiusSection } from "./CornerRadiusSection";

function makeRectangle(overrides: Partial<FigDesignNode> = {}): FigDesignNode {
  return {
    id: "rect" as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 80 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    ...overrides,
  };
}

describe("CornerRadiusSection", () => {
  it("renders uniform radius controls for a plain rectangle with no r field", () => {
    const node = makeRectangle();
    const html = renderToStaticMarkup(createElement(CornerRadiusSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain("Radius");
    expect(html).toContain('value="0"');
    expect(html).toContain('aria-label="Use individual corner radii"');
  });

  it("renders individual corner controls when rectangleCornerRadii is present", () => {
    const node = makeRectangle({ rectangleCornerRadii: [1, 2, 3, 4] });
    const html = renderToStaticMarkup(createElement(CornerRadiusSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain("TL");
    expect(html).toContain("TR");
    expect(html).toContain("BL");
    expect(html).toContain("BR");
    expect(html).toContain('aria-label="Use uniform corner radius"');
  });
});
