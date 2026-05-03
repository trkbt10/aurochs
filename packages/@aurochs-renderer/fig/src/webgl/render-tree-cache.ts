/** @file RenderTree cache for WebGL viewport-only rerenders. */

import type { SceneGraph } from "../scene-graph/types";
import { resolveRenderTree, type RenderTree } from "../scene-graph/render-tree";

type RenderTreeCacheEntry = {
  readonly root: SceneGraph["root"];
  readonly version: number;
  readonly tree: RenderTree;
};

function requireSceneViewport(scene: SceneGraph): NonNullable<SceneGraph["viewport"]> {
  if (!scene.viewport) {
    throw new Error("WebGL render tree cache requires scene.viewport");
  }
  return scene.viewport;
}

export type RenderTreeResolver = (scene: SceneGraph) => RenderTree;

export type WebGLRenderTreeCache = {
  readonly get: (scene: SceneGraph) => RenderTree;
  readonly clear: () => void;
};

/** Create a cache that reuses resolved RenderTree nodes across viewport-only changes. */
export function createWebGLRenderTreeCache(resolve: RenderTreeResolver = resolveRenderTree): WebGLRenderTreeCache {
  const current = { value: null as RenderTreeCacheEntry | null };

  return {
    get(scene: SceneGraph): RenderTree {
      const viewport = requireSceneViewport(scene);
      const cached = current.value;
      if (cached && cached.root === scene.root && cached.version === scene.version) {
        return { ...cached.tree, width: scene.width, height: scene.height, viewport };
      }

      const tree = resolve(scene);
      current.value = { root: scene.root, version: scene.version, tree };
      return tree;
    },

    clear(): void {
      current.value = null;
    },
  };
}
