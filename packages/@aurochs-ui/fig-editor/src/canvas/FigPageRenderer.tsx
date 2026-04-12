/**
 * @file Fig page renderer component
 *
 * Renders all nodes in the current page using the scene graph SVG pipeline.
 * Converts the page's FigDesignNode tree back to FigNode format,
 * builds a scene graph, and renders it to SVG.
 */

import { useMemo } from "react";
import type { FigPage } from "@aurochs-builder/fig/types";
import type { FigNode } from "@aurochs/fig/types";
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
 * This component builds a scene graph from the page's node tree
 * and renders it to an SVG string, which is injected into the DOM.
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

    // Convert FigDesignNode children back to FigNode-like objects for scene graph
    const figNodes = designNodesToFigNodes(page.children);

    const sceneGraph = buildSceneGraph(figNodes, {
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

// =============================================================================
// Conversion Helpers
// =============================================================================

/**
 * Convert FigDesignNode array to FigNode-like objects.
 *
 * The scene graph builder expects FigNode with guid, type as KiwiEnumValue,
 * and raw Kiwi field names (fillPaints, not fills).
 */
function designNodesToFigNodes(
  nodes: readonly import("@aurochs-builder/fig/types").FigDesignNode[],
): readonly FigNode[] {
  return nodes.map((node) => {
    const figNode: Record<string, unknown> = {
      guid: { sessionID: 0, localID: 0 },
      type: { value: 0, name: node.type },
      phase: { value: 1, name: "CREATED" },
      name: node.name,
      visible: node.visible,
      opacity: node.opacity,
      transform: node.transform,
      size: node.size,
      fillPaints: node.fills,
      strokePaints: node.strokes,
      strokeWeight: node.strokeWeight,
      strokeAlign: node.strokeAlign,
      strokeJoin: node.strokeJoin,
      strokeCap: node.strokeCap,
      cornerRadius: node.cornerRadius,
      rectangleCornerRadii: node.rectangleCornerRadii,
      effects: node.effects,
      clipsContent: node.clipsContent,
      // Spread _raw for any additional fields the renderer needs
      ...node._raw,
    };

    // Add text data fields
    if (node.textData) {
      figNode.characters = node.textData.characters;
      figNode.fontSize = node.textData.fontSize;
      figNode.fontName = node.textData.fontName;
      figNode.textAlignHorizontal = node.textData.textAlignHorizontal;
      figNode.textAlignVertical = node.textData.textAlignVertical;
      figNode.textAutoResize = node.textData.textAutoResize;
      figNode.lineHeight = node.textData.lineHeight;
      figNode.letterSpacing = node.textData.letterSpacing;
    }

    // Recursively convert children
    if (node.children && node.children.length > 0) {
      figNode.children = designNodesToFigNodes(node.children);
    }

    return figNode as FigNode;
  });
}
