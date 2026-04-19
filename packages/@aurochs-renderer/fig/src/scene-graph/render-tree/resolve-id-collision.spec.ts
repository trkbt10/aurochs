/**
 * @file Regression — render-tree IDs MUST NOT collide across renderer
 * instances mounted in the same document.
 *
 * Bug: Bento Link INSTANCE 190:3213 (Cover page) — an ELLIPSE Container
 * with OUTSIDE 2px white stroke produced `stroke-mask-0` via a
 * per-call sequential counter inside resolveRenderTree. A second
 * FigSceneRenderer (overlay, re-mount, StrictMode dev double-invoke,
 * etc.) also emitted `stroke-mask-0` → `url(#stroke-mask-0)` references
 * resolved against whichever definition was last attached to the DOM,
 * producing an alternating clip regression when the user changed
 * editor zoom.
 *
 * Fix: the ID generator now carries a module-level `generation` prefix
 * so every `createIdGenerator()` call namespaces its counter uniquely.
 *
 * This spec locks that in: two back-to-back resolveRenderTree calls on
 * identical scene graphs must produce disjoint ID sets.
 */

import { resolveRenderTree } from "./resolve";
import type { SceneGraph, EllipseNode, SceneNodeId } from "../types";
import type { FigImage } from "@aurochs/fig/parser";

const EMPTY_IMAGES = new Map<string, FigImage>();
const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function makeEllipseWithOutsideStroke(id: string): EllipseNode {
  return {
    type: "ellipse",
    id: id as SceneNodeId,
    name: "container",
    transform: IDENTITY,
    opacity: 1,
    visible: true,
    effects: [],
    blendMode: undefined,
    cx: 10, cy: 10, rx: 10, ry: 10,
    fills: [{ type: "solid", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
    stroke: {
      color: { r: 1, g: 1, b: 1, a: 1 },
      width: 2,
      opacity: 1,
      linecap: "butt",
      linejoin: "miter",
      align: "OUTSIDE",
    },
  };
}

function makeSceneGraph(nodes: readonly import("../types").SceneNode[]): SceneGraph {
  return {
    root: {
      type: "group", id: "root" as SceneNodeId, name: "root",
      transform: IDENTITY, opacity: 1, visible: true,
      effects: [], blendMode: undefined, children: nodes,
    },
    blobs: [], images: EMPTY_IMAGES,
  };
}

function collectDefIds(tree: import("./types").RenderTree): string[] {
  const ids: string[] = [];
  function walk(node: import("./types").RenderNode): void {
    if ("defs" in node && node.defs) {
      for (const d of node.defs) { ids.push(d.id); }
    }
    if ("children" in node && node.children) {
      for (const c of node.children) { walk(c); }
    }
  }
  for (const c of tree.children) { walk(c); }
  return ids;
}

describe("render-tree ID generator — cross-call uniqueness", () => {
  it("two resolveRenderTree calls on identical graphs produce disjoint IDs", () => {
    // This is the Bento Link reproduction: ELLIPSE OUTSIDE stroke → stroke-mask def.
    const scene = makeSceneGraph([makeEllipseWithOutsideStroke("ellipse-A")]);

    const treeA = resolveRenderTree(scene);
    const treeB = resolveRenderTree(scene);

    const idsA = collectDefIds(treeA);
    const idsB = collectDefIds(treeB);

    expect(idsA.length, "first tree must produce at least one def (stroke-mask)")
      .toBeGreaterThan(0);
    expect(idsB.length, "second tree must produce the same number of defs")
      .toBe(idsA.length);

    // No overlap: crossing the two ID sets must be empty.
    const setA = new Set(idsA);
    const intersection = idsB.filter((id) => setA.has(id));
    expect(intersection, "def IDs must NOT collide between resolver calls")
      .toEqual([]);
  });

  it("stroke-mask IDs across three sequential renders are all unique", () => {
    const scene = makeSceneGraph([makeEllipseWithOutsideStroke("ellipse-B")]);
    const allIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const tree = resolveRenderTree(scene);
      allIds.push(...collectDefIds(tree));
    }
    const unique = new Set(allIds);
    expect(unique.size, `all ${allIds.length} IDs across 3 renders must be unique`)
      .toBe(allIds.length);
  });
});
