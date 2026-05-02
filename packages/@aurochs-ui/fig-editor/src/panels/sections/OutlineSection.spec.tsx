/** @file Outline conversion property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { OutlineSection } from "./OutlineSection";

function makeNode(type: FigDesignNode["type"]): FigDesignNode {
  return {
    id: "node" as FigNodeId,
    type,
    name: "Node",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 80 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

describe("OutlineSection", () => {
  it("renders an outline action for supported shape nodes", () => {
    const html = renderToStaticMarkup(createElement(OutlineSection, { node: makeNode("RECTANGLE"), dispatch: () => undefined }));

    expect(html).toContain("Outline selection");
    expect(html).not.toContain("disabled");
  });

  it("renders text glyph data note for text nodes", () => {
    const html = renderToStaticMarkup(createElement(OutlineSection, { node: makeNode("TEXT"), dispatch: () => undefined }));

    expect(html).toContain("glyph path data");
  });
});
