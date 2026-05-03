/** @file Vector path property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { VectorPathSection } from "./VectorPathSection";
import { createPropertyMutationTarget } from "../property-mutation-target";

function makeVector(): FigDesignNode {
  return {
    id: "vector" as FigNodeId,
    type: "VECTOR",
    name: "Vector",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    vectorPaths: [{ windingRule: "EVENODD", data: "M 0 0 C 20 20 80 20 100 0" }],
  };
}

describe("VectorPathSection", () => {
  it("renders editable SVG path data", () => {
    const node = makeVector();
    const html = renderToStaticMarkup(createElement(VectorPathSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="EVENODD"');
    expect(html).toContain("M 0 0 C 20 20 80 20 100 0");
    expect(html).toContain(">Cubic</option>");
    expect(html).toContain("Add point");
    expect(html).toContain("Add cubic");
    expect(html).toContain("Add path");
  });
});
