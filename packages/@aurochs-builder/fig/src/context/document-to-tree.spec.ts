/** @file Tests for FigDesignDocument to raw FigNode conversion. */

import type { FigDesignDocument, FigDesignNode, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import { documentToTree } from "./document-to-tree";

function makeNode(id: string, type: FigDesignNode["type"], fields: Partial<FigDesignNode> = {}): FigDesignNode {
  return {
    id: id as FigNodeId,
    type,
    name: id,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 100 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    ...fields,
  };
}

function makeDocument(children: readonly FigDesignNode[]): FigDesignDocument {
  return {
    pages: [{ id: "1:10" as FigPageId, name: "Page", backgroundColor: DEFAULT_PAGE_BACKGROUND, children }],
    components: new Map(),
    images: new Map(),
    blobs: [],
    metadata: null,
    styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
  };
}

describe("documentToTree component properties", () => {
  it("writes domain component property definitions, refs, and assignments back to Kiwi fields", () => {
    const node = makeNode("1:20", "COMPONENT", {
      componentPropertyDefs: [
        { id: "1:30" as FigNodeId, name: "Visible", type: "BOOL", initialValue: { boolValue: true } },
        { id: "1:31" as FigNodeId, name: "Icon", type: "INSTANCE_SWAP", initialValue: { referenceValue: "1:40" as FigNodeId } },
        { id: "1:32" as FigNodeId, name: "Tone", type: "COLOR", initialValue: { referenceValue: "1:41" as FigNodeId } },
        { id: "1:33" as FigNodeId, name: "State", type: "VARIANT", initialValue: { referenceValue: "1:42" as FigNodeId } },
      ],
      componentPropertyRefs: [
        { defId: "1:30" as FigNodeId, nodeField: "VISIBLE" },
        { defId: "1:32" as FigNodeId, nodeField: "INHERIT_FILL_STYLE_ID" },
      ],
      componentPropertyAssignments: [
        { defId: "1:30" as FigNodeId, value: { boolValue: false } },
        { defId: "1:31" as FigNodeId, value: { referenceValue: "1:40" as FigNodeId } },
      ],
      variantPropSpecs: [
        { propDefId: "1:33" as FigNodeId, value: "Primary" },
      ],
    });

    const result = documentToTree(makeDocument([node]));
    const raw = result.nodeChanges.find((candidate) => candidate.guid.sessionID === 1 && candidate.guid.localID === 20);

    expect(raw?.componentPropDefs).toMatchObject([
      { id: { sessionID: 1, localID: 30 }, name: "Visible", type: { value: 0, name: "BOOL" }, initialValue: { boolValue: true } },
      { id: { sessionID: 1, localID: 31 }, name: "Icon", type: { value: 3, name: "INSTANCE_SWAP" }, initialValue: { guidValue: { sessionID: 1, localID: 40 } } },
      { id: { sessionID: 1, localID: 32 }, name: "Tone", type: { value: 2, name: "COLOR" }, initialValue: { guidValue: { sessionID: 1, localID: 41 } } },
      { id: { sessionID: 1, localID: 33 }, name: "State", type: { value: 4, name: "VARIANT" }, initialValue: { guidValue: { sessionID: 1, localID: 42 } } },
    ]);
    expect(raw?.componentPropRefs).toMatchObject([
      { defID: { sessionID: 1, localID: 30 }, componentPropNodeField: { value: 0, name: "VISIBLE" } },
      { defID: { sessionID: 1, localID: 32 }, componentPropNodeField: { value: 3, name: "INHERIT_FILL_STYLE_ID" } },
    ]);
    expect(raw?.componentPropAssignments).toMatchObject([
      { defID: { sessionID: 1, localID: 30 }, value: { boolValue: false } },
      { defID: { sessionID: 1, localID: 31 }, value: { guidValue: { sessionID: 1, localID: 40 } } },
    ]);
    expect(raw?.variantPropSpecs).toMatchObject([
      { propDefId: { sessionID: 1, localID: 33 }, value: "Primary" },
    ]);
  });
});

describe("documentToTree modeled Kiwi fields", () => {
  it("writes section visibility and child auto-layout constraints back to Kiwi fields", () => {
    const node = makeNode("1:50", "SECTION", {
      sectionContentsHidden: true,
      layoutConstraints: {
        stackChildAlignSelf: { value: 3, name: "STRETCH" },
        stackChildPrimaryGrow: 1,
      },
    });

    const result = documentToTree(makeDocument([node]));
    const raw = result.nodeChanges.find((candidate) => candidate.guid.sessionID === 1 && candidate.guid.localID === 50);

    expect(raw?.sectionContentsHidden).toBe(true);
    expect(raw?.stackChildAlignSelf).toEqual({ value: 3, name: "STRETCH" });
    expect(raw?.stackChildPrimaryGrow).toBe(1);
  });
});
