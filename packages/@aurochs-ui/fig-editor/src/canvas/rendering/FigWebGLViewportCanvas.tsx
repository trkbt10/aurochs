/** @file WebGL viewport canvas for the fig editor. */

import { useEffect, useRef, useState } from "react";
import type { SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import {
  createWebGLFigmaRenderer,
  resolveWebGLViewportPixelRatio,
  type WebGLFigmaRendererInstance,
} from "@aurochs-renderer/fig/webgl";

type FigWebGLViewportCanvasProps = {
  readonly sceneGraph: SceneGraph;
  readonly viewportScale: number;
};

/** Render the WebGL backend as an inert viewport-aligned canvas layer. */
export function FigWebGLViewportCanvas({ sceneGraph, viewportScale }: FigWebGLViewportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLFigmaRendererInstance | null>(null);
  const preparedSceneRef = useRef<SceneGraph | null>(null);
  const [devicePixelRatio, setDevicePixelRatio] = useState(() => typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const viewport = sceneGraph.viewport ?? { x: 0, y: 0 };
  const effectivePixelRatio = resolveWebGLViewportPixelRatio({ devicePixelRatio, viewportScale });

  useEffect(() => {
    if (typeof window === "undefined") { return; }
    const updatePixelRatio = () => {
      setDevicePixelRatio(window.devicePixelRatio || 1);
    };
    window.addEventListener("resize", updatePixelRatio);
    const media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    media.addEventListener("change", updatePixelRatio);
    return () => {
      window.removeEventListener("resize", updatePixelRatio);
      media.removeEventListener("change", updatePixelRatio);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { return; }

    if (!rendererRef.current) {
      rendererRef.current = createWebGLFigmaRenderer({
        canvas,
        antialias: true,
        pixelRatio: effectivePixelRatio,
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
      });
    }

    const renderer = rendererRef.current;
    renderer.setPixelRatio(effectivePixelRatio);
    if (preparedSceneRef.current === sceneGraph) {
      renderer.render(sceneGraph);
      return;
    }

    const cancelledRef = { value: false };
    void renderer.prepareScene(sceneGraph).then(() => {
      if (!cancelledRef.value) {
        preparedSceneRef.current = sceneGraph;
        renderer.render(sceneGraph);
      }
    });
    return () => {
      cancelledRef.value = true;
    };
  }, [sceneGraph, effectivePixelRatio]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      preparedSceneRef.current = null;
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
