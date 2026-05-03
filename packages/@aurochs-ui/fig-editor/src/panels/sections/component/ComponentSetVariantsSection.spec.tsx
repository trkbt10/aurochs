/** @file COMPONENT_SET variant controls tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { ComponentSetVariantsSection } from "./ComponentSetVariantsSection";
import { createPropertyMutationTarget } from "../../properties/property-mutation-target";

function makeComponentSet(): FigDesignNode {
  const child = {
    id: "30:2" as FigNodeId,
    type: "COMPONENT",
    name: "Primary",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 40 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    variantPropSpecs: [{ propDefId: "30:10" as FigNodeId, value: "Default" }],
  } as FigDesignNode;
  return {
    id: "30:1" as FigNodeId,
    type: "COMPONENT_SET",
    name: "Button Set",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 220, y: 80 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    componentPropertyDefs: [{
      id: "30:10" as FigNodeId,
      name: "State",
      type: "VARIANT",
      initialValue: { referenceValue: "30:2" as FigNodeId },
    }],
    children: [child],
  } as FigDesignNode;
}

describe("ComponentSetVariantsSection", () => {
  it("renders variant property and child value controls", () => {
    const node = makeComponentSet();

    const html = renderToStaticMarkup(createElement(ComponentSetVariantsSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('aria-label="Variant property name 1"');
    expect(html).toContain('aria-label="Variant Primary value 1"');
    expect(html).toContain('value="Default"');
  });
});
