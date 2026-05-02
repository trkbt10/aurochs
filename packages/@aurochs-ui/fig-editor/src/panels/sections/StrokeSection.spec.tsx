/** @file Stroke property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { StrokeSection } from "./StrokeSection";

function makeNode(strokes: FigDesignNode["strokes"]): FigDesignNode {
  return {
    id: "node" as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills: [],
    strokes,
    strokeWeight: 2,
    effects: [],
  };
}

describe("StrokeSection", () => {
  it("renders gradient stroke controls", () => {
    const html = renderToStaticMarkup(createElement(StrokeSection, {
      node: makeNode([{
        type: "GRADIENT_RADIAL",
        opacity: 0.8,
        gradientStops: [
          { position: 0, color: { r: 0, g: 1, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
        ],
      }]),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="GRADIENT_RADIAL"');
    expect(html).toContain('aria-label="Stroke gradient stop 1"');
    expect(html).toContain('value="#00ff00"');
    expect(html).toContain('value="#000000"');
  });
});
