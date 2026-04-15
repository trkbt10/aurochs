/**
 * @file Top-level React renderer for a fig scene graph
 *
 * Renders a SceneGraph as React SVG elements via the RenderTree
 * intermediate representation. All attribute resolution is performed
 * by resolveRenderTree() — this component tree only formats.
 *
 * ## Architecture
 *
 * ```
 * SceneGraph
 *     ↓ resolveRenderTree()
 * RenderTree (fully resolved)
 *     ↓ FigSceneRenderer [this file]
 * React SVG elements
 * ```
 *
 * Usage:
 * - In the editor canvas (EditorCanvas children): renders as <g> fragment
 * - In standalone viewer: wrap in your own <svg> element
 */

import { memo, useMemo } from "react";
import type { SceneGraph } from "../scene-graph/types";
import { resolveRenderTree, type RenderTree } from "../scene-graph/render-tree";
import { RenderNodeComponent } from "./nodes/RenderNodeComponent";

// =============================================================================
// Types
// =============================================================================

type FigSceneRendererProps = {
  /** The scene graph to render (will be resolved to RenderTree internally) */
  readonly sceneGraph: SceneGraph;
};

type FigRenderTreeRendererProps = {
  /** Pre-resolved render tree */
  readonly renderTree: RenderTree;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Render a pre-resolved RenderTree as React SVG elements.
 *
 * Use this when you've already resolved the RenderTree
 * (e.g., to share it between SVG string and React renderers).
 */
function FigRenderTreeRendererImpl({ renderTree }: FigRenderTreeRendererProps) {
  const childNodes = useMemo(
    () =>
      renderTree.children.map((child) => (
        <RenderNodeComponent key={child.id} node={child} />
      )),
    [renderTree.children],
  );

  return <g>{childNodes}</g>;
}

export const FigRenderTreeRenderer = memo(FigRenderTreeRendererImpl);

/**
 * Render a SceneGraph as React SVG elements.
 *
 * Resolves the SceneGraph to a RenderTree internally, then renders.
 * This is the backward-compatible entry point.
 */
function FigSceneRendererImpl({ sceneGraph }: FigSceneRendererProps) {
  const renderTree = useMemo(
    () => resolveRenderTree(sceneGraph),
    [sceneGraph],
  );

  return <FigRenderTreeRenderer renderTree={renderTree} />;
}

export const FigSceneRenderer = memo(FigSceneRendererImpl);
