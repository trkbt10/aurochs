/** @file Section behavior property section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { SectionBehaviorSection } from "./SectionBehaviorSection";
import { createPropertyMutationTarget } from "../property-mutation-target";

function makeSection(sectionContentsHidden: boolean): FigDesignNode {
  return {
    id: "section" as FigNodeId,
    type: "SECTION",
    name: "Section",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    sectionContentsHidden,
  };
}

describe("SectionBehaviorSection", () => {
  it("renders the Kiwi-backed section contents toggle", () => {
    const node = makeSection(true);

    const html = renderToStaticMarkup(createElement(SectionBehaviorSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Hide section contents"');
    expect(html).toContain("Hide section contents");
  });
});
