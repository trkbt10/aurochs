/** @file Export settings section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { ExportSettingsSection } from "./ExportSettingsSection";
import { createPropertyMutationTarget } from "../../properties/property-mutation-target";

function makeNode(exportSettings: FigDesignNode["exportSettings"]): FigDesignNode {
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
    effects: [],
    exportSettings,
  };
}

describe("ExportSettingsSection", () => {
  it("renders existing export presets", () => {
    const node = makeNode([{
      suffix: "@2x",
      imageType: { name: "SVG", value: 2 },
      constraint: { type: { name: "SCALE", value: 0 }, value: 2 },
    }]);
    const html = renderToStaticMarkup(createElement(ExportSettingsSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      dispatch: () => undefined,
    }));

    expect(html).toContain('value="SVG"');
    expect(html).toContain('value="@2x"');
    expect(html).toContain('value="2"');
    expect(html).toContain("Add export preset");
  });
});
