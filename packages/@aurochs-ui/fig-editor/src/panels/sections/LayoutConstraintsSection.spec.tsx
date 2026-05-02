/** @file Layout constraints property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { CONSTRAINT_TYPE_VALUES, STACK_POSITIONING_VALUES, STACK_SIZING_VALUES, toEnumValue } from "@aurochs/fig/constants";
import { LayoutConstraintsSection } from "./LayoutConstraintsSection";

function makeNode(layoutConstraints?: FigDesignNode["layoutConstraints"]): FigDesignNode {
  return {
    id: "rect" as FigNodeId,
    type: "RECTANGLE",
    name: "Rect",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 120, y: 80 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    layoutConstraints,
  };
}

describe("LayoutConstraintsSection", () => {
  it("renders explicit default child layout controls", () => {
    const html = renderToStaticMarkup(createElement(LayoutConstraintsSection, { node: makeNode(), dispatch: () => undefined }));

    expect(html).toContain("Position");
    expect(html).toContain('value="AUTO"');
    expect(html).toContain("Primary fit");
    expect(html).toContain("Counter fit");
  });

  it("renders fixed positioning constraints when absolute", () => {
    const html = renderToStaticMarkup(createElement(LayoutConstraintsSection, {
      node: makeNode({
        stackPositioning: toEnumValue("ABSOLUTE", STACK_POSITIONING_VALUES)!,
        stackPrimarySizing: toEnumValue("FILL", STACK_SIZING_VALUES)!,
        stackCounterSizing: toEnumValue("HUG", STACK_SIZING_VALUES)!,
        horizontalConstraint: toEnumValue("CENTER", CONSTRAINT_TYPE_VALUES)!,
        verticalConstraint: toEnumValue("STRETCH", CONSTRAINT_TYPE_VALUES)!,
      }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="ABSOLUTE"');
    expect(html).toContain('value="FILL"');
    expect(html).toContain('value="HUG"');
    expect(html).toContain("Horizontal");
    expect(html).toContain("Vertical");
  });
});
