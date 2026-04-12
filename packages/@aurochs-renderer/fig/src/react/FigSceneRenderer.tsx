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
import { FigSvgDefsProvider } from "./context/FigSvgDefsContext";
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
 * - FigSvgDefsProvider context for gradient/filter/clip-path defs collection
 * - A <defs> section with all collected definitions
 * - Rendered scene graph nodes as JSX SVG elements
 *
 * The output is a <g> element containing <defs> + content,
 * suitable for embedding inside an existing SVG (e.g., EditorCanvas).
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
    <FigSvgDefsProvider>
      {(collectedDefs) => (
        <g>
          {collectedDefs && <defs>{collectedDefs}</defs>}
          {childNodes}
        </g>
      )}
    </FigSvgDefsProvider>
  );
}

export const FigSceneRenderer = memo(FigSceneRendererImpl);
