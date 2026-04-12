/**
 * @file Fig page renderer component
 *
 * Renders all nodes in the current page as React SVG elements.
 * Uses the scene graph pipeline: FigDesignNode tree → SceneGraph → React JSX.
 *
 * Unlike the previous implementation that used dangerouslySetInnerHTML
 * with an SVG string, this renders proper React elements that participate
 * in React's reconciliation for efficient incremental updates.
 */

import { useMemo } from "react";
import type { FigPage } from "@aurochs/fig/domain";
import type { FigBlob } from "@aurochs/fig/parser";
import { buildSceneGraph, type BuildSceneGraphOptions } from "@aurochs-renderer/fig/scene-graph";
import { FigSceneRenderer } from "@aurochs-renderer/fig/react";

// =============================================================================
// Types
// =============================================================================

type FigPageRendererProps = {
  readonly page: FigPage;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly images?: ReadonlyMap<string, { readonly ref: string; readonly data: Uint8Array; readonly mimeType: string }>;
  readonly blobs?: readonly FigBlob[];
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a fig page as React SVG elements.
 *
 * Builds a scene graph from the page's FigDesignNode tree (domain objects)
 * and renders it through FigSceneRenderer which produces JSX SVG elements.
 *
 * The scene graph is memoized and only recomputed when the page content,
 * dimensions, or resources change.
 */
export function FigPageRenderer({
  page,
  canvasWidth,
  canvasHeight,
  images,
  blobs,
}: FigPageRendererProps) {
  const sceneGraph = useMemo(() => {
    if (page.children.length === 0) {
      return null;
    }

    return buildSceneGraph(page.children, {
      blobs: blobs ?? [],
      images: (images ?? new Map()) as BuildSceneGraphOptions["images"],
      canvasSize: { width: canvasWidth, height: canvasHeight },
    });
  }, [page.children, canvasWidth, canvasHeight, images, blobs]);

  if (!sceneGraph) {
    return <g />;
  }

  return <FigSceneRenderer sceneGraph={sceneGraph} />;
}
