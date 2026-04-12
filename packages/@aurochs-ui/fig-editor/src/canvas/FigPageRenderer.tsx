/**
 * @file Fig page renderer component
 *
 * Renders all nodes in the current page using the scene graph SVG pipeline.
 * Passes FigDesignNode tree directly to buildSceneGraph — no intermediate
 * conversion to the raw parser type (FigNode) is needed.
 */

import { useMemo } from "react";
import type { FigPage } from "@aurochs/fig/domain";
import type { FigBlob } from "@aurochs/fig/parser";
import { buildSceneGraph, type BuildSceneGraphOptions } from "@aurochs-renderer/fig/scene-graph";
import { renderSceneGraphToSvg } from "@aurochs-renderer/fig/svg";

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
 * Renders a fig page as SVG content.
 *
 * This component builds a scene graph from the page's FigDesignNode tree
 * (domain objects) and renders it to an SVG string, which is injected into the DOM.
 *
 * The SVG output is memoized and only recomputed when the page
 * content, dimensions, or resources change.
 */
export function FigPageRenderer({
  page,
  canvasWidth,
  canvasHeight,
  images,
  blobs,
}: FigPageRendererProps) {
  const svgContent = useMemo(() => {
    if (page.children.length === 0) {
      return "";
    }

    // Pass FigDesignNode children directly to buildSceneGraph.
    // No FigNode conversion needed — the scene graph builder accepts domain objects.
    const sceneGraph = buildSceneGraph(page.children, {
      blobs: blobs ?? [],
      images: (images ?? new Map()) as BuildSceneGraphOptions["images"],
      canvasSize: { width: canvasWidth, height: canvasHeight },
    });

    return renderSceneGraphToSvg(sceneGraph) as string;
  }, [page.children, canvasWidth, canvasHeight, images, blobs]);

  if (!svgContent) {
    return <g />;
  }

  // Inject SVG content (same pattern as pptx-slide-canvas)
  return <g dangerouslySetInnerHTML={{ __html: svgContent }} />;
}
