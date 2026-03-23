/**
 * @file Tests for buildDataModel
 *
 * Verifies that buildDataModel produces a DiagramDataModel whose tree structure
 * is correct when processed by the diagram tree builder.
 */

import { describe, it, expect } from "vitest";
import { buildDataModel } from "./data-model-builder";
import { buildDiagramTree } from "@aurochs-office/diagram/layout-engine";
import { generateDiagramLayoutResults } from "@aurochs-office/diagram/layout-engine";

describe("buildDataModel", () => {
  it("should produce a flat process with doc root and 3 child nodes", () => {
    const dm = buildDataModel({
      nodes: [
        { id: "1", text: "A" },
        { id: "2", text: "B" },
        { id: "3", text: "C" },
      ],
    });

    const tree = buildDiagramTree(dm);

    // Single root (doc node "0")
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].id).toBe("0");
    expect(tree.roots[0].type).toBe("doc");

    // 3 children of the root
    expect(tree.roots[0].children).toHaveLength(3);
    expect(tree.roots[0].children.map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("should produce a hierarchy with correct parent-child nesting", () => {
    const dm = buildDataModel({
      nodes: [
        { id: "1", text: "Top" },
        { id: "2", text: "Left", parentId: "1" },
        { id: "3", text: "Right", parentId: "1" },
      ],
    });

    const tree = buildDiagramTree(dm);

    expect(tree.roots).toHaveLength(1);
    const docRoot = tree.roots[0];
    expect(docRoot.children).toHaveLength(1); // only "1" is child of doc root

    const top = docRoot.children[0];
    expect(top.id).toBe("1");
    expect(top.children).toHaveLength(2);
    expect(top.children.map((c) => c.id)).toEqual(["2", "3"]);
  });

  it("should generate layout shapes without duplicate IDs", () => {
    const dm = buildDataModel({
      nodes: [
        { id: "1", text: "Step 1" },
        { id: "2", text: "Step 2" },
        { id: "3", text: "Step 3" },
      ],
    });

    const result = generateDiagramLayoutResults(
      dm,
      undefined,
      undefined,
      undefined,
      { bounds: { x: 0, y: 0, width: 500, height: 400 } },
    );

    // No duplicate IDs
    const ids = result.shapes.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);

    // At least the 3 content nodes should produce shapes
    expect(result.shapes.length).toBeGreaterThanOrEqual(3);
  });

  it("should generate hierarchy layout shapes without duplicate IDs", () => {
    const dm = buildDataModel({
      nodes: [
        { id: "1", text: "Top" },
        { id: "2", text: "Left", parentId: "1" },
        { id: "3", text: "Right", parentId: "1" },
        { id: "4", text: "Leaf", parentId: "2" },
      ],
    });

    const result = generateDiagramLayoutResults(
      dm,
      undefined,
      undefined,
      undefined,
      { bounds: { x: 0, y: 0, width: 500, height: 400 } },
    );

    const ids = result.shapes.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
