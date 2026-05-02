/** @file Fill property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { FillSection } from "./FillSection";

function makeNode(fills: FigDesignNode["fills"]): FigDesignNode {
  return {
    id: "node" as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills,
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

describe("FillSection", () => {
  it("renders gradient paint controls", () => {
    const html = renderToStaticMarkup(createElement(FillSection, {
      node: makeNode([{
        type: "GRADIENT_LINEAR",
        opacity: 1,
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
      }]),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="GRADIENT_LINEAR"');
    expect(html).toContain('aria-label="Gradient stop 1"');
    expect(html).toContain('value="#ff0000"');
    expect(html).toContain('value="#0000ff"');
  });
});
