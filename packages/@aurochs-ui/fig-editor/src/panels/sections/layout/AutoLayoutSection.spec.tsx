/** @file Auto layout property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { STACK_MODE_VALUES } from "@aurochs/fig/constants";
import { toEnumValue } from "@aurochs/fig/constants";
import { AutoLayoutSection } from "./AutoLayoutSection";
import { createPropertyMutationTarget } from "../../properties/property-mutation-target";

function makeFrame(autoLayout?: FigDesignNode["autoLayout"]): FigDesignNode {
  return {
    id: "frame" as FigNodeId,
    type: "FRAME",
    name: "Frame",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 240, y: 120 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    autoLayout,
    children: [],
  };
}

describe("AutoLayoutSection", () => {
  it("renders an explicit None mode for frames without auto layout", () => {
    const node = makeFrame();
    const html = renderToStaticMarkup(createElement(AutoLayoutSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain("<select");
    expect(html).toContain('value="NONE"');
    expect(html).toContain(">None</option>");
  });

  it("renders editable spacing and padding fields when auto layout is enabled", () => {
    const node = makeFrame({
      stackMode: toEnumValue("HORIZONTAL", STACK_MODE_VALUES)!,
      stackSpacing: 12,
      stackPadding: { top: 1, right: 2, bottom: 3, left: 4 },
      stackWrap: true,
      stackCounterSpacing: 8,
      itemReverseZIndex: true,
    });
    const html = renderToStaticMarkup(createElement(AutoLayoutSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="HORIZONTAL"');
    expect(html).toContain('value="12"');
    expect(html).toContain('value="1"');
    expect(html).toContain('value="4"');
    expect(html).toContain("Primary align");
    expect(html).toContain("Counter align");
    expect(html).toContain("Align content");
    expect(html).toContain("Counter gap");
    expect(html).toContain('value="8"');
    expect(html).toContain("Wrap");
    expect(html).toContain("Reverse Z");
  });
});
