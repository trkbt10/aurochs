/** @file WebGL viewport canvas for the fig editor. */

import { useEffect, useRef } from "react";
import type { SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import { createWebGLFigmaRenderer, type WebGLFigmaRendererInstance } from "@aurochs-renderer/fig/webgl";

type FigWebGLViewportCanvasProps = {
  readonly sceneGraph: SceneGraph;
};

/** Render the WebGL backend as an inert viewport-aligned canvas layer. */
export function FigWebGLViewportCanvas({ sceneGraph }: FigWebGLViewportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLFigmaRendererInstance | null>(null);
  const viewport = sceneGraph.viewport ?? { x: 0, y: 0 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { return; }

    if (!rendererRef.current) {
      rendererRef.current = createWebGLFigmaRenderer({
        canvas,
        antialias: true,
        pixelRatio: window.devicePixelRatio || 1,
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
      });
    }

    const renderer = rendererRef.current;
    const cancelledRef = { value: false };
    void renderer.prepareScene(sceneGraph).then(() => {
      if (!cancelledRef.value) {
        renderer.render(sceneGraph);
      }
    });
    return () => {
      cancelledRef.value = true;
    };
  }, [sceneGraph]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={sceneGraph.width}
      height={sceneGraph.height}
      style={{
        position: "absolute",
        left: viewport.x,
        top: viewport.y,
        display: "block",
        width: sceneGraph.width,
        height: sceneGraph.height,
      }}
    />
  );
}
