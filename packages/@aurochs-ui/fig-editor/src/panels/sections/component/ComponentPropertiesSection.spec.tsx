/** @file Component property override section tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FigDesignDocument, FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import { ComponentPropertiesSection } from "./ComponentPropertiesSection";
import { createPropertyMutationTarget } from "../../properties/property-mutation-target";

function makeNode(id: string, type: FigDesignNode["type"], name = id): FigDesignNode {
  return {
    id: id as FigNodeId,
    type,
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

describe("ComponentPropertiesSection", () => {
  it("renders editable inputs for supported component override types", () => {
    const component = {
      ...makeNode("component", "COMPONENT", "Button"),
      componentPropertyDefs: [
        { id: "visible" as FigNodeId, name: "Visible", type: "BOOL" as const, initialValue: { boolValue: true } },
        { id: "label" as FigNodeId, name: "Label", type: "TEXT" as const, initialValue: { textValue: { characters: "OK" } } },
        { id: "count" as FigNodeId, name: "Count", type: "NUMBER" as const, initialValue: { numberValue: 2 } },
        { id: "icon" as FigNodeId, name: "Icon", type: "INSTANCE_SWAP" as const, initialValue: { referenceValue: "icon-a" as FigNodeId } },
        { id: "variant" as FigNodeId, name: "Variant", type: "VARIANT" as const, initialValue: { referenceValue: "variant-a" as FigNodeId } },
        { id: "color" as FigNodeId, name: "Color", type: "COLOR" as const, initialValue: { referenceValue: "10:1" as FigNodeId } },
        { id: "image" as FigNodeId, name: "Image", type: "IMAGE" as const, initialValue: { referenceValue: "10:2" as FigNodeId } },
        { id: "slot" as FigNodeId, name: "Slot", type: "SLOT" as const, initialValue: { referenceValue: "10:3" as FigNodeId } },
      ],
    } satisfies FigDesignNode;
    const icon = makeNode("icon-a", "COMPONENT", "Icon A");
    const variant = makeNode("variant-a", "COMPONENT", "Variant A");
    const instance = { ...makeNode("instance", "INSTANCE"), symbolId: component.id };
    const document: FigDesignDocument = {
      pages: [{ id: "page" as never, name: "Page", backgroundColor: DEFAULT_PAGE_BACKGROUND, children: [instance] }],
      components: new Map([[component.id, component], [icon.id, icon], [variant.id, variant]]),
      images: new Map(),
      blobs: [],
      metadata: null,
      styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
    };

    const html = renderToStaticMarkup(createElement(ComponentPropertiesSection, {
      node: instance,
      target: createPropertyMutationTarget({ primaryNode: instance, selectedNodes: [instance] }),
      document,
      dispatch: () => undefined,
    }));

    expect(html).toContain("Component: Button");
    expect(html).toContain('aria-label="Component property Visible"');
    expect(html).toContain('aria-label="Component property Label"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('value="OK"');
    expect(html).toContain('value="2"');
    expect(html).toContain('value="icon-a"');
    expect(html).toContain(">Icon A</option>");
    expect(html).toContain('value="variant-a"');
    expect(html).toContain(">Variant A</option>");
    expect(html).toContain('value="10:1"');
    expect(html).toContain('value="10:2"');
    expect(html).toContain('value="10:3"');
  });
});
