/** @file WebGL RenderTree cache tests. */

import type { RenderTree } from "../scene-graph/render-tree";
import type { GroupNode, SceneGraph, SceneNodeId } from "../scene-graph/types";
import { createWebGLRenderTreeCache } from "./render-tree-cache";

function makeRoot(): GroupNode {
  return {
    id: "root" as SceneNodeId,
    type: "group",
    name: "root",
    visible: true,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    opacity: 1,
    effects: [],
    children: [],
  };
}

function makeScene(root: GroupNode, viewportX: number): SceneGraph {
  return {
    width: 500,
    height: 400,
    viewport: { x: viewportX, y: 0, width: 500, height: 400 },
    root,
    version: 1,
  };
}

describe("createWebGLRenderTreeCache", () => {
  it("reuses resolved children when only the viewport changes", () => {
    const root = makeRoot();
    const calls = { value: 0 };
    const tree: RenderTree = { width: 500, height: 400, viewport: { x: 0, y: 0, width: 500, height: 400 }, children: [] };
    const cache = createWebGLRenderTreeCache((scene) => {
      calls.value += 1;
      return { ...tree, viewport: scene.viewport ?? tree.viewport };
    });

    expect(cache.get(makeScene(root, 0)).viewport.x).toBe(0);
    expect(cache.get(makeScene(root, 120)).viewport.x).toBe(120);
    expect(calls.value).toBe(1);
  });

  it("resolves again when the root changes", () => {
    const calls = { value: 0 };
    const tree: RenderTree = { width: 500, height: 400, viewport: { x: 0, y: 0, width: 500, height: 400 }, children: [] };
    const cache = createWebGLRenderTreeCache((scene) => {
      calls.value += 1;
      return { ...tree, viewport: scene.viewport ?? tree.viewport };
    });

    cache.get(makeScene(makeRoot(), 0));
    cache.get(makeScene(makeRoot(), 0));

    expect(calls.value).toBe(2);
  });

  it("throws when scene viewport is missing", () => {
    const root = makeRoot();
    const cache = createWebGLRenderTreeCache();

    expect(() => cache.get({
      width: 500,
      height: 400,
      root,
      version: 1,
    })).toThrow("scene.viewport");
  });
});
