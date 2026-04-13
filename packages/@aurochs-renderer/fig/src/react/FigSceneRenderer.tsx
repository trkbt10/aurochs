/**
 * @file Top-level React renderer for a fig scene graph
 *
 * Replaces renderSceneGraphToSvg for editor/viewer use cases.
 * Instead of producing an SVG string, this component renders
 * the scene graph as React SVG elements, enabling React's
 * reconciliation for efficient incremental updates.
 *
 * Usage:
 * - In the editor canvas (EditorCanvas children): renders as <g> fragment
 * - In standalone viewer: wrap in your own <svg> element
 */

import { memo, useMemo } from "react";
import type { SceneGraph } from "../scene-graph/types";
import { FigSvgIdProvider } from "./context/FigSvgDefsContext";
import { SceneNodeRenderer } from "./nodes/SceneNodeRenderer";

// =============================================================================
// Types
// =============================================================================

type FigSceneRendererProps = {
  /** The scene graph to render */
  readonly sceneGraph: SceneGraph;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Render a scene graph as React SVG elements.
 *
 * This component provides:
 * - FigSvgIdProvider context for unique ID generation
 * - Rendered scene graph nodes as JSX SVG elements
 *
 * Each node renderer produces its own inline <defs> for gradients,
 * filters, clip-paths, etc. This ensures defs are always present
 * in the DOM on the first render.
 *
 * The output is a <g> element suitable for embedding inside an
 * existing SVG (e.g., EditorCanvas).
 */
function FigSceneRendererImpl({ sceneGraph }: FigSceneRendererProps) {
  const rootChildren = sceneGraph.root.children;

  const childNodes = useMemo(
    () =>
      rootChildren.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} />
      )),
    [rootChildren],
  );

  return (
    <FigSvgIdProvider>
      <g>{childNodes}</g>
    </FigSvgIdProvider>
  );
}

export const FigSceneRenderer = memo(FigSceneRendererImpl);
