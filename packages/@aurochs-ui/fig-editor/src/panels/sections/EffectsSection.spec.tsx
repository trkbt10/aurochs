/** @file Effect property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { EffectsSection } from "./EffectsSection";
import { createPropertyMutationTarget } from "../property-mutation-target";

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
    const node = makeNode();
    const html = renderToStaticMarkup(createElement(EffectsSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain("No effects");
    expect(html).toContain("Add effect");
  });

  it("renders editable controls for shadow effects", () => {
    const node = makeNode([{
      type: { value: 1, name: "DROP_SHADOW" },
      visible: true,
      offset: { x: 3, y: 4 },
      radius: 8,
      spread: 2,
      color: { r: 0, g: 0, b: 0, a: 0.5 },
    }]);
    const html = renderToStaticMarkup(createElement(EffectsSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="DROP_SHADOW"');
    expect(html).toContain('aria-label="Effect type 1"');
    expect(html).toContain('aria-label="Drop Shadow radius"');
    expect(html).toContain('aria-label="Drop Shadow offset x"');
    expect(html).toContain('aria-label="Drop Shadow offset y"');
    expect(html).toContain('aria-label="Drop Shadow spread"');
    expect(html).toContain('aria-label="Drop Shadow opacity"');
    expect(html).toContain('value="8"');
    expect(html).toContain('value="3"');
    expect(html).toContain('value="4"');
    expect(html).toContain('value="2"');
    expect(html).toContain('value="#000000"');
    expect(html).toContain('value="50"');
  });
});
