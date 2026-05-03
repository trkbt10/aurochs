/** @file Instance self-override section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EMPTY_FIG_STYLE_REGISTRY, type FigDesignDocument, type FigDesignNode, type FigNodeId } from "@aurochs/fig/domain";
import { InstanceOverridesSection } from "./InstanceOverridesSection";
import { createPropertyMutationTarget } from "../property-mutation-target";

function makeInstance(): FigDesignNode {
  return {
    id: "20:2" as FigNodeId,
    type: "INSTANCE",
    name: "Button Instance",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 40 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    symbolId: "20:1" as FigNodeId,
    overrides: [{
      guidPath: { guids: [{ sessionID: 20, localID: 1 }] },
      opacity: 0.4,
    }],
  };
}

function makeDocument(symbol: FigDesignNode): FigDesignDocument {
  return {
    pages: [],
    components: new Map([[symbol.id, symbol]]),
    images: new Map(),
    blobs: [],
    metadata: null,
    styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
  };
}

describe("InstanceOverridesSection", () => {
  it("renders self-override opacity from SymbolOverride data", () => {
    const node = makeInstance();
    const symbol = { ...node, id: "20:1" as FigNodeId, type: "COMPONENT", symbolId: undefined } as FigDesignNode;

    const html = renderToStaticMarkup(createElement(InstanceOverridesSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      document: makeDocument(symbol),
      dispatch: () => undefined,
    }));

    expect(html).toContain("Opacity override");
    expect(html).toContain('aria-label="Instance override opacity"');
    expect(html).toContain('value="40"');
  });

  it("renders descendant override controls from the referenced component tree", () => {
    const node = makeInstance();
    const child = {
      id: "20:3" as FigNodeId,
      type: "RECTANGLE",
      name: "Button Background",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
      size: { x: 100, y: 40 },
      fills: [],
      strokes: [],
      strokeWeight: 0,
      effects: [],
    } as FigDesignNode;
    const symbol = {
      ...child,
      id: "20:1" as FigNodeId,
      type: "COMPONENT",
      name: "Button",
      children: [child],
    } as FigDesignNode;

    const html = renderToStaticMarkup(createElement(InstanceOverridesSection, {
      node,
      target: createPropertyMutationTarget({ primaryNode: node, selectedNodes: [node] }),
      document: makeDocument(symbol),
      dispatch: () => undefined,
    }));

    expect(html).toContain("Button Background");
    expect(html).toContain('aria-label="Override Button Background opacity"');
  });
});
