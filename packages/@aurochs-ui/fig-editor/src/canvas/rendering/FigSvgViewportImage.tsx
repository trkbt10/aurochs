/** @file SVG-renderer viewport image for the fig editor. */

import { useMemo } from "react";
import type { SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import { renderSceneGraphToSvg } from "@aurochs-renderer/fig/svg";

type FigSvgViewportImageProps = {
  readonly sceneGraph: SceneGraph;
};

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Render the SVG backend as an inert viewport-aligned image layer. */
export function FigSvgViewportImage({ sceneGraph }: FigSvgViewportImageProps) {
  const href = useMemo(() => svgToDataUrl(renderSceneGraphToSvg(sceneGraph) as string), [sceneGraph]);
  const viewport = sceneGraph.viewport ?? { x: 0, y: 0 };

  return (
    <img
      src={href}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: viewport.x,
        top: viewport.y,
        display: "block",
        width: sceneGraph.width,
        height: sceneGraph.height,
        userSelect: "none",
      }}
    />
  );
}
