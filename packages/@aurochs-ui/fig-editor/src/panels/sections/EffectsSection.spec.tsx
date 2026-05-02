/** @file Effect property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { EffectsSection } from "./EffectsSection";

function makeNode(effects: FigDesignNode["effects"] = []): FigDesignNode {
  return {
    id: "node" as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects,
  };
}

describe("EffectsSection", () => {
  it("renders add effect controls for nodes without effects", () => {
    const html = renderToStaticMarkup(createElement(EffectsSection, { node: makeNode(), dispatch: () => undefined }));

    expect(html).toContain("No effects");
    expect(html).toContain("Add effect");
  });

  it("renders editable controls for shadow effects", () => {
    const html = renderToStaticMarkup(createElement(EffectsSection, {
      node: makeNode([{
        type: { value: 1, name: "DROP_SHADOW" },
        visible: true,
        offset: { x: 3, y: 4 },
        radius: 8,
        spread: 2,
        color: { r: 0, g: 0, b: 0, a: 0.5 },
      }]),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="DROP_SHADOW"');
    expect(html).toContain('value="8"');
    expect(html).toContain('value="3"');
    expect(html).toContain('value="4"');
    expect(html).toContain('value="2"');
    expect(html).toContain('value="#000000"');
    expect(html).toContain('value="50"');
  });
});
