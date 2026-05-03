/** @file Variant property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { VariantPropertiesSection } from "./VariantPropertiesSection";
import { createPropertyMutationTarget } from "../../properties/property-mutation-target";

function makeComponent(): FigDesignNode {
  return {
    id: "component" as FigNodeId,
    type: "COMPONENT",
    name: "Button / State=Default",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 40 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    variantPropSpecs: [{ propDefId: "20:10" as FigNodeId, value: "Default" }],
  };
}

describe("VariantPropertiesSection", () => {
  it("renders Kiwi-backed variant value controls", () => {
    const node = makeComponent();

    const html = renderToStaticMarkup(createElement(VariantPropertiesSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain("Variant 1");
    expect(html).toContain('aria-label="Variant value 1"');
    expect(html).toContain('value="Default"');
  });
});
