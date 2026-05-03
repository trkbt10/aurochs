/** @file Property-panel mutation target tests. */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { createPropertyMutationTarget, createPropertyTargetUpdateAction } from "./property-mutation-target";

function makeNode(id: string): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name: id,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 10, y: 10 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

describe("property mutation target", () => {
  it("keeps the full selected-node set as the property mutation target", () => {
    const first = makeNode("first");
    const second = makeNode("second");

    const target = createPropertyMutationTarget({ primaryNode: second, selectedNodes: [first, second] });
    const action = createPropertyTargetUpdateAction({
      target,
      updater: (node) => ({ ...node, opacity: 0.5 }),
    });

    expect(target).toMatchObject({ primaryNode: second, nodeIds: ["first", "second"], isMultiSelection: true });
    expect(action).toMatchObject({ type: "UPDATE_NODES", source: "property-panel", nodeIds: ["first", "second"] });
  });

  it("rejects a primary node outside the selected-node set", () => {
    const first = makeNode("first");
    const second = makeNode("second");

    expect(() => createPropertyMutationTarget({ primaryNode: second, selectedNodes: [first] })).toThrow(
      "PropertyMutationTarget primary node must be part of the selected nodes.",
    );
  });

  it("keeps property-panel sections from dispatching raw node update actions", () => {
    const sectionsDir = join(import.meta.dir, "../sections");
    const sectionFiles = readdirSync(sectionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const sectionDir = join(sectionsDir, entry.name);
        return readdirSync(sectionDir)
          .filter((file) => file.endsWith("Section.tsx"))
          .map((file) => join(entry.name, file));
      });
    const offenders = sectionFiles.flatMap((file) => {
      const source = readFileSync(join(sectionsDir, file), "utf8");
      return source.includes('type: "UPDATE_NODE"') || source.includes("nodeId: node.id") ? [file] : [];
    });

    expect(offenders).toEqual([]);
  });
});
